import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { TAB_SEO_REGISTRY } from './src/utils/seo.ts';
import { CURRENCIES, CurrencyCode } from './src/types.ts';
import { convertCurrency } from './src/data/mockData.ts';
import { filterTransactionsByPeriod, PeriodFilter } from './src/utils/finance.ts';
import type { AppStateSnapshot } from './src/utils/api.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

const DATA_DIR = path.resolve(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'app-state.json');

function isPersistedState(value: unknown): value is AppStateSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppStateSnapshot>;
  const isObjectArray = (input: unknown) =>
    Array.isArray(input) && input.every((item) => item !== null && typeof item === 'object');

  return (
    isObjectArray(candidate.categories) &&
    isObjectArray(candidate.transactions) &&
    isObjectArray(candidate.budgets) &&
    isObjectArray(candidate.recurringList) &&
    typeof candidate.currency === 'string'
  );
}

function readPersistedState(): AppStateSnapshot | null {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as unknown;
    return isPersistedState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writePersistedState(state: AppStateSnapshot): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${STATE_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(temporaryFile, STATE_FILE);
}

async function createServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // 1. Backend REST API Routes (/api/v1/*)
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({
      status: 'UP',
      service: 'financial-tracker-ssr',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Persistent application snapshot. The web client hydrates from this endpoint
  // and writes changes back after a debounce, so refreshes no longer reset data.
  app.get('/api/v1/state', (_req: Request, res: Response) => {
    res.json({
      status: 'success',
      data: readPersistedState(),
    });
  });

  app.put('/api/v1/state', (req: Request, res: Response) => {
    if (!isPersistedState(req.body)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid application state payload.',
      });
    }

    try {
      writePersistedState(req.body);
      res.json({
        status: 'success',
        data: req.body,
        savedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to persist application state.',
      });
    }
  });

  app.get('/api/v1/dashboard/summary', (req: Request, res: Response) => {
    const state = readPersistedState();
    if (!state) {
      return res.status(404).json({
        status: 'error',
        message: 'No persisted state yet. Save a snapshot first via PUT /api/v1/state.',
      });
    }

    const requestedCurrency = String(req.query.currency || state.currency || 'IDR') as CurrencyCode;
    const currency = CURRENCIES[requestedCurrency] ? requestedCurrency : 'IDR';
    const requestedPeriod = String(req.query.period || 'this_month') as PeriodFilter;
    const period: PeriodFilter = ['today', 'this_week', 'this_month', 'this_year', 'all'].includes(requestedPeriod)
      ? requestedPeriod
      : 'this_month';

    const periodTransactions = filterTransactionsByPeriod(state.transactions, period);
    const monthlyTransactions = filterTransactionsByPeriod(state.transactions, 'this_month');

    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryMap = new Map<string, number>();

    periodTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        totalIncome += convertCurrency(tx.amount, tx.currency, currency);
      } else if (tx.type === 'EXPENSE') {
        const amount = convertCurrency(tx.amount, tx.currency, currency);
        totalExpenses += amount;
        if (tx.categoryId) {
          categoryMap.set(tx.categoryId, (categoryMap.get(tx.categoryId) || 0) + amount);
        }
      }
    });

    const monthlySpendByCategory = new Map<string, number>();
    monthlyTransactions.forEach((tx) => {
      if (tx.type !== 'EXPENSE' || !tx.categoryId) return;
      const amount = convertCurrency(tx.amount, tx.currency, currency);
      monthlySpendByCategory.set(
        tx.categoryId,
        (monthlySpendByCategory.get(tx.categoryId) || 0) + amount
      );
    });

    const totalBudget = state.budgets.reduce(
      (sum, budget) => sum + convertCurrency(budget.monthlyLimit, budget.currency, currency),
      0
    );
    const totalBudgetSpent = state.budgets.reduce(
      (sum, budget) =>
        sum + (monthlySpendByCategory.get(budget.categoryId) || 0),
      0
    );

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([categoryId, amount]) => {
        const category = state.categories.find((item) => item.id === categoryId);
        return {
          categoryId,
          categoryName: category?.name || 'Unassigned',
          amount,
          percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 1000) / 10 : 0,
          color: category?.colorHex || '#8E85FA',
        };
      })
      .sort((a, b) => b.amount - a.amount);

    res.json({
      status: 'success',
      data: {
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
        currency,
        period,
        budgetUtilizationPercent:
          totalBudget > 0 ? Math.round((totalBudgetSpent / totalBudget) * 1000) / 10 : 0,
        recordedTransactions: state.transactions.length,
        categoryBreakdown,
      },
    });
  });

  // 2. Vite Dev Server Middleware or Production Static Handler
  let vite: any;
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  // 3. Server-Side Rendering (SSR) & Dynamic HTML Metadata Pre-injection
  app.use('*', async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;
    const tabParam = (req.query.tab as string) || 'dashboard';
    const tabConfig = TAB_SEO_REGISTRY[tabParam] || TAB_SEO_REGISTRY.dashboard;

    try {
      let template: string;
      if (!isProduction) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        template = fs.readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf-8');
      }

      // Dynamic Canonical & OpenGraph URL injection based on host/APP_URL
      const fullUrl = `${APP_URL}${url}`;
      
      // SSR SEO Replacements for Tab-Specific Meta
      let html = template
        .replace(/<title>.*?<\/title>/, `<title>${tabConfig.title}</title>`)
        .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${tabConfig.description}" />`)
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${tabConfig.title}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${tabConfig.description}" />`);

      const canonicalTag = `<link rel="canonical" href="${fullUrl}" />\n    <meta property="og:url" content="${fullUrl}" />`;
      html = html.replace('</head>', `  ${canonicalTag}\n  </head>`);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e: any) {
      if (vite) {
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Financial Tracker SSR & API running at http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
