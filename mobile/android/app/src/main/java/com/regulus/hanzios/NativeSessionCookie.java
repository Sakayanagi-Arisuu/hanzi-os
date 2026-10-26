package com.regulus.hanzios;

import java.util.List;

/** Shared by trusted, fixed-origin authentication exchanges only. */
final class NativeSessionCookie {
    private NativeSessionCookie() {}
    static String parse(List<String> values) {
        if (values == null) throw new IllegalArgumentException("Session cookie missing");
        String token = null;
        for (String value : values) {
            if (value == null) continue;
            String[] fields = value.split(";");
            String first = fields[0].trim();
            if (!first.startsWith("__Host-hanzi_session=")) continue;
            if (token != null) throw new IllegalArgumentException("Duplicate session cookie");
            token = first.substring("__Host-hanzi_session=".length());
            if (!token.matches("[A-Za-z0-9_-]{40,100}")) throw new IllegalArgumentException("Invalid session cookie");
            boolean secure = false, httpOnly = false, rootPath = false;
            for (int index = 1; index < fields.length; index++) {
                String attribute = fields[index].trim();
                if (attribute.equalsIgnoreCase("Secure")) secure = true;
                if (attribute.equalsIgnoreCase("HttpOnly")) httpOnly = true;
                if (attribute.equalsIgnoreCase("Path=/")) rootPath = true;
                if (attribute.toLowerCase(java.util.Locale.ROOT).startsWith("domain=")) throw new IllegalArgumentException("Session cookie has domain");
            }
            if (!secure || !httpOnly || !rootPath) throw new IllegalArgumentException("Unsafe session cookie");
        }
        if (token == null) throw new IllegalArgumentException("Session cookie missing");
        return token;
    }
}
