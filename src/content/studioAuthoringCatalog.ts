import type { StudioItemType } from "./studioContent";

export type StudioLearnerModuleId =
  | "path"
  | "review"
  | "pronunciation"
  | "characters"
  | "reader"
  | "exams"
  | "dictionary"
  | "analytics";

export type StudioAuthoringMethod = {
  itemType: StudioItemType | "reader_series";
  label: string;
  description: string;
  href: string;
};

export type StudioModuleAuthoringCoverage = {
  id: StudioLearnerModuleId;
  module: string;
  plainLabel: string;
  learnerContent: string;
  methods: readonly StudioAuthoringMethod[];
  derived?: string;
};

const method = (
  itemType: StudioAuthoringMethod["itemType"],
  label: string,
  description: string,
): StudioAuthoringMethod => ({
  itemType,
  label,
  description,
  href: itemType === "reader_series"
    ? "/studio/library#new-reader-series"
    : `/studio?create=${itemType}#new-draft`,
});

export type StudioAuthoringGroup = {
  id: "learning" | "communication" | "characters" | "reader" | "exams";
  label: string;
  module: string;
  description: string;
  methods: readonly StudioAuthoringMethod[];
};

/**
 * Non-technical entry points shown once on the Studio home screen.
 * Each authoring method appears in exactly one group to avoid making editors
 * choose between duplicate routes that happen to feed several learner modules.
 */
export const STUDIO_AUTHORING_GROUPS: readonly StudioAuthoringGroup[] = [
  {
    id: "learning",
    label: "Bài học và kiến thức",
    module: "Thiên Lộ · Ký Ức Trận",
    description: "Soạn phần người học đọc, ghi nhớ và luyện ngay trong một bài.",
    methods: [
      method("lesson", "Soạn một bài học", "Mục tiêu, lý thuyết, hội thoại và phần thực hành có hướng dẫn."),
      method("vocabulary", "Thêm từ hoặc cụm từ", "Hán tự, Pinyin, nghĩa Việt và ví dụ dùng trong bài."),
      method("grammar", "Thêm điểm ngữ pháp", "Mẫu câu, cách dùng, lỗi thường gặp và ví dụ."),
    ],
  },
  {
    id: "communication",
    label: "Nghe, nói và phát âm",
    module: "Vạn Âm Điện",
    description: "Soạn nội dung giúp người học nghe ra, đọc đúng và giao tiếp được.",
    methods: [
      method("pronunciation", "Tạo bài luyện phát âm", "Thanh điệu, âm đầu, biến điệu và mẫu tự nghe."),
      method("communicative_function", "Tạo nhiệm vụ giao tiếp", "Tình huống, hội thoại mẫu và đầu ra quan sát được."),
    ],
  },
  {
    id: "characters",
    label: "Hán tự và luyện viết",
    module: "Thần Văn Lô",
    description: "Soạn hồ sơ từng chữ và ngữ cảnh giúp người học nhận diện chữ.",
    methods: [
      method("character", "Thêm một Hán tự", "Cách đọc, nghĩa, từ chứa chữ và nguồn dữ liệu nét nếu có."),
    ],
  },
  {
    id: "reader",
    label: "Bài đọc và sách",
    module: "Vạn Quyển Các",
    description: "Soạn văn bản đọc hiểu ngắn hoặc một bộ sách nhiều chương.",
    methods: [
      method("graded_text", "Tạo bài đọc ngắn", "Văn bản Trung–Pinyin–Việt và câu hỏi đọc hiểu."),
      method("reader_series", "Tạo sách nhiều chương", "Bìa, mục lục, chương, đoạn đọc và nguồn gốc nội dung."),
    ],
  },
  {
    id: "exams",
    label: "Câu hỏi và bộ đề",
    module: "Phòng Luyện Đề",
    description: "Soạn từng câu hỏi trước, sau đó ghép các câu đã kiểm định thành bộ đề.",
    methods: [
      method("exam_item", "Tạo câu hỏi", "Ngữ liệu, lựa chọn, đáp án và lời giải."),
      method("exam_form", "Ghép bộ đề", "Chọn cửa; hệ thống tự ghép đúng số câu và tỷ lệ kỹ năng."),
    ],
  },
] as const;

