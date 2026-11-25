# Progress - Financial Tracker (Notification Capture)

Tanggal update: 2026-11-25

## Ringkasan pekerjaan

Fitur pencatatan transaksi dari notifikasi Android (native listener + queue + parser/dedup TS + UI draft/settings) sudah terintegrasi di branch kerja ini. Sesi ini melanjutkan verifikasi build Capacitor Android, memperbaiki audit alur `notificationDrafts`, dan mendokumentasikan status.

## Perubahan yang sudah dilakukan (sesi ini)

- **Revert infrastruktur Gradle KMP yang tidak relevan**: mengembalikan `build.gradle.kts`, `system/build.gradle.kts`, `server/build.gradle.kts` ke kondisi semula dan menghapus `libs/build.gradle.kts` yang sempat dibuat saat percobaan build sebelumnya. Tidak ada perubahan pada fitur notifikasi.
- **Build Capacitor**: menjalankan urutan yang diminta (dan diulang setelah audit fix `App.tsx`):
  1. `npm run build` — **berhasil** (Vite build sukses).
  2. `npx cap sync android` — **berhasil** (web assets disalin, 5 plugin Capacitor terdeteksi termasuk `@capacitor/app`).
  3. `cd android && .\gradlew.bat assembleDebug` — **gagal** (error sama, environment toolchain; lihat di bawah).
- **Perbaikan lingkungan build Android (relevan)**: menambahkan `org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jre-21.0.6.7-hotspot` di `android/gradle.properties` karena default sistem memakai Java 8, sedangkan AGP 8.13 membutuhkan Java 11+. Setelah perubahan ini Gradle berjalan dengan Java 21, tetapi build tetap gagal karena instalasi tersebut adalah **JRE**, bukan JDK (tidak menyediakan `JAVA_COMPILER`).
- **Audit/fix alur `notificationDrafts`** (`src/App.tsx`):
  - **Dimuat dari snapshot saat startup**: `applySnapshot(...)` sekarang mengisi `notificationDrafts` dan `notificationDedupRef` dari `AppStateSnapshot` yang dimuat oleh `loadAppState()`.
  - **Tetap tersimpan saat state aplikasi berubah**: effect persist snapshot sekarang menyertakan `notificationDrafts` dan `notificationDedup` (bukan hanya categories/transactions/budgets/recurring/currency).
  - **Dihapus hanya setelah transaksi konfirmasi benar-benar disimpan**: menambah `confirmingDraftId`. Saat draft dikonfirmasi, modal transaksi dibuka dengan data prefill dan draft ID dicatat. Draft dihapus dari state/ref **hanya** di `handleSaveTransaction` saat transaksi baru berhasil ditambahkan (bukan edit), lalu persist effect menyimpan snapshot yang sudah tanpa draft tersebut. Saat modal ditutup/batal, `confirmingDraftId` dibersihkan.
  - Drain queue juga diperbarui untuk memakai `notificationDraftsRef`/`notificationDedupRef` agar dedup tidak hilang dan snapshot yang disimpan konsisten.

## Hasil test

Perintah: `npm test`

Hasil: **PASS** — 39 tests, 7 suites, 0 failures.
- `src/utils/__tests__/notificationParser.test.ts`
- `src/utils/__tests__/notificationDedup.test.ts`
- `src/utils/__tests__/notificationPipeline.test.ts`

## Hasil build Android

### Pemeriksaan lingkungan
- Java: Java 8 terdeteksi di PATH (`java version "1.8.0_503"`), juga ada Adoptium JRE 21 (`C:\Program Files\Eclipse Adoptium\jre-21.0.6.7-hotspot`).
- `javac`: **tidak ditemukan** (tidak ada JDK penuh).
- `JAVA_HOME` / `ANDROID_HOME` / `ANDROID_SDK_ROOT`: tidak ter-set di environment.
- `android/local.properties`: **tidak ada**.
- Android SDK di lokasi umum (`C:\Android`, `%LOCALAPPDATA%\Android\Sdk`): **tidak ditemukan**.

### Error build pertama (sebelum override Java home)
```
FAILURE: Build failed with an exception.
* What went wrong:
A problem occurred configuring root project 'android'.
> Could not resolve all artifacts for configuration 'classpath'.
   > Could not resolve com.android.tools.build:gradle:8.13.0.
     Required by:
         root project :
      > Dependency requires at least JVM runtime version 11. This build uses a Java 8 JVM.
   > Could not resolve com.google.gms:google-services:4.4.4.
     Required by:
         root project :
      > Dependency requires at least JVM runtime version 11. This build uses a Java 8 JVM.
```

### Error build setelah override `org.gradle.java.home` ke JRE 21
```
FAILURE: Build failed with an exception.
* What went wrong:
Could not determine the dependencies of task ':app:packageDebug'.
> Could not create task ':app:compileDebugJavaWithJavac'.
   > Failed to calculate the value of task ':app:compileDebugJavaWithJavac' property 'javaCompiler'.
      > Toolchain installation 'C:\Program Files\Eclipse Adoptium\jre-21.0.6.7-hotspot' does not provide the required capabilities: [JAVA_COMPILER]
```

