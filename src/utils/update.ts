import { Capacitor } from '@capacitor/core';
import { APP_VERSION, UPDATE_CHECK_URL } from '../config';

export interface AvailableUpdate {
  version: string;
  notes: string;
  releaseUrl: string;
  downloadUrl: string;
}

interface GitHubRelease {
  tag_name?: unknown;
  body?: unknown;
  html_url?: unknown;
  assets?: Array<{ name?: unknown; browser_download_url?: unknown }>;
}

const versionParts = (value: string) => value.replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0);

function isNewer(remote: string, local: string): boolean {
  const a = versionParts(remote);
  const b = versionParts(local);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  try {
    const response = await fetch(UPDATE_CHECK_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return null;
    const release = (await response.json()) as GitHubRelease;
    const tag = typeof release.tag_name === 'string' ? release.tag_name : '';
    const releaseUrl = typeof release.html_url === 'string' ? release.html_url : '';
    if (!tag || !releaseUrl || !isNewer(tag, APP_VERSION)) return null;
    const apk = release.assets?.find((asset) => typeof asset.name === 'string' && asset.name.toLowerCase().endsWith('.apk'));
    const downloadUrl = typeof apk?.browser_download_url === 'string' ? apk.browser_download_url : releaseUrl;
    return {
      version: tag.replace(/^v/i, ''),
      notes: typeof release.body === 'string' ? release.body.trim() : '',
      releaseUrl,
      downloadUrl: Capacitor.isNativePlatform() ? downloadUrl : releaseUrl,
    };
  } catch {
    return null;
  }
}
