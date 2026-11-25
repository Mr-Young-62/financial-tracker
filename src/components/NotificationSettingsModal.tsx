import React, { useEffect, useState } from 'react';
import { BellRing, Check, ExternalLink, Search, ShieldCheck, X } from 'lucide-react';
import {
  CandidateApp,
  listCandidateApps,
  openNotificationListenerSettings,
  setCaptureEnabled,
  setMonitoredPackages,
} from '../utils/notificationCapture';
import { CaptureHealth, getCaptureHealth } from '../utils/notificationPipeline';
import { useLanguage } from '../utils/i18n';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the health changes so App state/badges stay current. */
  onHealthChange?: (health: CaptureHealth) => void;
}

/**
 * Settings surface for the local notification-capture feature:
 * access status, master toggle, monitored-app picker, and help/privacy text.
 * All operations are local-only (no network).
 */
export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  onHealthChange,
}) => {
  const { t } = useLanguage();
  const [health, setHealth] = useState<CaptureHealth | null>(null);
  const [apps, setApps] = useState<CandidateApp[]>([]);
  const [search, setSearch] = useState('');
  const [loadingApps, setLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const applyHealth = (next: CaptureHealth) => {
    setHealth(next);
    onHealthChange?.(next);
  };

  const refresh = async () => {
    const next = await getCaptureHealth();
    applyHealth(next);
    return next;
  };

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setAppsError(false);
    let cancelled = false;

    void (async () => {
      const next = await refresh();
      if (cancelled || !next.available) return;
      setLoadingApps(true);
      try {
        const list = await listCandidateApps();
        if (!cancelled) setApps(list);
      } catch {
        if (!cancelled) setAppsError(true);
      } finally {
        if (!cancelled) setLoadingApps(false);
      }
    })();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const statusLine = (): string => {
    if (!health) return '';
    if (!health.available) return t.notificationCapture.statusWeb;
    if (!health.listenerPermission && !health.enabled) return t.notificationCapture.statusPermissionMissing;
    if (!health.listenerPermission) return t.notificationCapture.statusPermissionMissing;
    if (!health.enabled) return t.notificationCapture.statusDisabled;
    if (!health.serviceConnected) return t.notificationCapture.statusServiceDown;
    return t.notificationCapture.statusReady;
  };

  const isHealthy = Boolean(health?.available && health?.listenerPermission && health?.enabled && health?.serviceConnected);

  const handleToggle = async (enabled: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await setCaptureEnabled(enabled);
      applyHealth({
        available: true,
        enabled: next.enabled,
        listenerPermission: next.listenerPermission,
        serviceConnected: next.serviceConnected,
        monitoredPackages: next.monitoredPackages ?? health?.monitoredPackages ?? [],
      });
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await openNotificationListenerSettings();
    } catch {
      // Native side already falls back; nothing actionable in the UI.
    }
    // Permission flips happen in Android Settings; refresh when we return.
    window.setTimeout(() => void refresh(), 500);
  };

  const togglePackage = async (packageName: string) => {
    if (!health) return;
    const current = new Set(health.monitoredPackages);
    if (current.has(packageName)) {
      current.delete(packageName);
    } else {
      current.add(packageName);
    }
    const nextList = Array.from(current);
    // Optimistic UI update; roll back by refreshing on failure.
    applyHealth({ ...health, monitoredPackages: nextList });
    try {
      const saved = await setMonitoredPackages(nextList);
      applyHealth({ ...health, monitoredPackages: saved });
    } catch {
      await refresh();
    }
    setApps((prev) =>
      prev.map((app) => ({ ...app, monitored: nextList.includes(app.packageName) }))
    );
  };

  const filteredApps = apps.filter((app) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      app.label.toLowerCase().includes(needle) ||
      app.packageName.toLowerCase().includes(needle)
    );
  });

  const monitoredCount = health?.monitoredPackages.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:pb-6">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.notificationCapture.settingsTitle}
        className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto bg-white dark:bg-[#1A1726] border border-[#E5DDD0] dark:border-[#2E283F] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slideUp sm:animate-fadeIn"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 pt-5 pb-3 bg-white/95 dark:bg-[#1A1726]/95 backdrop-blur-sm border-b border-[#EDE7DE] dark:border-[#2C273B]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#EFEAFE] dark:bg-[#2A2440] flex items-center justify-center shrink-0">
              <BellRing className="w-4.5 h-4.5 text-[#704BEA] dark:text-[#B8B0FF]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold tracking-tight leading-snug">
                {t.notificationCapture.settingsTitle}
              </h2>
              <p className="text-[11px] text-[#726B82] dark:text-[#A7A0B8] font-medium mt-0.5">
                {t.notificationCapture.settingsSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.notificationCapture.closeAria}
            className="p-2 -mr-1.5 rounded-xl text-[#6D657C] dark:text-[#A7A0B8] hover:bg-black/5 dark:hover:bg-white/10 btn-tactile cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Status */}
          <div
            className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${
              isHealthy
                ? 'border-emerald-300/70 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-500/10'
                : 'border-amber-300/70 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-500/10'
            }`}
          >
            <span
              className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#726B82] dark:text-[#A7A0B8]">
                {t.notificationCapture.statusLabel}
              </div>
              <div className="text-xs font-semibold mt-0.5 leading-relaxed">
                {statusLine()}
              </div>
            </div>
          </div>

          {/* Master toggle + settings shortcut */}
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#E5DDD0] dark:border-[#2E283F] bg-[#FBF8F2] dark:bg-[#15121D] cursor-pointer">
              <span className="text-xs font-semibold">
                {t.notificationCapture.enableLabel}
              </span>
              <input
                type="checkbox"
                checked={Boolean(health?.enabled)}
                onChange={(e) => void handleToggle(e.target.checked)}
                disabled={!health?.available || busy}
                className="w-9 h-5 appearance-none rounded-full bg-[#DAD3C8] dark:bg-[#3A3450] relative transition-colors checked:bg-[#704BEA] cursor-pointer disabled:opacity-50 checked:before:absolute checked:before:top-0.5 checked:before:left-0.5 checked:before:w-4 checked:before:h-4 checked:before:bg-white checked:before:rounded-full before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full"
                aria-label={t.notificationCapture.enableLabel}
              />
            </label>

            <button
              onClick={() => void handleOpenSettings()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#704BEA]/40 dark:border-[#B8B0FF]/40 bg-[#704BEA] dark:bg-[#4B32A8] text-white text-xs font-bold flex items-center justify-center gap-2 btn-tactile cursor-pointer hover:opacity-95 transition-opacity"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              {t.notificationCapture.openSettingsBtn}
            </button>
          </div>

          {/* Monitored apps */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#726B82] dark:text-[#A7A0B8] mb-1">
              {t.notificationCapture.monitoredAppsTitle}
              {monitoredCount > 0 && (
                <span className="ml-1.5 normal-case tracking-normal text-[#704BEA] dark:text-[#B8B0FF]">
                  ({monitoredCount})
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#726B82] dark:text-[#A7A0B8] leading-relaxed mb-2.5">
              {t.notificationCapture.monitoredAppsHint}
            </p>

            {health && !health.listenerPermission ? (
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {t.notificationCapture.statusPermissionMissing}
              </p>
            ) : (
              <>
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9D98AC]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.notificationCapture.searchApps}
                    className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-[#E5DDD0] dark:border-[#2E283F] bg-white dark:bg-[#15121D] text-xs font-medium outline-none focus:border-[#704BEA] transition-colors"
                  />
                </div>

                {appsError && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    {t.notificationCapture.loadAppsError}
                  </p>
                )}
                {loadingApps && !appsError && (
                  <p className="text-[11px] text-[#726B82] dark:text-[#A7A0B8]">…</p>
                )}
                {!loadingApps && !appsError && filteredApps.length === 0 && (
                  <p className="text-[11px] text-[#726B82] dark:text-[#A7A0B8]">
                    {apps.length === 0
                      ? t.notificationCapture.noAppsMonitored
                      : t.notificationCapture.noAppsFound}
                  </p>
                )}

                <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E5DDD0] dark:border-[#2E283F] divide-y divide-[#EDE7DE] dark:divide-[#2C273B]">
                  {filteredApps.map((app) => {
                    const checked = health?.monitoredPackages.includes(app.packageName) ?? false;
                    return (
                      <button
                        key={app.packageName}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => void togglePackage(app.packageName)}
                        className="w-full min-h-[44px] px-3 py-2 flex items-center gap-2.5 text-left hover:bg-[#FBF8F2] dark:hover:bg-[#252132] transition-colors btn-tactile cursor-pointer"
                      >
                        <span
                          className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            checked
                              ? 'bg-[#704BEA] border-[#704BEA] text-white'
                              : 'border-[#C9C2B6] dark:border-[#4A4460] bg-white dark:bg-[#15121D]'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold truncate">
                            {app.label}
                          </span>
                          <span className="block text-[10px] text-[#9D98AC] truncate">
                            {app.packageName}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Help */}
          <div className="rounded-2xl border border-[#E5DDD0] dark:border-[#2E283F] bg-[#FBF8F2] dark:bg-[#15121D] px-4 py-3.5">
            <h3 className="text-xs font-extrabold mb-1.5 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-[#704BEA] dark:text-[#B8B0FF]" />
              {t.notificationCapture.helpTitle}
            </h3>
            <p className="text-[11px] leading-relaxed text-[#726B82] dark:text-[#A7A0B8]">
              {t.notificationCapture.helpBody}
            </p>
          </div>

          {/* Privacy */}
          <div className="rounded-2xl border border-[#E5DDD0] dark:border-[#2E283F] bg-[#FBF8F2] dark:bg-[#15121D] px-4 py-3.5">
            <h3 className="text-xs font-extrabold mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#704BEA] dark:text-[#B8B0FF]" />
              {t.notificationCapture.privacyTitle}
            </h3>
            <p className="text-[11px] leading-relaxed text-[#726B82] dark:text-[#A7A0B8]">
              {t.notificationCapture.privacyBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
