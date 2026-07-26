import type { Metadata, Viewport } from "next";
import "../src/styles.css";

const siteUrl =
  "https://hanzi-os-awakening.sopping-oboists-13ts.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "HANZI.OS",
  title: "HANZI.OS | Mandarin Awakening System",
  description:
    "Hệ thống học tiếng Trung thích ứng theo mục tiêu, trí nhớ và bằng chứng làm chủ.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
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
    url: siteUrl,
    siteName: "HANZI.OS",
    title: "HANZI.OS - Đánh thức một ngôn ngữ mới",
    description:
      "Lộ trình tiếng Trung thích ứng với FSRS, luyện phát âm, Hán tự và kiểm tra làm chủ.",
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
    title: "HANZI.OS - Đánh thức một ngôn ngữ mới",
    description:
      "Lộ trình tiếng Trung thích ứng với FSRS, luyện phát âm, Hán tự và kiểm tra làm chủ.",
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
