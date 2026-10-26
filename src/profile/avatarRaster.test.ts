import { expect, it } from 'vitest';
import { avatarCropRectangle, inspectAvatarImage } from './avatarRaster';
import { AVATAR_MAX_INPUT_BYTES } from './avatarContract';

const png = (width: number, height: number) => {
  const bytes = new Uint8Array(33);
  bytes.set([137,80,78,71,13,10,26,10]);
  new DataView(bytes.buffer).setUint32(8, 13); bytes.set([73,72,68,82], 12);
  new DataView(bytes.buffer).setUint32(16, width); new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
};
it('checks MIME/signature/dimensions before decode and rejects oversize, animation and mismatched file types', () => {
  expect(inspectAvatarImage(png(800, 600), 'image/png')).toEqual({ width: 800, height: 600 });
  expect(() => inspectAvatarImage(png(5000, 5000), 'image/png')).toThrow('16 megapixel');
  expect(() => inspectAvatarImage(png(0, 256), 'image/png')).toThrow();
  expect(() => inspectAvatarImage(png(800, 600), 'image/jpeg')).toThrow();
  expect(() => inspectAvatarImage(new Uint8Array(AVATAR_MAX_INPUT_BYTES + 1), 'image/png')).toThrow('5 MiB');
  const animated = new Uint8Array(45); animated.set(png(800, 600)); animated.set([97,99,84,76], 37);
  expect(() => inspectAvatarImage(animated, 'image/png')).toThrow('tĩnh');
  expect(() => inspectAvatarImage(new TextEncoder().encode('<svg/>'), 'image/svg+xml')).toThrow();
});
it('crops deterministically within source bounds and provides keyboard-controllable position/zoom', () => {
  expect(avatarCropRectangle(800, 600, { zoom: 1, horizontal: 50, vertical: 50 })).toEqual({ left: 100, top: 0, side: 600 });
  expect(avatarCropRectangle(800, 600, { zoom: 2, horizontal: 100, vertical: 100 })).toEqual({ left: 500, top: 300, side: 300 });
  expect(() => avatarCropRectangle(800, 600, { zoom: 0, horizontal: 0, vertical: 0 })).toThrow();
  expect(() => avatarCropRectangle(800, 600, { zoom: 1, horizontal: 101, vertical: 0 })).toThrow();
});
