"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './AuthSwordFormation.css';
const swordAssets = ['xich-diem', 'thanh-truc', 'tu-tinh', 'huyen-thiet', 'bich-hai', 'kim-o'];

/** Original formation with AI-assisted artwork; provenance lives in design-explorations/auth-swords-v1. */
export function AuthSwordFormation() {
  const [paused, setPaused] = useState(false);
  const auraId = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const [inactive, setInactive] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 761px)');
    const place = () => setHost(desktop.matches ? anchor.current?.closest<HTMLElement>('.signin-page') ?? null : null);
    place(); desktop.addEventListener('change', place);
    return () => desktop.removeEventListener('change', place);
  }, []);
  useEffect(() => {
    let visible = true;
    const update = () => setInactive(document.hidden || !visible);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (sceneRef.current) observer.observe(sceneRef.current);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [host]);
  const scene = <section ref={sceneRef} className="auth-sword-scene" data-paused={paused || inactive} aria-label="Kiếm trận Cổng Hành Giả">
    <div className="auth-sword-art" aria-hidden="true">
      <svg viewBox="0 0 500 500" fill="none">
        <defs><radialGradient id={auraId}>
          <stop offset="0" stopColor="#081c17" stopOpacity=".91" />
          <stop offset=".64" stopColor="#05241e" stopOpacity=".79" />
          <stop offset="1" stopColor="#6dffd7" stopOpacity=".2" />
        </radialGradient>
        </defs>
        <circle className="auth-sword-aura" cx="250" cy="250" r="220" fill={`url(#${auraId})`} />
        <g className="sword-runes">
          <circle cx="250" cy="250" r="220" /><circle cx="250" cy="250" r="204" strokeDasharray="1 9" />
          <circle cx="250" cy="250" r="181" />
          {Array.from({length:12},(_,i)=><g key={i} transform={`rotate(${i*30} 250 250)`}>
            <path d="M240 42h20m-10-10v20m-10-5 20-10M246 63h8" />
            <path d="M250 75 256 86 250 97 244 86Z" />
          </g>)}
        </g>
        <g className="sword-inner-ring"><path d="M250 83 395 334H105Z M250 417 105 166H395Z" /><circle cx="250" cy="250" r="145" strokeDasharray="70 14 2 14" /></g>
        <g className="sword-flight">
          {Array.from({length:6},(_,i)=><g key={i} transform={`rotate(${i*60} 250 250)`}>
            <path className="sword-trail" d="M250 78A172 172 0 0 0 91 185" />
            <g transform="translate(250 78) rotate(90)">
              <image className="rendered-flying-sword" href={`/images/auth/swords-v1/${swordAssets[i]}.webp`} x="-48" y="-72" width="96" height="144" preserveAspectRatio="xMidYMid meet" />
            </g>
          </g>)}
        </g>
        <g className="sword-center">
          <image className="rendered-central-sword" href="/images/auth/swords-v1/lam-hoa.webp" x="130" y="72" width="240" height="360" preserveAspectRatio="xMidYMid meet" />
        </g>
        <g className="sword-qi"><path d="M45 375Q230 220 457 143" /><path d="M86 405Q257 255 419 111" /></g>
        <g className="sword-sparks">{Array.from({length:16},(_,i)=><circle key={i} cx={250+Math.cos(i*2.4)* (90+i*7)} cy={250+Math.sin(i*2.4)*(90+i*7)} r={i%3+1} />)}</g>
      </svg>
      <div className="sword-opening-ring" />
    </div>
    <div className="auth-sword-caption"><span>KIẾM TRẬN · KHAI MỞ</span><strong>Một chữ khai thiên.<br/>Một niệm vạn dặm.</strong></div>
    <button className="auth-motion-toggle" type="button" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused ? 'Bật kiếm trận' : 'Tạm dừng hiệu ứng'}</button>
  </section>;
  return <><span ref={anchor} className="auth-sword-anchor" aria-hidden="true" />{host ? createPortal(scene, host) : scene}</>;
}
