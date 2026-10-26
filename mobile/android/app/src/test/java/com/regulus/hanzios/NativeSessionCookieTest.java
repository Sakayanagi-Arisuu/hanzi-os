package com.regulus.hanzios;
import java.util.Arrays;
import org.junit.Test;
import static org.junit.Assert.*;

public class NativeSessionCookieTest {
    private final String token = "a".repeat(43);
    @Test public void acceptsOnlyHostBoundHttpOnlySession() {
        assertEquals(token, NativeSessionCookie.parse(Arrays.asList("__Host-hanzi_session=" + token + "; Path=/; Secure; HttpOnly; SameSite=Lax")));
        for (String suffix : new String[] {"; Path=/; Secure", "; Path=/; HttpOnly", "; Path=/auth; Secure; HttpOnly", "; Path=/; Secure; HttpOnly; Domain=example.com"}) {
            try { NativeSessionCookie.parse(Arrays.asList("__Host-hanzi_session=" + token + suffix)); fail("Accepted unsafe cookie"); }
            catch (IllegalArgumentException expected) { }
        }
    }
    @Test public void rejectsMissingAndAmbiguousCookies() {
        try { NativeSessionCookie.parse(null); fail(); } catch (IllegalArgumentException expected) { }
        String cookie = "__Host-hanzi_session=" + token + "; Path=/; Secure; HttpOnly";
        try { NativeSessionCookie.parse(Arrays.asList(cookie, cookie)); fail(); } catch (IllegalArgumentException expected) { }
    }
}