**Kesimpulan build**: Build APK debug **belum berhasil** di lingkungan ini karena tidak ada JDK (hanya JRE) dan Android SDK tidak terdeteksi/terkonfigurasi. Build ulang setelah audit fix `App.tsx` + `cap sync` menghasilkan error yang sama (`JAVA_COMPILER` capability missing dari JRE 21). Tidak ada error kode proyek Android/Capacitor yang teridentifikasi dari kegagalan ini.

## Kendala / Blocker

1. **JDK tidak tersedia (hanya JRE)**: `javac` tidak ditemukan. Adoptium yang ada adalah `jre-21.0.6.7-hotspot` sehingga Gradle/AGP gagal pada task `:app:compileDebugJavaWithJavac` dengan `JAVA_COMPILER capability missing`. AGP 8.13 membutuhkan Java 11+ **JDK**.
2. **Android SDK tidak terkonfigurasi**: `ANDROID_HOME`/`ANDROID_SDK_ROOT` tidak ter-set, `android/local.properties` tidak ada, dan SDK tidak ditemukan di lokasi umum. Setelah JDK diperbaiki, SDK masih wajib untuk assembleDebug.
3. **`org.gradle.java.home` sementara menunjuk ke JRE**: saya set di `android/gradle.properties` untuk melewati error Java 8; ini harus diganti ke JDK valid atau dihapus saat `JAVA_HOME` sudah benar.
4. **Validasi E2E Android belum bisa dilakukan**: butuh device/emulator + Notification Access + notifikasi uji nyata/sintetis untuk memastikan capture, draft, confirm, dedup, resume/background, dan permission-revoked behavior.
5. **Repo belum terhubung ke Git remote**: workspace ini saat ini **bukan git repository** (`git status` -> not a git repository). Untuk push ke `main`, perlu `git init`/remote URL yang benar, atau konfirmasi repo target. Saya tidak akan push tanpa remote/konfirmasi.

## File yang diubah sesi ini

- `src/App.tsx` — audit/fix alur `notificationDrafts` (load startup, persist on change, delete after confirmed save), ref dedup/drafts, clear confirming draft on modal close.
- `android/gradle.properties` — set `org.gradle.java.home` ke instalasi Java 21 yang ada (relevan untuk AGP; masih membutuhkan JDK penuh untuk kompilasi Java).
- `progress.md` — dokumen status ini.

## File fitur notifikasi yang sudah ada sebelumnya (tidak diubah sesi ini, tetap dipertahankan)

- Native Android: `TransactionNotificationService.java`, `NotificationCaptureStore.java`, `NotificationDedup.java`, `NotificationCapturePlugin.java`, `MainActivity.java`, `AndroidManifest.xml`.
- TS core: `src/utils/notificationParser.ts`, `notificationDedup.ts`, `notificationCapture.ts`, `notificationPipeline.ts`, `src/utils/storage.ts` (schema snapshot/drafts/dedup), `src/types.ts`.
- UI: `src/components/NotificationSettingsModal.tsx`, `NotificationDraftsModal.tsx`, integrasi `Header.tsx`/`App.tsx`.
- Tests: `src/utils/__tests__/notificationParser.test.ts`, `notificationDedup.test.ts`, `notificationPipeline.test.ts`.

## Task yang belum selesai

1. **Sediakan Android build toolchain yang lengkap**: install JDK (bukan JRE) yang kompatibel dengan AGP 8.13/Gradle 8.14, install Android SDK + command-line tools, set `JAVA_HOME`/`ANDROID_HOME` atau `android/local.properties` (`sdk.dir=...`), lalu jalankan ulang `.\gradlew.bat assembleDebug`.
2. **Verifikasi build APK debug di lingkungan dengan SDK/JDK**: pastikan `:app:assembleDebug` menghasilkan APK dan catat path output.
3. **Validasi end-to-end di perangkat Android nyata/emulator**: beri izin Notification Access, pilih aplikasi bank/e-wallet, kirim notifikasi uji, pastikan draft muncul, konfirmasi menjadi transaksi, hapus draft, dan cek dedup tidak membuat duplikat.
4. **Audit perilaku resume/background**: pastikan drain queue berjalan saat app resume/foreground dan tidak ada kehilangan draft saat app ditutup (queue native SharedPreferences).
5. **Review UX/edge cases**: draft dengan `needsReview`, notifikasi tanpa nominal, multi-amount, permission revoked, service disconnected, dan backup/restore yang menyertakan drafts.
6. **Keputusan `android/gradle.properties`**: `org.gradle.java.home` saat ini menunjuk ke JRE 21 lokal; ganti ke path JDK yang valid di lingkungan build target, atau hapus jika CI/dev sudah menyediakan JAVA_HOME yang benar.

## Catatan

- Jangan jalankan build dari root KMP; APK aplikasi ini dibangun lewat proyek Capacitor di `android/`.
- Raw notification text tidak di-log; data draft/dedup disimpan lokal di snapshot/storage.