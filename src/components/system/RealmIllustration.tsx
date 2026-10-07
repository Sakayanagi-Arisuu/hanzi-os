import type { MotionFamily } from "../../system/awakeningMotion";

/** Original vector stage props. Animation moves groups, never SVG filters. */
function Blades({ count = 8 }: { count?: number }) {
  return <>{Array.from({ length: count }, (_, i) => <g key={i} transform={`rotate(${i * 360 / count} 100 100)`}>
    <path d="M100 5L105 32L100 42L95 32Z" fill="currentColor" fillOpacity=".35" />
    <path d="M100 8V47M91 36H109M97 47H103" />
  </g>)}</>;
}

function Petals({ count = 8 }: { count?: number }) {
  return <>{Array.from({ length: count }, (_, i) => <path key={i} transform={`rotate(${i * 360 / count} 100 100)`}
    d="M100 22Q139 55 100 77Q61 55 100 22ZM100 32V65" fill="currentColor" fillOpacity=".08" />)}</>;
}

function Runes() {
  return <>{Array.from({ length: 12 }, (_, i) => <g key={i} transform={`rotate(${i * 30} 100 100)`}>
    <path d="M95 14H105M96 18H104M95 22H105M100 12V24" />
    <path d="M100 4V8" strokeWidth="2.5" />
  </g>)}</>;
}

