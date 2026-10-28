const viewTypes = [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array] as const;
const hexTable = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0'));
export type EncodedRecoveryBinary = { kind: 'array-buffer'; hex: string }
  | { kind: 'binary-view'; type: string; byteOffset: number; byteLength: number; buffer: { kind: 'array-buffer'; hex: string } };

/** Only fixed, authentic built-ins whose structured clone does not discard
 * enumerable metadata may cross the recovery Worker boundary. */
export function recoveryBinaryType(value: unknown): string | null {
  try {
    if (value instanceof ArrayBuffer && Object.getPrototypeOf(value) === ArrayBuffer.prototype) {
      // This also rejects objects that merely inherit ArrayBuffer.prototype.
      new Uint8Array(value);
      Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')!.get!.call(value);
      if ('resizable' in value && value.resizable) return null;
      for (const key in value) if (Object.hasOwn(value, key)) return null;
      return 'ArrayBuffer';
    }
    if (!ArrayBuffer.isView(value) || recoveryBinaryType(value.buffer) !== 'ArrayBuffer') return null;
    const type = Object.getPrototypeOf(value) === DataView.prototype ? 'DataView'
      : viewTypes.find(Constructor => Object.getPrototypeOf(value) === Constructor.prototype)?.name;
    if (!type) return null;
    const length = type === 'DataView' ? 0 : (value as unknown as { length: number }).length;
    for (const key in value) if (Object.hasOwn(value, key)
      && !(String(Number(key)) === key && Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < length)) return null;
    return type;
  } catch { return null; }
}

/** Bounded temporary chunks avoid one JS string object per byte. */
export function recoveryHex(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += 4096) {
    let chunk = '';
    for (let index = start; index < Math.min(start + 4096, bytes.length); index++) chunk += hexTable[bytes[index]];
    chunks.push(chunk);
  }
  return chunks.join('');
}

export function recoveryHexBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 || !/^[a-f0-9]*$/.test(hex)) throw Error('Unsupported recovery encoding.');
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index++) bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

export function encodeRecoveryBinary(value: unknown): EncodedRecoveryBinary | null {
  const type = recoveryBinaryType(value);
  if (type === null) return null;
  if (type === 'ArrayBuffer') return { kind: 'array-buffer', hex: recoveryHex(new Uint8Array(value as ArrayBuffer)) };
  const view = value as ArrayBufferView;
  return { kind: 'binary-view', type, byteOffset: view.byteOffset, byteLength: view.byteLength,
    buffer: { kind: 'array-buffer', hex: recoveryHex(new Uint8Array(view.buffer)) } };
}

export function decodeRecoveryBinary(value: Record<string, unknown>): ArrayBuffer | ArrayBufferView | null {
  if (value.kind === 'array-buffer' && Object.keys(value).sort().join() === 'hex,kind' && typeof value.hex === 'string') return recoveryHexBytes(value.hex).buffer;
  if (value.kind !== 'binary-view') return null;
  if (Object.keys(value).sort().join() !== 'buffer,byteLength,byteOffset,kind,type'
    || typeof value.type !== 'string' || !Number.isSafeInteger(value.byteOffset) || Number(value.byteOffset) < 0
    || !Number.isSafeInteger(value.byteLength) || Number(value.byteLength) < 0
    || !value.buffer || typeof value.buffer !== 'object' || Array.isArray(value.buffer)) throw Error('Unsupported recovery encoding.');
  const encoded = value.buffer as Record<string, unknown>;
  if (encoded.kind !== 'array-buffer' || Object.keys(encoded).sort().join() !== 'hex,kind' || typeof encoded.hex !== 'string') throw Error('Unsupported recovery encoding.');
  const Constructor = viewTypes.find(Type => Type.name === value.type);
  if (!Constructor && value.type !== 'DataView') throw Error('Unsupported recovery encoding.');
  const offset = Number(value.byteOffset), length = Number(value.byteLength), size = Constructor?.BYTES_PER_ELEMENT ?? 1;
  if (offset % size || length % size || offset > encoded.hex.length / 2 || length > encoded.hex.length / 2 - offset) throw Error('Unsupported recovery encoding.');
  const buffer = recoveryHexBytes(encoded.hex).buffer;
  return Constructor ? new Constructor(buffer, offset, length / size) : new DataView(buffer, offset, length);
}
