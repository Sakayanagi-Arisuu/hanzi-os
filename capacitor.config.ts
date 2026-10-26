import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.regulus.hanzios',
  appName: 'HANZI.OS',
  webDir: 'tmp/capacitor-web',
  android: { path: 'mobile/android', backgroundColor: '#041710', allowMixedContent: false, webContentsDebuggingEnabled: false },
  server: { hostname: 'localhost', androidScheme: 'https' },
  plugins: { CapacitorHttp: { enabled: false }, CapacitorCookies: { enabled: false }, SystemBars: { style: 'LIGHT', insetsHandling: 'native' } },
};
export default config;
