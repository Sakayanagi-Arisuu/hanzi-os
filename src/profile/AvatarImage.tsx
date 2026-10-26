import { useState } from 'react';

export function AvatarImage({ name, url = null }: { name: string; url?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return url && failedUrl !== url
    ? <img src={url} alt="" width={44} height={44} onError={() => setFailedUrl(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
    : <>{Array.from(name.trim() || 'Hành giả vô danh')[0].toUpperCase()}</>;
}
