import { useEffect, useState } from 'react';
import { isNativeApp, openNativeExternal } from './nativeRuntime';

declare const __HANZI_NATIVE_VERSION__: { code: number; name: string; origin: string };
export function NativeAppUpdate() {
  const [update, setUpdate] = useState<{ name: string; path: string } | null>(null);
  useEffect(() => {
    if (!isNativeApp() || typeof __HANZI_NATIVE_VERSION__ === 'undefined') return;
    const controller = new AbortController();
    const check = async () => {
      try {
        const response = await fetch('/api/system/android-release', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const value = await response.json() as { versionCode: number; versionName: string; androidPackage: string; apkUrl: string };
        const url = new URL(value.apkUrl);
        if (value.androidPackage !== 'com.regulus.hanzios' || !Number.isSafeInteger(value.versionCode)
          || value.versionCode <= __HANZI_NATIVE_VERSION__.code || !/^\d+\.\d+\.\d+$/.test(value.versionName)
          || url.origin !== __HANZI_NATIVE_VERSION__.origin || url.pathname !== `/downloads/hanzi-os-${value.versionName}.apk`
          || url.search || url.hash) return;
        setUpdate({ name: value.versionName, path: url.pathname });
      } catch { /* An update check never interrupts learning or offline storage. */ }
    };
    void check(); window.addEventListener('online', check);
    return () => { controller.abort(); window.removeEventListener('online', check); };
  }, []);
  if (!isNativeApp() || typeof __HANZI_NATIVE_VERSION__ === 'undefined') return null;
  return <div className="data-status"><div>
    <strong>Ứng dụng Android · {__HANZI_NATIVE_VERSION__.name}</strong>
    {update ? <><p>Có phiên bản {update.name}. Cài bản cập nhật để nhận cải tiến ứng dụng; tiến trình đã lưu được giữ lại.</p>
      <button className="secondary-button" type="button" onClick={() => { void openNativeExternal(update.path); }}>Tải bản cập nhật</button></>
      : <p>Nội dung và tiến trình đồng bộ khi có mạng. Phiên bản ứng dụng mới sẽ xuất hiện ở đây.</p>}
  </div></div>;
}