/** One non-technical authoring route for every learner-visible content surface. */
export const STUDIO_MODULE_AUTHORING_COVERAGE: readonly StudioModuleAuthoringCoverage[] = [
  {
    id: "path",
    module: "Thiên Lộ",
    plainLabel: "Bài học và lộ trình",
    learnerContent: "Mục tiêu, từ mới, hội thoại, ngữ pháp, bài tập và nhiệm vụ vận dụng.",
    methods: [
      method("lesson", "Soạn bài học", "Chọn một bài trong lộ trình rồi biên soạn toàn bộ phần lĩnh hội trước Thử Luyện."),
      method("communicative_function", "Soạn nhiệm vụ giao tiếp", "Tạo tình huống và đầu ra giao tiếp sau bài."),
    ],
  },
  {
    id: "review",
    module: "Ký Ức Trận · Nghịch Cảnh Lục",
    plainLabel: "Ôn tập và chữa lỗi",
    learnerContent: "Thẻ gọi lại, ví dụ, đáp án, lời giải và nội dung sửa lỗi.",
    methods: [
      method("vocabulary", "Soạn nguồn ôn từ", "Từ, nghĩa và ví dụ tạo nguồn cho thẻ ôn."),
      method("grammar", "Soạn nguồn ôn ngữ pháp", "Mẫu câu, lỗi thường gặp và ví dụ đối chiếu."),
      method("exam_item", "Soạn câu tự kiểm", "Câu hỏi, đáp án và lời giải có kiểm định."),
    ],
    derived: "Lịch ôn cách quãng và danh sách lỗi được tạo từ bằng chứng học; Biên tập viên sửa nội dung nguồn, không sửa lịch của từng người học.",
  },
  {
    id: "pronunciation",
    module: "Vạn Âm Điện",
    plainLabel: "Nghe, nói và phát âm",
    learnerContent: "Mục tiêu âm, quy tắc, cặp đối chiếu, câu mẫu và bước tự nghe lại.",
    methods: [
      method("pronunciation", "Soạn bài luyện âm", "Tạo bài thanh điệu, âm đầu hoặc biến điệu."),
      method("communicative_function", "Soạn nhiệm vụ nói", "Tạo tình huống nghe–nói và tiêu chí hoàn thành."),
    ],
  },
  {
    id: "characters",
    module: "Thần Văn Lô",
    plainLabel: "Hán tự và luyện viết",
    learnerContent: "Cách đọc, nghĩa, cấu tạo, ngữ cảnh và nguồn dữ liệu nét.",
    methods: [
      method("character", "Soạn hồ sơ Hán tự", "Biên soạn nhận diện chữ và chỉ mở luyện nét khi dữ liệu có nguồn gốc hợp lệ."),
      method("vocabulary", "Soạn từ chứa chữ", "Thêm ngữ cảnh từ/cụm từ cho chữ đang học."),
    ],
  },
  {
    id: "reader",
    module: "Vạn Quyển Các",
    plainLabel: "Bài đọc và sách dài",
    learnerContent: "Bài đọc ngắn, câu hỏi đọc hiểu, sách, chương và đoạn Trung–Pinyin–Việt.",
    methods: [
      method("graded_text", "Soạn bài đọc ngắn", "Tạo văn bản theo cấp độ với câu hỏi đọc hiểu."),
      method("reader_series", "Soạn sách nhiều chương", "Dùng bàn sách cho bìa, chương, nguồn gốc nội dung và quét từ."),
    ],
  },
  {
    id: "exams",
    module: "Khảo Nghiệm · Phòng Luyện Đề",
    plainLabel: "Đánh giá và luyện đề",
    learnerContent: "Câu đánh giá, lựa chọn, đáp án, lời giải và cấu trúc bộ đề.",
    methods: [
      method("exam_item", "Soạn câu đánh giá", "Dùng chung cho khảo nghiệm đầu vào và luyện đề."),
      method("exam_form", "Ghép bộ đề", "Ghép câu đã kiểm định theo cấu trúc HSK chuẩn."),
    ],
  },
  {
    id: "dictionary",
    module: "Tàng Tự Khố",
    plainLabel: "Từ điển và mục đã lưu",
    learnerContent: "Từ/cụm từ, Pinyin, nghĩa Việt, ví dụ và liên kết Hán tự.",
    methods: [
      method("vocabulary", "Soạn mục từ", "Biên soạn mục tra cứu và nguồn cho Sổ Từ."),
      method("character", "Soạn mục chữ", "Biên soạn hồ sơ từng Hán tự liên quan."),
    ],
  },
  {
    id: "analytics",
    module: "Thiên Cơ Kính",
    plainLabel: "Bảy kỹ năng",
    learnerContent: "Nhãn kỹ năng và bằng chứng được chiếu từ nội dung học đã phát hành.",
    methods: [
      method("lesson", "Gắn kỹ năng trong bài", "Xác định bài tạo cơ hội luyện kỹ năng nào."),
      method("pronunciation", "Gắn bằng chứng nghe–âm", "Mô tả đúng loại thực hành và giới hạn đo lường."),
      method("communicative_function", "Gắn bằng chứng giao tiếp", "Mô tả đầu ra nghe, nói hoặc đọc có thể quan sát."),
    ],
    derived: "Biên tập viên mô tả cơ hội luyện và tiêu chí; hệ thống tự tính chỉ số từ bằng chứng học, không cho nhập mức thông thạo thủ công.",
  },
] as const;

export const coveredStudioItemTypes = () => new Set(
  STUDIO_MODULE_AUTHORING_COVERAGE.flatMap((module) =>
    module.methods
      .map((entry) => entry.itemType)
      .filter((itemType): itemType is StudioItemType => itemType !== "reader_series")
  ),
);
