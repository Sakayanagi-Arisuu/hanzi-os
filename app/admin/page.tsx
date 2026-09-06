import type { CSSProperties } from "react";
import { AdminSection, MetricCard } from "./adminComponents";
import { AdminShell, AdminState } from "./AdminShell";
import { loadAdminContext } from "./adminServer";
import { AdminDashboardRepository } from "../../src/server/adminDashboardRepository";
import { ContentStudioRepository } from "../../src/server/contentStudioRepository";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const state = await loadAdminContext("admin:users:read");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;

  let summary: Awaited<ReturnType<ContentStudioRepository["operationalSummary"]>>;
  let submitted: Awaited<ReturnType<ContentStudioRepository["list"]>>;
  let approved: Awaited<ReturnType<ContentStudioRepository["list"]>>;
  let system: Awaited<ReturnType<AdminDashboardRepository["overview"]>>;
  try {
    const repository = new ContentStudioRepository(state.context.database);
    [summary, submitted, approved, system] = await Promise.all([
      repository.operationalSummary(),
      repository.list({ state: "submitted", limit: 6 }),
      repository.list({ state: "approved", limit: 6 }),
      new AdminDashboardRepository(state.context.database).overview(),
    ]);
  } catch {
    return <AdminState kind="offline" />;
  }

  const query = await searchParams;
  const overdueWork = summary.assignment.overdue + summary.assignment.withoutReviewer;
  const failedReleases = summary.release.dead;
  const tasks = [
    {
      title: "Duyệt nội dung",
      count: submitted.length,
      step: "1",
      href: "/admin/publishing",
      action: "Duyệt nội dung",
      emptyLabel: "Không có việc",
    },
    {
      title: "Sắp xếp công việc",
      count: overdueWork,
      step: "2",
      href: "/admin/workflow",
      action: "Phân công",
      emptyLabel: "Không có việc",
    },
    {
      title: "Theo dõi phát hành",
      count: failedReleases || approved.length,
      step: "3",
      href: "/admin/publishing",
      action: "Phát hành",
      emptyLabel: "Chưa có việc",
    },
  ] as const;
  const workflowBars = [
    { label: "Bản nháp", value: summary.workflow.draft, tone: "jade" },
    { label: "Chờ duyệt", value: summary.workflow.submitted, tone: "gold" },
    { label: "Đã duyệt", value: summary.workflow.approved, tone: "cyan" },
    { label: "Đang phục vụ", value: summary.workflow.published, tone: "jade" },
  ] as const;
  const workflowPeak = Math.max(1, ...workflowBars.map((item) => item.value));
  const healthyReleases = summary.release.published + summary.release.activePackages;
  const releaseTotal = healthyReleases + summary.release.pending + summary.release.processing + summary.release.dead;
  const releaseRate = releaseTotal > 0
    ? Math.round((healthyReleases / releaseTotal) * 100)
    : null;
  const activityPeak = Math.max(1, ...system.activity.map((day) =>
    day.signIns + day.learningActions + day.editorialActions));
  const activityTotal = system.activity.reduce((total, day) =>
    total + day.signIns + day.learningActions + day.editorialActions, 0);
  const accountBars = [
    { label: "Đang hoạt động", value: system.accounts.active, tone: "jade" },
    { label: "Đang khóa", value: system.accounts.locked, tone: "coral" },
    { label: "Biên tập viên", value: system.accounts.editors, tone: "cyan" },
    { label: "Quản trị viên", value: system.accounts.admins, tone: "gold" },
  ] as const;
  const accountPeak = Math.max(1, system.accounts.total, ...accountBars.map((item) => item.value));
  const formatNumber = (value: number) => value.toLocaleString("vi-VN");

  return <AdminShell
    current="overview"
    title="Bảng điều hành"
    description=""
    authorization={state.context.account.authorization}
    badges={{ workflow: overdueWork, publishing: submitted.length + failedReleases }}
    status={query.error ? { kind: "error", message: query.error } : query.updated ? { kind: "updated", message: "Đã lưu thay đổi." } : null}
  >
    <AdminSection
      title="Toàn cảnh hệ thống"
      description="Số liệu trực tiếp từ D1: tài khoản, phiên máy chủ và hoạt động học đã đồng bộ. Hành vi guest/local không bị theo dõi."
      eyebrow="7 NGÀY GẦN NHẤT"
      action={<a className="admin-button is-secondary" href="/admin/activity">Mở nhật ký</a>}
    >
      <div className="admin-metric-grid admin-system-metrics">
        <MetricCard value={formatNumber(system.accounts.total)} label="Tài khoản hiện có" hint={`+${formatNumber(system.accounts.createdInRange)} trong 7 ngày`} href="/admin/access" />
        <MetricCard value={formatNumber(system.activeSessions)} label="Phiên đang dùng" hint="Chưa thu hồi, chưa hết hạn" tone="cyan" href="/admin/security" />
        <MetricCard value={formatNumber(system.activeLearners)} label="Người học có hoạt động" hint="Tài khoản đã đồng bộ" tone="gold" />
        <MetricCard value={formatNumber(system.learningActions)} label="Tương tác học" hint="Học + luyện đề đã ghi nhận" tone="jade" />
      </div>

      <div className="admin-chart-grid admin-system-chart-grid">
        <figure className="admin-chart-card admin-activity-card">
          <figcaption><strong>Nhịp hoạt động máy chủ</strong><span>{formatNumber(activityTotal)} sự kiện · 7 ngày</span></figcaption>
          {activityTotal > 0
            ? <div
                className="admin-activity-chart"
                role="img"
                aria-label={system.activity.map((day) => `${day.label}: ${day.learningActions} tương tác học, ${day.signIns} lượt đăng nhập, ${day.editorialActions} thao tác biên tập`).join("; ")}
              >
                {system.activity.map((day) => {
                  const total = day.signIns + day.learningActions + day.editorialActions;
                  return <div className="admin-activity-day" key={day.startAt}>
                    <strong>{total}</strong>
                    <span className="admin-activity-stack" aria-hidden="true">
                      {day.learningActions > 0 && <i className="learning" style={{ height: `${Math.max(4, Math.round((day.learningActions / activityPeak) * 100))}%` }} />}
                      {day.signIns > 0 && <i className="signin" style={{ height: `${Math.max(4, Math.round((day.signIns / activityPeak) * 100))}%` }} />}
                      {day.editorialActions > 0 && <i className="editorial" style={{ height: `${Math.max(4, Math.round((day.editorialActions / activityPeak) * 100))}%` }} />}
                    </span>
                    <small>{day.label}</small>
                  </div>;
                })}
              </div>
            : <div className="admin-chart-empty"><strong>Chưa có sự kiện trong 7 ngày</strong><span>Biểu đồ sẽ xuất hiện khi có đăng nhập, tương tác học đã đồng bộ hoặc thao tác biên tập.</span></div>}
          <div className="admin-chart-legend" aria-label="Chú giải biểu đồ"><span><i className="learning" /> Học đã đồng bộ</span><span><i className="signin" /> Đăng nhập</span><span><i className="editorial" /> Biên tập</span></div>
          <details className="admin-chart-table"><summary>Xem bảng số liệu</summary><div><table><thead><tr><th>Ngày</th><th>Học</th><th>Đăng nhập</th><th>Biên tập</th></tr></thead><tbody>{system.activity.map((day) => <tr key={day.startAt}><th>{day.label}</th><td>{day.learningActions}</td><td>{day.signIns}</td><td>{day.editorialActions}</td></tr>)}</tbody></table></div></details>
        </figure>

        <figure className="admin-chart-card">
          <figcaption><strong>Cơ cấu tài khoản</strong><span>{formatNumber(system.accounts.total)} tài khoản</span></figcaption>
          <div className="admin-bar-chart" role="img" aria-label={accountBars.map((item) => `${item.label}: ${item.value}`).join(", ")}>
            {accountBars.map((item) => <div className="admin-bar-row" key={item.label}><span>{item.label}</span><div><i className={item.tone} style={{ "--admin-bar-width": `${Math.max(item.value > 0 ? 8 : 0, Math.round((item.value / accountPeak) * 100))}%` } as CSSProperties} /></div><strong>{item.value}</strong></div>)}
          </div>
          <p className="admin-chart-note">Vai trò là tập con và có thể giao nhau; trạng thái khóa không được tính là phiên đang dùng.</p>
        </figure>
      </div>
    </AdminSection>

    <AdminSection title="Việc cần ưu tiên" description="Mở đúng hàng chờ đang cần quyết định; số 0 chỉ có nghĩa là hiện chưa có việc trong hàng chờ đó." eyebrow="ĐIỀU HÀNH">
      <div className="admin-task-grid">
        {tasks.map((task) => <a className="admin-task-card admin-start-card" href={task.href} key={task.title}><span className="admin-task-icon" aria-hidden="true">{task.step}</span><strong>{task.title}</strong><span className={`admin-tag ${task.count > 0 ? "gold" : "neutral"}`}>{task.count > 0 ? `${task.count} việc` : task.emptyLabel}</span><span>{task.action} →</span></a>)}
      </div>
    </AdminSection>

    <AdminSection title="Tình hình nội dung" eyebrow="HÔM NAY">
      <div className="admin-metric-grid">
        <MetricCard value={summary.workflow.draft} label="Bản nháp" href="/admin/content" />
        <MetricCard value={summary.workflow.submitted} label="Chờ duyệt" tone="gold" href="/admin/publishing" />
        <MetricCard value={summary.release.activePackages} label="Đang phục vụ" tone="cyan" href="/admin/publishing" />
        <MetricCard value={summary.release.dead} label="Có lỗi" tone={summary.release.dead > 0 ? "coral" : "jade"} href="/admin/publishing" />
      </div>
      <div className="admin-chart-grid">
        <figure className="admin-chart-card">
          <figcaption><strong>Tiến độ biên tập</strong><span>{workflowBars.reduce((total, item) => total + item.value, 0)} bản</span></figcaption>
          <div className="admin-bar-chart" role="img" aria-label={workflowBars.map((item) => `${item.label}: ${item.value}`).join(", ")}>
            {workflowBars.map((item) => <div className="admin-bar-row" key={item.label}><span>{item.label}</span><div><i className={item.tone} style={{ "--admin-bar-width": `${Math.max(item.value > 0 ? 8 : 0, Math.round((item.value / workflowPeak) * 100))}%` } as CSSProperties} /></div><strong>{item.value}</strong></div>)}
          </div>
        </figure>
        <figure className="admin-chart-card admin-release-chart">
          <figcaption><strong>Sức khỏe phát hành</strong><span>{releaseTotal} lượt</span></figcaption>
          <div className={`admin-donut ${releaseRate === null ? "is-empty" : ""}`} style={{ "--admin-release-rate": `${(releaseRate ?? 0) * 3.6}deg` } as CSSProperties} role="img" aria-label={releaseRate === null ? "Chưa có lượt phát hành để đánh giá" : `${releaseRate}% lượt phát hành khỏe mạnh`}><span><strong>{releaseRate === null ? "—" : `${releaseRate}%`}</strong><small>{releaseRate === null ? "chưa có dữ liệu" : "ổn định"}</small></span></div>
          <div className="admin-release-legend"><span><i className="jade" /> Thành công <strong>{healthyReleases}</strong></span><span><i className="gold" /> Đang xử lý <strong>{summary.release.pending + summary.release.processing}</strong></span><span><i className="coral" /> Có lỗi <strong>{summary.release.dead}</strong></span></div>
        </figure>
      </div>
    </AdminSection>
  </AdminShell>;
}
