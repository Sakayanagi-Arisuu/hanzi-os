import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { RemediationObservatoryItem } from '../mistakes/remediationObservatory';

export function RemediationSourceLink({ item, onRevisit }: {
  item: RemediationObservatoryItem;
  onRevisit?: (item: RemediationObservatoryItem, operationId: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const operation = useRef<string | null>(null);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!item.referenceLessonId || !onRevisit) return null;
  const open = async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setFailed(false);
    operation.current ??= `mistake-revisit:${crypto.randomUUID()}`;
    try {
      await onRevisit(item, operation.current);
      navigate(`/lesson/${encodeURIComponent(item.referenceLessonId!)}`);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  return <span>
    <button className="rem-secondary-action" type="button" disabled={saving} onClick={() => void open()}>
      {saving ? 'Đang lưu lượt mở bài…' : 'Đọc lại bài gốc'}
    </button>
    {failed && <span role="alert">Chưa lưu được lượt mở bài. Dữ liệu cũ vẫn được giữ; hãy thử lại.</span>}
  </span>;
}
