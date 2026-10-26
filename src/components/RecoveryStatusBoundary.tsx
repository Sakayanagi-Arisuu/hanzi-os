import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const RecoveryStatusHost = createContext<((host: HTMLDivElement | null) => void) | null>(null);

export function RecoveryStatusBoundary({ children, status }: { children: ReactNode; status: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return <RecoveryStatusHost.Provider value={setHost}>
    {!host && status}
    {children}
    {host && createPortal(status, host)}
  </RecoveryStatusHost.Provider>;
}

export function RecoveryStatusSlot() {
  const registerHost = useContext(RecoveryStatusHost);
  const slotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const slot = slotRef.current;
    const stage = slot?.parentElement;
    if (!registerHost || !slot || !stage) return;
    registerHost(slot);
    const updateHeight = () => stage.style.setProperty('--recovery-status-block', `${slot.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(slot);
    return () => {
      observer.disconnect();
      stage.style.removeProperty('--recovery-status-block');
      registerHost(null);
    };
  }, [registerHost]);
  return <div className="recovery-status-slot" ref={slotRef} />;
}
