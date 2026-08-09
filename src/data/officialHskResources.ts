export type OfficialHskResource = {
  level: "HSK1" | "HSK2" | "HSK3" | "HSK4";
  items: 40 | 60 | 80 | 100;
  minutes: 40 | 55 | 90 | 105;
  sections: string;
  structure: `https://www.chinesetest.cn/HSK/${1 | 2 | 3 | 4}`;
  paperCode: `H${1 | 2 | 3 | 4}${number}`;
  paper: `https://admin.chinesetest.cn/${string}.pdf`;
  sample: `https://download.chinesetest.cn/${string}.pdf`;
};

/**
 * Direct links published by Chinese Test Service and checked on 2026-08-09.
 * These are references to CTI-hosted material, not copies distributed by
 * HANZI.OS and not a claim that a paper came from a recent test sitting.
 */
export const OFFICIAL_HSK_RESOURCES: readonly OfficialHskResource[] = [
  { level: "HSK1", items: 40, minutes: 40, sections: "Nghe 20 · Đọc 20", structure: "https://www.chinesetest.cn/HSK/1", paperCode: "H10901", paper: "https://admin.chinesetest.cn/userfiles/file/HSK/level1/H10901.pdf", sample: "https://download.chinesetest.cn/newhsk-site/model/HSK1_yj.pdf" },
  { level: "HSK2", items: 60, minutes: 55, sections: "Nghe 35 · Đọc 25", structure: "https://www.chinesetest.cn/HSK/2", paperCode: "H20901", paper: "https://admin.chinesetest.cn/userfiles/file/HSK/level2/H20901.pdf", sample: "https://download.chinesetest.cn/newhsk-site/model/HSK2_yj.pdf" },
  { level: "HSK3", items: 80, minutes: 90, sections: "Nghe 40 · Đọc 30 · Viết 10", structure: "https://www.chinesetest.cn/HSK/3", paperCode: "H31001", paper: "https://admin.chinesetest.cn/userfiles/file/HSK/level3/H31001.pdf", sample: "https://download.chinesetest.cn/newhsk-site/model/HSK3_yj.pdf" },
  { level: "HSK4", items: 100, minutes: 105, sections: "Nghe 45 · Đọc 40 · Viết 15", structure: "https://www.chinesetest.cn/HSK/4", paperCode: "H41001", paper: "https://admin.chinesetest.cn/userfiles/file/HSK/level4/H41001.pdf", sample: "https://download.chinesetest.cn/newhsk-site/model/HSK4_yj.pdf" },
] as const;

export const OFFICIAL_HSK_AUDIO_URL = "https://admin.chinesetest.cn/audio.do";
export const OFFICIAL_HSK3_SAMPLE_URL = "https://hsk.cn-bj.ufileos.com/3.0/HSK3.0-%E6%A0%B7%E9%A2%98-12.18.zip";
