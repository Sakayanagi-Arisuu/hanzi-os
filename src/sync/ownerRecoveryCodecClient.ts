import { canCloneRecoveryInput, CODEC_PROTOCOL, executeCodecTask, type CodecArgs, type CodecResult, type CodecTask } from './ownerRecoveryCodecTask';

type WorkerFactory = () => Worker;
let sequence = 0;
const createWorker: WorkerFactory = () => new Worker(new URL('./ownerRecoveryCodecWorker.ts', import.meta.url), { type: 'module' });

export async function runRecoveryCodec<T extends CodecTask>(task: T, args: CodecArgs<T>, factory: WorkerFactory = createWorker): Promise<CodecResult<T>> {
  if ((factory === createWorker && typeof Worker === 'undefined') || !canCloneRecoveryInput(args)) {
    return executeCodecTask(task, args);
  }
  let worker: Worker;
  try { worker = factory(); } catch { return executeCodecTask(task, args); }
  const id = `recovery-codec-${++sequence}`;
  return new Promise((resolve, reject) => {
    const finish = (error: Error | null, result?: CodecResult<T>) => {
      clearTimeout(timeout);
      worker.terminate();
      if (error) reject(error); else resolve(result as CodecResult<T>);
    };
    const timeout = setTimeout(() => finish(new Error('Recovery codec timed out; source retained.')), 120_000);
    worker.onerror = () => finish(new Error('Recovery codec worker failed; source retained.'));
    worker.onmessageerror = () => finish(new Error('Recovery codec response could not be read; source retained.'));
    worker.onmessage = ({ data }: MessageEvent) => {
      if (!data || data.version !== CODEC_PROTOCOL || data.id !== id || data.task !== task
        || typeof data.ok !== 'boolean' || (data.ok ? !Object.hasOwn(data, 'result') : typeof data.error !== 'string')) {
        finish(new Error('Invalid recovery codec response; source retained.'));
      } else if (!data.ok) finish(new Error(data.error));
      else finish(null, data.result as CodecResult<T>);
    };
    try { worker.postMessage({ version: CODEC_PROTOCOL, id, task, args }); }
    catch { finish(new Error('Recovery codec input could not be copied; source retained.')); }
  });
}
