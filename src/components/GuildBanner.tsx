import { useId } from "react";

/** Original vector ornament: scalable cloth, staff, embroidered edges and tassels. */
export function GuildBanner() {
  const id = useId().replaceAll(":", "");
  return <aside className="guild-banner" aria-label="Công Hội Mạo Hiểm Giả">
    <svg className="guild-banner-art" viewBox="0 0 260 470" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-cloth`}><stop stopColor="#031511"/><stop offset=".2" stopColor="#1a3025"/><stop offset=".48" stopColor="#0b211c"/><stop offset=".8" stopColor="#142a23"/><stop offset="1" stopColor="#020e0c"/></linearGradient>
        <linearGradient id={`${id}-gold`} x2=".3" y2="1"><stop stopColor="#40351c"/><stop offset=".22" stopColor="#e1c280"/><stop offset=".42" stopColor="#7c632e"/><stop offset=".7" stopColor="#b79850"/><stop offset="1" stopColor="#493916"/></linearGradient>
        <pattern id={`${id}-weave`} width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 1H4M1 0V4" stroke="#d5c18a" strokeOpacity=".055" strokeWidth=".6"/></pattern>
      </defs>
      <path d="M33 35H226V342L130 433L33 342Z" fill={`url(#${id}-cloth)`} stroke={`url(#${id}-gold)`} strokeWidth="5"/>
      <path d="M42 43H217V338L130 420L42 338Z" fill={`url(#${id}-weave)`} stroke="#9c8247" strokeWidth="1"/>
      <path d="M48 48V333L130 411L211 333V48M54 51V326L130 399L205 326V51" fill="none" stroke="#9c8247" strokeOpacity=".38"/>
      <path d="M20 31H241" stroke="#030b08" strokeWidth="12"/>
      <path d="M20 29H241" stroke={`url(#${id}-gold)`} strokeWidth="6"/>
      <g fill={`url(#${id}-gold)`} stroke="#5d4d2a"><path d="M6 30L25 19L20 30L25 41ZM255 30L236 19L241 30L236 41Z"/><path d="M115 24L130 16L145 24L130 43Z"/><path d="M126 25L130 22L134 25L130 31Z" fill="#5af1c9"/><path d="M30 24H38V36H30ZM222 24H230V36H222Z"/></g>
      <g stroke="#a38b4a" fill="none"><path d="M20 39V300M238 38V186M130 433V450"/><path d="M16 302Q20 290 24 302L26 330M16 302L14 330M19 302L18 334M22 302L23 334M234 188Q238 176 242 188L244 218M234 188L232 218M237 188L236 222M240 188L241 222M125 452Q130 440 135 452L138 467M125 452L122 467M128 451L127 470M132 451L133 470"/></g>
      <circle cx="130" cy="118" r="44" fill="#12231a" stroke={`url(#${id}-gold)`} strokeWidth="2"/>
      <circle cx="130" cy="118" r="39" fill="none" stroke="#a38b4a" strokeWidth=".6"/>
      <path d="M130 68L134 75L130 81L126 75ZM81 118L87 114L92 118L87 122ZM179 118L173 114L168 118L173 122ZM130 168L134 161L130 155L126 161Z" fill="#b59b55"/>
    </svg>
    <div className="guild-banner-lettering"><span lang="zh-Hans">文</span><strong>THẦN VĂN LÔ</strong><p>Công Hội Mạo Hiểm<br/>Chi nhánh Ngôn Tự</p></div>
  </aside>;
}
