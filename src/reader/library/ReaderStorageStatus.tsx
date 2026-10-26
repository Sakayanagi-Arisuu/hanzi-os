export function ReaderStorageStatus({ error }: { error: boolean }) {
  return <section className="reader-recovery" role={error ? 'alert' : 'status'} aria-live="polite">
    <h1>{error ? 'Chưa đọc được tiến trình Reader' : 'Đang khôi phục trang đã lưu'}</h1>
    <p>{error ? 'Dữ liệu gốc vẫn được giữ. Không có tiến trình nào bị thay bằng dữ liệu rỗng. Hãy thử đọc lại kho trên thiết bị.' : 'Đang đối chiếu đúng hồ sơ và các câu trả lời đã lưu.'}</p>
    {error && <button type="button" className="reader-button reader-button--primary" onClick={() => window.location.reload()}>Đọc lại dữ liệu</button>}
  </section>;
}
