package com.regulus.hanzios;

import org.junit.Test;
import static org.junit.Assert.*;

public class NativeNetworkPolicyTest {
    @Test public void avatarMutationsKeepRevisionAndRetryIdentityOnlyOnTheirOwnRoute() {
        for (String method : new String[] {"PUT", "DELETE"}) {
            for (String header : new String[] {"If-Match", "x-avatar-operation", "X-Avatar-Operation"}) {
                assertTrue(HanziDevicePlugin.forwardsRequestHeader("/api/account/avatar", method, header));
                assertFalse(HanziDevicePlugin.forwardsRequestHeader("/api/learning/attempts", method, header));
                assertFalse(HanziDevicePlugin.forwardsRequestHeader("/api/account/avatar?other=1", method, header));
            }
        }
        assertFalse(HanziDevicePlugin.forwardsRequestHeader("/api/account/avatar", "GET", "If-Match"));
        assertFalse(HanziDevicePlugin.forwardsRequestHeader("/api/account/avatar", "POST", "x-avatar-operation"));
        for (String header : new String[] {"Cookie", "Authorization", "Origin", "Host"}) {
            assertFalse(HanziDevicePlugin.forwardsRequestHeader("/api/account/avatar", "PUT", header));
        }
        assertTrue(HanziDevicePlugin.forwardsRequestHeader("/api/learning/attempts", "POST", "x-learning-owner"));
        assertTrue(HanziDevicePlugin.forwardsRequestHeader("/api/learning/attempts", "POST", "idempotency-key"));
    }
    @Test public void credentialTransportRejectsForeignAndTraversalPaths() throws Exception {
        assertEquals("/api/session", HanziDevicePlugin.apiPath("/api/session"));
        assertEquals("/api/learning/attempts?session=abc", HanziDevicePlugin.apiPath("/api/learning/attempts?session=abc"));
        for (String path : new String[] {"https://evil.example/api/session", "//evil.example/api/session", "/admin", "/api/../admin", "/api/%2e%2e/admin", "/api/hello\\world", "/api/session#fragment"}) {
            try { HanziDevicePlugin.apiPath(path); fail("Allowed unsafe path: " + path); }
            catch (Exception expected) { /* Credential stays within the API origin. */ }
        }
    }
    @Test public void cachedMediaCannotOutliveItsPermissionOrClockBoundary() {
        long savedAt = 1_000_000;
        assertTrue(HanziDevicePlugin.offlineMediaAgeValid(savedAt, 60_000, savedAt + 59_999));
        assertFalse(HanziDevicePlugin.offlineMediaAgeValid(savedAt, 60_000, savedAt + 60_000));
        assertFalse(HanziDevicePlugin.offlineMediaAgeValid(savedAt, 60_000, savedAt - 1));
        assertFalse(HanziDevicePlugin.offlineMediaAgeValid(savedAt, 0, savedAt));
        assertFalse(HanziDevicePlugin.offlineMediaAgeValid(savedAt, Long.MAX_VALUE, savedAt + 30L * 86400_000));
    }
    @Test public void studyImagesNeverOpenArbitraryAuthenticatedUrls() throws Exception {
        assertTrue(HanziDevicePlugin.publicStudyResource("/lessons/original-picture.webp"));
        assertTrue(HanziDevicePlugin.publicStudyResource("/reader/series/cover.png"));
        for (String path : new String[] {"/api/account/export", "/reader/../admin.webp", "/reader/%2e%2e/admin.webp", "/reader/picture.webp?redirect=evil", "//evil.example/reader/x.webp", "/reader/book.json"}) {
            assertFalse(HanziDevicePlugin.publicStudyResource(path));
        }
    }
}