export function RealmIllustration({ family }: { family: MotionFamily }) {
  return <>
    <g data-act="shock" className="realm-art-shock"><circle cx="100" cy="100" r="78" strokeWidth="3" /><circle cx="100" cy="100" r="91" strokeDasharray="1 9" /></g>
    <g data-act="aura" className="realm-art-aura"><circle cx="100" cy="100" r="68" strokeWidth="12" strokeOpacity=".14" /><circle cx="100" cy="100" r="74" strokeOpacity=".38" /></g>
    {family === "path" && <>
      <g data-act="orbit" className="realm-art-gold"><Runes /><path d="M14 100A86 86 0 0 1 186 100M24 100A76 76 0 0 0 176 100" /></g>
      <g data-act="swords"><Blades count={6} /></g>
      <g data-act="cloud"><path d="M2 144Q20 124 40 142T78 140M120 57Q140 37 164 55T198 47M17 155Q38 143 59 155M143 38Q161 27 183 38" strokeWidth="2.2" /></g>
    </>}
    {family === "memory" && <>
      <g data-act="gather"><Petals count={6} /></g>
      <g data-act="crystal" className="realm-art-gold"><path d="M100 38L137 81L125 129L100 161L75 129L63 81ZM63 81H137L100 161L100 38M75 129H125" fill="currentColor" fillOpacity=".1" /></g>
      <g data-act="orbit"><circle cx="100" cy="100" r="91" strokeDasharray="45 8 2 8" /></g>
    </>}
    {family === "forge" && <>
      <g data-act="swords" className="realm-art-gold"><Blades count={8} /></g>
      <g data-act="forge"><path d="M57 50H143M70 39V155M130 39V155M51 110H149M100 64V143M80 145L122 79" strokeWidth="3" /></g>
      <g data-act="embers"><Petals count={4} /></g>
    </>}
    {family === "trial" && <>
      <g data-act="gate-left" className="realm-art-gold"><path d="M29 37L94 16V183L29 160ZM38 45L84 31V166L38 154ZM48 66H73V137H48ZM58 86V117" fill="currentColor" fillOpacity=".1" /></g>
      <g data-act="gate-right" className="realm-art-gold"><path d="M171 37L106 16V183L171 160ZM162 45L116 31V166L162 154ZM152 66H127V137H152ZM142 86V117" fill="currentColor" fillOpacity=".1" /></g>
      <g data-act="stamp"><path d="M100 47L152 100L100 153L48 100ZM100 60V140M72 100H128M86 82H114M86 118H114" strokeWidth="2" /></g>
    </>}
    {family === "voice" && <>
      <g data-act="wave"><circle cx="100" cy="100" r="89" strokeDasharray="90 50" /></g>
      <g data-act="sound" className="realm-art-gold">{Array.from({ length: 8 }, (_, i) => <path key={i} transform={`rotate(${i * 45} 100 100)`} d="M100 9V16" strokeWidth="2" />)}</g>
      <g data-act="orbit"><path d="M15 70Q2 100 15 130M185 70Q198 100 185 130M70 15Q100 2 130 15M70 185Q100 198 130 185" /></g>
    </>}
    {(family === "reader" || family === "lesson") && <>
      <g data-act="page-left" className="realm-art-gold"><path d="M18 44Q62 27 97 52V153Q59 130 18 147ZM29 62Q59 50 84 66M29 82Q59 70 84 86M29 102Q59 90 84 106" fill="currentColor" fillOpacity=".07" /></g>
      <g data-act="page-right" className="realm-art-gold"><path d="M182 44Q138 27 103 52V153Q141 130 182 147ZM171 62Q141 50 116 66M171 82Q141 70 116 86M171 102Q141 90 116 106" fill="currentColor" fillOpacity=".07" /></g>
      <g data-act="ink"><path d="M9 157Q56 141 100 168Q144 141 191 157M42 18L51 24L60 18M141 177L150 183L159 177" strokeWidth="2" /></g>
    </>}
    {family === "repair" && <>
      <g data-act="shield" className="realm-art-gold"><path d="M24 70A82 82 0 0 1 70 24M130 24A82 82 0 0 1 176 70M176 130A82 82 0 0 1 130 176M70 176A82 82 0 0 1 24 130" /></g>
      <g data-act="mend"><path d="M94 12L100 6L106 12M188 94L194 100L188 106M106 188L100 194L94 188M12 106L6 100L12 94" strokeWidth="2" /></g>
      <g data-act="embers"><Blades count={4} /></g>
    </>}
    {family === "lexicon" && <>
      <g data-act="tiles" className="realm-art-gold"><path d="M26 26H84V84H26ZM116 26H174V84H116ZM26 116H84V174H26ZM116 116H174V174H116Z" fill="currentColor" fillOpacity=".07" /></g>
      <g data-act="ink"><path d="M37 50H74M55 35V73M127 40H162M138 39V70M47 126L35 143H72M53 144V164M132 129H160V161H132Z" strokeWidth="2.5" /></g>
      <g data-act="orbit"><path d="M5 71V5H71M129 5H195V71M195 129V195H129M71 195H5V129" /></g>
    </>}
    {family === "oracle" && <>
      <g data-act="orbit" className="realm-art-gold"><Runes /><path d="M100 29L162 136H38ZM100 171L38 64H162Z" /></g>
      <g data-act="constellation"><path d="M27 81L68 50L131 74L160 126L95 163L43 131Z" />{[[27,81],[68,50],[131,74],[160,126],[95,163],[43,131]].map(([x,y])=><circle key={x} cx={x} cy={y} r="4" fill="currentColor" />)}</g>
      <g data-act="eye"><path d="M52 100Q100 53 148 100Q100 147 52 100Z" /><circle cx="100" cy="100" r="17" /></g>
    </>}
    {family === "profile" && <>
      <g data-act="gather"><Petals count={8} /></g>
      <g data-act="stamp" className="realm-art-gold"><path d="M100 28L152 58V132L100 173L48 132V58ZM100 42L139 65V127L100 158L61 127V65Z" /></g>
      <g data-act="orbit"><Runes /></g>
    </>}
    {family === "premium" && <>
      <g data-act="crown" className="realm-art-gold"><path d="M31 63L64 84L100 35L136 84L169 63L151 153H49ZM56 135H144M65 116L100 80L135 116" fill="currentColor" fillOpacity=".12" /></g>
      <g data-act="wings"><path d="M66 101Q20 41 4 68L22 129L48 144M134 101Q180 41 196 68L178 129L152 144M21 79L45 128M179 79L155 128" strokeWidth="2" /></g>
      <g data-act="orbit"><Runes /></g>
    </>}
    {family === "awakening" && <>
      <g data-act="orbit" className="realm-art-gold"><Runes /><circle cx="100" cy="100" r="80" strokeDasharray="66 8" /></g>
      <g data-act="gather"><Petals count={8} /></g>
      <g data-act="ascend"><path d="M100 29L141 69L132 125L100 168L68 125L59 69ZM59 69H141M68 125H132M100 29V168M59 69L132 125M141 69L68 125" fill="currentColor" fillOpacity=".08" /></g>
    </>}
    <g data-act="sparks" className="realm-art-gold">{Array.from({ length: 8 }, (_, i) => <path key={i} transform={`rotate(${i * 45 + 22.5} 100 100)`} d="M100 2L103 9L100 16L97 9Z" fill="currentColor" />)}</g>
  </>;
}
