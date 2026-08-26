import type { Metadata, Viewport } from "next";
import "../src/critical.css";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const siteUrl = new URL(configuredSiteUrl || "http://localhost:3000");
const isPublicSite = Boolean(configuredSiteUrl);

// This runs from the server-fresh HTML before the Vite browser entry. It is
// deliberately independent of the client bundle: an older localhost worker
// can otherwise serve a stale copy of the very module that tries to unregister
// it. CacheStorage is safe to clear here because learner progress lives in
// localStorage/IndexedDB and server state lives in D1.
const DEVELOPMENT_SERVICE_WORKER_RECOVERY_SCRIPT = String.raw`
(() => {
  if (
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
    || !("serviceWorker" in navigator)
  ) return;

  const recoveryAttemptsKey = "hanzi-os-dev-worker-recovery-v14";
  const wasControlled = Boolean(navigator.serviceWorker.controller);
  const reportRuntimeError = (detail) => {
    void window.fetch("/api/dev/runtime-error", {
      body: JSON.stringify({ detail: String(detail).slice(0, 4000), route: window.location.pathname }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }).catch(() => undefined);
  };
  window.addEventListener("error", (event) => {
    reportRuntimeError(
      String(event.message)
        + " | "
        + String(event.filename)
        + ":"
        + String(event.lineno)
        + ":"
        + String(event.colno),
    );
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportRuntimeError(
      reason instanceof Error
        ? reason.name
          + ": "
          + reason.message
          + " | "
          + (reason.stack || "no stack")
        : String(reason),
    );
  });
  void (async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(
        registrations.map((registration) => registration.unregister()),
      );
      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.allSettled(
          keys
            .filter((key) => key.startsWith("hanzi-os-"))
            .map((key) => window.caches.delete(key)),
        );
      }

      if (wasControlled) {
        const recoveryAttempts = Number(
          window.sessionStorage.getItem(recoveryAttemptsKey) || "0",
        );
        if (recoveryAttempts >= 3) {
          reportRuntimeError(
            "Development service worker remained attached after three reloads.",
          );
          return;
        }
        window.sessionStorage.setItem(
          recoveryAttemptsKey,
          String(recoveryAttempts + 1),
        );
        window.location.reload();
        return;
      }
      window.sessionStorage.removeItem(recoveryAttemptsKey);
    } catch {
      // Recovery is best-effort and must never block the application shell.
    }
  })();
})();`;

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "HANZI.OS",
  title: "HANZI.OS | Mandarin Awakening System",
  description:
    "Ứng dụng tự học Mainland Mandarin HSK0–HSK4, local-first cho người Việt.",
  alternates: isPublicSite ? { canonical: "/" } : undefined,
  robots: {
    index: isPublicSite,
    follow: isPublicSite,
  },
  referrer: "strict-origin-when-cross-origin",
  category: "education",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/hanzi-os-mark.svg",
    shortcut: "/hanzi-os-mark.svg",
    apple: "/hanzi-os-mark.svg",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl.toString(),
    siteName: "HANZI.OS",
    title: "HANZI.OS — Đánh thức một ngôn ngữ mới",
    description:
      "Lộ trình Mainland Mandarin local-first với bài học, ôn tập và luyện tập rõ ràng.",
    images: [
      {
        url: "/hanzi-os-og-1200x630.webp",
        width: 1200,
        height: 630,
        alt: "HANZI.OS Mandarin Awakening System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HANZI.OS — Đánh thức một ngôn ngữ mới",
    description:
      "Lộ trình Mainland Mandarin local-first với bài học, ôn tập và luyện tập rõ ràng.",
    images: ["/hanzi-os-og-1200x630.webp"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030708",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: DEVELOPMENT_SERVICE_WORKER_RECOVERY_SCRIPT,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
