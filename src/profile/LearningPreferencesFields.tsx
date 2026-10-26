import { DEFAULT_LEARNING_PREFERENCES, LEARNING_TOPICS, type LearningPreferences } from '../learning/learningPreferences';

const topicLabels = ['Đời sống', 'Mua sắm', 'Du lịch', 'Công việc', 'HSK'];

export function LearningPreferencesFields({ value, onChange }: {
  value: LearningPreferences | null | undefined;
  onChange: (value: LearningPreferences | null) => void;
}) {
  const current = value ?? DEFAULT_LEARNING_PREFERENCES;
  const update = (patch: Partial<LearningPreferences>) => onChange({ ...current, ...patch });
  return <details className="sys-advanced learning-preferences-fields">
    <summary>Nhịp phiên & bối cảnh học · tự chọn</summary>
    <p>Đây là lựa chọn tự khai, không phải kết quả khảo nghiệm. Mục tiêu mỗi ngày vẫn giữ riêng. Lưu cấu hình để áp dụng cho những phiên tiếp theo.</p>
    <label className="field-label"><span>Thời lượng một phiên</span>
      <select value={current.sessionMinutes} onChange={event => update({ sessionMinutes: Number(event.target.value) as LearningPreferences['sessionMinutes'] })}>
        {[5, 10, 20].map(minutes => <option key={minutes} value={minutes}>{minutes} phút</option>)}
      </select>
    </label>
    <fieldset className="profile-fieldset"><legend>Chủ đề muốn luyện · có thể bỏ qua</legend>
      {LEARNING_TOPICS.map((topic, index) => <label className="learning-preference-check" key={topic}>
        <span><input type="checkbox" checked={current.topics.includes(topic)} onChange={event => update({
          topics: event.target.checked ? [...current.topics, topic] : current.topics.filter(item => item !== topic),
        })} /> {topicLabels[index]}</span>
      </label>)}
    </fieldset>
    {(['audio', 'microphone'] as const).map(kind => <label className="field-label" key={kind}>
      <span>{kind === 'audio' ? 'Nghe âm thanh trong phiên' : 'Dùng microphone trong phiên'}</span>
      <select value={current[kind]} onChange={event => update({ [kind]: event.target.value })}>
        <option value="ask">Chọn khi bắt đầu phiên</option>
        <option value="available">Có thể dùng</option>
        <option value="unavailable">Không dùng</option>
      </select>
    </label>)}
    <p>Chọn microphone ở đây không cấp quyền thiết bị. Bạn luôn có thể chọn cách luyện khác khi vào phiên.</p>
    <label className="learning-preference-check"><span><input type="checkbox" checked={current.allowInference}
      onChange={event => update({ allowInference: event.target.checked })} /> Cho phép dùng lịch sử học để đề xuất phiên phù hợp</span></label>
    <p>Tắt lựa chọn này vẫn giữ lịch sử, tiến độ và đường chọn bài thủ công. Các phiên thích ứng đang được kiểm chứng; chưa tự thay đổi Thiên Lộ.</p>
    <button type="button" onClick={() => onChange(null)}>Đặt lại lựa chọn phiên · giữ tiến độ</button>
  </details>;
}
