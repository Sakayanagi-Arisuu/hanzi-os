import { ArrowLeft, BookOpenText, LockKeyhole } from "lucide-react";
import { hasPermission } from "../../../src/auth/authorization";
import { resolveAuthorizedAccount } from "../../../src/server/authorizationRepository";
import { ContentStudioRepository } from "../../../src/server/contentStudioRepository";
import { getD1Database } from "../../../src/server/d1";
import { getAuthenticatedUser } from "../../chatgpt-auth";
import { ReaderSeriesStudio } from "./ReaderSeriesStudio";
import styles from "./library.module.css";

export const dynamic = "force-dynamic";

export default async function ReaderLibraryStudioPage() {
  const identity = await getAuthenticatedUser();
  if (!identity) return <main className={styles.locked}><LockKeyhole size={34} /><h1>Gian biên tập đang khóa</h1><p>Đăng nhập bằng tài khoản Biên tập viên để thêm sách.</p><a href="/signin?returnTo=%2Fstudio%2Flibrary">Đăng nhập</a></main>;
  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "content:workspace:read")) return <main className={styles.locked}><LockKeyhole size={34} /><h1>Chưa có quyền biên tập</h1><p>Draft và hàng duyệt được bảo vệ phía máy chủ.</p><a href="/reader">Về Vạn Quyển Các</a></main>;
    const allLessons = await new ContentStudioRepository(database).list({ itemType: "lesson", limit: 500 });
    const revisions = allLessons.filter((revision) => revision.stableKey.startsWith("reader.series."));
    return <main className={styles.page}><nav className={styles.nav}><a href="/studio"><ArrowLeft size={17} /> Biên Tập Viện</a><a href="/reader"><BookOpenText size={17} /> Xem Vạn Quyển Các</a></nav><header className={styles.hero}><span>VẠN QUYỂN CÁC · EDITORIAL COMMERCE FLOW</span><h1>Gian Biên Tập Thư Khố</h1><p>Thêm sách như thêm sản phẩm: hồ sơ, bìa, chương, provenance, revision và trạng thái phát hành nằm trong một luồng.</p></header><ReaderSeriesStudio revisions={revisions} canDraft={hasPermission(account.authorization, "content:drafts:write")} /></main>;
  } catch {
    return <main className={styles.locked}><LockKeyhole size={34} /><h1>Kho bản nháp chưa sẵn sàng</h1><p>D1 local đang ngoại tuyến; không có draft nào bị ghi tạm ra phía người học.</p><a href="/reader">Về Vạn Quyển Các</a></main>;
  }
}
