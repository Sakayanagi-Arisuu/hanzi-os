import type { LessonDiagram } from '../learning/lessonDiagram';
import { validateLessonDiagram } from '../learning/lessonDiagram';
export function LessonDiagramBlock({diagram}:{diagram:LessonDiagram}) {
  if(validateLessonDiagram(diagram).length)return <p role="status">Hoàn thiện nhãn, nghĩa và mô tả sơ đồ trong Xưởng.</p>;
  return <figure className={`jade-diagram jade-diagram-${diagram.type}`}>
    <figcaption>{diagram.description}</figcaption>
    <ol aria-label={diagram.type==='map'?'Sơ đồ vị trí':diagram.type==='timeline'?'Trình tự thời gian':'Các phần của sơ đồ'}>{diagram.nodes.map((node,index)=><li key={node.id} style={diagram.type==='map'?{gridColumn:node.x+1,gridRow:node.y+1}:undefined}>
      <span className="jade-diagram-number" aria-hidden="true">{index+1}</span><strong lang="zh-Hans">{node.label}</strong>{node.pinyin&&<span>{node.pinyin}</span>}<b>{node.meaningVi}</b>{node.note&&<p>{node.note}</p>}
    </li>)}</ol>
  </figure>;
}
