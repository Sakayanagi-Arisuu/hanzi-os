import { ShieldCheck, ArrowLeft, BookOpenText, LayoutDashboard } from "lucide-react";
import { AuthConsole } from "../../../src/components/AuthConsole";
import { WorkspaceSignOut } from "../../../src/components/WorkspaceSignOut";
import { getAuthenticatedUser } from "../../chatgpt-auth";
import { resolveAuthorizedAccount } from '../../../src/server/authorizationRepository';
import { getD1Database } from '../../../src/server/d1';
import { hasPermission } from '../../../src/auth/authorization';
import "../../thien-van.css";
import "./security.css";
export const dynamic = "force-dynamic";
export default async function AccountSecurityPage() {
  const identity = await getAuthenticatedUser();
  const account=identity?await resolveAuthorizedAccount(await getD1Database(),identity).catch(()=>null):null;
  return <main className="tv-account">
    <nav className="tv-account-nav" aria-label="Điều hướng tài khoản"><a className="tv-brand" href="/profile"><span>漢</span><div>HANZI.OS<small>THIÊN VĂN · TÀI KHOẢN</small></div></a><div>{account&&hasPermission(account.authorization,'content:workspace:read')&&<a href="/studio"><BookOpenText size={18}/> Biên Tập Viện</a>}{account&&hasPermission(account.authorization,'admin:users:read')&&<a href="/admin"><LayoutDashboard size={18}/> Quản trị</a>}<a href="/profile"><ArrowLeft size={18}/> Hồ sơ</a>{identity && <WorkspaceSignOut />}</div></nav>
    <div className="tv-account-body"><header className="tv-hero"><span className="tv-eyebrow"><ShieldCheck size={18}/> BẢO VỆ TÀI KHOẢN</span><h1>Bảo mật tài khoản</h1><p>Quản lý cách đăng nhập và thiết bị của bạn.<br/>Mọi thay đổi đều giữ nguyên tiến độ học.</p></header>
    {identity ? <AuthConsole mode="security"/> : <section className="auth-card"><h2>Đăng nhập để tiếp tục</h2><p>Chỉ bạn mới có thể quản lý phương thức đăng nhập của mình.</p><a className="auth-button" href="/signin?returnTo=%2Faccount%2Fsecurity">Mở đăng nhập</a></section>}
    </div>
  </main>;
}
