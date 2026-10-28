import * as core from './ownerRecoveryArchiveCore';
import { recoveryBinaryType } from './recoveryBinary';

export type CodecTask = keyof typeof core;
export type CodecArgs<T extends CodecTask> = Parameters<typeof core[T]>;
export type CodecResult<T extends CodecTask> = Awaited<ReturnType<typeof core[T]>>;
export const CODEC_PROTOCOL = 1;

export async function executeCodecTask<T extends CodecTask>(task: T, args: CodecArgs<T>): Promise<CodecResult<T>> {
  switch (task) {
    case 'ownerRecoveryResourceIntegrity': return await core.ownerRecoveryResourceIntegrity(args[0]) as CodecResult<T>;
    case 'createOwnerRecoveryArchive': return await core.createOwnerRecoveryArchive(...args as CodecArgs<'createOwnerRecoveryArchive'>) as CodecResult<T>;
    case 'stageOwnerRecoveryArchive': return await core.stageOwnerRecoveryArchive(...args as CodecArgs<'stageOwnerRecoveryArchive'>) as CodecResult<T>;
    default: throw new Error('Unknown recovery codec task.');
  }
}

// Cloning must not turn an unsupported class/accessor into accepted data.
// Unsafe inputs go to the original validator without normalization.
export function canCloneRecoveryInput(value: unknown, seen = new WeakSet<object>(), depth = 0): boolean {
  if (depth > 128) return false;
  if (value === null || ['undefined', 'string', 'boolean', 'number'].includes(typeof value)) return true;
  if (typeof value !== 'object' || seen.has(value)) return false;
  if (value instanceof Blob) return Object.getPrototypeOf(value) === Blob.prototype;
  if (recoveryBinaryType(value) !== null) return true;
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return false;
  if (Array.isArray(value) && prototype !== Array.prototype) return false;
  seen.add(value);
  try {
    return Object.values(Object.getOwnPropertyDescriptors(value)).every(descriptor =>
      !descriptor.enumerable || ('value' in descriptor && canCloneRecoveryInput(descriptor.value, seen, depth + 1)));
  } finally { seen.delete(value); }
}
