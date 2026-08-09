import { FullStyleBoundary } from "../../src/components/FullStyleBoundary";

export default function VoiceDataLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <FullStyleBoundary />
      {children}
    </>
  );
}
