import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "../../src/content/hsk2LessonBlueprints.mjs";
import {
  assertValidHsk2VocabularyDraftBundle,
  loadHsk2VocabularyDraftBundle,
} from "../../src/content/hsk2VocabularyDraft.mjs";
import {
  HSK2_VOCABULARY_PRACTICE_RELATIVE_PATH,
} from "../../src/content/hsk2VocabularyPractice.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const VI_GLOSS_BY_SEQUENCE = {
  301: "trợ từ cuối câu biểu thị xác nhận hoặc cảm thán",
  302: "yêu thích; sở thích",
  303: "màu trắng",
  304: "lớp; nhóm; ca làm",
  305: "giúp",
  306: "giúp đỡ; giúp một tay",
  307: "gói; bọc; bao hoặc túi",
  308: "vở; sổ",
  309: "so với; hơn",
  310: "bút",
  311: "đừng; chớ",
  312: "không tệ; khá tốt",
  313: "ngại quá; xin lỗi vì làm phiền",
  314: "dài",
  315: "nhà ga; trạm xe",
  316: "ra; xuất hiện",
  317: "ra nước ngoài",
  318: "đi ra; xuất hiện",
  319: "ra khỏi nhà",
  320: "đi ra ngoài",
  321: "giường",
  322: "từ; từ ngữ",
  323: "lần; lượt",
  324: "từ; theo; kể từ",
  325: "từ nhỏ",
  326: "sai; lỗi",
  327: "đánh; thực hiện một hành động",
  328: "đi taxi",
  329: "mở; bật",
  330: "nhưng; chỉ",
  331: "nhưng; tuy nhiên",
  332: "trợ từ nối động từ với bổ ngữ",
  333: "trợ từ nối trạng ngữ với động từ",
  334: "đợi; vân vân",
  335: "tàu điện ngầm",
  336: "chấm; điểm; gọi món",
  337: "hiểu",
  338: "động; di chuyển",
  339: "quán ăn; nhà hàng",
  340: "bay",
  341: "cao",
  342: "trung học phổ thông; cấp ba",
  343: "nói cho biết; thông báo",
  344: "vóc dáng; chiều cao",
  345: "với; theo; cùng",
  346: "xe buýt",
  347: "qua; vượt qua",
  348: "lại đây; đi qua đây",
  349: "ăn Tết",
  350: "đi qua; đi sang",
  351: "trợ từ chỉ trải nghiệm đã từng",
  352: "vẫn; hay là",
  353: "màu đen",
  354: "trà đen",
  355: "màu đỏ",
  356: "phía sau",
  357: "tiêu; dành tiền hoặc thời gian",
  358: "hoa",
  359: "vẽ; tranh",
  360: "xấu; hỏng",
  361: "quay lại đây; trở về",
  362: "quay về; trở lại chỗ cũ",
  363: "sân bay",
  364: "vé máy bay",
  365: "nhớ",
  366: "gian; phòng; khoảng",
  367: "dạy",
  368: "phòng học",
  369: "giới thiệu",
  370: "vào; tiến vào",
  371: "gần",
  372: "đi vào đây",
  373: "đi vào trong",
  374: "thường xuyên",
  375: "khách sạn",
  376: "liền; thì; chỉ",
  377: "cà phê",
  378: "bắt đầu",
  379: "khai giảng; bắt đầu học kỳ",
  380: "thi; kiểm tra",
  381: "thi; kỳ thi",
  382: "có thể; khả năng",
  383: "quần",
  384: "nhanh; sắp",
  385: "vui vẻ",
  386: "sắp; sắp sửa",
  387: "bóng rổ",
  388: "mệt",
  389: "cách; rời khỏi",
  390: "bên trong",
  391: "tầng; tòa nhà nhiều tầng",
  392: "đường; tuyến",
  393: "trên đường",
  394: "du lịch",
  395: "trà xanh",
  396: "màu xanh lá",
  397: "chậm",
  398: "chán; không thú vị",
  399: "mỗi",
  400: "cửa",
  401: "cửa ra vào",
  402: "vé vào cửa",
  403: "mặt; phía",
  404: "tên; vị trí trong bảng xếp hạng",
  405: "cầm; lấy",
  406: "như vậy; thế thì",
  407: "kiểu đó; như thế",
  408: "trà sữa",
  409: "bà nội",
  410: "bé trai",
  411: "chim",
  412: "bé gái",
  413: "bên cạnh",
  414: "chạy",
  415: "chạy bộ",
  416: "vé",
  417: "vợ",
  418: "đứng dậy; bắt đầu chuyển sang trạng thái mới",
  419: "phía trước",
  420: "trời quang; trời nắng",
  421: "quả bóng",
  422: "để; cho phép; nhường",
  423: "thịt",
  424: "trung tâm mua sắm",
  425: "đi lên đây",
  426: "phía trên",
  427: "đi lên",
  428: "lên mạng",
  429: "cơ thể; sức khỏe",
  430: "sinh nhật",
  431: "giờ; lúc",
  432: "sự việc; chuyện",
  433: "tay",
  434: "đồng hồ đeo tay",
  435: "cặp sách",
  436: "thoải mái; khỏe",
  437: "gửi; tặng; tiễn",
  438: "mặc dù",
  439: "vì vậy; cho nên",
  440: "đau",
  441: "đá bằng chân",
  442: "đề; câu hỏi",
  443: "lượng từ cho vật dài; điều hoặc khoản",
  444: "nhảy múa",
  445: "đầu",
  446: "nước ngoài",
  447: "bên ngoài",
  448: "xong; hoàn thành",
  449: "mười nghìn",
  450: "về phía; hướng tới",
  451: "trên mạng",
  452: "quên",
  453: "vị; lượng từ lịch sự chỉ người",
  454: "tại sao",
  455: "hy vọng",
  456: "giặt; rửa; tắm",
  457: "nhà vệ sinh",
  458: "đi xuống; xuống đây",
  459: "phía dưới; tiếp theo",
  460: "đi xuống; tiếp tục theo hướng đó",
  461: "trẻ con",
  462: "hồi nhỏ",
  463: "cười",
  464: "họ; mang họ",
  465: "họ tên",
  466: "màu sắc",
  467: "mắt",
  468: "thuốc",
  469: "hiệu thuốc",
  470: "ông nội",
  471: "một lát; một lúc",
  472: "đã; rồi",
  473: "cùng nhau",
  474: "ý; ý nghĩa",
  475: "âm u; nhiều mây",
  476: "bởi vì",
  477: "bơi",
  478: "bơi lội",
  479: "thú vị; có ý nghĩa",
  480: "đôi khi",
  481: "phải; phía bên phải",
  482: "bên phải",
  483: "cá",
  484: "xa",
  485: "vận động; thể thao",
  486: "trạm; đứng",
  487: "chồng",
  488: "như thế này; chừng này",
  489: "như thế này",
  490: "trợ từ chỉ trạng thái đang tiếp diễn",
  491: "đang; chính; đúng",
  492: "tuần",
  493: "chuẩn bị",
  494: "bản thân; tự mình",
  495: "đi; bước",
  496: "đi bộ",
  497: "bóng đá",
  498: "nhất",
  499: "trái; phía bên trái",
  500: "bên trái",
};

