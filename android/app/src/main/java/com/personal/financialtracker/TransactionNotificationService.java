package com.personal.financialtracker;

import android.app.Notification;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

/**
 * Native capture point for transaction notifications.
 *
 * Contract (privacy by design):
 * - Reads ONLY the notification title and body text of packages the user has
 *   explicitly selected in the app settings; every other package is ignored
 *   before any content is touched.
 * - Performs no network I/O, sends nothing anywhere, and never logs raw
 *   notification content (only process-level diagnostics).
 * - Captured items go to a local SharedPreferences queue that survives WebView
 *   restarts; the React UI drains and confirms them later.
 */
public class TransactionNotificationService extends NotificationListenerService {

    private static final String TAG = "NTFCapture";

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        NotificationCaptureStore.setServiceConnected(true);
        Log.i(TAG, "Notification listener connected");
    }

    @Override
    public void onListenerDisconnected() {
        NotificationCaptureStore.setServiceConnected(false);
        Log.w(TAG, "Notification listener disconnected (system revoked the connection)");
        super.onListenerDisconnected();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getPackageName() == null) return;

        // Feature gate: master toggle must be on.
        if (!NotificationCaptureStore.isEnabled(this)) return;

        // Package allowlist: only explicitly selected apps are processed.
        if (!NotificationCaptureStore.isPackageMonitored(this, sbn.getPackageName())) return;

        // Self-notifications must never be captured (prevents feedback loops).
        if (sbn.getPackageName().equals(getPackageName())) return;

        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) return;

        try {
            CharSequence titleCs = notification.extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence textCs = notification.extras.getCharSequence(Notification.EXTRA_TEXT);

            // Fallback: some apps only populate EXTRA_TEXT_LINES.
            if (textCs == null) {
                CharSequence[] lines = notification.extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
                if (lines != null && lines.length > 0) {
                    StringBuilder joined = new StringBuilder();
                    for (CharSequence line : lines) {
                        if (line == null) continue;
                        if (joined.length() > 0) joined.append('\n');
                        joined.append(line);
                    }
                    textCs = joined.length() > 0 ? joined : null;
                }
            }

            String title = titleCs == null ? "" : titleCs.toString();
            String text = textCs == null ? "" : textCs.toString();

            // Title+text only — no screenshot, no accessibility/UI scraping.
            boolean queued = NotificationCaptureStore.enqueue(
                this,
                sbn.getPackageName(),
                title,
                text,
                sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis()
            );

            if (queued) {
                Log.i(TAG, "Queued notification from monitored package (content not logged)");
            }
        } catch (RuntimeException e) {
            // Defensive: a malformed notification must never crash the service.
            Log.w(TAG, "Failed to process notification: " + e.getClass().getSimpleName());
        }
    }
}
