package com.personal.financialtracker;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;
import java.util.List;
import java.util.Set;

/**
 * JS bridge for the local notification-capture feature.
 *
 * PRIVACY: every method is local-only. Raw notification content is returned to
 * the WebView (which runs locally) so it can be parsed and confirmed by the
 * user; nothing here performs network I/O or logs content.
 */
@CapacitorPlugin(name = "NotificationCapture")
public class NotificationCapturePlugin extends Plugin {

    /**
     * Method surface (kept small and explicit):
     *  - getStatus                 : listener permission, service liveness, config
     *  - openListenerSettings      : jump to Android "Notification access" page
     *  - setEnabled                : master toggle
     *  - getMonitoredPackages      : current allowlist
     *  - setMonitoredPackages      : replace allowlist
     *  - listCandidateApps         : launcher apps the user can pick from
     *  - getPendingNotifications   : drain queue (read)
     *  - acknowledgeNotifications  : remove handled ids from queue (write)
     */

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", NotificationCaptureStore.isEnabled(getContext()));
        result.put("listenerPermission", isListenerPermissionGranted());
        result.put("serviceConnected", NotificationCaptureStore.isServiceConnected());
        result.put("monitoredPackages", toArray(NotificationCaptureStore.getMonitoredPackages(getContext())));
        call.resolve(result);
    }

    @PluginMethod
    public void openListenerSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("activity_unavailable", "No active Activity to launch settings");
            return;
        }
        try {
            // Official deep link to the system "Notification access" screen.
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            call.resolve(new JSObject());
        } catch (Exception e) {
            // Some OEMs strip the intent; fall back to app notification settings.
            try {
                Intent fallback = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_URI, Uri.parse("package:" + getContext().getPackageName()));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(fallback);
                call.resolve(new JSObject());
            } catch (Exception e2) {
                call.reject("settings_unavailable", "Could not open notification settings");
            }
        }
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("missing_argument", "enabled is required");
            return;
        }
        NotificationCaptureStore.setEnabled(getContext(), enabled);
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        result.put("listenerPermission", isListenerPermissionGranted());
        result.put("serviceConnected", NotificationCaptureStore.isServiceConnected());
        call.resolve(result);
    }

    @PluginMethod
    public void getMonitoredPackages(PluginCall call) {
        JSObject result = new JSObject();
        result.put("monitoredPackages", toArray(NotificationCaptureStore.getMonitoredPackages(getContext())));
        call.resolve(result);
    }

    @PluginMethod
    public void setMonitoredPackages(PluginCall call) {
        JSArray packages = call.getArray("packages");
        if (packages == null) {
            call.reject("missing_argument", "packages array is required");
            return;
        }
        Set<String> next = new java.util.HashSet<>();
        for (int i = 0; i < packages.length(); i++) {
            try {
                String pkg = packages.getString(i);
                if (pkg != null && !pkg.isEmpty() && !pkg.equals(getContext().getPackageName())) {
                    next.add(pkg);
                }
            } catch (JSONException e) {
                // Skip malformed entries rather than failing the whole call.
            }
        }
        NotificationCaptureStore.setMonitoredPackages(getContext(), next);
        JSObject result = new JSObject();
        result.put("monitoredPackages", toArray(next));
        call.resolve(result);
    }

    @PluginMethod
    public void listCandidateApps(PluginCall call) {
        Context context = getContext();
        PackageManager pm = context.getPackageManager();
        Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
        launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        JSArray apps = new JSArray();
        try {
            List<android.content.pm.ResolveInfo> resolved =
                pm.queryIntentActivities(launcherIntent, 0);
            java.util.Locale locale = context.getResources().getConfiguration().locale;
            for (android.content.pm.ResolveInfo info : resolved) {
                String pkg = info.activityInfo.packageName;
                if (pkg.equals(context.getPackageName())) continue;
                CharSequence labelCs = info.loadLabel(pm);
                String label = labelCs == null ? pkg : labelCs.toString();
                JSObject app = new JSObject();
                app.put("packageName", pkg);
                app.put("label", label);
                app.put("monitored",
                    NotificationCaptureStore.getMonitoredPackages(context).contains(pkg));
                apps.put(app);
            }
            // Stable, locale-aware ordering for the UI.
            java.util.List<org.json.JSONObject> sorted = new java.util.ArrayList<>();
            for (int i = 0; i < apps.length(); i++) {
                sorted.add(apps.getJSONObject(i));
            }
            sorted.sort((a, b) -> {
                String la = a.optString("label", "");
                String lb = b.optString("label", "");
                return la.toLowerCase(locale).compareTo(lb.toLowerCase(locale));
            });
            JSArray sortedArray = new JSArray();
            for (org.json.JSONObject obj : sorted) sortedArray.put(obj);
            apps = sortedArray;
        } catch (Exception e) {
            call.reject("list_failed", "Could not list installed apps");
            return;
        }

        JSObject result = new JSObject();
        result.put("apps", apps);
        call.resolve(result);
    }

    @PluginMethod
    public void getPendingNotifications(PluginCall call) {
        List<JSONObject> queue = NotificationCaptureStore.peekQueue(getContext());
        JSArray items = new JSArray();
        for (JSONObject item : queue) {
            JSObject entry = new JSObject();
            entry.put("id", item.optString("id", ""));
            entry.put("sourcePackage", item.optString("sourcePackage", ""));
            entry.put("title", item.optString("title", ""));
            entry.put("text", item.optString("text", ""));
            entry.put("receivedAt", item.optLong("receivedAt", 0L));
            entry.put("dedupeKey", item.optString("dedupeKey", ""));
            items.put(entry);
        }
        JSObject result = new JSObject();
        result.put("items", items);
        call.resolve(result);
    }

    @PluginMethod
    public void acknowledgeNotifications(PluginCall call) {
        JSArray ids = call.getArray("ids");
        if (ids == null) {
            call.reject("missing_argument", "ids array is required");
            return;
        }
        Set<String> idSet = new java.util.HashSet<>();
        for (int i = 0; i < ids.length(); i++) {
            try {
                String id = ids.getString(i);
                if (id != null && !id.isEmpty()) idSet.add(id);
            } catch (JSONException e) {
                // Skip malformed ids.
            }
        }
        int removed = NotificationCaptureStore.ack(getContext(), idSet);
        JSObject result = new JSObject();
        result.put("removed", removed);
        call.resolve(result);
    }

    // ------------------------------------------------------------------

    private boolean isListenerPermissionGranted() {
        try {
            // Read the Secure setting directly: stable across Android versions
            // and avoids depending on androidx.core internals.
            String enabled = Settings.Secure.getString(
                getContext().getContentResolver(), "enabled_notification_listeners");
            if (enabled == null || enabled.isEmpty()) return false;
            String pkg = getContext().getPackageName();
            String cls = TransactionNotificationService.class.getName();
            for (String component : enabled.split(":")) {
                if (component.isEmpty()) continue;
                android.content.ComponentName cn =
                    android.content.ComponentName.unflattenFromString(component);
                if (cn != null && pkg.equals(cn.getPackageName()) && cls.equals(cn.getClassName())) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private JSArray toArray(Set<String> values) {
        JSArray array = new JSArray();
        Iterator<String> it = values.iterator();
        while (it.hasNext()) array.put(it.next());
        return array;
    }
}
