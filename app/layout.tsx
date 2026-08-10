import type { Metadata, Viewport } from "next";
import "../src/critical.css";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const siteUrl = new URL(configuredSiteUrl || "http://localhost:3000");
const isPublicSite = Boolean(configuredSiteUrl);

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
      <body>{children}</body>
    </html>
  );
}