const pickDistinctDistractors = ({
  lexemes,
  targetIndex,
  field,
}) => {
  const targetValue = lexemes[targetIndex][field];
  const distractors = [];
  for (
    let offset = 1;
    offset < lexemes.length * 2 && distractors.length < 3;
    offset += 1
  ) {
    const candidate = lexemes[(targetIndex + offset) % lexemes.length][field];
    if (candidate !== targetValue && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }
  if (distractors.length !== 3) {
    throw new Error(
      `Cannot create three distinct ${field} distractors for ${lexemes[targetIndex].officialId}`,
    );
  }
  return distractors;
};

export const buildHsk2VocabularyPractice = (root = process.cwd()) => {
  const vocabularyBundle = loadHsk2VocabularyDraftBundle(root);
  assertValidHsk2VocabularyDraftBundle(vocabularyBundle);
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
  const situationalLessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "situational-dialogue",
  );
  const lessonIdByVocabularyId = new Map();
  for (const lesson of situationalLessons) {
    for (const officialId of lesson.inventoryMappings.vocabularyIds) {
      if (lessonIdByVocabularyId.has(officialId)) {
        throw new Error(`${officialId} belongs to multiple HSK2 lessons`);
      }
      lessonIdByVocabularyId.set(officialId, lesson.lessonId);
    }
  }
  const lexemes = vocabularyBundle.draft.entries.map((sourceDraft) => {
    const vietnameseGlossDraft = VI_GLOSS_BY_SEQUENCE[sourceDraft.sequence];
    const lessonId = lessonIdByVocabularyId.get(sourceDraft.officialId);
    if (!vietnameseGlossDraft || !lessonId) {
      throw new Error(
        `${sourceDraft.officialId} Vietnamese gloss or lesson is missing`,
      );
    }
    return {
      officialId: sourceDraft.officialId,
      sequence: sourceDraft.sequence,
      lessonId,
      simplified: sourceDraft.simplified,
      pinyin: sourceDraft.officialPinyin,
      officialPartOfSpeech: sourceDraft.officialPartOfSpeech,
      vietnameseGlossDraft,
      sourceLineSha256: [
        ...new Set(sourceDraft.sourceMatches.map(
          (source) => source.sourceLineSha256,
        )),
      ],
      review: {
        machineAssisted: true,
        mandarinLinguisticReview: "pending",
        vietnameseEditorialReview: "pending",
      },
    };
  });
  const practiceItems = lexemes.flatMap((lexeme, index) => {
    const pinyinDistractors = pickDistinctDistractors({
      lexemes,
      targetIndex: index,
      field: "pinyin",
    });
    const hanziDistractors = pickDistinctDistractors({
      lexemes,
      targetIndex: index,
      field: "simplified",
    });
    const base = {
      lessonId: lexeme.lessonId,
      officialVocabularyId: lexeme.officialId,
      review: "pending",
      releaseEligible: false,
      measurementEligible: false,
      masteryEligible: false,
    };
    return [
      {
        ...base,
        itemId: `${lexeme.lessonId}:${lexeme.officialId}:meaning`,
        kind: "meaning-recall",
        prompt: lexeme.simplified,
        answer: lexeme.vietnameseGlossDraft,
        scoringPolicy: "self-reveal-only",
      },
      {
        ...base,
        itemId: `${lexeme.lessonId}:${lexeme.officialId}:pinyin`,
        kind: "pinyin-recognition",
        prompt: lexeme.simplified,
        options: [
          pinyinDistractors[0],
          lexeme.pinyin,
          pinyinDistractors[1],
          pinyinDistractors[2],
        ],
        correctAnswer: lexeme.pinyin,
        scoringPolicy: "automatic-draft-only",
      },
      {
        ...base,
        itemId: `${lexeme.lessonId}:${lexeme.officialId}:listening`,
        kind: "listening-selection",
        prompt: "Chọn từ bạn nghe được.",
        audio: null,
        ttsText: lexeme.simplified,
        ttsDisclosure: "synthetic-browser-voice",
        options: [
          hanziDistractors[0],
          lexeme.simplified,
          hanziDistractors[1],
          hanziDistractors[2],
        ],
        correctAnswer: lexeme.simplified,
        scoringPolicy: "automatic-draft-only",
      },
    ];
  });
  const lessonAssignments = situationalLessons.map((lesson) => ({
    lessonId: lesson.lessonId,
    vocabularyIds: lesson.inventoryMappings.vocabularyIds,
    practiceItemIds: practiceItems.filter(
      (item) => item.lessonId === lesson.lessonId,
    ).map((item) => item.itemId),
  }));
  const reviewBatches = lessonAssignments.map((assignment) => ({
    batchId: `${assignment.lessonId}:vocabulary-review-v1`,
    lessonId: assignment.lessonId,
    lexemeIds: assignment.vocabularyIds,
    practiceItemIds: assignment.practiceItemIds,
    requiredRoles: [
      "native-mandarin-reviewer",
      "vietnamese-editor",
      "assessment-editor",
    ],
    state: "pending",
    approvals: [],
  }));

  return {
    schemaVersion: 1,
    packId: "hsk2-vocabulary-practice-2026.07",
    level: 2,
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      vocabularyDraftId: vocabularyBundle.draft.draftId,
      vocabularyDraftSha256: fileSha256(vocabularyBundle.draftPath),
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      attribution:
        "content/sources/cc-cedict-debian-2026-04-03/ATTRIBUTION.md",
    },
    authorship: {
      method: "ai-assisted-translation-and-practice-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      reviewedAudioRequiredForMeasurement: true,
      browserTtsPracticeOnly: true,
    },
    counts: {
      situationalLessons: situationalLessons.length,
      vocabularyDrafts: lexemes.length,
      authoredPracticeItems: practiceItems.length,
      meaningRecallItems: practiceItems.filter(
        (item) => item.kind === "meaning-recall",
      ).length,
      pinyinRecognitionItems: practiceItems.filter(
        (item) => item.kind === "pinyin-recognition",
      ).length,
      listeningSelectionItems: practiceItems.filter(
        (item) => item.kind === "listening-selection",
      ).length,
      audioDependentItems: practiceItems.filter(
        (item) => item.kind === "listening-selection",
      ).length,
      reviewedAudioItems: 0,
      reviewBatches: reviewBatches.length,
      approvals: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      vocabularyDraftCoverageComplete: true,
      vocabularyPracticeDraftComplete: true,
      reviewedContentComplete: false,
      assessmentCoverageComplete: false,
      hsk2Complete: false,
    },
    lexemes,
    lessonAssignments,
    practiceItems,
    reviewBatches,
  };
};

export const serializeHsk2VocabularyPractice = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK2_VOCABULARY_PRACTICE_RELATIVE_PATH,
  );
  const serialized = serializeHsk2VocabularyPractice(
    buildHsk2VocabularyPractice(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK2 vocabulary-practice pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK2_VOCABULARY_PRACTICE_RELATIVE_PATH,
    mode: process.argv.includes("--write")
      ? "write"
      : process.argv.includes("--check")
        ? "check"
        : "stdout",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
