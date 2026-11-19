import React, { useState } from 'react';
import { Database, Send, Sparkles } from 'lucide-react';
import { Skeleton } from './Skeleton';

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  category: string;
  description: string;
  defaultPayload?: any;
  defaultResponse: any;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'auth-register',
    method: 'POST',
    path: '/api/v1/auth/register',
    category: 'Authentication',
    description: 'Registers new user and issues access and rotating refresh token',
    defaultPayload: {
      email: 'agist.kilua@example.com',
      password: 'SecurePassword123!',
      fullName: 'Agist Kilua',
      baseCurrency: 'IDR',
    },
    defaultResponse: {
      status: 'success',
      statusCode: 201,
      data: {
        user: {
          id: 'e4414ef4-1fbc-418d-9b0d-5875225be3dc',
          email: 'agist.kilua@example.com',
          fullName: 'Agist Kilua',
          baseCurrency: 'IDR',
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDQ...',
          refreshToken: 'd88b43fb-0d5b-42fa-9eb9-923fbc043187',
          expiresIn: 3600,
        },
      },
    },
  },
  {
    id: 'auth-login',
    method: 'POST',
    path: '/api/v1/auth/login',
    category: 'Authentication',
    description: 'Validates BCrypt/Argon2 password and issues JWT',
    defaultPayload: {
      email: 'agist.kilua@example.com',
      password: 'SecurePassword123!',
    },
    defaultResponse: {
      status: 'success',
      statusCode: 200,
      data: {
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'f49a3721-6674-4b53-855f-846cf4653198',
          expiresIn: 3600,
        },
      },
    },
  },
  {
    id: 'dashboard-summary',
    method: 'GET',
    path: '/api/v1/dashboard/summary?period=this_month',
    category: 'Dashboard',
    description: 'Returns real-time financial aggregates and budget health',
    defaultResponse: {
      status: 'success',
      statusCode: 200,
      data: {
        totalIncome: 21700000.0,
        totalExpenses: 2408000.0,
        netCashFlow: 19292000.0,
        currency: 'IDR',
        budgetUtilizationPercent: 68.8,
      },
    },
  },
  {
    id: 'transactions-list',
    method: 'GET',
    path: '/api/v1/transactions?limit=20&sortBy=date_desc',
    category: 'Transactions',
    description: 'Paged and filtered ledger entries with category relations',
    defaultResponse: {
      status: 'success',
      statusCode: 200,
      data: {
        page: 1,
        totalItems: 8,
        items: [
          {
            id: 'tx-001',
            type: 'EXPENSE',
            amount: 186000.0,
            currency: 'IDR',
            description: 'Netflix 4K Ultra Subscription',
            category: 'Entertainment',
          },
        ],
      },
    },
  },
  {
    id: 'transactions-create',
    method: 'POST',
    path: '/api/v1/transactions',
    category: 'Transactions',
    description: 'Creates new transaction with UUID Idempotency-Key duplicate prevention',
    defaultPayload: {
      categoryId: 'cat-food',
      type: 'EXPENSE',
      amount: 45000.0,
      currency: 'IDR',
      description: 'Lunch at Grand Indonesia',
      transactionDate: '2026-11-08T12:30:00Z',
      idempotencyKey: 'idem-8f2a91c0-20261108',
    },
    defaultResponse: {
      status: 'success',
      statusCode: 201,
      data: {
        transactionId: 'tx-9281a9',
        syncStatus: 'SYNCED',
        idempotencyKey: 'idem-8f2a91c0-20261108',
      },
    },
  },
];

const DB_TABLES = [
  { name: 'users', desc: 'User profiles, base currency, argon2 password hash' },
  { name: 'categories', desc: 'Income and expense hierarchical classifications' },
  { name: 'transactions', desc: 'Financial ledger records' },
  { name: 'budgets', desc: 'Category monthly limit threshold targets' },
  { name: 'recurring_schedules', desc: 'Automated recurring rules and cron intervals' },
  { name: 'refresh_tokens', desc: 'Hashed rotating session credentials' },
  { name: 'idempotency_keys', desc: 'UUID hash deduplication registry' },
  { name: 'audit_logs', desc: 'Security actions and mutation trails' },
  { name: 'exchange_rates', desc: 'Historical & live FX conversion cache' },
];

