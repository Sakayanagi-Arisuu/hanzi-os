import { FullStyleBoundary } from "../../src/components/FullStyleBoundary";

export default function TermsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <FullStyleBoundary />
      {children}
    </>
  );
}
