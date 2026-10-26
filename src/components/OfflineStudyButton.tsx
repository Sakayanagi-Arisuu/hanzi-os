import { useState } from 'react';
import { Download } from 'lucide-react';
import { prepareOfflineStudy } from '../lib/prepareOfflineStudy';
import { enableOfflineAccount } from '../sync/offlineAccount';
import { useLearning } from '../store/LearningStore';
import { getHskLessonPathId } from '../data/hskCurriculumGraph';
import { readLessonResume } from '../sync/indexedDb';
import { ownerScopedResumeCacheScope, resolveLearningResumeOwnerScope } from '../sync/learningResumeStore';
import { lessonReadingEntryKey, parseLessonReadingSession } from '../learning/lessonReadingSession';

export function OfflineStudyButton({ lessonId, loading, content, onPrepared }: { lessonId: string; loading?: boolean; content?: unknown; onPrepared?: () => void }) {
  const { sync } = useLearning();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (getHskLessonPathId(lessonId) === 'hsk4') return <p className="synthetic-audio-note">Bài HSK4 hiện cần mạng để xác minh quyền truy cập và tải học liệu.</p>;
  return <div className="offline-study-control">
    <button type="button" className="secondary-button" disabled={busy || loading} onClick={() => {
      setBusy(true);
      setMessage('Đang tải ứng dụng và bài học…');
      void (async () => {
        const scope = ownerScopedResumeCacheScope(await resolveLearningResumeOwnerScope(sync.ownerKey), lessonReadingEntryKey(lessonId));
        const record = await readLessonResume<unknown>(scope);
        const saved = parseLessonReadingSession(record?.value, lessonId);
        if (!saved) throw new Error('Bài đọc chưa lưu xong. Hãy mở một mục trong bài rồi thử tải lại.');
        await prepareOfflineStudy([content, saved.document]);
        if (sync.session?.authenticated) {
          const response = await fetch('/api/session', { cache: 'no-store', credentials: 'same-origin' });
          const session = response.ok ? await response.json() : null;
          if (!session?.authenticated || session.accountKey !== sync.ownerKey) throw new Error('Hãy đăng nhập lại trước khi cho phép học offline.');
          await enableOfflineAccount(session);
        }
        setMessage('Đã tải trên thiết bị này. Mở phần luyện khi còn mạng để chuẩn bị câu hỏi; sau đó bạn có thể ngắt mạng.');
        onPrepared?.();
      })().catch(cause => setMessage(cause instanceof Error ? cause.message : 'Chưa tải được bài. Hãy thử lại.'))
        .finally(() => setBusy(false));
    }}><Download size={17} />{busy ? 'Đang tải…' : 'Tải để học offline'}</button>
    <small>Lưu bài đọc này để học khi mất mạng. Một số ảnh và âm thanh vẫn cần mạng. Chỉ tải trên thiết bị cá nhân.</small>
    {message && <p role="status">{message}</p>}
  </div>;
}