export const ApiWorkbench: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0]);
  const [requestPayload, setRequestPayload] = useState<string>(
    JSON.stringify(API_ENDPOINTS[0].defaultPayload || {}, null, 2)
  );
  const [responseLog, setResponseLog] = useState<any>(API_ENDPOINTS[0].defaultResponse);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectEndpoint = (ep: ApiEndpoint) => {
    setSelectedEndpoint(ep);
    setRequestPayload(JSON.stringify(ep.defaultPayload || {}, null, 2));
    setResponseLog(ep.defaultResponse);
  };

  const handleExecute = () => {
    setIsLoading(true);
    setTimeout(() => {
      setResponseLog(selectedEndpoint.defaultResponse);
      setIsLoading(false);
    }, 350);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#EAE5DC] dark:border-[#22202E]">
        <div>
          <div className="text-[11px] font-semibold text-[#8E85FA] dark:text-[#B8B2FF] tracking-wider uppercase mb-1">
            Backend API Studio
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16151D] dark:text-white">
            REST API & PostgreSQL Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#706B82] dark:text-[#9D98AC] mt-1">
            Simulate Ktor REST endpoints, JWT authentication tokens, and inspect database schema
          </p>
        </div>
      </section>

      {/* Grid: Endpoints list & Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Endpoints Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#706B82] dark:text-[#9D98AC]">
            Available API Endpoints (/api/v1)
          </div>

          <div className="bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs divide-y divide-[#F1ECE3] dark:divide-[#252230] overflow-hidden">
            {API_ENDPOINTS.map((ep) => {
              const isSelected = selectedEndpoint.id === ep.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => handleSelectEndpoint(ep)}
                  className={`w-full p-3.5 text-left transition-colors flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#FAF7F2] dark:bg-[#252230]'
                      : 'hover:bg-[#FAF7F2]/60 dark:hover:bg-[#252230]/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                        ep.method === 'GET' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                        ep.method === 'POST' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="text-xs font-semibold text-[#16151D] dark:text-white truncate">
                        {ep.path}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#706B82] dark:text-[#9D98AC] truncate mt-1">
                      {ep.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Database Tables Overview */}
          <div className="p-5 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#16151D] dark:text-white">
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#8E85FA] dark:text-[#B8B2FF]" />
                <span>PostgreSQL 16 Tables</span>
              </span>
              <span className="text-[#868196] dark:text-[#9D98AC] font-mono">10 tables</span>
            </div>

            <div className="divide-y divide-[#F1ECE3] dark:divide-[#252230] text-xs">
              {DB_TABLES.slice(0, 5).map((t) => (
                <div key={t.name} className="py-2 flex items-center justify-between font-mono">
                  <span className="text-[#16151D] dark:text-[#E2DFEC] font-semibold">{t.name}</span>
                  <span className="text-[#868196] dark:text-[#9D98AC] text-[11px]">{t.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* API Playground (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Request Header Bar */}
          <div className="p-5 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="px-2 py-0.5 text-xs font-bold font-mono rounded bg-[#F1ECE3] dark:bg-[#252230] text-[#16151D] dark:text-white">
                  {selectedEndpoint.method}
                </span>
                <span className="text-xs font-mono font-semibold text-[#16151D] dark:text-white truncate">
                  https://api.financialtracker.app{selectedEndpoint.path}
                </span>
              </div>

              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-bold bg-[#121118] text-white dark:bg-[#B8B2FF] dark:text-[#121118] hover:bg-[#252230] dark:hover:bg-[#A8A0FC] btn-tactile rounded-xl shadow-xs flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${isLoading ? 'animate-pulse' : ''}`} />
                <span>{isLoading ? 'Executing Request...' : 'Send Request'}</span>
              </button>
            </div>

            {/* Request Body Editor if POST */}
            {selectedEndpoint.method === 'POST' && (
              <div>
                <label className="block text-xs font-semibold text-[#706B82] dark:text-[#9D98AC] mb-1">
                  Request JSON Body:
                </label>
                <textarea
                  rows={4}
                  value={requestPayload}
                  onChange={(e) => setRequestPayload(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-[#121118] text-emerald-400 rounded-xl border border-[#2B273C] focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
                />
              </div>
            )}
          </div>

          {/* Response Inspector with Skeleton Shimmer */}
          <div className="p-5 bg-[#121118] rounded-2xl border border-[#2B273C] shadow-xs space-y-2 text-slate-200 card-hover-lift">
            <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#2B273C]">
              <div className="flex items-center gap-2">
                <span className={`${isLoading ? 'text-amber-400' : 'text-emerald-400'} font-bold`}>
                  {isLoading ? 'HTTP 102 PROCESSING...' : 'HTTP 200 / 201 OK'}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">Response Payload</span>
              </div>
              <span className="text-slate-500">Content-Type: application/json</span>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-2.5 animate-fadeIn" role="status" aria-label="Loading API Response...">
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="w-20 h-4 rounded-md" />
                  <Skeleton className="w-36 h-4 rounded-md" />
                </div>
                <Skeleton className="w-full h-4 rounded" />
                <Skeleton className="w-4/5 h-4 rounded" />
                <Skeleton className="w-3/4 h-4 rounded" />
                <Skeleton className="w-5/6 h-4 rounded" />
                <Skeleton className="w-2/3 h-4 rounded" />
              </div>
            ) : (
              <pre className="p-2 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
                <code>{JSON.stringify(responseLog, null, 2)}</code>
              </pre>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
