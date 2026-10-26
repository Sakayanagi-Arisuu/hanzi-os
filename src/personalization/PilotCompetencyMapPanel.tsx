import type { PilotCompetencyMap as MapData } from './pilotCompetencyMap';

export function PilotCompetencyMap({ map }: {map:MapData}) {
  return <details className="adaptive-competency-map"><summary>Năng lực và bằng chứng hiện có</summary>
    <p>Bản đồ pilot chỉ bao quát giá và số lượng. Các liên hệ giúp sắp xếp gợi ý; không tự mở bài hoặc xác nhận đủ HSK.</p>
    {!map.inferenceEnabled && <p>Đang tắt dùng lịch sử để suy luận gợi ý. Các kỹ năng được giữ ở trạng thái chưa đánh giá; bạn vẫn tự chọn lượt luyện.</p>}
    <ol>{map.nodes.map(node => <li key={node.id}><h3>{node.objectiveVi}</h3>
      <ul>{node.dimensions.map(dimension => <li key={dimension.labelVi}><strong>{dimension.labelVi}</strong>: {dimension.status === 'practice'
        ? 'Đã có lượt luyện · chưa xác nhận thành thạo' : dimension.status === 'exposure' ? 'Đã xem theo ngữ cảnh · chưa kiểm chứng nhớ độc lập' : 'Chưa đánh giá'}
        {map.inferenceEnabled && dimension.uniqueItems > 0 && <p>{dimension.uniqueItems} mục luyện khác nhau trên {dimension.days} ngày có ghi nhận. Lặp lại cùng mục không tăng độ phủ.</p>}
        {dimension.pending > 0 && <p>Có lượt đang chờ xác nhận; chưa tính vào bằng chứng đã ghi nhận.</p>}</li>)}</ul>
      {node.supportingObserved && <p>Đã có hoạt động hỗ trợ ở kỹ năng khác; không thay bằng chứng của kỹ năng đích.</p>}
      <p>Chưa xác định khả năng nhớ khi không có hỗ trợ. Tiêu chí xác nhận còn chờ thẩm định.</p>
      {node.prerequisitesVi.length > 0 && <details><summary>Liên hệ trước khi luyện</summary><ul>{node.prerequisitesVi.map(value => <li key={value}>{value}</li>)}</ul></details>}
    </li>)}</ol></details>;
}
