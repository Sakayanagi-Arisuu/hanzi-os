import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { currentWorkspaceScope } from '../sync/workspaceSync';
import { createOwnerDeviceRecoveryArchive, stageOwnerDeviceRecoveryArchive } from '../sync/ownerDeviceRecovery';
import { SYNC_DEVICE_STORAGE_KEY, SYNC_INSTALLATION_STORAGE_KEY } from '../lib/storageKeys';
import { isNativeApp, saveNativeJson } from '../native/nativeRuntime';
import { openOwnerRecoveryPreview } from '../sync/ownerRecoveryApply';

export function DeviceRecoveryControls({ ownerKey }: { ownerKey: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ source: string; count: number } | null>(null);
  const context = async () => {
    const scope = await currentWorkspaceScope(ownerKey);
    const installationId = localStorage.getItem(SYNC_INSTALLATION_STORAGE_KEY);
    const deviceId = localStorage.getItem(SYNC_DEVICE_STORAGE_KEY);
    if (!scope || !installationId || !deviceId) throw new Error('Recovery context unavailable');
    return { scope, binding: { installationId, deviceId } };
  };
  const exportArchive = async () => {
    if (busy) return;
    setBusy(true); setError(''); setMessage(''); setPreview(null);
    try {
      const { scope, binding } = await context();
      const source = await createOwnerDeviceRecoveryArchive(scope, binding);
      const current = await currentWorkspaceScope(ownerKey);
      if (!current || current.resetEpoch !== scope.resetEpoch
        || current.ownerGeneration.generation !== scope.ownerGeneration.generation) throw new Error('Recovery owner changed');
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Saigon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const name = `hanzi-os-device-journal-${day}.json`;
      if (isNativeApp()) {
        if (new TextEncoder().encode(source).byteLength > 8_000_000) throw new Error('Native archive too large');
        await saveNativeJson(name, source);
      } else {
        const url = URL.createObjectURL(new Blob([source], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
        document.body.append(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
      setMessage('Đã tạo bản sao nhật ký, phiên dở và ảnh có trên thiết bị. Học liệu tải sẵn và tệp riêng của ứng dụng chưa được bao gồm.');
    } catch (error) {
      setError(error instanceof Error && error.message.startsWith('Recovery archive exceeds supported size')
        ? 'Bản sao bổ sung chưa hỗ trợ lượng dữ liệu hiện có. Dữ liệu vẫn được giữ; hãy giữ nguyên bộ nhớ trình duyệt và các bản sao cũ.'
        : 'Chưa tạo được bản sao nhật ký. Dữ liệu hiện có vẫn được giữ; chờ các thao tác lưu hoàn tất rồi thử lại.');
    } finally { setBusy(false); }
  };
  const inspectArchive = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true); setError(''); setMessage(''); setPreview(null);
    try {
      if (file.size > 128 * 1024 * 1024) throw new Error('Archive too large');
      const { scope, binding } = await context();
      const source = await file.text();
      const staged = await stageOwnerDeviceRecoveryArchive(source, scope, binding);
      const count = staged.manifest.reduce((total, resource) => total + resource.count, 0);
      setMessage(`Đã kiểm tra bản sao gồm ${count} mục trong ${staged.manifest.length} nhóm dữ liệu. Chưa thay đổi tiến trình hiện tại.`);
      if (!isNativeApp() && ownerKey.startsWith('anonymous:') && staged.restoreAuthenticity === 'same-installation-capture') {
        setPreview({ source, count });
      } else setMessage(`Đã kiểm tra ${count} mục. Bản này chỉ dùng để kiểm tra trên hồ sơ hiện tại; chưa đủ điều kiện khôi phục trực tiếp.`);
    } catch {
      setError('Chưa thể dùng bản sao này trên hồ sơ và phiên hiện tại. Tệp gốc và dữ liệu trên thiết bị vẫn được giữ.');
    } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const restore = async () => {
    if (!preview || busy) return;
    setBusy(true); setError('');
    try {
      const { scope, binding } = await context();
      await openOwnerRecoveryPreview(preview.source, scope, binding);
    } catch {
      setPreview(null);
      setError('Chưa thể tạm dừng phiên để xem trước khôi phục. Chưa thay đổi dữ liệu học; kiểm tra lại tệp để thử tiếp.');
    } finally { setBusy(false); }
  };
  return <details className="sys-advanced"><summary>Nhật ký & phiên trên thiết bị · bản sao bổ sung</summary>
    <p>Bản này giữ thêm nhật ký, lượt chờ gửi, phiên dở và ảnh. Khôi phục hiện hỗ trợ hồ sơ khách trên cùng trình duyệt, thiết bị và lần đặt lại. Chưa dùng để chuyển máy hoặc thay thế bản sao toàn bộ ứng dụng.</p>
    <button type="button" className="secondary-button full-button" disabled={busy} onClick={() => void exportArchive()}><Download size={17} /> Xuất nhật ký và phiên trên thiết bị</button>
    <input ref={input} type="file" accept="application/json,.json" hidden aria-label="Chọn bản sao nhật ký thiết bị" onChange={event => void inspectArchive(event.target.files?.[0])} />
    <button type="button" className="secondary-button full-button" disabled={busy} onClick={() => input.current?.click()}><Upload size={17} /> Kiểm tra bản sao nhật ký</button>
    {preview && <div>
      <p>Bản sao có {preview.count} mục. Tạm dừng các phiên học để kiểm tra điều kiện và xem trước; chưa thay đổi dữ liệu học ở bước này.</p>
      <button type="button" className="primary-button full-button" disabled={busy} onClick={() => void restore()}>Xem trước khôi phục</button>
      <button type="button" className="secondary-button full-button" disabled={busy} onClick={() => setPreview(null)}>Giữ dữ liệu hiện tại</button>
    </div>}
    {busy && <p role="status">Đang kiểm tra và giữ bản dữ liệu hiện có…</p>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </details>;
}
