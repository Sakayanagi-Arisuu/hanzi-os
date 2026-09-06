import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createAuthorization } from "../../src/auth/authorization";
import { AdminShell } from "./AdminShell";

describe("Cổng Quản Trị navigation", () => {
  it("keeps daily work and system administration in separate labelled destinations", () => {
    const html = renderToStaticMarkup(
      <AdminShell
        current="workflow"
        title="Công việc biên tập"
        description="Phân công công việc."
        authorization={createAuthorization(["admin"])}
        badges={{ workflow: 2 }}
      >
        <section><h2>Danh sách</h2></section>
      </AdminShell>,
    );

    expect(html.match(/class="admin-nav-item(?: |")/g)).toHaveLength(8);
    expect(html).toContain("Công việc hàng ngày");
    expect(html).toContain("Quản trị hệ thống");
    expect(html).toContain('href="/admin/workflow"');
    expect(html).toContain('href="/admin/access"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("2");
    expect(html).not.toContain("#admin-users");
  });

  it("keeps the shell language focused on everyday admin work", () => {
    const html = renderToStaticMarkup(
      <AdminShell
        current="configuration"
        title="Cấu hình vận hành"
        description="Thiết lập."
        authorization={createAuthorization(["admin"])}
      >
        <section><h2>Thiết lập</h2></section>
      </AdminShell>,
    );
    expect(html).toContain("Quản lý hệ thống");
    expect(html).toContain("Mở Biên Tập Viện");
    expect(html).toContain("Tài khoản");
    expect(html).not.toContain("Không gian học");
  });
});
