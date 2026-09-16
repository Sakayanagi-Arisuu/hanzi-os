export type LessonDiagram = {
  type:'sequence'|'timeline'|'comparison'|'map';
  description:string;
  nodes:Array<{id:string;label:string;pinyin:string;meaningVi:string;note:string;x:number;y:number}>;
};
export const emptyLessonDiagram=():LessonDiagram=>({type:'sequence',description:'',nodes:[]});
export function isEditableLessonDiagram(value:unknown):value is LessonDiagram {
  if(!value||typeof value!=='object')return false;
  const d=value as LessonDiagram;
  return ['sequence','timeline','comparison','map'].includes(d.type)&&typeof d.description==='string'&&d.description.length<=4000
    &&Array.isArray(d.nodes)&&d.nodes.length<=20&&d.nodes.every(n=>n&&['id','label','pinyin','meaningVi','note'].every(k=>typeof n[k as keyof typeof n]==='string'&&String(n[k as keyof typeof n]).length<=2000)&&Number.isInteger(n.x)&&n.x>=0&&n.x<=3&&Number.isInteger(n.y)&&n.y>=0&&n.y<=3);
}
export function validateLessonDiagram(value:unknown):string[] {
  if(!isEditableLessonDiagram(value))return ['Sơ đồ có cấu trúc chưa hợp lệ.'];
  const errors:string[]=[];
  if(!value.description.trim())errors.push('Sơ đồ cần mô tả bằng chữ để người học hiểu quan hệ.');
  if(value.nodes.length<2||value.nodes.some(n=>!n.id||!n.label.trim()||!n.meaningVi.trim())||new Set(value.nodes.map(n=>n.id)).size!==value.nodes.length)errors.push('Sơ đồ cần ít nhất hai mục có mã riêng, nhãn và nghĩa Việt.');
  if(value.type==='map'&&new Set(value.nodes.map(n=>`${n.x}:${n.y}`)).size!==value.nodes.length)errors.push('Các địa điểm trên bản đồ không được trùng ô.');
  return errors;
}
