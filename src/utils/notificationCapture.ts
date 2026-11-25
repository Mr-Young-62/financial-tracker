/**
 * TypeScript bridge for the local NotificationCapture native plugin.
 *
 * All methods are local-only (no network). On web/browsers where the native
 * plugin does not exist, every call degrades gracefully to safe defaults so
 * the app keeps working without the capture feature.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface CaptureStatus {
  enabled: boolean;
  listenerPermission: boolean;
  serviceConnected: boolean;
  monitoredPackages: string[];
}

export interface CandidateApp {
  packageName: string;
  label: string;
  monitored: boolean;
}

export interface PendingNotificationItem {
  id: string;
  sourcePackage: string;
  title: string;
  text: string;
  receivedAt: number;
  dedupeKey: string;
}

interface NotificationCapturePluginLike {
  getStatus(): Promise<CaptureStatus>;
  openListenerSettings(): Promise<void>;
  setEnabled(options: { enabled: boolean }): Promise<CaptureStatus>;
  getMonitoredPackages(): Promise<{ monitoredPackages: string[] }>;
  setMonitoredPackages(options: { packages: string[] }): Promise<{ monitoredPackages: string[] }>;
  listCandidateApps(): Promise<{ apps: CandidateApp[] }>;
  getPendingNotifications(): Promise<{ items: PendingNotificationItem[] }>;
  acknowledgeNotifications(options: { ids: string[] }): Promise<{ removed: number }>;
  downloadAndInstallApk(options: { url: string }): Promise<void>;
}

export async function downloadAndInstallApk(url: string): Promise<void> {
  if (!isCaptureAvailable()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await plugin.downloadAndInstallApk({ url });
}

const plugin = registerPlugin<NotificationCapturePluginLike>('NotificationCapture');

/** True when running inside the Android app where the plugin is registered. */
export function isCaptureAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function getCaptureStatus(): Promise<CaptureStatus> {
  if (!isCaptureAvailable()) {
    return { enabled: false, listenerPermission: false, serviceConnected: false, monitoredPackages: [] };
  }
  return plugin.getStatus();
}

export async function openNotificationListenerSettings(): Promise<void> {
  if (!isCaptureAvailable()) return;
  await plugin.openListenerSettings();
}

export async function setCaptureEnabled(enabled: boolean): Promise<CaptureStatus> {
  if (!isCaptureAvailable()) {
    return { enabled: false, listenerPermission: false, serviceConnected: false, monitoredPackages: [] };
  }
  return plugin.setEnabled({ enabled });
}

export async function getMonitoredPackages(): Promise<string[]> {
  if (!isCaptureAvailable()) return [];
  const result = await plugin.getMonitoredPackages();
  return result.monitoredPackages;
}

export async function setMonitoredPackages(packages: string[]): Promise<string[]> {
  if (!isCaptureAvailable()) return [];
  const result = await plugin.setMonitoredPackages({ packages });
  return result.monitoredPackages;
}

export async function listCandidateApps(): Promise<CandidateApp[]> {
  if (!isCaptureAvailable()) return [];
  const result = await plugin.listCandidateApps();
  return result.apps;
}

export async function getPendingNotifications(): Promise<PendingNotificationItem[]> {
  if (!isCaptureAvailable()) return [];
  const result = await plugin.getPendingNotifications();
  return result.items;
}

export async function acknowledgeNotifications(ids: string[]): Promise<number> {
  if (!isCaptureAvailable()) return 0;
  if (ids.length === 0) return 0;
  const result = await plugin.acknowledgeNotifications({ ids });
  return result.removed;
}
