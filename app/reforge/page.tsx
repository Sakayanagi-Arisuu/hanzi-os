import type { Metadata } from "next";
import { ReforgeProductIntro } from "../../src/components/ReforgeProductIntro";

export const metadata: Metadata = {
  title: "HANZI.OS Reforge | Học tiếng Trung rõ đường",
  description:
    "Hợp đồng sản phẩm HANZI.OS Reforge dành cho người Việt tự học Mainland Mandarin từ số 0 đến HSK4.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReforgePage() {
  return <ReforgeProductIntro />;
}
