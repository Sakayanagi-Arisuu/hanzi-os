import { ArrowRight, AudioWaveform, BookOpen, BookOpenText, Ear, Languages, Mic2, Orbit, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { buildSevenDayLabels, buildSevenDaySignals, buildSkillSignals, buildSourceSignals, countActiveSignals, selectRemediationSession, type RemediationObservatoryItem } from "../mistakes/remediationObservatory";

const icons = { listening: Ear, pronunciation: AudioWaveform, grammar: BookOpen, vocabulary: Languages, reading: BookOpenText, speaking: Mic2, writing: PenLine };

export function RemediationAtlas({ items, resolvedCount, onStart }: { items: readonly RemediationObservatoryItem[]; resolvedCount: number; onStart: () => void }) {
  const skills = buildSkillSignals(items);
  const sources = buildSourceSignals(items);
  const priority = selectRemediationSession(items);
  const total = countActiveSignals(items);
  const trend = buildSevenDaySignals(items);
  const days = buildSevenDayLabels();
  const max = Math.max(1, ...trend);
  const points = trend.map((n, i) => `${15 + i * 45},${70 - n / max * 46}`).join(" ");
  return <section className="rem-atlas" aria-labelledby="rem-map-title">
    <header className="rem-atlas-heading"><span className="rem-atlas-seal" aria-hidden="true"><Orbit /></span><div><p className="rem-atlas-kicker">THIÊN VĂN ĐÀI · NGHỊCH CẢNH LỤC</p><h1 id="rem-map-title">Bản đồ điểm yếu</h1><p>Nhìn rõ nơi còn vướng. Từng bước hóa giải.</p></div><span className="rem-atlas-record"><ShieldCheck size={16} /> {resolvedCount} đã hóa giải</span></header>
    <div className="rem-atlas-body">
      <section className="rem-atlas-chart" aria-label="Phân bố dấu vết theo kỹ năng">
        <div className="rem-atlas-orbits" aria-hidden="true"><svg viewBox="0 0 600 600"><defs><radialGradient id="remAtlasAura"><stop stopColor="#37dbd4" stopOpacity=".23"/><stop offset="1" stopColor="#37dbd4" stopOpacity="0"/></radialGradient></defs><circle cx="300" cy="300" r="290" fill="url(#remAtlasAura)"/>{[105,155,205,250,285].map((r,i)=><circle key={r} cx="300" cy="300" r={r} fill="none" stroke="currentColor" strokeOpacity={i===3 ? .5 : .18} strokeDasharray={i%2 ? "2 10" : undefined}/>)}<ellipse cx="300" cy="300" rx="200" ry="74" transform="rotate(-30 300 300)" fill="none" stroke="currentColor" strokeOpacity=".35"/><ellipse cx="300" cy="300" rx="200" ry="74" transform="rotate(30 300 300)" fill="none" stroke="currentColor" strokeOpacity=".35"/>{[0,1,2,3,4,5,6,7].map(i=><g key={i} transform={`rotate(${i*45} 300 300)`}><path d="M300 39v12m-6-6h12" stroke="currentColor"/><circle cx="300" cy="95" r="3" fill="currentColor"/></g>)}</svg></div>
        <div className="rem-atlas-core"><ShieldCheck aria-hidden="true"/><strong>{total}</strong><span>dấu vết cần hóa giải</span></div>
        <ul className="rem-atlas-nodes" aria-label="Số dấu vết từng kỹ năng">{skills.map((skill,i)=>{ const Icon=icons[skill.skill]; const angle=-Math.PI/2+i*2*Math.PI/skills.length; return <li key={skill.skill} style={{"--node-x":`${50+36*Math.cos(angle)}%`,"--node-y":`${50+36*Math.sin(angle)}%`} as CSSProperties}><span className="rem-atlas-node-icon"><Icon aria-hidden="true"/><b>{skill.count}</b></span><strong>{skill.label}</strong></li>; })}</ul>
        {skills.length===0 && <p className="rem-atlas-clear">Tinh đồ đang yên tĩnh.<br/>Dấu vết mới sẽ xuất hiện sau những lượt học được chấm.</p>}
        <div className="rem-atlas-legend"><span><i/>{skills.length} vùng kỹ năng</span><span>Số lần sai tích lũy · không phải điểm thành thạo</span></div>
      </section>
      <aside className="rem-atlas-side">
        <section className="rem-atlas-priority"><header><div><p className="rem-atlas-kicker">ĐIỂM KHỞI HÀNH</p><h2>{priority.length ? `${priority.length} lỗi ưu tiên hôm nay` : "Chưa có lỗi cần luyện"}</h2></div><Sparkles aria-hidden="true"/></header><ol>{priority.map((item,i)=>{const Icon=icons[item.skill];return <li key={item.id}><span className="rem-atlas-order">{i+1}</span><span className="rem-atlas-item-icon"><Icon aria-hidden="true"/></span><div><span className="rem-atlas-skill">{item.skillLabel}</span><p>{item.prompt}</p><small>{item.originLabel} · {item.originDetail}</small></div><span className="rem-atlas-occurrence" title="Số lần xuất hiện">×{item.occurrenceCount}</span></li>;})}</ol>{!priority.length&&<p className="rem-atlas-empty">Tiếp tục học ở Thiên Lộ. Những phần cần củng cố sẽ được tập hợp tại đây.</p>}</section>
        <div className="rem-atlas-metrics"><section><h2>Nguồn dấu vết</h2>{sources.map(source=><div className="rem-atlas-source" key={source.source}><span>{source.label}</span><strong>{source.count}</strong><i style={{"--source-share":`${source.count/Math.max(1,total)*100}%`} as CSSProperties}/></div>)}{!sources.length&&<p>Chưa có dấu vết</p>}</section><section><h2>Gần đây <small>7 ngày</small></h2><svg viewBox="0 0 300 90" role="img" aria-label={trend.map((n,i)=>`${days[i]}: ${n} nhóm lỗi`).join(", ")}><path d="M15 70H285M15 25H285" stroke="#a5cde51c"/><polyline points={points} fill="none" stroke="#66e7dd" strokeWidth="2"/>{trend.map((n,i)=><circle key={i} cx={15+i*45} cy={70-n/max*46} r="3" fill="#c6fff7"/>)}</svg><div className="rem-atlas-days">{days.map((day,i)=><span key={i}>{day}</span>)}</div></section></div>
      </aside>
    </div>
    <footer className="rem-atlas-actions"><div><ShieldCheck aria-hidden="true"/><p><strong>Mỗi lượt, một bước vững hơn</strong><span>Tối đa 5 lỗi · Gợi ý hỗ trợ luyện tập, không tính là tự nhớ.</span></p></div><button type="button" className="rem-primary-action" onClick={onStart} disabled={!priority.length}>Bắt đầu hóa giải <ArrowRight size={20}/></button></footer>
  </section>;
}
