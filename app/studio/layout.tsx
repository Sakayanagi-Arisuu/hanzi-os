import { FullStyleBoundary } from "../../src/components/FullStyleBoundary";
import "./studio.css";
import "../thien-van.css";
import { StudioShell } from "./StudioShell";

export default function StudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <FullStyleBoundary />
      <StudioShell>{children}</StudioShell>
    </>
  );
}
