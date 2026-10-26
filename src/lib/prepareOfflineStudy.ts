export function publicOfflineResources(value: unknown): string[] {
  const urls = new Set<string>();
  const visit = (node: unknown) => {
    if (typeof node === 'string' && /^\/(assets|images|art|audio|content|hanzi-data|lessons|reader|api\/content\/media)\//.test(node)
      && !node.includes('..') && !node.includes('?') && !node.includes('\\')) urls.add(node);
    else if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === 'object') Object.values(node).forEach(visit);
  };
  visit(value);
  return [...urls];
}

export async function prepareOfflineStudy(content: unknown) {
  if (!navigator.onLine) throw new Error('Kết nối mạng để tải bài trước khi học offline.');
  const { isNativeApp, prepareNativeStudy } = await import('../native/nativeRuntime');
  if (isNativeApp()) {
    await prepareNativeStudy(content);
    return;
  }
  if (!('serviceWorker' in navigator) || process.env.NODE_ENV === 'development') {
    throw new Error('Hãy mở bản học offline để tải bài; chế độ chỉnh sửa hiện tại chưa lưu ứng dụng offline.');
  }
  await navigator.serviceWorker.register('/sw.js?offline=1');
  const resources = publicOfflineResources(content);
  const batches = Array.from({ length: Math.max(1, Math.ceil(resources.length / 100)) }, (_, index) => resources.slice(index * 100, index * 100 + 100));
  for (const urls of batches) await new Promise<void>((resolve, reject) => {
    let channel: MessageChannel | undefined;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      channel?.port1.close();
      channel?.port2.close();
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error('Chưa tải xong ứng dụng. Hãy giữ mạng và thử lại.')), 120_000);
    void navigator.serviceWorker.ready.then(registration => {
      if (settled) return;
      channel = new MessageChannel();
      channel.port1.onmessage = event => {
        finish(event.data?.ok ? undefined : new Error('Chưa tải đủ tài nguyên. Kiểm tra kết nối và dung lượng thiết bị rồi thử lại.'));
      };
      registration.active?.postMessage({ type: 'PREPARE_OFFLINE', urls }, [channel.port2]);
    }).catch(cause => finish(cause instanceof Error ? cause : new Error('Chưa chuẩn bị được ứng dụng offline.')));
  });
  // Best effort: browsers may decline persistent storage. Never delete progress.
  await navigator.storage?.persist?.().catch(() => false);
}
