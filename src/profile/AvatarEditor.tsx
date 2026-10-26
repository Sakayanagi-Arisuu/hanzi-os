import { useEffect, useRef, useState } from 'react';
import { AvatarImage } from './AvatarImage';
import { useAvatar } from './useAvatar';
import { decodeAvatarFile, drawAvatarCrop, encodeAvatarCrop, type AvatarCrop } from './avatarRaster';
import { saveGuestAvatar } from './avatarStorage';
import { AccountAvatarClientError, saveAccountAvatar } from './accountAvatarClient';
import type { OwnerGeneration } from '../sync/indexedDb';
import './avatar.css';

export function AvatarEditor({ name }: { name: string }) {
  const avatar = useAvatar();
  const [selection, setSelection] = useState<{ image: ImageBitmap; owner: OwnerGeneration; revision: number } | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>({ zoom: 1, horizontal: 50, vertical: 50 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [removePrompt, setRemovePrompt] = useState<{ owner: OwnerGeneration; revision: number; operationId: string } | null>(null);
  const pendingSave = useRef<{ blob: Blob; operationId: string } | null>(null);
  const sequence = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const ownerKey = avatar.owner?.ownerKey, generation = avatar.owner?.generation;
  useEffect(() => {
    sequence.current += 1; pendingSave.current = null;
    setSelection(null); setRemovePrompt(null); setBusy(false); setMessage(''); dialog.current?.close();
  }, [ownerKey, generation]);
  useEffect(() => {
    if (!selection) return;
    dialog.current?.showModal();
    return () => { selection.image.close(); };
  }, [selection]);
  useEffect(() => {
    if (selection && canvas.current) {
      try { drawAvatarCrop(canvas.current, selection.image, crop); }
      catch { setMessage('Chưa dựng được ảnh xem trước; ảnh cũ vẫn được giữ.'); }
    }
  }, [crop, selection]);
  useEffect(() => () => { sequence.current += 1; }, []);
  const cancel = () => {
    sequence.current += 1; pendingSave.current = null; setSelection(null); setBusy(false); dialog.current?.close();
    if (input.current) input.current.value = '';
    input.current?.focus();
  };
  const choose = async (file?: File) => {
    if (!file || !avatar.ready || !avatar.owner || !avatar.canUpload) return;
    pendingSave.current = null;
    const attempt = ++sequence.current, owner = avatar.owner, revision = avatar.record?.revision ?? 0;
    setBusy(true); setMessage('Đang đọc ảnh…');
    try {
      const image = await decodeAvatarFile(file);
      if (attempt !== sequence.current) { image.close(); return; }
      setCrop({ zoom: 1, horizontal: 50, vertical: 50 }); setSelection({ image, owner, revision }); setMessage('');
    } catch { if (attempt === sequence.current) setMessage('Chưa đọc được ảnh này. Chọn JPEG, PNG hoặc WebP tĩnh tối đa 5 MiB và 16 megapixel; ảnh cũ vẫn được giữ.'); }
    finally { if (attempt === sequence.current) { setBusy(false); if (input.current) input.current.value = ''; } }
  };
  const save = async () => {
    if (!selection || busy) return;
    const attempt = sequence.current;
    setBusy(true);
    try {
      const pending = pendingSave.current ?? { blob: await encodeAvatarCrop(selection.image, crop), operationId: crypto.randomUUID() };
      if (attempt !== sequence.current) return;
      pendingSave.current = pending;
      if (selection.owner.ownerKey.startsWith('anonymous:')) await saveGuestAvatar(selection.owner, selection.revision, pending.blob);
      else await saveAccountAvatar(selection.owner, selection.revision, pending.blob, pending.operationId);
      if (attempt !== sequence.current) return;
      avatar.retry(); cancel(); setMessage(selection.owner.ownerKey.startsWith('anonymous:') ? 'Đã lưu ảnh trên thiết bị này. Chưa đồng bộ ảnh lên tài khoản.' : 'Đã lưu ảnh đại diện tài khoản.');
    } catch (error) { if (attempt === sequence.current) setMessage(error instanceof AccountAvatarClientError && error.code === 'AVATAR_REVISION_CONFLICT'
      ? 'Ảnh đã đổi ở cửa sổ khác. Hủy để đọc ảnh mới nhất rồi chọn lại.' : 'Chưa xác nhận được lần lưu. Giữ nguyên khung cắt và thử lưu lại; ảnh đã lưu vẫn được giữ.'); }
    finally { if (attempt === sequence.current) setBusy(false); }
  };
  const remove = async () => {
    if (!removePrompt || busy) return;
    const attempt = sequence.current;
    setBusy(true);
    try {
      if (removePrompt.owner.ownerKey.startsWith('anonymous:')) await saveGuestAvatar(removePrompt.owner, removePrompt.revision, null);
      else await saveAccountAvatar(removePrompt.owner, removePrompt.revision, null, removePrompt.operationId);
      if (attempt === sequence.current) { avatar.retry(); setRemovePrompt(null); setMessage('Đã gỡ ảnh đại diện.'); }
    }
    catch { if (attempt === sequence.current) setMessage('Chưa gỡ được ảnh. Ảnh đã lưu vẫn được giữ; đọc lại ảnh mới nhất rồi thử lại.'); }
    finally { if (attempt === sequence.current) setBusy(false); }
  };
  return <section className="avatar-editor" aria-labelledby="avatar-heading">
    <div className="avatar-summary"><span className="avatar-preview" aria-hidden="true"><AvatarImage name={name} url={avatar.url} /></span><div><h2 id="avatar-heading">Chân dung · ảnh đại diện</h2><p>{avatar.authenticated ? 'Ảnh được lưu riêng cho tài khoản. Ảnh guest trên thiết bị không tự gửi lên tài khoản.' : 'Ảnh guest chỉ lưu trên thiết bị này, chưa nằm trong bản sao tiến độ cũ; không dùng để suy đoán năng lực.'}</p></div></div>
    <label className="field-label"><span>Chọn ảnh đại diện</span><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={!avatar.ready || !avatar.canUpload || busy} aria-describedby="avatar-limits" onChange={event => void choose(event.currentTarget.files?.[0])} /></label>
    {avatar.ready && !avatar.canUpload && <p>Chức năng xử lý ảnh tài khoản chưa sẵn sàng. Bạn vẫn có thể xem hoặc gỡ ảnh đã lưu.</p>}
    <p id="avatar-limits">JPEG, PNG hoặc WebP tĩnh · tối đa 5 MiB, 16 megapixel. Ảnh lưu 256 × 256, bỏ metadata gốc.</p>
    {avatar.error && <><p role="alert">{avatar.error}</p><button type="button" className="secondary-button" onClick={avatar.retry}>Đọc lại ảnh đã lưu</button></>}
    {message && !selection && <p role="status">{message}</p>}
    {avatar.record?.blob && !removePrompt && <button type="button" className="secondary-button" disabled={busy} onClick={() => { if (avatar.owner) setRemovePrompt({ owner: avatar.owner, revision: avatar.record?.revision ?? 0, operationId: crypto.randomUUID() }); }}>Gỡ ảnh đại diện</button>}
    {removePrompt && <div><p>Gỡ ảnh và dùng chữ cái đại diện?</p><button type="button" className="secondary-button" disabled={busy} onClick={() => setRemovePrompt(null)}>Giữ ảnh</button><button type="button" className="secondary-button" disabled={busy} onClick={() => void remove()}>Xác nhận gỡ ảnh</button></div>}
    <dialog ref={dialog} className="avatar-crop-dialog" aria-labelledby="avatar-crop-title" onCancel={event => { event.preventDefault(); if (!busy) cancel(); }} onClose={() => { if (selection) cancel(); }}>
      <header><h2 id="avatar-crop-title">Cắt và xem trước ảnh</h2><button type="button" className="secondary-button" disabled={busy} onClick={cancel}>Hủy</button></header>
      <div className="avatar-crop-body"><canvas ref={canvas} width={256} height={256} role="img" aria-label="Ảnh đại diện sau khi cắt" />
        {(['zoom', 'horizontal', 'vertical'] as const).map(key => <label key={key}><span>{key === 'zoom' ? 'Thu phóng' : key === 'horizontal' ? 'Vị trí ngang' : 'Vị trí dọc'}</span><input type="range" min={key === 'zoom' ? 1 : 0} max={key === 'zoom' ? 3 : 100} step={key === 'zoom' ? 0.05 : 1} value={crop[key]} disabled={busy} onChange={event => { pendingSave.current = null; setCrop(current => ({ ...current, [key]: Number(event.target.value) })); }} /></label>)}
        {message && <p role="alert">{message}</p>}
      </div><footer><button type="button" className="primary-button" disabled={busy || !selection} onClick={() => void save()}>{busy ? 'Đang lưu…' : 'Lưu ảnh đại diện'}</button></footer>
    </dialog>
  </section>;
}
