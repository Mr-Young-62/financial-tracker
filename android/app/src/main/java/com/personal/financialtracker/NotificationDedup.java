package com.personal.financialtracker;

/**
 * Java mirror of {@code src/utils/notificationDedup.ts}.
 *
 * The web layer and the native listener must agree on identity, so both use
 * the same canonical string and the same FNV-1a 32-bit hash:
 *
 *   fnv1a32(package|normalizedTitle|normalizedText|minuteBucket)
 *
 * Keep this file in sync with notificationDedup.ts (unit tests cover the TS
 * side; this class intentionally stays trivial).
 */
final class NotificationDedup {

    private NotificationDedup() {}

    static String computeKey(String sourcePackage, String title, String text, long receivedAt) {
        long minuteBucket = Math.floorDiv(receivedAt, 60_000L);
        String canonical = sourcePackage + '|'
            + normalize(title) + '|'
            + normalize(text) + '|'
            + minuteBucket;
        return fnv1a32(canonical);
    }

    private static String normalize(String value) {
        if (value == null) return "";
        return value.trim().replaceAll("\\s+", " ");
    }

    /** FNV-1a 32-bit over UTF-16 code units, rendered as 8 lowercase hex chars. */
    static String fnv1a32(String input) {
        long hash = 0x811c9dc5L;
        for (int i = 0; i < input.length(); i++) {
            hash ^= (input.charAt(i) & 0xffffL);
            hash = (hash * 0x01000193L) & 0xffffffffL;
        }
        return String.format(java.util.Locale.ROOT, "%08x", hash);
    }
}
