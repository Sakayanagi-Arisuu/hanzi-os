import type { StudioItemType } from "./studioContent";

export type StudioChangeKind = "added" | "removed" | "changed";

export type StudioFriendlyChange = {
  path: string;
  label: string;
  kind: StudioChangeKind;
  before: string | null;
  after: string | null;
};

export type StudioOutboundLink = {
  kind: "lesson" | "vocabulary" | "assessment" | "skill" | "content";
  value: string;
};

export type StudioRevisionAnalysis = {
  changes: StudioFriendlyChange[];
  changeOverflow: number;
  outboundLinks: StudioOutboundLink[];
  affectedModules: string[];
};

const FIELD_LABELS: Record<string, string> = {
  title: "Tên nội dung",
  level: "Cấp độ HSK",
  objectiveVi: "Mục tiêu bài học",
  prerequisites: "Bài học tiên quyết",
  vocabulary: "Từ vựng liên kết",
  skills: "Kỹ năng rèn luyện",
  dialogue: "Hội thoại",
  grammar: "Ngữ pháp",
  exercises: "Bài tập",
  hanzi: "Chữ Hán",
  pinyin: "Pinyin",
  meaningVi: "Nghĩa tiếng Việt",
  explanationVi: "Giải thích tiếng Việt",
  promptVi: "Đề bài tiếng Việt",
  answer: "Đáp án",
  distractors: "Phương án nhiễu",
  itemStableKeys: "Câu hỏi trong đề",
  sourceLessonIds: "Bài học nguồn",
  wordIds: "Từ vựng nguồn",
  lessonIds: "Bài học liên kết",
  humanReviewed: "Duyệt thủ công",
  provenance: "Nguồn và quyền sử dụng",
};

const AFFECTED_MODULES: Record<StudioItemType, string[]> = {
  vocabulary: ["Học", "Ôn", "Luyện", "Tra cứu"],
  character: ["Học", "Ôn", "Luyện", "Lò Luyện Chữ"],
  grammar: ["Học", "Ôn", "Luyện"],
  pronunciation: ["Nói", "Luyện", "Học"],
  communicative_function: ["Học", "Nói", "Luyện"],
  graded_text: ["Vạn Quyển Các", "Ôn", "Luyện"],
  lesson: ["Thiên Lộ", "Học", "Ôn", "Nói", "Luyện", "Hồ sơ"],
  exam_item: ["Khảo Luyện", "Luyện", "Hồ sơ"],
  exam_form: ["Khảo Luyện", "Luyện", "Hồ sơ"],
};

const LINK_KEYS: Record<string, StudioOutboundLink["kind"]> = {
  prerequisites: "lesson",
  prerequisiteLessonIds: "lesson",
  sourceLessonIds: "lesson",
  lessonIds: "lesson",
  vocabulary: "vocabulary",
  vocabularyIds: "vocabulary",
  wordIds: "vocabulary",
  itemStableKeys: "assessment",
  itemIds: "assessment",
  skills: "skill",
  skillIds: "skill",
  targetSkills: "skill",
  linkedContentKeys: "content",
};

const truncate = (value: string, length = 96) =>
  value.length <= length ? value : `${value.slice(0, length - 1)}…`;

const describe = (value: unknown): string => {
  if (value === null) return "Để trống";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "string") return truncate(value || "Để trống");
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `${value.length} mục`;
  if (value && typeof value === "object") return `${Object.keys(value).length} trường`;
  return "Để trống";
};

const flatten = (
  value: unknown,
  path: string,
  output: Map<string, string>,
  depth = 0,
) => {
  if (depth >= 5 || value === null || typeof value !== "object") {
    output.set(path, describe(value));
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0 || value.every((entry) => entry === null || typeof entry !== "object")) {
      const visible = value.slice(0, 12).map((entry) => describe(entry)).join(" · ");
      output.set(path, `${visible}${value.length > 12 ? ` · còn ${value.length - 12} mục` : ""}` || "0 mục");
      return;
    }
    value.slice(0, 20).forEach((entry, index) => flatten(entry, `${path}.${index + 1}`, output, depth + 1));
    if (value.length > 20) output.set(`${path}.more`, `Còn ${value.length - 20} mục`);
    return;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) output.set(path, "0 trường");
  entries.forEach(([key, entry]) => flatten(entry, path ? `${path}.${key}` : key, output, depth + 1));
};

const friendlyPath = (path: string) => {
  const parts = path.split(".");
  const field = [...parts].reverse().find((part) => !/^\d+$/u.test(part) && part !== "content") ?? path;
  const base = FIELD_LABELS[field] ?? field.replace(/([a-z])([A-Z])/gu, "$1 $2");
  const position = parts.find((part) => /^\d+$/u.test(part));
  return position ? `${base} · mục ${position}` : base;
};

const collectOutboundLinks = (value: unknown) => {
  const links = new Map<string, StudioOutboundLink>();
  const walk = (entry: unknown, key: string | null) => {
    if (key && LINK_KEYS[key] && Array.isArray(entry)) {
      for (const candidate of entry) {
        if (typeof candidate === "string" && candidate.trim()) {
          const link = { kind: LINK_KEYS[key], value: candidate.trim() } as const;
          links.set(`${link.kind}:${link.value}`, link);
        }
      }
    }
    if (Array.isArray(entry)) entry.forEach((candidate) => walk(candidate, null));
    else if (entry && typeof entry === "object") {
      Object.entries(entry as Record<string, unknown>).forEach(([childKey, child]) => walk(child, childKey));
    }
  };
  walk(value, null);
  return [...links.values()].slice(0, 120);
};

export const studioReferenceCandidates = (
  stableKey: string,
  content: Record<string, unknown>,
) => {
  const candidates = new Set<string>([stableKey]);
  for (const key of ["id", "key", "lessonId", "wordId", "characterId", "formKey", "stableKey"]) {
    const value = content[key];
    if (typeof value === "string" && value.trim().length >= 2) candidates.add(value.trim());
  }
  return [...candidates].slice(0, 12);
};

export const analyzeStudioRevision = (input: {
  itemType: StudioItemType;
  current: { title: string; level: string; content: Record<string, unknown> };
  baseline?: { title: string; level: string; content: Record<string, unknown> } | null;
  maxChanges?: number;
}): StudioRevisionAnalysis => {
  const current = new Map<string, string>();
  const baseline = new Map<string, string>();
  flatten({ title: input.current.title, level: input.current.level, content: input.current.content }, "", current);
  if (input.baseline) {
    flatten({ title: input.baseline.title, level: input.baseline.level, content: input.baseline.content }, "", baseline);
  }
  const paths = [...new Set([...baseline.keys(), ...current.keys()])].sort();
  const allChanges = paths.flatMap((path): StudioFriendlyChange[] => {
    const before = baseline.get(path) ?? null;
    const after = current.get(path) ?? null;
    if (before === after) return [];
    return [{
      path,
      label: friendlyPath(path),
      kind: before === null ? "added" : after === null ? "removed" : "changed",
      before,
      after,
    }];
  });
  const maxChanges = Math.max(5, Math.min(100, Math.trunc(input.maxChanges ?? 40)));
  return {
    changes: allChanges.slice(0, maxChanges),
    changeOverflow: Math.max(0, allChanges.length - maxChanges),
    outboundLinks: collectOutboundLinks(input.current.content),
    affectedModules: AFFECTED_MODULES[input.itemType],
  };
};
