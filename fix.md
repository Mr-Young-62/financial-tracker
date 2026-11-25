# Fix Log - Financial Tracker

Tanggal: 2026-11-25

Dokumen ini mencatat semua perbaikan bug (kritis maupun minor) yang sudah
dilakukan di codebase TypeScript/React + Express.

---

## Ringkasan

| # | Severity | Bug | File | Status |
|---|----------|-----|------|--------|
| 1 | Kritis | Waktu (`now`) dibekukan oleh `useMemo` | `DashboardView.tsx`, `TransactionsView.tsx` | ✅ Fixed |
| 2 | Kritis | Tanggal parser bergeser karena timezone | `notificationParser.ts` | ✅ Fixed |
| 3 | Kritis | `syncStatus` dipaksa `SYNCED` saat normalize | `storage.ts` | ✅ Fixed |
| 4 | Major | Mata uang terkunci `IDR` (tidak bisa ganti) | `App.tsx`, `Header.tsx` | ✅ Fixed |
| 5 | Major | Query array jadi string koma di server | `server.ts` | ✅ Fixed |
| 6 | Major | Prefix `data:image/...;base64,` tidak di-strip | `server.ts` | ✅ Fixed |
| 7 | Major | `biometricConfigured` stale (tidak di-refresh) | `LockScreen.tsx` | ✅ Fixed |
| 8 | Major | Validasi `isPersistedState` server terlalu lemah | `server.ts` | ✅ Fixed |
| 9 | Minor | Duplikasi logika normalisasi amount | `ReceiptScannerModal.tsx`, `server.ts` → `amount.ts` | ✅ Fixed |

---

## Detail perbaikan

### 1. Waktu (`now`) dibekukan oleh `useMemo` — Kritis

- **Lokasi**: `src/components/DashboardView.tsx`, `src/components/TransactionsView.tsx`
- **Gejala**: Label tanggal ("Per ..."), filter periode, dan chart tidak
  pernah update karena `now` dihitung sekali saat mount:
  `const now = useMemo(() => new Date(), []);`
- **Penyebab**: `new Date()` di-memoize tanpa dependensi, jadi waktu selalu
  menunjuk saat komponen pertama kali dirender.
- **Fix**: `const now = new Date();` langsung (tanpa memo), dan `now`
  dihapus dari daftar dependensi `useMemo` yang memakainya.
- **Status**: ✅ Fixed — `tsc` clean, test 39/39 pass.

### 2. Tanggal parser bergeser karena timezone — Kritis

- **Lokasi**: `src/utils/notificationParser.ts` (`extractDate`)
- **Gejala**: Tanggal yang diekstrak dari notifikasi bisa maju/mundur 1 hari
  tergantung timezone perangkat (mis. notifikasi jam 00:30 WIB → tanggal
  sebelumnya).
- **Penyebab**: Parsing tanggal memakai constructor lokal, sehingga offset
  timezone ikut menggeser nilai tanggalnya.
- **Fix**: Bangun tanggal via `Date.UTC` dan baca komponennya dengan UTC
  getter, sehingga tanggal murni tidak terpengaruh timezone.
- **Status**: ✅ Fixed — test parser (39) lulus tanpa regresi.

### 3. `syncStatus` dipaksa `SYNCED` saat normalize — Kritis

- **Lokasi**: `src/utils/storage.ts` (`normalizeSnapshot`)
- **Gejala**: Transaksi berstatus `PENDING` (belum tersinkron) tiba-tiba
  jadi `SYNCED` setelah snapshot dimuat/dinormalisasi — informasi antrean
  sinkronisasi hilang tanpa jejak.
- **Penyebab**: Ada pemaksaan `syncStatus: 'SYNCED'` di dalam
  `normalizeSnapshot`, menimpa nilai asli.
- **Fix**: Hapus pemaksaan tersebut; nilai `syncStatus` asli dipertahankan.
- **Status**: ✅ Fixed.

### 4. Mata uang terkunci `IDR` — Major

- **Lokasi**: `src/App.tsx` (sekitar baris 97), `src/components/Header.tsx`
- **Gejala**: Aplikasi selalu memakai `IDR`; tidak ada cara mengganti mata
  uang tampilan meskipun `CURRENCIES` mendukung IDR/USD/EUR/SGD/MYG/JPY.
- **Penyebab**: `const currency: CurrencyCode = 'IDR';` — konstanta statis.
- **Fix**:
  - `currency` jadi state: `useState<CurrencyCode>('IDR')` (default tetap IDR).
  - Header mendapat **switcher mata uang** (tombol simbol + kode, dropdown
    semua mata uang dari `CURRENCIES`) dengan prop baru
    `currency`/`onCurrencyChange`.
  - Pilihan tersimpan otomatis karena `currency` sudah menjadi bagian
    snapshot persist (`saveAppState`).
  - Tambah i18n key `header.switchCurrency` (ID + EN).
- **Status**: ✅ Fixed.

### 5. Query array jadi string koma di server — Major

- **Lokasi**: `server.ts` (`/api/v1/dashboard/summary`)
- **Gejala**: Request `?currency=USD&currency=EUR` menghasilkan
  `"USD,EUR"` → tidak dikenal → fallback `IDR`, padahal yang diinginkan
  pemakai adalah `USD`.
