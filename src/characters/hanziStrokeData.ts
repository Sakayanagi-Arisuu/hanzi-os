export type HanziStrokeData = {
  strokes: string[];
  medians: Array<Array<[number, number]>>;
  radStrokes?: number[];
};

const cache = new Map<string, Promise<HanziStrokeData>>();

const validate = (value: unknown): HanziStrokeData => {
  if (!value || typeof value !== "object") throw new Error("Dữ liệu nét không hợp lệ.");
  const candidate = value as Partial<HanziStrokeData>;
  if (
    !Array.isArray(candidate.strokes)
    || !Array.isArray(candidate.medians)
    || candidate.strokes.length === 0
    || candidate.strokes.length !== candidate.medians.length
    || candidate.strokes.some((stroke) => typeof stroke !== "string" || !stroke.startsWith("M"))
    || candidate.medians.some((median) => !Array.isArray(median) || median.length < 2)
  ) throw new Error("Dữ liệu thứ tự nét chưa vượt kiểm tra cấu trúc.");
  return candidate as HanziStrokeData;
};

export const loadHanziStrokeData = (hanzi: string) => {
  if ([...hanzi].length !== 1) return Promise.reject(new Error("Chỉ có thể luyện một Hán tự mỗi lượt."));
  const cached = cache.get(hanzi);
  if (cached) return cached;
  const request = fetch(`/hanzi-data/${encodeURIComponent(hanzi)}.json`)
    .then((response) => {
      if (!response.ok) throw new Error("Chữ này chưa có dữ liệu nét đã phát hành.");
      return response.json() as Promise<unknown>;
    })
    .then(validate)
    .catch((error: unknown) => {
      cache.delete(hanzi);
      throw error;
    });
  cache.set(hanzi, request);
  return request;
};
