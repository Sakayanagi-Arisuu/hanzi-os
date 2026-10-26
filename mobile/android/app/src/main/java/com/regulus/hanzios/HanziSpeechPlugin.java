package com.regulus.hanzios;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;
import java.util.UUID;

/** Android device synthesis is a labelled fallback, never pronunciation evidence. */
@CapacitorPlugin(name = "HanziSpeech")
public class HanziSpeechPlugin extends Plugin {
    private TextToSpeech engine;
    private boolean ready;
    private boolean initialized;
    private PluginCall pending;
    private PluginCall speaking;
    private String utteranceId;
    @Override public void load() {
        engine = new TextToSpeech(getContext(), status -> {
            ready = status == TextToSpeech.SUCCESS;
            initialized = true;
            if (pending != null) { PluginCall call = pending; pending = null; perform(call); }
        });
        engine.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) {}
            @Override public void onDone(String id) { complete(id, false); }
            @Override public void onError(String id) { complete(id, true); }
        });
    }
    private synchronized void complete(String id, boolean error) {
        if (!id.equals(utteranceId) || speaking == null) return;
        PluginCall call = speaking; speaking = null;
        if (error) call.reject("Giọng tổng hợp trên thiết bị chưa đọc được. Hãy dùng bản ghi âm hoặc xem Pinyin.");
        else call.resolve();
    }
    private synchronized void perform(PluginCall call) {
        String text = call.getString("text", "");
        if (!ready || text.trim().isEmpty() || text.length() > 2000) { call.reject("Thiết bị chưa có giọng tổng hợp phù hợp."); return; }
        String language = call.getString("language", "zh-CN");
        if (!language.equals("zh-CN") && !language.equals("vi-VN")) { call.reject("Unsupported language"); return; }
        int result = engine.setLanguage(Locale.forLanguageTag(language));
        if (result < TextToSpeech.LANG_AVAILABLE) { call.reject("Hãy tải giọng tổng hợp tiếng Trung trong cài đặt điện thoại hoặc dùng bản ghi âm."); return; }
        stop();
        engine.setSpeechRate(Math.max(0.5f, Math.min(1.5f, call.getFloat("rate", 0.82f))));
        android.os.Bundle options = new android.os.Bundle();
        options.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, Math.max(0f, Math.min(1f, call.getFloat("volume", 1f))));
        speaking = call; utteranceId = UUID.randomUUID().toString();
        if (engine.speak(text, TextToSpeech.QUEUE_FLUSH, options, utteranceId) == TextToSpeech.ERROR) complete(utteranceId, true);
    }
    private synchronized void stop() {
        if (engine != null) engine.stop();
        if (speaking != null) { speaking.reject("Speech cancelled"); speaking = null; }
    }
    @PluginMethod public void speak(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!initialized) { if (pending != null) pending.reject("Speech replaced"); pending = call; }
            else perform(call);
        });
    }
    @PluginMethod public void cancel(PluginCall call) { getActivity().runOnUiThread(() -> { stop(); if (pending != null) { pending.reject("Speech cancelled"); pending = null; } call.resolve(); }); }
    @Override protected void handleOnDestroy() { stop(); if (engine != null) engine.shutdown(); }
    @Override protected void handleOnStop() { stop(); }
}