- **Penyebab**: `String(req.query.currency ...)` mengubah array jadi string
  dengan pemisah koma.
- **Fix**: Jika `Array.isArray(...)`, ambil elemen pertama
  (`arr[0]`); `??`/`||` diberi tanda kurung agar precedence benar.
  Berlaku juga untuk `?period`.
- **Status**: ✅ Fixed — diverifikasi E2E via HTTP:
  `?currency=USD&currency=EUR` → `USD`; `?currency=BADCODE` → `IDR`;
  `?currency=EUR` → `EUR`.

### 6. Prefix `data:image/...;base64,` tidak di-strip — Major

- **Lokasi**: `server.ts` (`/api/v1/receipt/scan`)
- **Gejala**: Jika klien mengirim gambar sebagai data URI lengkap
  (`data:image/png;base64,iVBOR...`), server meneruskan string mentah ke
  Gemini → request gagal/struk gagal terbaca.
- **Penyebab**: `imageBase64` hanya di-`trim()`, prefix data URI tidak
  dibuang (padahal `mimeType` sudah dikirim terpisah).
- **Fix**: Strip prefix dengan
  `.replace(/^data:image\/[^;]+;base64,/, '')` sebelum dikirim ke Gemini.
- **Status**: ✅ Fixed — regex diverifikasi (data URI ter-strip, base64
  polos tetap utuh).

### 7. `biometricConfigured` stale di LockScreen — Major

- **Lokasi**: `src/components/LockScreen.tsx` (baris 58)
- **Gejala**: Subtitle/judul unlock masih menampilkan opsi biometrik lama
  setelah status biometrik diubah dari Security Settings — state tidak
  pernah di-refresh selama komponen terpasang.
- **Penyebab**: `const [biometricConfigured] = useState(() => isBiometricEnabled())`
  — hanya dibaca sekali saat mount, tanpa setter.
- **Fix**: Jadikan state dengan setter, lalu refresh
  `setBiometricConfigured(isBiometricEnabled())` di effect yang sudah ada
  (effect jalan tiap mount/navigate antar mode setup/unlock).
- **Status**: ✅ Fixed.

### 8. Validasi `isPersistedState` server terlalu lemah — Major

- **Lokasi**: `server.ts` (`isPersistedState`, baris 26–39)
- **Gejala**: `PUT /api/v1/state` menerima payload cacat (transaksi tanpa
  `amount`, mata uang bukan kode valid, tags bukan string, dll) lalu
  menulisnya ke `data/app-state.json` → merusak state server.
- **Penyebab**: Validator hanya mengecek "array of objects" + `currency`
  berupa string.
- **Fix**: Validasi per-entitas:
  - `category`: `id`, `name` string; `type` ∈ {INCOME, EXPENSE}
  - `transaction`: `id`, `transactionDate`, `idempotencyKey`, `createdAt`
    string; `amount` number finite; `currency` ∈ `CURRENCIES`;
    `type` ∈ {INCOME, EXPENSE}; `tags` array of string
  - `budget`: `id`, `categoryId` string; `monthlyLimit` finite; currency valid
  - `recurring`: `id`, `interval`, `nextRunDate` string; `amount` finite;
    `isActive` boolean; currency valid; type valid
  - `currency` snapshot ∈ `CURRENCIES`
- **Status**: ✅ Fixed — diverifikasi E2E: payload valid → 200; transaksi
  tanpa `amount` → **400**.

### 9. Duplikasi logika normalisasi amount — Minor

- **Lokasi**: `src/components/ReceiptScannerModal.tsx` vs `server.ts`
- **Gejala**: Fungsi `parseAmount` (parsing "Rp1.234,56" / "1,234.56" /
  "1.234.567") diduplikasi di dua tempat → rawan menyimpang saat salah satu
  diperbaiki.
- **Fix**: Ekstrak **verbatim** (tanpa perubahan perilaku) ke util bersama
  `src/utils/amount.ts` (`export function parseAmount`), diimpor oleh:
  - `ReceiptScannerModal.tsx` (klien)
  - `server.ts` (API scan struk)
- **Status**: ✅ Fixed — perilaku identik dengan versi lama (extracted as-is).

---

## Verifikasi (2026-11-25)

- `npx tsc --noEmit` → **clean** (exit 0, tanpa error)
- `npm test` → **39 tests, 39 pass, 0 fail, 0 skipped**
  - `notificationParser.test.ts`
  - `notificationDedup.test.ts`
  - `notificationPipeline.test.ts`
- Smoke test E2E server (dev server di port 3100, lalu dihentikan + data
  dibersihkan):
  - `PUT /api/v1/state` valid → `200 success`
  - `PUT /api/v1/state` transaksi tanpa `amount` → `400`
  - `GET .../summary?currency=USD&currency=EUR` → `USD`
  - `GET .../summary?currency=BADCODE` → `IDR`
  - `GET .../summary?currency=EUR` → `EUR`
  - Regex strip base64 → data URI ter-strip, base64 polos utuh

## Catatan

- Semua perubahan **belum di-commit** (lihat `git status`): 10 file modified
  + 1 file baru (`src/utils/amount.ts`).
- Blocker lama yang tidak terkait bug kode (dari `progress.md`): build APK
  Android masih butuh JDK penuh + Android SDK; repo belum punya remote.
