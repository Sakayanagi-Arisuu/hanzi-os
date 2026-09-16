import { useEffect, useState } from "react";
import { loadHanziStrokeData, type HanziStrokeData } from "../characters/hanziStrokeData";

/** Use the same verified stroke geometry as the writing exercise. */
export function GuildGlyph({ hanzi }: { hanzi: string }) {
  const [data, setData] = useState<HanziStrokeData | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    void loadHanziStrokeData(hanzi).then((value) => {
      if (active) setData(value);
    }).catch(() => { /* Text remains readable when stroke data is unavailable. */ });
    return () => { active = false; };
  }, [hanzi]);
  if (!data) return <span lang="zh-Hans">{hanzi}</span>;
  return <svg className="guild-glyph" viewBox="0 0 1024 1024" role="img" aria-label={hanzi}>
    <g transform="translate(0 900) scale(1 -1)">
      {data.strokes.map((stroke, index) => <path key={index} d={stroke} />)}
    </g>
  </svg>;
}
