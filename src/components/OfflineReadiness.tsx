import { useEffect, useState } from 'react';
import { OFFLINE_PREPARATION_CHANGED, readOfflinePreparationStatus, type OfflinePreparationStatus } from '../sync/offlinePreparationStatus';
export function OfflineReadiness({ ownerKey }: { ownerKey: string }) {
  const [status, setStatus] = useState<OfflinePreparationStatus | null>(null);
  useEffect(() => {
    let active = true;
    setStatus(null);
    const read = () => { void readOfflinePreparationStatus(ownerKey).then(value => { if (active) setStatus(value); }).catch(() => undefined); };
    read(); window.addEventListener(OFFLINE_PREPARATION_CHANGED, read);
    return () => { active = false; window.removeEventListener(OFFLINE_PREPARATION_CHANGED, read); };
  }, [ownerKey]);
  return <div className="data-status" role="status"><div>
    <strong>{status?.phase === 'ready' ? 'Học liệu đã sẵn sàng trên thiết bị' : status?.phase === 'preparing' ? 'Đang chuẩn bị học liệu offline' : 'Ứng dụng tự lưu học liệu để học offline'}</strong>
    <p>{status?.phase === 'ready' ? 'Bạn có thể mở lại ứng dụng và học nội dung đã chuẩn bị khi mất mạng hoặc máy chủ tắt.'
      : status?.phase === 'preparing' ? 'Giữ ứng dụng mở và kết nối máy chủ để lưu các bài, đề luyện, sách và dữ liệu nét chữ.'
        : 'Các học liệu đã lưu vẫn dùng được. Kết nối lại máy chủ để hoàn tất phần còn thiếu.'}</p>
    <button className="secondary-button" type="button" onClick={() => window.dispatchEvent(new Event('hanzi-prepare-offline'))}>Chuẩn bị lại học liệu</button>
  </div></div>;
}
