# Update Log - Financial Tracker

Tanggal: 2026-11-25

Dokumen ini mencatat **update/peringkasan kode** yang dilakukan di sesi
bug-fix ini (berbeda dari `fix.md` yang fokus pada daftar bug).
Riwayat pekerjaan fitur sebelumnya (notification capture, build Android,
audit `notificationDrafts`) ada di `progress.md`.

---

## Ringkasan sesi

Sesi ini menuntaskan sisa **6 temuan audit** (setelah 3 critical fix pada
sesi sebelumnya), melakukan type-check + test + smoke test E2E, dan
mendokumentasikan hasilnya.

---

## File yang di-update

### Baru
| File | Isi |
|------|-----|
| `src/utils/amount.ts` | Util bersama `parseAmount` (hasil ekstraksi kode duplikat dari scanner klien + server) |
| `fix.md` | Log lengkap 9 bug yang sudah diperbaiki |
| `update.md` | Dokumen ini |

### Diubah
| File | Update |
|------|--------|
| `src/App.tsx` | `currency` dari konstanta `IDR` menjadi `useState<CurrencyCode>('IDR')`; prop baru `currency`/`onCurrencyChange` diteruskan ke `Header` |
| `src/components/Header.tsx` | Prop `currency` + `onCurrencyChange`; **switcher mata uang** baru (tombol simbol+kode, dropdown 6 mata uang dari `CURRENCIES`); import pindah dari `types.ts` |
| `src/components/DashboardView.tsx` | `now` dihitung ulang tiap render (bukan `useMemo(..., [])`) — waktu/periode tidak lagi membeku; `now` dihapus dari deps memo |
| `src/components/TransactionsView.tsx` | Perbaikan frozen `now` yang sama |
| `src/components/LockScreen.tsx` | `biometricConfigured` jadi state dengan setter + refresh di effect (tiap mount/navigate) — tidak lagi stale |
| `src/components/ReceiptScannerModal.tsx` | `parseAmount` lokal dihapus; import dari `../utils/amount` |
| `src/utils/notificationParser.ts` | `extractDate` pakai `Date.UTC` + UTC getter — tanggal tidak lagi bergeser karena timezone |
| `src/utils/storage.ts` | Pemaksaan `syncStatus: 'SYNCED'` dihapus dari `normalizeSnapshot` — status asli `PENDING`/`SYNCED` dipertahankan |
| `src/utils/i18n.ts` | Key baru `header.switchCurrency`: `Pilih Mata Uang` (ID) / `Choose Currency` (EN) |
| `server.ts` | Lihat di bawah |

### Update di `server.ts`
1. **Validator `isPersistedState` diperkuat** — validasi field wajib per
   entitas (kategori/transaksi/budget/recurring + kode mata uang valid);
   payload cacat → `400`.
2. **Query array dinormalisasi** — `?currency=USD&currency=EUR` ambil
   elemen pertama (bukan `"USD,EUR"`); berlaku juga `?period`; precedence
   `??`/`||` diberi kurung.
3. **Prefix data URI di-strip** — `data:image/...;base64,` dibuang sebelum
   `imageBase64` dikirim ke Gemini.
4. **`parseAmount`** — IIFE inline ~25 baris diganti
   `parseAmount(raw.amount)` dari `src/utils/amount.ts`.
5. **Import** — tambah `Budget`, `Category`, `RecurringTransaction`,
   `Transaction` (types) dan `parseAmount`.

---

## Perubahan perilaku yang terlihat pengguna

1. **Bisa ganti mata uang tampilan** dari Header (IDR/USD/EUR/SGD/MYG/JPY);
   pilihan tersimpan ke snapshot & bertahan setelah restart.
2. **Tanggal/label periode di dashboard selalu akurat** (tidak membeku di
   waktu pertama dibuka).
3. **Tanggal hasil parse notifikasi akurat** lintas timezone.
4. **Status sinkronisasi transaksi tidak lagi dipalsukan** jadi `SYNCED`.
5. **Lock screen menampilkan status biometrik terbaru** setelah diubah di
   Security Settings.
