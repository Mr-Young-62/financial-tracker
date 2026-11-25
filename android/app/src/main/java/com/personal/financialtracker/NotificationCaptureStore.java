package com.personal.financialtracker;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Process-local persistence for the notification capture feature.
 *
 * Holds everything the NotificationListenerService needs in a single
 * SharedPreferences file so capture keeps working while the WebView/UI is
 * closed:
 *   1. master enable flag,
 *   2. the set of monitored source packages,
 *   3. the pending (un-acknowledged) notification queue,
 *   4. a bounded dedupe window (hash + timestamp only).
 *
 * PRIVACY: raw notification text lives only inside the pending queue and is
 * removed as soon as the web layer acknowledges it. Nothing in this class is
 * ever logged.
 */
final class NotificationCaptureStore {

    private static final String PREFS_NAME = "ntf_capture_prefs";

    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_PACKAGES = "monitored_packages";
    private static final String KEY_QUEUE = "queue";
    private static final String KEY_SEEN = "seen";

    /** Hard cap so a long-dormant queue can never grow without bound. */
    private static final int QUEUE_CAP = 100;
    /** Bounded dedupe memory (hashes + timestamps only). */
    private static final int SEEN_CAP = 500;
    private static final long SEEN_WINDOW_MS = 10 * 60 * 1000L;
    /** Cap stored text size per notification (keeps prefs small). */
    private static final int MAX_TEXT_CHARS = 1000;

    /** Written by the listener service, read by the plugin for status display. */
    private static volatile boolean sServiceConnected = false;

    private static final Object LOCK = new Object();

    private NotificationCaptureStore() {}

    static void setServiceConnected(boolean connected) {
        sServiceConnected = connected;
    }

