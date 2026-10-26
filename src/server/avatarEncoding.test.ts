import { expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { encodeAccountAvatar, readAvatarBytes, validateEncodedAvatar, type AvatarImagesBinding } from './avatarEncoding';
const raster = () => sharp({ create: { width: 300, height: 400, channels: 3, background: '#de5629' } });
const localBinding = (): AvatarImagesBinding => ({
  async info(stream) { const metadata = await sharp(Buffer.from(await new Response(stream).arrayBuffer())).metadata(); return metadata; },
  input(stream) { return { transform() { return { async output() {
    const output = await sharp(Buffer.from(await new Response(stream).arrayBuffer())).rotate().resize(256, 256, { fit: 'cover' }).webp().toBuffer();
    return { response: () => new Response(output, { headers: { 'content-type': 'image/webp' } }) };
  } }; } }; },
});
it('requires a real decoder/encoder and does not treat signature checks as processing', async () => {
  const source = new Uint8Array(await raster().png().toBuffer());
  await expect(encodeAccountAvatar(source, 'image/png')).rejects.toThrow('not configured');
  await expect(encodeAccountAvatar(source, 'image/jpeg', localBinding())).rejects.toThrow('Invalid avatar source');
});
it('re-encodes a real EXIF-bearing raster to bounded static 256px WebP without metadata', async () => {
  const source = new Uint8Array(await raster().withMetadata({ exif: { IFD0: { Artist: 'private fixture metadata' } } }).jpeg().toBuffer());
  const bytes = await encodeAccountAvatar(source, 'image/jpeg', localBinding()); validateEncodedAvatar(bytes);
  const metadata = await sharp(bytes).metadata();
  expect(metadata).toMatchObject({ format: 'webp', width: 256, height: 256 });
  expect(metadata.exif).toBeUndefined(); expect(metadata.xmp).toBeUndefined(); expect(metadata.icc).toBeUndefined();
});
it('rejects decoder dimension bombs and unexpected encoder metadata/output', async () => {
  const source = new Uint8Array(await raster().png().toBuffer()), binding = localBinding();
  binding.info = vi.fn().mockResolvedValue({ width: 100000, height: 100000 });
  const input = vi.spyOn(binding, 'input');
  await expect(encodeAccountAvatar(source, 'image/png', binding)).rejects.toThrow('dimensions'); expect(input).not.toHaveBeenCalled();
  const wrong = localBinding(); wrong.input = () => ({ transform: () => ({ output: async () => ({ response: () => new Response(source, { headers: { 'content-type': 'image/png' } }) }) }) });
  await expect(encodeAccountAvatar(source, 'image/png', wrong)).rejects.toThrow('output unavailable');
});
it('bounds binary streams despite absent or dishonest content length and cancels overflow', async () => {
  let cancelled = false;
  const request = new Request('https://hanzi.test/avatar', { method: 'PUT', headers: { 'content-length': '1' },
    body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(9)); }, cancel() { cancelled = true; } }), duplex: 'half' } as RequestInit);
  await expect(readAvatarBytes(request, 8)).rejects.toThrow('too large'); expect(cancelled).toBe(true);
  expect(await readAvatarBytes(new Response(new Uint8Array([0, 128, 255])), 3)).toEqual(new Uint8Array([0, 128, 255]));
});
