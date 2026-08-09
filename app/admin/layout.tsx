import { FullStyleBoundary } from "../../src/components/FullStyleBoundary";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <FullStyleBoundary />
      {children}
    </>
  );
}
