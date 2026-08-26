import { FullStyleBoundary } from "../../src/components/FullStyleBoundary";
import "./studio.css";

export default function StudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <FullStyleBoundary />
      {children}
    </>
  );
}
