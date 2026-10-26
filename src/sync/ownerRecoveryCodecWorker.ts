import { CODEC_PROTOCOL, executeCodecTask, type CodecArgs, type CodecTask } from './ownerRecoveryCodecTask';

const worker = globalThis as unknown as {
  onmessage: (event: MessageEvent) => void;
  postMessage: (value: unknown) => void;
};
worker.onmessage = async ({ data }: MessageEvent) => {
  const { version, id, task, args } = data ?? {};
  try {
    if (version !== CODEC_PROTOCOL || typeof id !== 'string' || !Array.isArray(args)
      || !['ownerRecoveryResourceIntegrity', 'createOwnerRecoveryArchive', 'stageOwnerRecoveryArchive'].includes(task)) {
      throw new Error('Invalid recovery codec request.');
    }
    const result = await executeCodecTask(task as CodecTask, args as CodecArgs<CodecTask>);
    worker.postMessage({ version, id, task, ok: true, result });
  } catch (error) {
    worker.postMessage({ version, id, task, ok: false, error: error instanceof Error ? error.message : 'Recovery codec failed.' });
  }
};