    static boolean isServiceConnected() {
        return sServiceConnected;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext()
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    // ------------------------------------------------------------------
    // Config
    // ------------------------------------------------------------------

    static boolean isEnabled(Context context) {
        synchronized (LOCK) {
            return prefs(context).getBoolean(KEY_ENABLED, false);
        }
    }

    static void setEnabled(Context context, boolean enabled) {
        synchronized (LOCK) {
            prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply();
        }
    }

    static Set<String> getMonitoredPackages(Context context) {
        synchronized (LOCK) {
            Set<String> raw = prefs(context).getStringSet(KEY_PACKAGES, null);
            return raw == null ? new HashSet<String>() : new HashSet<String>(raw);
        }
    }

    static void setMonitoredPackages(Context context, Set<String> packages) {
        synchronized (LOCK) {
            prefs(context).edit()
                .putStringSet(KEY_PACKAGES, new HashSet<String>(packages))
                .apply();
        }
    }

    static boolean isPackageMonitored(Context context, String packageName) {
        synchronized (LOCK) {
            Set<String> raw = prefs(context).getStringSet(KEY_PACKAGES, null);
            return raw != null && raw.contains(packageName);
        }
    }

    // ------------------------------------------------------------------
    // Pending notification queue
    // ------------------------------------------------------------------

    /**
     * Enqueues a captured notification after native-side deduplication.
     *
     * @return true when the item was queued; false when it was a duplicate or
     *         the capture carried no text at all.
     */
    static boolean enqueue(Context context, String packageName, String title, String text, long receivedAt) {
        String safeTitle = truncate(title == null ? "" : title.trim());
        String safeText = truncate(text == null ? "" : text.trim());
        if (safeTitle.isEmpty() && safeText.isEmpty()) return false;

        String dedupeKey = NotificationDedup.computeKey(packageName, safeTitle, safeText, receivedAt);

        synchronized (LOCK) {
            SharedPreferences sp = prefs(context);
            long now = System.currentTimeMillis();

            // Native dedupe: same content hash inside the window is dropped
            // before it ever reaches the queue.
            JSONArray seen = readArray(sp, KEY_SEEN);
            pruneArray(seen, "seenAt", now - SEEN_WINDOW_MS);
            if (arrayContainsKey(seen, dedupeKey, now)) {
                return false;
            }
            try {
                JSONObject entry = new JSONObject();
                entry.put("key", dedupeKey);
                entry.put("seenAt", now);
                seen.put(entry);
            } catch (JSONException e) {
                return false;
            }
            trimFront(seen, SEEN_CAP);

            // Newest-first queue with a hard cap.
            JSONArray next = new JSONArray();
            try {
                JSONObject item = new JSONObject();
                item.put("id", dedupeKey + "-" + receivedAt);
                item.put("sourcePackage", packageName);
                item.put("title", safeTitle);
                item.put("text", safeText);
                item.put("receivedAt", receivedAt);
                item.put("dedupeKey", dedupeKey);
                next.put(item);
            } catch (JSONException e) {
                return false;
            }
            JSONArray existing = readArray(sp, KEY_QUEUE);
            for (int i = 0; i < existing.length() && next.length() < QUEUE_CAP; i++) {
                try {
                    next.put(existing.get(i));
                } catch (JSONException e) {
                    // Skip malformed entries.
                }
            }

            sp.edit()
                .putString(KEY_SEEN, seen.toString())
                .putString(KEY_QUEUE, next.toString())
                .apply();
            return true;
        }
    }

    /** Returns a deep copy of the pending queue (newest first). */
    static List<JSONObject> peekQueue(Context context) {
        List<JSONObject> items = new ArrayList<JSONObject>();
        synchronized (LOCK) {
            JSONArray queue = readArray(prefs(context), KEY_QUEUE);
            for (int i = 0; i < queue.length(); i++) {
                try {
                    items.add(new JSONObject(queue.get(i).toString()));
                } catch (JSONException e) {
                    // Skip malformed entries.
                }
            }
        }
        return items;
    }

    /**
     * Removes acknowledged items from the queue. Items whose ids are not in
     * {@code ids} are retained — a failed web-layer save therefore never loses
     * a notification.
     *
     * @return number of items removed.
     */
    static int ack(Context context, Set<String> ids) {
        if (ids.isEmpty()) return 0;
        synchronized (LOCK) {
            SharedPreferences sp = prefs(context);
            JSONArray queue = readArray(sp, KEY_QUEUE);
            JSONArray next = new JSONArray();
            int removed = 0;
            for (int i = 0; i < queue.length(); i++) {
                try {
                    JSONObject item = queue.getJSONObject(i);
                    if (ids.contains(item.optString("id", ""))) {
                        removed += 1;
                    } else {
                        next.put(item);
                    }
                } catch (JSONException e) {
                    // Malformed entry: drop it (it can never be processed).
                }
            }
            sp.edit().putString(KEY_QUEUE, next.toString()).apply();
            return removed;
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private static JSONArray readArray(SharedPreferences sp, String key) {
        String raw = sp.getString(key, null);
        if (raw == null) return new JSONArray();
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            // Corrupted payload: start fresh rather than crash the service.
            return new JSONArray();
        }
    }

    private static boolean arrayContainsKey(JSONArray seen, String key, long now) {
        for (int i = 0; i < seen.length(); i++) {
            try {
                JSONObject entry = seen.getJSONObject(i);
                if (key.equals(entry.optString("key", ""))
                    && now - entry.optLong("seenAt", 0L) <= SEEN_WINDOW_MS) {
                    return true;
                }
            } catch (JSONException e) {
                // Ignore malformed entries.
            }
        }
        return false;
    }

    /** Removes entries whose numeric field {@code field} is older than cutoff. */
    private static void pruneArray(JSONArray array, String field, long cutoff) {
        JSONArray kept = new JSONArray();
        for (int i = 0; i < array.length(); i++) {
            try {
                JSONObject entry = array.getJSONObject(i);
                if (entry.optLong(field, 0L) >= cutoff) {
                    kept.put(entry);
                }
            } catch (JSONException e) {
                // Drop malformed entries.
            }
        }
        // Copy kept items back over the original array.
        while (array.length() > 0) {
            array.remove(array.length() - 1);
        }
        for (int i = 0; i < kept.length(); i++) {
            try {
                array.put(kept.get(i));
            } catch (JSONException e) {
                // Ignore.
            }
        }
    }

    /** Keeps only the first {@code cap} entries (array is newest-first). */
    private static void trimFront(JSONArray array, int cap) {
        while (array.length() > cap) {
            array.remove(array.length() - 1);
        }
    }

    private static String truncate(String value) {
        return value.length() <= MAX_TEXT_CHARS ? value : value.substring(0, MAX_TEXT_CHARS);
    }
}
