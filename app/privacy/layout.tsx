import { FullStyleBoundary } from "../../src/components/FullStyleBoundary";

export default function PrivacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <FullStyleBoundary />
      {children}
    </>
  );
}
