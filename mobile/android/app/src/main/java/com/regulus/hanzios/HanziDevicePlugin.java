package com.regulus.hanzios;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import androidx.activity.result.ActivityResult;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

@CapacitorPlugin(name = "HanziDevice")
public class HanziDevicePlugin extends Plugin {
    static final String ORIGIN = BuildConfig.HANZI_API_ORIGIN;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private DeviceVault vault;
    @Override public void load() { vault = new DeviceVault(getContext()); }
    private static String base64(byte[] bytes) { return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING); }
    static String apiPath(String path) throws Exception {
        if (path == null || !path.startsWith("/api/") || path.contains("\\") || path.contains("#") || path.length() > 4000) throw new IllegalArgumentException("Invalid API path");
        URI uri = new URI(path);
        if (uri.isAbsolute() || uri.getRawAuthority() != null || !uri.normalize().equals(uri)
            || uri.getPath().contains("..") || !uri.getPath().startsWith("/api/")) throw new IllegalArgumentException("Invalid API path");
        return path;
    }
    static boolean publicStudyResource(String path) throws Exception {
        if (path == null || !path.matches("/(lessons|reader)/[A-Za-z0-9_./%-]+\\.(png|jpg|jpeg|webp|avif)")) return false;
        URI uri = new URI(path);
        return !uri.isAbsolute() && uri.getRawAuthority() == null && uri.normalize().equals(uri)
            && !uri.getPath().contains("..") && !uri.getPath().contains("\\");
    }
    static final class Reply {
        int status; byte[] bytes; Map<String, String> headers = new HashMap<>();
    }
    static byte[] readBytes(InputStream input) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[16384]; int count;
        while ((count = input.read(buffer)) != -1) {
            if (output.size() + count > 20 * 1024 * 1024) throw new IllegalStateException("Response too large");
            output.write(buffer, 0, count);
        }
        return output.toByteArray();
    }
    static boolean forwardsRequestHeader(String path, String method, String name) {
        String lower = name.toLowerCase(java.util.Locale.ROOT);
        if (lower.equals("content-type") || lower.equals("accept") || lower.equals("range")
            || lower.startsWith("x-learning-") || lower.equals("idempotency-key")) return true;
        return path.equals("/api/account/avatar") && (method.equals("PUT") || method.equals("DELETE"))
            && (lower.equals("if-match") || lower.equals("x-avatar-operation"));
    }
    private Reply send(String path, String method, JSONObject headers, byte[] body) throws Exception {
        return send(path, method, headers, body, false);
    }
    private Reply send(String path, String method, JSONObject headers, byte[] body, boolean captureAuthSession) throws Exception {
        if (!(method.equals("GET") && publicStudyResource(path))) apiPath(path);
        if (!method.matches("GET|POST|PUT|PATCH|DELETE|HEAD")) throw new IllegalArgumentException("Invalid method");
        HttpURLConnection connection = (HttpURLConnection) new URL(ORIGIN + path).openConnection();
        connection.setConnectTimeout(12000); connection.setReadTimeout(60000);
        connection.setInstanceFollowRedirects(false); connection.setRequestMethod(method);
        connection.setRequestProperty("Origin", ORIGIN);
        connection.setRequestProperty("Accept", "application/json");
        String token = vault.read("session");
        if (token != null) connection.setRequestProperty("Cookie", "__Host-hanzi_session=" + token);
        if (headers != null) for (java.util.Iterator<String> names = headers.keys(); names.hasNext();) {
            String name = names.next();
            if (forwardsRequestHeader(path, method, name)) {
                connection.setRequestProperty(name, headers.getString(name));
            }
        }
        try {
            if (body != null && !method.equals("GET") && !method.equals("HEAD")) {
                connection.setDoOutput(true);
                try (java.io.OutputStream output = connection.getOutputStream()) { output.write(body); }
            }
            Reply reply = new Reply(); reply.status = connection.getResponseCode();
            for (Map.Entry<String, java.util.List<String>> entry : connection.getHeaderFields().entrySet()) {
                if (entry.getKey() == null || entry.getKey().equalsIgnoreCase("set-cookie")) continue;
                reply.headers.put(entry.getKey().toLowerCase(java.util.Locale.ROOT), android.text.TextUtils.join(", ", entry.getValue()));
            }
            InputStream input = reply.status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            if (input != null) try (InputStream stream = input) {
                byte[] buffer = new byte[16384]; int count;
                while ((count = stream.read(buffer)) != -1) {
                    if (bytes.size() + count > 20 * 1024 * 1024) throw new IllegalStateException("Response too large");
                    bytes.write(buffer, 0, count);
                }
            }
            reply.bytes = bytes.toByteArray();
            if (captureAuthSession && reply.status >= 200 && reply.status < 300) {
                if (!method.equals("POST") || !(path.equals("/api/auth/hanzi/login") || path.equals("/api/auth/hanzi/register"))) throw new IllegalArgumentException("Invalid auth capture");
                JSONObject payload = new JSONObject(new String(reply.bytes, StandardCharsets.UTF_8));
                if (!payload.optBoolean("authenticated")) throw new IllegalArgumentException("Authentication not confirmed");
                java.util.List<String> cookies = null;
                for (Map.Entry<String, java.util.List<String>> entry : connection.getHeaderFields().entrySet()) {
                    if (entry.getKey() != null && entry.getKey().equalsIgnoreCase("set-cookie")) cookies = entry.getValue();
                }
                vault.write("session", NativeSessionCookie.parse(cookies));
            }
            if (path.equals("/api/auth/signout") && reply.status >= 200 && reply.status < 300) vault.write("session", null);
            if (path.equals("/api/account") && method.equals("DELETE") && reply.status >= 200 && reply.status < 300) vault.write("session", null);
            return reply;
        } finally { connection.disconnect(); }
    }
    @PluginMethod public void hanziSignIn(PluginCall call) {
        executor.execute(() -> {
            try {
                String operation = call.getString("operation", "login");
                if (!(operation.equals("login") || operation.equals("register"))) throw new IllegalArgumentException("Invalid auth operation");
                JSONObject body = call.getObject("credentials");
                if (body == null || body.toString().getBytes(StandardCharsets.UTF_8).length > 4096) throw new IllegalArgumentException("Invalid credentials");
                Reply reply = send("/api/auth/hanzi/" + operation, "POST", new JSONObject().put("content-type", "application/json"), body.toString().getBytes(StandardCharsets.UTF_8), true);
                // Only the ordinary public JSON reply crosses the bridge. All
                // cookie headers stay inside Java and encrypted DeviceVault.
                JSObject result = new JSObject(); result.put("status", reply.status);
                result.put("body", new String(reply.bytes, StandardCharsets.UTF_8)); call.resolve(result);
            } catch (Exception error) { call.reject("Chưa đăng nhập được. Kiểm tra mạng rồi thử lại."); }
        });
    }
    @PluginMethod public void request(PluginCall call) {
        executor.execute(() -> {
            try {
                String path = call.getString("path");
                apiPath(path);
                if (path == null || new URI(path).getPath().startsWith("/api/auth/mobile/")
                    || new URI(path).getPath().equals("/api/auth/hanzi/login") || new URI(path).getPath().equals("/api/auth/hanzi/register")) throw new IllegalArgumentException("Private authentication exchange");
                String encoded = call.getString("body");
                byte[] body = encoded == null ? null : Base64.decode(encoded, Base64.NO_WRAP);
                if (body != null && body.length > 20 * 1024 * 1024) throw new IllegalArgumentException("Body too large");
                Reply reply = send(path, call.getString("method", "GET"), call.getObject("headers"), body);
                JSObject result = new JSObject(); result.put("status", reply.status);
                result.put("headers", new JSObject(new JSONObject(reply.headers).toString()));
                result.put("body", Base64.encodeToString(reply.bytes, Base64.NO_WRAP)); call.resolve(result);
            } catch (Exception error) { call.reject("Không kết nối được máy chủ. Tiến độ đã lưu vẫn ở trên thiết bị."); }
        });
    }
    @PluginMethod public void signIn(PluginCall call) {
        executor.execute(() -> {
            try {
                String provider = call.getString("provider", "google");
                if (!(provider.equals("google") || provider.equals("github"))) throw new IllegalArgumentException("Invalid provider");
                byte[] random = new byte[48]; new SecureRandom().nextBytes(random);
                String verifier = base64(random);
                String challenge = base64(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
                JSONObject body = new JSONObject().put("codeChallenge", challenge).put("provider", provider);
                Reply reply = send("/api/auth/mobile/start", "POST", new JSONObject().put("content-type", "application/json"), body.toString().getBytes(StandardCharsets.UTF_8));
                if (reply.status != 200) throw new IllegalStateException("Unable to start sign-in");
                URI destination = new URI(new JSONObject(new String(reply.bytes, StandardCharsets.UTF_8)).getString("url"));
                if (!(ORIGIN + "/auth/" + provider + "/start").equals(destination.getScheme() + "://" + destination.getAuthority() + destination.getPath())) throw new IllegalStateException("Invalid OAuth destination");
                vault.write("pending-login", new JSONObject().put("verifier", verifier).put("provider", provider).put("createdAt", System.currentTimeMillis()).toString());
                getActivity().runOnUiThread(() -> {
                    try { getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(destination.toString()))); call.resolve(); }
                    catch (Exception error) { call.reject("Không mở được trình duyệt đăng nhập."); }
                });
            } catch (Exception error) { call.reject("Không bắt đầu được đăng nhập. Kiểm tra mạng rồi thử lại."); }
        });
    }
    @PluginMethod public void finishSignIn(PluginCall call) {
        executor.execute(() -> {
            synchronized (this) {
                try {
                    Uri uri = Uri.parse(call.getString("url", ""));
                    if (!"com.regulus.hanzios".equals(uri.getScheme()) || !"auth".equals(uri.getHost())
                        || (uri.getPath() != null && !uri.getPath().isEmpty()) || uri.getFragment() != null
                        || uri.getQueryParameters("code").size() != 1) throw new IllegalArgumentException("Invalid mobile callback");
                    String pending = vault.read("pending-login");
                    if (pending == null) throw new IllegalStateException("Login was not started on this device");
                    JSONObject saved = new JSONObject(pending);
                    long elapsed = System.currentTimeMillis() - saved.getLong("createdAt");
                    if (elapsed < 0 || elapsed > 10 * 60_000) throw new IllegalStateException("Login expired");
                    String provider = saved.optString("provider", "google");
                    if (!(provider.equals("google") || provider.equals("github"))) throw new IllegalArgumentException("Invalid provider");
                    JSONObject body = new JSONObject().put("code", uri.getQueryParameter("code")).put("verifier", saved.getString("verifier")).put("provider", provider);
                    Reply reply = send("/api/auth/mobile/exchange", "POST", new JSONObject().put("content-type", "application/json"), body.toString().getBytes(StandardCharsets.UTF_8));
                    if (reply.status != 200) throw new IllegalStateException("Mobile exchange failed");
                    String token = new JSONObject(new String(reply.bytes, StandardCharsets.UTF_8)).getString("token");
                    if (!token.matches("[A-Za-z0-9_-]{40,100}")) throw new IllegalStateException("Invalid session");
                    vault.write("session", token); vault.write("pending-login", null);
                    call.resolve();
                } catch (Exception error) { call.reject("Đăng nhập đã hết hạn. Hãy thử lại từ ứng dụng."); }
            }
        });
    }
    @PluginMethod public void openExternal(PluginCall call) {
        try {
            URI path = new URI(call.getString("path", ""));
            if (!path.toString().startsWith("/") || path.getRawAuthority() != null || path.isAbsolute()
                || !path.normalize().equals(path)) throw new IllegalArgumentException("Invalid path");
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(ORIGIN + path))); call.resolve();
        } catch (Exception error) { call.reject("Không mở được trang này trong trình duyệt."); }
    }
    @PluginMethod public void saveFile(PluginCall call) {
        String name = call.getString("name", "hanzi-os-recovery.json");
        if (!name.matches("[A-Za-z0-9._-]{1,100}\\.json") || call.getString("body", "").length() > 28 * 1024 * 1024) { call.reject("Invalid backup file"); return; }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE); intent.setType("application/json"); intent.putExtra(Intent.EXTRA_TITLE, name);
        startActivityForResult(call, intent, "backupSaved");
    }
    @ActivityCallback private void backupSaved(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.reject("Bạn chưa lưu bản sao."); return; }
        executor.execute(() -> {
            try (java.io.OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
                if (output == null) throw new IllegalStateException("Backup destination unavailable");
                output.write(Base64.decode(call.getString("body", ""), Base64.NO_WRAP)); call.resolve();
            } catch (Exception error) { call.reject("Chưa lưu được bản sao. Hãy chọn nơi lưu khác."); }
        });
    }
    Reply media(String path) throws Exception {
        boolean publicResource = publicStudyResource(path);
        if (!publicResource && !path.matches("/api/content/media/[0-9a-f-]{36}\\.(png|jpg|webp|mp3|wav|ogg)")) throw new IllegalArgumentException("Invalid media path");
        String token = vault.read("session");
        String namespace = base64(MessageDigest.getInstance("SHA-256").digest((token == null ? "guest" : token).getBytes(StandardCharsets.UTF_8)));
        java.io.File directory = new java.io.File(getContext().getFilesDir(), "learner-media/" + namespace);
        java.io.File file = new java.io.File(directory, base64(MessageDigest.getInstance("SHA-256").digest(path.getBytes(StandardCharsets.UTF_8))));
        java.io.File metadata = new java.io.File(file + ".json");
        Reply reply;
        try {
            reply = send(path, "GET", null, null);
            if (reply.status >= 500 || reply.status == 408 || reply.status == 429) throw new IllegalStateException("Server unavailable");
        } catch (Exception error) {
            return restoreMedia(file, metadata, error);
        }
        if (publicResource && reply.status == 200) {
            String mime = reply.headers.getOrDefault("content-type", "");
            if (!mime.startsWith("image/")) throw new IllegalStateException("Invalid study image");
            reply.headers.put("x-hanzi-learner-media", "free");
        }
            if (reply.status == 401 || reply.status == 403 || reply.status == 404) {
                if (file.exists() && !file.delete()) throw new IllegalStateException("Unable to invalidate cached media");
                if (metadata.exists() && !metadata.delete()) throw new IllegalStateException("Unable to invalidate cached media");
            }
            String tier = reply.headers.get("x-hanzi-learner-media");
            long lifetime = 30L * 86400_000;
            if (reply.status == 200 && "premium".equals(tier)) {
                Reply permission = send("/api/commerce", "GET", null, null);
                JSONObject access = new JSONObject(new String(permission.bytes, StandardCharsets.UTF_8));
                if (permission.status != 200 || !access.optBoolean("active") || !access.optBoolean("authenticated")) throw new IllegalStateException("Premium offline permission unavailable");
                lifetime = Math.min(lifetime, access.getLong("expiresAt") - access.getLong("serverNow"));
                if (lifetime <= 0) throw new IllegalStateException("Premium expired");
            }
            if (reply.status == 200 && ("free".equals(tier) || "premium".equals(tier))) {
                if (!directory.isDirectory() && !directory.mkdirs()) throw new IllegalStateException("Media storage unavailable");
                try (java.io.FileOutputStream output = new java.io.FileOutputStream(file)) { output.write(reply.bytes); }
                try (java.io.FileOutputStream output = new java.io.FileOutputStream(metadata)) {
                    output.write(new JSONObject().put("savedAt", System.currentTimeMillis()).put("lifetime", lifetime).put("tier", tier)
                        .put("sha256", base64(MessageDigest.getInstance("SHA-256").digest(reply.bytes)))
                        .put("mime", reply.headers.get("content-type")).toString().getBytes(StandardCharsets.UTF_8));
                }
            }
            return reply;
    }
    static boolean offlineMediaAgeValid(long savedAt, long lifetime, long now) {
        long elapsed = now - savedAt;
        return lifetime > 0 && elapsed >= 0 && elapsed < Math.min(30L * 86400_000, lifetime);
    }
    private Reply restoreMedia(java.io.File file, java.io.File metadata, Exception error) throws Exception {
            if (!file.isFile() || !metadata.isFile()) throw error;
            JSONObject saved;
            try (InputStream input = new java.io.FileInputStream(metadata)) { saved = new JSONObject(new String(readBytes(input), StandardCharsets.UTF_8)); }
            if (!offlineMediaAgeValid(saved.getLong("savedAt"), saved.getLong("lifetime"), System.currentTimeMillis())) throw error;
            Reply reply = new Reply(); reply.status = 200;
            try (InputStream input = new java.io.FileInputStream(file)) { reply.bytes = readBytes(input); }
            if (!base64(MessageDigest.getInstance("SHA-256").digest(reply.bytes)).equals(saved.getString("sha256"))) throw error;
            reply.headers.put("content-type", saved.getString("mime")); reply.headers.put("x-hanzi-learner-media", saved.getString("tier")); return reply;
    }
    @PluginMethod public void prepareMedia(PluginCall call) {
        executor.execute(() -> {
            try {
                JSArray paths = call.getArray("paths", new JSArray());
                if (paths.length() > 30) throw new IllegalArgumentException("Too many media paths");
                for (int index = 0; index < paths.length(); index++) {
                    Reply reply = media(paths.getString(index));
                    String tier = reply.headers.get("x-hanzi-learner-media");
                    if (reply.status != 200 || !("free".equals(tier) || "premium".equals(tier))) throw new IllegalStateException("Media is not prepared for offline");
                }
                call.resolve();
            } catch (Exception error) { call.reject("Chưa lưu đủ âm thanh/hình ảnh trên thiết bị. Hãy giữ mạng và thử lại."); }
        });
    }
    @Override protected void handleOnDestroy() { executor.shutdown(); }
}