6. **API scan struk lebih toleran & aman**: menerima data URI maupun base64
   polos; server menolak snapshot yang rusak.
7. **API summary lebih benar** saat parameter query diulang/aneh.

---

## Verifikasi

| Pemeriksaan | Hasil |
|-------------|-------|
| `npx tsc --noEmit` | ✅ Clean (exit 0) |
| `npm test` | ✅ 39 tests, 39 pass, 0 fail |
| Smoke test E2E `PUT/GET /api/v1/state` | ✅ Valid→200, cacat→400 |
| Smoke test query `currency` array/invalid/tunggal | ✅ USD / IDR / EUR |
| Strip regex base64 | ✅ Data URI ter-strip, base64 polos utuh |

---

## Status Git (belum di-commit)

```
 M server.ts
 M src/App.tsx
 M src/components/DashboardView.tsx
 M src/components/Header.tsx
 M src/components/LockScreen.tsx
 M src/components/ReceiptScannerModal.tsx
 M src/components/TransactionsView.tsx
 M src/utils/i18n.ts
 M src/utils/notificationParser.ts
 M src/utils/storage.ts
?? src/utils/amount.ts
?? fix.md
?? update.md
```

## Lanjutan (belum dikerjakan — di luar scope bug-fix)

## Sistem update GitHub Release

Ditambahkan untuk repository:

```text
Mr-Young-62/financial-tracker
```

### File update

- `src/config.ts` — versi aplikasi (`APP_VERSION`) dan repository GitHub.
- `src/utils/update.ts` — mengambil release terbaru dari GitHub API,
  membandingkan versi semantik, dan memilih asset APK.
- `src/components/UpdateModal.tsx` — popup update dengan tombol **Nanti**
  dan **Update Sekarang**.
- `src/App.tsx` — pengecekan saat startup dan saat Android resume.
- `android/app/build.gradle` — `versionName` disamakan ke `1.0.0`.

### Cara membuat release

1. Naikkan `APP_VERSION` di `src/config.ts`, misalnya `1.0.0` → `1.1.0`.
2. Naikkan `versionCode` di `android/app/build.gradle` setiap kali membuat
   APK baru. `versionCode` harus selalu lebih besar dari release sebelumnya.
3. Jalankan build web dan sinkronisasi Capacitor:

   ```powershell
   npm run build
   npx cap sync android
   ```

4. Build APK release menggunakan Android JDK + SDK yang lengkap.
5. Buat GitHub Release dengan tag versi, misalnya `v1.1.0`.
6. Upload file APK sebagai asset release. Nama file bebas selama berekstensi
   `.apk`; sistem akan memilih asset APK pertama.
7. Isi release notes karena teksnya akan ditampilkan di popup.

### Perilaku update

- Web mengecek `https://api.github.com/repos/Mr-Young-62/financial-tracker/releases/latest`.
- Web membuka halaman GitHub Release agar pengguna mendapatkan update web
  terbaru dari hosting/deployment web.
- Android membuka asset APK langsung jika asset `.apk` tersedia.
- Jika APK belum di-upload, Android fallback ke halaman GitHub Release.
- Android tidak boleh memasang APK diam-diam; pengguna tetap harus
  mengonfirmasi instalasi dan mungkin mengizinkan pemasangan dari sumber ini.
- Jika GitHub API gagal atau offline, popup tidak ditampilkan dan aplikasi
  tetap berjalan normal.
- Release dengan versi sama atau lebih rendah dari `APP_VERSION` diabaikan.

Dari `progress.md` (tidak berubah):
1. Build APK Android: butuh **JDK penuh** (bukan JRE) + Android SDK.
2. Validasi E2E notifikasi capture di device/emulator nyata.
3. Repo belum punya remote — push butuh konfirmasi remote.
4. `android/gradle.properties` masih menunjuk `org.gradle.java.home` ke
   JRE 21 lokal; ganti/hapus saat JDK tersedia.
