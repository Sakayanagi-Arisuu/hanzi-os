import type { Metadata, Viewport } from "next";
import "../src/styles.css";

const siteUrl =
  "https://hanzi-os-awakening.sopping-oboists-13ts.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "HANZI.OS | Mandarin Awakening System",
  description:
    "Hệ thống học tiếng Trung thích ứng theo mục tiêu, trí nhớ và bằng chứng làm chủ.",
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
    title: "HANZI.OS - Đánh thức một ngôn ngữ mới",
    description:
      "Lộ trình tiếng Trung thích ứng với FSRS, luyện phát âm, Hán tự và kiểm tra làm chủ.",
    images: [
      {
        url: "/hanzi-awakening-hero.png",
        width: 1536,
        height: 1024,
        alt: "HANZI.OS Mandarin Awakening System",
      },
    ],
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
