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
import { GoogleGenAI } from '@google/genai';

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

  app.post('/api/v1/receipt/scan', async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          status: 'error',
          message: 'Gemini belum dikonfigurasi. Tambahkan GEMINI_API_KEY pada environment server.',
        });
      }

      const imageBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64.trim() : '';
      const mimeType = typeof req.body?.mimeType === 'string' && req.body.mimeType ? req.body.mimeType : 'image/jpeg';
      const language = req.body?.language === 'en' ? 'English' : 'Indonesian';
      const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];

      if (!imageBase64) {
        return res.status(400).json({ status: 'error', message: 'Gambar struk wajib dipilih.' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const preferredModel = process.env.GEMINI_MODEL?.trim();
      const models = Array.from(new Set([
        preferredModel,
        'gemini-2.5-flash',
        'gemini-flash-lite-latest',
        'gemini-3-flash-preview',
        'gemini-3.1-flash-lite-preview',
        'gemini-flash-latest',
      ].filter((value): value is string => Boolean(value))));

      const prompt = `Extract transaction data from this receipt image. Return a single JSON object only.
Language for text fields: ${language}.
Available categories (choose the closest match and return its exact name in categoryName, or "" if none fits): ${JSON.stringify(categories)}
Rules:
- amount: final total paid as a number (no currency symbol, no separators). Use 0 if unreadable.
- currency: ISO code if visible, else "".
- transactionDate: YYYY-MM-DD if visible, else "".
- merchant: store or merchant name.
- description: short transaction description.
- categoryName: exact name from available categories or "".
- notes: extra useful details, else "".
- tags: array of short lowercase strings.
JSON shape: {"merchant":"","description":"","amount":0,"currency":"","transactionDate":"","categoryName":"","notes":"","tags":[]}`;

      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
      let lastError: unknown = null;

      for (const model of models) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: imageBase64 } },
                { text: prompt },
              ],
            }],
            config: { responseMimeType: 'application/json' },
          });
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          const retryable = /not found|no longer available|not supported|unavailable|high demand|503|404/i.test(message);
          if (!retryable) break;
        }
      }

      if (!response) {
        throw lastError ?? new Error('Tidak ada model Gemini yang tersedia.');
      }

      const text = (() => {
        const direct = (response as { text?: unknown }).text;
        if (typeof direct === 'string' && direct.trim()) return direct.trim();
        const parts = (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          return parts.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('').trim();
        }
        return '';
      })();

      if (!text) {
        return res.status(502).json({ status: 'error', message: 'Gemini tidak mengembalikan hasil pembacaan struk.' });
      }

      let parsed: unknown;
      try {
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return res.status(502).json({ status: 'error', message: 'Hasil pembacaan struk tidak dapat diproses.' });
      }

      const raw = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
      const amount = (() => {
        const value = raw.amount;
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
          let normalized = value.trim().replace(/[^\d,.-]/g, '');
          if (!normalized) return undefined;
          if (normalized.includes(',') && normalized.includes('.')) {
            if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
              normalized = normalized.replace(/\./g, '').replace(',', '.');
            } else {
              normalized = normalized.replace(/,/g, '');
            }
          } else if (normalized.includes(',')) {
            const parts = normalized.split(',');
            normalized = parts.length === 2 ? `${parts[0].replace(/\./g, '')}.${parts[1]}` : normalized.replace(/,/g, '');
          } else {
            const parts = normalized.split('.');
            if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
              normalized = normalized.replace(/\./g, '');
            }
          }
          const numeric = Number(normalized);
          return Number.isFinite(numeric) ? numeric : undefined;
        }
        return undefined;
      })();

      const transactionDate = typeof raw.transactionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.transactionDate.trim())
        ? raw.transactionDate.trim()
        : '';
      const tags = Array.isArray(raw.tags)
        ? raw.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
        : [];

      res.json({
        status: 'success',
        data: {
          merchant: typeof raw.merchant === 'string' ? raw.merchant.trim() : '',
          description: typeof raw.description === 'string' ? raw.description.trim() : '',
          amount,
          currency: typeof raw.currency === 'string' ? raw.currency.trim() : '',
          transactionDate,
          categoryName: typeof raw.categoryName === 'string' ? raw.categoryName.trim() : '',
          notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
          tags,
        },
      });
    } catch (error) {
      console.error('Receipt scan failed:', error);
      const detail = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: `Gagal membaca struk: ${detail}`,
      });
    }
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
