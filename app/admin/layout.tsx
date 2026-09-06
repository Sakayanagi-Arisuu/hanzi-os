import { FullStyleBoundary } from "../../src/components/FullStyleBoundary";
import { AdminStyles } from "./adminStyles";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <FullStyleBoundary />
      <AdminStyles />
      {children}
    </>
  );
}
