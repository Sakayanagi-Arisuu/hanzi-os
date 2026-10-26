package com.regulus.hanzios;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import android.os.Bundle;
import android.os.Build;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HanziDevicePlugin.class);
        registerPlugin(HanziSpeechPlugin.class);
        registerPlugin(HanziGooglePlugin.class);
        super.onCreate(savedInstanceState);
        // Capacitor applies safe insets to this decor view. Its exposed area must
        // share the app background on Android 15+ edge-to-edge windows.
        getWindow().getDecorView().setBackgroundColor(getColor(R.color.hanzi_background));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
        if (bridge == null) return;
        JSONObject imageMap;
        try (java.io.InputStream input = getAssets().open("public/native-image-map.json")) {
            imageMap = new JSONObject(new String(HanziDevicePlugin.readBytes(input), java.nio.charset.StandardCharsets.UTF_8));
        } catch (Exception error) { throw new IllegalStateException("Packaged images are missing", error); }
        final JSONObject types = imageMap;
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if ("localhost".equals(request.getUrl().getHost()) && path != null) {
                    try {
                        if (types.has(path) && request.getMethod().equals("GET")) {
                            return new WebResourceResponse(types.getString(path), null, getAssets().open("public" + path));
                        }
                        if ((path.startsWith("/api/content/media/") || HanziDevicePlugin.publicStudyResource(path)) && request.getMethod().equals("GET")) {
                            HanziDevicePlugin plugin = (HanziDevicePlugin) bridge.getPlugin("HanziDevice").getInstance();
                            HanziDevicePlugin.Reply reply = plugin.media(path);
                            return new WebResourceResponse(reply.headers.getOrDefault("content-type", "application/octet-stream"), null,
                                reply.status, reply.status == 200 ? "OK" : "Unavailable", reply.headers, new ByteArrayInputStream(reply.bytes));
                        }
                    } catch (Exception error) {
                        return new WebResourceResponse("text/plain", "UTF-8", 503, "Unavailable", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
    }
}
