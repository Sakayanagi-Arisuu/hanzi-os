import { AVATAR_MAX_INPUT_BYTES, AVATAR_MAX_OUTPUT_BYTES, AVATAR_MAX_PIXELS, AVATAR_SIZE } from './avatarContract';

export type AvatarCrop = { zoom: number; horizontal: number; vertical: number };
const ascii = (bytes: Uint8Array, start: number, count: number) => String.fromCharCode(...bytes.subarray(start, start + count));

export function inspectAvatarImage(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > AVATAR_MAX_INPUT_BYTES) throw new Error('Chọn ảnh tối đa 5 MiB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0;
  if (mime === 'image/png' && bytes.length >= 33 && bytes[0] === 137 && ascii(bytes, 1, 7) === 'PNG\r\n\x1a\n') {
    if (ascii(bytes, 12, 4) !== 'IHDR') throw new Error('PNG chưa hợp lệ.');
    width = view.getUint32(16); height = view.getUint32(20);
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const size = view.getUint32(offset);
      if (size > bytes.length - offset - 12 || ascii(bytes, offset + 4, 4) === 'acTL') throw new Error('Chỉ dùng ảnh PNG tĩnh, không dùng ảnh động.');
      offset += size + 12;
    }
  } else if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    for (let offset = 2; offset + 4 <= bytes.length;) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 217 || marker === 218) break;
      if (marker === 255) { offset++; continue; }
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker) && length >= 7) {
        height = view.getUint16(offset + 5); width = view.getUint16(offset + 7); break;
      }
      offset += length + 2;
    }
  } else if (mime === 'image/webp' && bytes.length >= 30 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const kind = ascii(bytes, offset, 4), size = view.getUint32(offset + 4, true), start = offset + 8;
      if (size > bytes.length - start || kind === 'ANIM' || kind === 'ANMF') throw new Error('Chỉ dùng ảnh WebP tĩnh.');
      if (kind === 'VP8X' && size >= 10) {
        if (bytes[start] & 2) throw new Error('Không dùng ảnh WebP động.');
        width = 1 + bytes[start + 4] + (bytes[start + 5] << 8) + (bytes[start + 6] << 16);
        height = 1 + bytes[start + 7] + (bytes[start + 8] << 8) + (bytes[start + 9] << 16);
      } else if (kind === 'VP8 ' && size >= 10 && bytes[start + 3] === 157 && bytes[start + 4] === 1 && bytes[start + 5] === 42) {
        width = view.getUint16(start + 6, true) & 16383; height = view.getUint16(start + 8, true) & 16383;
      } else if (kind === 'VP8L' && size >= 5 && bytes[start] === 47) {
        const bits = view.getUint32(start + 1, true); width = (bits & 16383) + 1; height = ((bits >>> 14) & 16383) + 1;
      }
      offset = start + size + (size % 2);
    }
  }
  if (!width || !height || width * height > AVATAR_MAX_PIXELS) throw new Error('Chọn JPEG, PNG hoặc WebP tĩnh tối đa 16 megapixel.');
  return { width, height };
}

export function avatarCropRectangle(width: number, height: number, crop: AvatarCrop) {
  if (![width, height, crop.zoom, crop.horizontal, crop.vertical].every(Number.isFinite)
    || width < 1 || height < 1 || crop.zoom < 1 || crop.zoom > 3 || crop.horizontal < 0 || crop.horizontal > 100
    || crop.vertical < 0 || crop.vertical > 100) throw new Error('Vùng cắt ảnh chưa hợp lệ.');
  const side = Math.min(width, height) / crop.zoom;
  return { left: (width - side) * crop.horizontal / 100, top: (height - side) * crop.vertical / 100, side };
}
export async function decodeAvatarFile(file: File) {
  if (file.size > AVATAR_MAX_INPUT_BYTES || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chọn JPEG, PNG hoặc WebP tĩnh tối đa 5 MiB.');
  inspectAvatarImage(new Uint8Array(await file.arrayBuffer()), file.type);
  const image = await createImageBitmap(file);
  if (!image.width || !image.height || image.width * image.height > AVATAR_MAX_PIXELS) { image.close(); throw new Error('Ảnh vượt giới hạn kích thước.'); }
  return image;
}
export function drawAvatarCrop(canvas: HTMLCanvasElement, image: ImageBitmap, crop: AvatarCrop) {
  const rectangle = avatarCropRectangle(image.width, image.height, crop);
  canvas.width = AVATAR_SIZE; canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Thiết bị chưa mở được vùng cắt ảnh.');
  context.clearRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.drawImage(image, rectangle.left, rectangle.top, rectangle.side, rectangle.side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
}
export async function encodeAvatarCrop(image: ImageBitmap, crop: AvatarCrop) {
  const canvas = document.createElement('canvas'); drawAvatarCrop(canvas, image, crop);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Chưa tạo được ảnh.')), 'image/webp', 0.85));
  if (blob.type !== 'image/webp' || blob.size > AVATAR_MAX_OUTPUT_BYTES) throw new Error('Chưa tạo được ảnh WebP nhỏ gọn; ảnh cũ vẫn được giữ.');
  return blob;
}
