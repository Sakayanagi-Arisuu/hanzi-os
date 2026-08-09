import { FullStyleBoundary } from "../../src/components/FullStyleBoundary";

export default function StudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <FullStyleBoundary />
      {children}
    </>
  );
}
