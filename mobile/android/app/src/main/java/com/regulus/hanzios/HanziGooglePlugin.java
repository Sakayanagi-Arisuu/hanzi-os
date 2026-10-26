package com.regulus.hanzios;

import android.os.CancellationSignal;
import android.util.Base64;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException;
import androidx.credentials.exceptions.NoCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

@CapacitorPlugin(name = "HanziGoogle")
public class HanziGooglePlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private CancellationSignal cancellation;
    private static String encode(byte[] value) {
        return Base64.encodeToString(value, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }
    private JSONObject exchange(JSONObject body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(BuildConfig.HANZI_API_ORIGIN + "/api/auth/mobile/google").openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(12000); connection.setReadTimeout(15000);
        connection.setRequestMethod("POST"); connection.setDoOutput(true);
        connection.setRequestProperty("Origin", BuildConfig.HANZI_API_ORIGIN);
        connection.setRequestProperty("Content-Type", "application/json");
        try {
            try (java.io.OutputStream output = connection.getOutputStream()) { output.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
            int status = connection.getResponseCode();
            if (status == 404 || status == 503) return new JSONObject().put("unconfigured", true);
            if (status != 200) throw new IllegalStateException("Google exchange failed");
            try (java.io.InputStream input = connection.getInputStream()) {
                java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
                byte[] buffer = new byte[4096]; int count;
                while ((count = input.read(buffer)) != -1) {
                    if (output.size() + count > 32768) throw new IllegalStateException("Reply too large");
                    output.write(buffer, 0, count);
                }
                return new JSONObject(output.toString(StandardCharsets.UTF_8.name()));
            }
        } finally { connection.disconnect(); }
    }
    private void fallback(PluginCall call, String reason) {
        busy.set(false);
        JSObject result = new JSObject(); result.put("fallback", true); result.put("reason", reason); call.resolve(result);
    }
    private void failure(PluginCall call, String message) { busy.set(false); call.reject(message); }
    @PluginMethod public void signIn(PluginCall call) {
        if (!busy.compareAndSet(false, true)) { call.reject("Đang mở đăng nhập Google."); return; }
        executor.execute(() -> {
            try {
                byte[] random = new byte[48]; new SecureRandom().nextBytes(random);
                String verifier = encode(random);
                String digest = encode(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
                JSONObject start = exchange(new JSONObject().put("operation", "start").put("codeChallenge", digest));
                if (start.optBoolean("unconfigured")) { fallback(call, "not-configured"); return; }
                String clientId = start.getString("serverClientId");
                String nonce = start.getString("nonce");
                String challenge = start.getString("challenge");
                if (!clientId.endsWith(".apps.googleusercontent.com") || !nonce.matches("[A-Za-z0-9_-]{43}")
                    || !challenge.matches("[A-Za-z0-9_-]{43}")) throw new IllegalStateException("Invalid challenge");
                GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId).setNonce(nonce).build();
                GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
                cancellation = new CancellationSignal();
                getActivity().runOnUiThread(() -> {
                    try { CredentialManager.create(getContext()).getCredentialAsync(
                    getActivity(), request, cancellation, executor,
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse response) {
                            try {
                                if (!(response.getCredential() instanceof CustomCredential)) throw new IllegalStateException("Invalid credential");
                                CustomCredential credential = (CustomCredential) response.getCredential();
                                if (!credential.getType().equals(GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL)) throw new IllegalStateException("Wrong credential type");
                                String idToken = GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                                JSONObject result = exchange(new JSONObject().put("operation", "finish").put("challenge", challenge)
                                    .put("verifier", verifier).put("idToken", idToken));
                                String token = result.getString("token");
                                if (!token.matches("[A-Za-z0-9_-]{40,100}")) throw new IllegalStateException("Invalid session");
                                new DeviceVault(getContext()).write("session", token);
                                busy.set(false);
                                JSObject publicResult = new JSObject(); publicResult.put("authenticated", true); call.resolve(publicResult);
                            } catch (Exception error) { failure(call, "Chưa xác minh được đăng nhập Google. Hãy thử lại."); }
                        }
                        @Override public void onError(GetCredentialException error) {
                            if (error instanceof GetCredentialCancellationException) { failure(call, "Bạn đã hủy đăng nhập Google."); }
                            else if (error instanceof NoCredentialException || error instanceof GetCredentialProviderConfigurationException) { fallback(call, "unavailable"); }
                            else { failure(call, "Không mở được Google trên thiết bị này. Hãy thử lại."); }
                        }
                    }); }
                    catch (Exception error) { failure(call, "Không mở được Google trên thiết bị này. Hãy thử lại."); }
                });
            } catch (Exception error) { failure(call, "Chưa kết nối được Google. Kiểm tra mạng rồi thử lại."); }
        });
    }
    @Override protected void handleOnDestroy() {
        if (cancellation != null) cancellation.cancel();
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
