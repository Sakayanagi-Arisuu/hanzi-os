import { AVATAR_MAX_OUTPUT_BYTES, AVATAR_MAX_PIXELS, AVATAR_SIZE } from '../profile/avatarContract';
import { inspectAvatarImage } from '../profile/avatarRaster';
import { AvatarInputError, readAvatarBytes } from '../profile/avatarBinary';
export { AvatarInputError, AvatarSizeError, readAvatarBytes } from '../profile/avatarBinary';
export class AvatarEncoderUnavailableError extends Error {}
export type AvatarImagesBinding = {
  info(stream: ReadableStream<Uint8Array>): Promise<{ width?: number; height?: number }>;
  input(stream: ReadableStream<Uint8Array>): { transform(options: Record<string, unknown>): {
    output(options: { format: string; quality: number; anim: boolean }): Promise<{ response(): Response }>;
  } };
};
export const avatarEncoderAvailable = (binding: AvatarImagesBinding | undefined) =>
  Boolean(binding && typeof binding.info === 'function' && typeof binding.input === 'function');

/** No filename, source EXIF, URL or original bytes enter durable avatar storage. */
export function validateEncodedAvatar(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > AVATAR_MAX_OUTPUT_BYTES) throw new AvatarInputError('Avatar output size invalid.');
  let shape;
  try { shape = inspectAvatarImage(bytes, 'image/webp'); } catch { throw new AvatarInputError('Avatar output is not static WebP.'); }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (shape.width !== AVATAR_SIZE || shape.height !== AVATAR_SIZE || view.getUint32(4, true) + 8 !== bytes.length) {
    throw new AvatarInputError('Avatar output dimensions invalid.');
  }
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const kind = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (!['VP8X', 'ALPH', 'VP8 ', 'VP8L'].includes(kind) || size > bytes.length - offset - 8) {
      throw new AvatarInputError('Avatar output contains unsupported metadata or chunks.');
    }
    offset += 8 + size + size % 2;
  }
  if (offset !== bytes.length) throw new AvatarInputError('Truncated avatar output.');
}

export async function encodeAccountAvatar(bytes: Uint8Array, mime: string, binding?: AvatarImagesBinding) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new AvatarInputError('Unsupported avatar type.');
  try { inspectAvatarImage(bytes, mime); } catch { throw new AvatarInputError('Invalid avatar source image.'); }
  if (!avatarEncoderAvailable(binding)) throw new AvatarEncoderUnavailableError('Avatar encoder is not configured.');
  const stream = () => new Blob([Uint8Array.from(bytes)]).stream();
  try {
    const info = await binding!.info(stream());
    if (!Number.isSafeInteger(info.width) || !Number.isSafeInteger(info.height) || info.width! < 1 || info.height! < 1
      || info.width! * info.height! > AVATAR_MAX_PIXELS) throw new AvatarInputError('Decoded avatar dimensions invalid.');
    const response = (await binding!.input(stream()).transform({ width: AVATAR_SIZE, height: AVATAR_SIZE, fit: 'cover', metadata: 'none' })
      .output({ format: 'image/webp', quality: 85, anim: false })).response();
    if (!response.ok || response.headers.get('content-type')?.split(';')[0]?.trim() !== 'image/webp') {
      throw new AvatarEncoderUnavailableError('Avatar encoder output unavailable.');
    }
    const encoded = await readAvatarBytes(response, AVATAR_MAX_OUTPUT_BYTES);
    validateEncodedAvatar(encoded); return encoded;
  } catch (error) {
    if (error instanceof AvatarInputError || error instanceof AvatarEncoderUnavailableError) throw error;
    throw new AvatarEncoderUnavailableError('Avatar could not be safely re-encoded.');
  }
}
