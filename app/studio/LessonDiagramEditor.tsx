"use client";
import { emptyLessonDiagram, type LessonDiagram } from '../../src/learning/lessonDiagram';
export function LessonDiagramEditor({value,onChange}:{value?:LessonDiagram;onChange:(value:LessonDiagram)=>void}) {
  const diagram=value??emptyLessonDiagram();
  const update=(fields:Partial<LessonDiagram>)=>onChange({...diagram,...fields});
  return <div className="lesson-diagram-editor"><label>Kiểu sơ đồ<select aria-label="Kiểu sơ đồ" value={diagram.type} onChange={e=>update({type:e.target.value as LessonDiagram['type']})}><option value="sequence">Trật tự câu / chuỗi bước</option><option value="timeline">Trục thời gian</option><option value="comparison">Đối chiếu</option><option value="map">Bản đồ ô vị trí</option></select></label>
    <label>Mô tả quan hệ bằng chữ<textarea value={diagram.description} onChange={e=>update({description:e.target.value})}/></label>
    {diagram.nodes.map((node,index)=><fieldset key={node.id}><legend>Mục sơ đồ {index+1}</legend>{(['label','pinyin','meaningVi','note'] as const).map(field=><label key={field}>{{label:'Nhãn Hán tự / mốc',pinyin:'Pinyin',meaningVi:'Nghĩa Việt',note:'Ghi chú giải thích'}[field]}<input value={node[field]} onChange={e=>update({nodes:diagram.nodes.map(n=>n.id===node.id?{...n,[field]:e.target.value}:n)})}/></label>)}
      {diagram.type==='map'&&(['x','y'] as const).map(field=><label key={field}>{field==='x'?'Cột (1–4)':'Hàng (1–4)'}<input type="number" min={1} max={4} value={node[field]+1} onChange={e=>update({nodes:diagram.nodes.map(n=>n.id===node.id?{...n,[field]:Number(e.target.value)-1}:n)})}/></label>)}
      <button type="button" disabled={!index} onClick={()=>{const nodes=[...diagram.nodes];[nodes[index-1],nodes[index]]=[nodes[index],nodes[index-1]];update({nodes});}}>Đưa mục lên</button><button type="button" onClick={()=>update({nodes:diagram.nodes.filter(n=>n.id!==node.id)})}>Xóa mục</button>
    </fieldset>)}<button type="button" disabled={diagram.nodes.length>=20} onClick={()=>update({nodes:[...diagram.nodes,{id:crypto.randomUUID(),label:'',pinyin:'',meaningVi:'',note:'',x:diagram.nodes.length%4,y:Math.floor(diagram.nodes.length/4)%4}]})}>Thêm mục sơ đồ</button></div>;
}
