import { useEffect, useState } from "react";
import { useLocation } from "react-router";

export function SystemRoutePulse() {
  const location = useLocation();
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    setPulse((current) => current + 1);
  }, [location.pathname]);

  return (
    <div className="sys-route-pulse" key={pulse} aria-hidden="true">
      <span />
    </div>
  );
}
