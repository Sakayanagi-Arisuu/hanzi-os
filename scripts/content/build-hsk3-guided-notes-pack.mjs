import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk3DiscourseLinkingNarrationPackBundle,
  loadHsk3DiscourseLinkingNarrationPackBundle,
} from "../../src/content/hsk3DiscourseLinkingNarrationPack.mjs";
import {
  collectHsk3ParagraphTextCatalog,
  HSK3_GUIDED_NOTES_LESSON_IDS,
  HSK3_GUIDED_NOTES_PACK_RELATIVE_PATH,
  HSK3_GUIDED_NOTES_TRACK_ID,
} from "../../src/content/hsk3GuidedNotesPack.mjs";
import {
  assertValidHsk3SocietyArtsSportsDomainPackBundle,
  loadHsk3SocietyArtsSportsDomainPackBundle,
} from "../../src/content/hsk3SocietyArtsSportsDomainPack.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const LESSON_1_SOURCE_IDS = [
  "hsk3-personal-life-narratives-identity-transactions:reading-01",
  "hsk3-personal-life-narratives-identity-transactions:listening-01",
  "hsk3-personal-life-narratives-food-shopping:reading-01",
  "hsk3-personal-life-narratives-food-shopping:listening-01",
  "hsk3-study-work-accounts-courses-learning:reading-01",
  "hsk3-study-work-accounts-courses-learning:listening-01",
  "hsk3-study-work-accounts-campus-education:reading-01",
  "hsk3-study-work-accounts-campus-education:listening-01",
];
const LESSON_2_SOURCE_IDS = [
  "hsk3-study-work-accounts-office-tasks:reading-01",
  "hsk3-study-work-accounts-office-tasks:listening-01",
  "hsk3-study-work-accounts-colleague-workplace:reading-01",
  "hsk3-study-work-accounts-colleague-workplace:listening-01",
  "hsk3-nature-environment-explanations-climate-seasons:reading-01",
  "hsk3-nature-environment-explanations-climate-seasons:listening-01",
  "hsk3-nature-environment-explanations-plants-animals:reading-01",
  "hsk3-nature-environment-explanations-plants-animals:listening-01",
];
const COMPARISON_PAIRS = [
  {
    reading:
      "hsk3-nature-environment-explanations-landscape-place:reading-01",
    listening:
      "hsk3-nature-environment-explanations-landscape-place:listening-01",
    sharedGuideVi: [
      "Chủ đề chung: dùng phương hướng để hiểu và tổ chức không gian.",
      "Bài đọc giới thiệu các khu vực của một thành phố núi theo tám hướng.",
      "Bài nghe kể việc lớp địa lý đổi địa điểm nhưng vẫn ôn tám hướng.",
      "Hai nguồn cùng dùng từ chỉ hướng nhưng có mục đích và tình huống khác nhau.",
    ],
    differenceGuideVi: [
      "Chỉ bài đọc: phía tây nam có hồ yên tĩnh và đường đi bộ.",
      "Chỉ bài nghe: mưa lớn khiến hoạt động chuyển từ vườn sang lớp dưới núi.",
      "Bằng chứng bài đọc ở r06 về 西南、湖、小路.",
      "Bằng chứng bài nghe ở l01–l02 về mưa và đổi địa điểm.",
    ],
    sharedEvidence: ["r01", "l03"],
    differenceEvidence: ["r06", "l01", "l02"],
  },
  {
    reading:
      "hsk3-nature-environment-explanations-environment-state:reading-01",
    listening:
      "hsk3-nature-environment-explanations-environment-state:listening-01",
    sharedGuideVi: [
      "Chủ đề chung: cộng đồng xử lý một vấn đề môi trường trong khu dân cư.",
      "Bài đọc kể buổi dọn cầu thang và phân loại đồ cũ.",
      "Bài nghe kể việc sửa cửa sổ để giảm tiếng máy bay và gió.",
      "Cả hai đều có kiểm tra, giải pháp cụ thể và kết quả cải thiện có giới hạn.",
    ],
    differenceGuideVi: [
      "Chỉ bài đọc: người dân tắt điều hòa khi nghỉ để bớt dùng điện.",
      "Chỉ bài nghe: kỹ sư đo cửa sổ và đề nghị thay cửa cũ không kín.",
      "Bằng chứng bài đọc ở r04–r05 về điều hòa và điện.",
      "Bằng chứng bài nghe ở l04–l05 về đo và thay cửa.",
    ],
    sharedEvidence: ["r01", "r08", "l03", "l08"],
    differenceEvidence: ["r04", "r05", "l04", "l05"],
  },
  {
    reading: "hsk3-society-arts-sports-reports-modern-life:reading-01",
    listening:
      "hsk3-society-arts-sports-reports-modern-life:listening-01",
    sharedGuideVi: [
      "Chủ đề chung: thay đổi thói quen để thích nghi với đời sống hiện đại.",
      "Bài đọc kể ông học xem tin trên điện thoại nhưng giữ thói quen đọc báo cuối tuần.",
      "Bài nghe kể Tiểu Trần thêm cầu lông vào cuộc sống vốn chỉ có công việc và tin tức.",
      "Cả hai không xóa thói quen cũ mà điều chỉnh để đời sống cân bằng hơn.",
    ],
    differenceGuideVi: [
      "Chỉ bài đọc: cháu gái tặng tai nghe và cùng ông xem tin trên điện thoại.",
      "Chỉ bài nghe: bãi đỗ xe cũ được đổi thành sân thể thao cộng đồng.",
      "Bằng chứng bài đọc ở r03–r06 về điện thoại và báo cuối tuần.",
      "Bằng chứng bài nghe ở l02 và l05–l06 về sân thể thao và cầu lông.",
    ],
    sharedEvidence: ["r08", "l07", "l08"],
    differenceEvidence: ["r03", "r06", "l02", "l05", "l06"],
  },
  {
    reading:
      "hsk3-society-arts-sports-reports-arts-activities:reading-01",
    listening:
      "hsk3-society-arts-sports-reports-arts-activities:listening-01",
    sharedGuideVi: [
      "Chủ đề chung: chuẩn bị biểu diễn cần hợp tác và chăm sóc con người.",
      "Bài đọc kể Tiểu Lan luyện hát, được bạn nhắc ăn và nghỉ.",
      "Bài nghe kể cả nhóm dừng nhạc để giúp một bạn sửa giày.",
      "Hai nguồn đều đặt sức khỏe và giúp đỡ nhau bên cạnh thành tích nghệ thuật.",
    ],
    differenceGuideVi: [
      "Chỉ bài đọc: Tiểu Lan đói nhưng chưa muốn rời sân khấu.",
      "Chỉ bài nghe: giày một học sinh hỏng ngay trước buổi diễn.",
      "Bằng chứng bài đọc ở r05–r06 về đói và bánh mì.",
      "Bằng chứng bài nghe ở l03–l05 về giày hỏng và cả nhóm giúp sửa.",
    ],
    sharedEvidence: ["r03", "r08", "l07", "l08"],
    differenceEvidence: ["r05", "r06", "l03", "l04", "l05"],
  },
];

const SINGLE_SOURCE_GUIDES = new Map([
  [LESSON_1_SOURCE_IDS[0], {
    answerGuideVi: [
      "Ai: Tiểu Lâm, nhân viên một công ty.",
      "Việc chính: xin nghỉ để tham gia hoạt động tiếng Trung cuối tuần.",
      "Ở đâu: văn phòng công ty, qua tổ trưởng và quản lý.",
      "Kết quả: quản lý đồng ý và Tiểu Lâm hiểu thủ tục.",
    ],
    evidenceLineIds: ["r01", "r03", "r06", "r07", "r08"],
  }],
  [LESSON_1_SOURCE_IDS[1], {
    answerGuideVi: [
      "Ai: chú Châu ở trung tâm dịch vụ và người giao đồ ăn.",
      "Việc chính: kiểm tra đơn không có tên và số phòng rõ.",
      "Ở đâu: trung tâm dịch vụ, vườn cạnh văn phòng hoạt động.",
      "Kết quả: bổ sung địa điểm rồi đưa người giao hàng tới đúng chỗ.",
    ],
    evidenceLineIds: ["l01", "l02", "l03", "l06", "l07"],
  }],
  [LESSON_1_SOURCE_IDS[2], {
    answerGuideVi: [
      "Ai: Vương Lệ đi mua máy ảnh và quần đùi.",
      "Việc chính: so ba cửa hàng, thử máy và thử quần.",
      "Ở đâu: một thành phố ven sông, sau đó trên tàu cao tốc.",
      "Kết quả: mua món phù hợp dù giá cao hơn dự tính.",
    ],
    evidenceLineIds: ["r01", "r03", "r05", "r06", "r07"],
  }],
  [LESSON_1_SOURCE_IDS[3], {
    answerGuideVi: [
      "Ai: một vị khách, nhân viên phục vụ và quản lý Trương.",
      "Việc chính: điều chỉnh khẩu phần và âm lượng theo phản hồi khách.",
      "Ở đâu: trong nhà hàng.",
      "Kết quả: khách hài lòng; quản lý coi cảm nhận khách quan trọng hơn chỉ nhìn thực đơn.",
    ],
    evidenceLineIds: ["l01", "l02", "l04", "l05", "l06", "l08"],
  }],
  [LESSON_1_SOURCE_IDS[4], {
    answerGuideVi: [
      "Ai: giáo viên và học sinh trong lớp.",
      "Việc chính: thực hiện kế hoạch đọc, ghi trọng điểm và đọc lặp ba lần.",
      "Ở đâu: trường học, từ sân bóng trở về lớp.",
      "Kết quả: sau một tháng học sinh nhớ nhanh và tự tìm trọng điểm.",
    ],
    evidenceLineIds: ["r01", "r02", "r03", "r04", "r07"],
  }],
  [LESSON_1_SOURCE_IDS[5], {
    answerGuideVi: [
      "Ai: Tiểu Lâm và nhân viên đăng ký.",
      "Việc chính: đăng ký khóa ngôn ngữ và kiểm tra thiết bị.",
      "Ở đâu: trao đổi qua thư điện tử trước giờ học.",
      "Kết quả: Tiểu Lâm yên tâm và ghi lại giờ khai giảng.",
    ],
    evidenceLineIds: ["l01", "l02", "l05", "l06", "l08"],
  }],
  [LESSON_1_SOURCE_IDS[6], {
    answerGuideVi: [
      "Ai: Tiểu Vũ, em gái, hiệu trưởng và phụ huynh.",
      "Việc chính: tham quan, nghe giới thiệu lịch và các tòa nhà.",
      "Ở đâu: khuôn viên mới, thư viện và bảng lớp.",
      "Kết quả: hai chị em thấy môi trường học mới đáng yên tâm.",
    ],
    evidenceLineIds: ["r01", "r02", "r03", "r06", "r08"],
  }],
  [LESSON_1_SOURCE_IDS[7], {
    answerGuideVi: [
      "Ai: Tiểu An, hai chị em và giáo viên ký túc.",
      "Việc chính: trao đổi về việc chỉ ăn mì và cần ăn theo thực đơn.",
      "Ở đâu: ký túc xá và cửa nhà ăn.",
      "Kết quả: Tiểu An hứa từ hôm sau ăn tối nghiêm túc.",
    ],
    evidenceLineIds: ["l01", "l02", "l04", "l05", "l07", "l08"],
  }],
  [LESSON_2_SOURCE_IDS[0], {
    answerGuideVi: [
      "Mốc đầu: sáng ngày làm việc, trước cuộc họp lúc chín giờ.",
      "Sự kiện: cuốn từ điển dùng cho cuộc họp biến mất.",
      "Nguyên nhân: quản lý đã mang nó tới phòng thu hôm trước.",
      "Kết quả: lấy lại trước họp và lập bảng mượn chung trong thư điện tử.",
    ],
    evidenceLineIds: ["r01", "r02", "r04", "r05", "r06", "r08"],
  }],
  [LESSON_2_SOURCE_IDS[1], {
    answerGuideVi: [
      "Mốc đầu: trước cuộc họp chiều, tàu của khách bị trễ.",
      "Sự kiện: văn phòng phải chọn hoãn họp hay cho khách tham gia trực tuyến.",
      "Nguyên nhân: tàu trễ và chân khách bị thương.",
      "Kết quả: họp đúng giờ qua video và gửi tệp ghi lại sau họp.",
    ],
    evidenceLineIds: ["l01", "l02", "l03", "l04", "l07", "l08"],
  }],
  [LESSON_2_SOURCE_IDS[2], {
    answerGuideVi: [
      "Mốc đầu: ngày đầu đồng nghiệp Trần Hải chuẩn bị tập huấn ở cảng.",
      "Sự kiện: học quy tắc an toàn và luyện leo thang ngắn bên tàu.",
      "Nguyên nhân: chỉ học được quy tắc mới được làm việc trên tàu.",
      "Kết quả: hoàn thành tập huấn, hiểu quy trình và gần đồng nghiệp hơn.",
    ],
    evidenceLineIds: ["r01", "r03", "r04", "r05", "r06", "r08"],
  }],
  [LESSON_2_SOURCE_IDS[3], {
    answerGuideVi: [
      "Mốc đầu: công ty sắp đón sáu khách với mười hai kiện hành lý.",
      "Sự kiện: nhóm phân hành lý theo số phòng và nhãn.",
      "Nguyên nhân: hai người chuyển đồ có thể không đủ thời gian.",
      "Kết quả: phân công rõ nên mọi kiện tới đúng phòng nhanh chóng.",
    ],
    evidenceLineIds: ["l01", "l02", "l04", "l05", "l07", "l08"],
  }],
  [LESSON_2_SOURCE_IDS[4], {
    answerGuideVi: [
      "Mốc đầu: bắt đầu từ mùa xuân rồi đi qua bốn mùa.",
      "Sự kiện: thời tiết và cách sinh hoạt thay đổi theo mùa.",
      "Nguyên nhân: nhiệt độ, gió, băng và nguy cơ cảm sốt khác nhau.",
      "Kết quả: hiểu bốn mùa để sắp xếp cuộc sống, không phải để sợ thời tiết.",
    ],
    evidenceLineIds: ["r01", "r02", "r03", "r04", "r06", "r08"],
  }],
  [LESSON_2_SOURCE_IDS[5], {
    answerGuideVi: [
      "Mốc đầu: sau chuyến mùa xuân bị cảm, trước chuyến mùa thu.",
      "Sự kiện: Tiểu Phương xem thời tiết và lập lại danh sách hành lý.",
      "Nguyên nhân: ban ngày mát nhưng đêm có gió lạnh; hành lý đổi theo mùa.",
      "Kết quả: chuẩn bị áo, áo mưa, đồ an toàn và thấy yên tâm hơn.",
    ],
    evidenceLineIds: ["l01", "l02", "l03", "l04", "l06", "l08"],
  }],
  [LESSON_2_SOURCE_IDS[6], {
    answerGuideVi: [
      "Mốc đầu: trong kỳ nghỉ, người lớn và trẻ em sửa vườn cũ.",
      "Sự kiện: trồng cây, gắn bảng và chia việc tưới–kiểm tra đất.",
      "Nguyên nhân: muốn biến vườn thành nơi học tự nhiên bằng việc nhỏ.",
      "Kết quả: vài tháng sau cây lớn và khu vườn thành nơi mọi người thường tới.",
    ],
    evidenceLineIds: ["r01", "r02", "r03", "r06", "r07", "r08"],
  }],
  [LESSON_2_SOURCE_IDS[7], {
    answerGuideVi: [
      "Mốc đầu: kỳ nghỉ sau khi vườn thú thêm khu trải nghiệm.",
      "Sự kiện: làm trang hướng dẫn hai trang về cho động vật ăn.",
      "Nguyên nhân: có người cho ngựa quá nhiều thức ăn.",
      "Kết quả: khách hiểu mỗi loài cần cách chăm sóc khác nhau.",
    ],
    evidenceLineIds: ["l01", "l02", "l03", "l04", "l05", "l07"],
  }],
]);

const REVISION_CHECKLIST = [
  "Kiểm tra mỗi ghi chú có bằng chứng ở đúng dòng nguồn, không thêm chi tiết suy đoán.",
  "Tách ý chính khỏi chi tiết hỗ trợ và giữ từ nối chỉ đúng quan hệ thời gian hoặc nguyên nhân.",
  "Sau khi xem gợi ý, viết lại bằng lời của mình; không chép gợi ý để tự cấp mastery.",
];
const FIELDS_BY_LESSON = new Map([
  [
    HSK3_GUIDED_NOTES_LESSON_IDS[0],
    ["Ai/đối tượng", "Việc chính", "Nơi/tình huống", "Kết quả"],
  ],
  [
    HSK3_GUIDED_NOTES_LESSON_IDS[1],
    ["Mốc đầu", "Sự kiện/thay đổi", "Nguyên nhân", "Kết quả"],
  ],
]);
const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "audio-rights-reviewer",
];

const skillForText = (text) =>
  text.kind === "graded-listening" ? "listening" : "reading";

const makeItem = ({
  lessonId,
  index,
  mode,
  promptKind,
  sources,
  promptVi,
  requiredResponseFieldsVi,
  answerGuideVi,
  evidenceLineIds,
}) => {
  const inputSkills = sources.map(({ text }) => skillForText(text));
  const hasListening = inputSkills.includes("listening");
  return {
    itemId: `${lessonId}:prompt-${String(index + 1).padStart(2, "0")}`,
    lessonId,
    mode,
    promptKind,
    inputRefs: sources.map(({ text }) => ({ textId: text.textId })),
    inputSkills,
    responseSkill: "writing",
    promptVi,
    requiredResponseFieldsVi,
    answerGuideVi,
    evidenceLineIds,
    revisionChecklistVi: REVISION_CHECKLIST,
    responseMode: "guided-notes-with-model-reveal-and-revision",
    scoringPolicy: "source-exposed-practice-only",
    reviewedRubric: null,
    modelRevealCanGrantMastery: false,
    audio: null,
    syntheticBrowserVoicePreviewOnly: hasListening,
    reviewedAudioRequiredForRelease: hasListening,
    review: "pending",
    measurementEligible: false,
    masteryEligible: false,
    releaseEligible: false,
  };
};

export const buildHsk3GuidedNotesPack = (root = process.cwd()) => {
  const narrationBundle =
    loadHsk3DiscourseLinkingNarrationPackBundle(root);
  assertValidHsk3DiscourseLinkingNarrationPackBundle(narrationBundle);
  const paragraphBundle =
    loadHsk3SocietyArtsSportsDomainPackBundle(root);
  assertValidHsk3SocietyArtsSportsDomainPackBundle(paragraphBundle);
  const blueprintBundle = narrationBundle.blueprintBundle;
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const sourceCatalog = collectHsk3ParagraphTextCatalog(paragraphBundle);
  const selectedTextIds = [
    ...LESSON_1_SOURCE_IDS,
    ...LESSON_2_SOURCE_IDS,
    ...COMPARISON_PAIRS.flatMap((pair) => [pair.reading, pair.listening]),
  ];
  const sourceTexts = selectedTextIds.map((textId) => {
    const source = sourceCatalog.get(textId);
    if (!source) throw new Error(`Missing HSK3 paragraph source ${textId}`);
    return {
      textId,
      sourcePackId: source.sourcePackId,
      sourceLessonId: source.sourceLessonId,
      text: source.text,
    };
  });
  const selectedSourceById = new Map(
    sourceTexts.map((source) => [source.textId, source]),
  );

  const firstLesson = blueprintById.get(HSK3_GUIDED_NOTES_LESSON_IDS[0]);
  const firstItems = LESSON_1_SOURCE_IDS.map((textId, index) => {
    const source = selectedSourceById.get(textId);
    const guide = SINGLE_SOURCE_GUIDES.get(textId);
    return makeItem({
      lessonId: firstLesson.lessonId,
      index,
      mode: firstLesson.promptPlan.mode,
      promptKind: "main-idea-actor-action-place-grid",
      sources: [source],
      promptVi:
        `Đọc/nghe “${source.text.titleVi}” rồi ghi bốn ô ai–việc gì–ở đâu–kết quả. Mỗi ô phải ngắn và có thể chỉ lại dòng nguồn.`,
      requiredResponseFieldsVi: FIELDS_BY_LESSON.get(firstLesson.lessonId),
      answerGuideVi: guide.answerGuideVi,
      evidenceLineIds: guide.evidenceLineIds,
    });
  });

  const secondLesson = blueprintById.get(HSK3_GUIDED_NOTES_LESSON_IDS[1]);
  const secondItems = LESSON_2_SOURCE_IDS.map((textId, index) => {
    const source = selectedSourceById.get(textId);
    const guide = SINGLE_SOURCE_GUIDES.get(textId);
    return makeItem({
      lessonId: secondLesson.lessonId,
      index,
      mode: secondLesson.promptPlan.mode,
      promptKind: "timeline-cause-note-grid",
      sources: [source],
      promptVi:
        `Đọc/nghe “${source.text.titleVi}”, ghi mốc đầu–sự kiện–nguyên nhân–kết quả; phân biệt nguyên nhân được nói rõ với suy đoán của người học.`,
      requiredResponseFieldsVi: FIELDS_BY_LESSON.get(secondLesson.lessonId),
      answerGuideVi: guide.answerGuideVi,
      evidenceLineIds: guide.evidenceLineIds,
    });
  });

  const thirdLesson = blueprintById.get(HSK3_GUIDED_NOTES_LESSON_IDS[2]);
  const thirdItems = COMPARISON_PAIRS.flatMap((pair, pairIndex) => {
    const reading = selectedSourceById.get(pair.reading);
    const listening = selectedSourceById.get(pair.listening);
    return [
      makeItem({
        lessonId: thirdLesson.lessonId,
        index: pairIndex * 2,
        mode: thirdLesson.promptPlan.mode,
        promptKind: "listening-reading-detail-comparison",
        sources: [reading, listening],
        promptVi:
          `Đối chiếu bài đọc “${reading.text.titleVi}” với bài nghe “${listening.text.titleVi}”: ghi chủ đề chung, trọng tâm mỗi nguồn và giới hạn của kết luận chung.`,
        requiredResponseFieldsVi: [
          "Chủ đề chung",
          "Trọng tâm bài đọc",
          "Trọng tâm bài nghe",
          "Giới hạn kết luận",
        ],
        answerGuideVi: pair.sharedGuideVi,
        evidenceLineIds: pair.sharedEvidence,
      }),
      makeItem({
        lessonId: thirdLesson.lessonId,
        index: pairIndex * 2 + 1,
        mode: thirdLesson.promptPlan.mode,
        promptKind: "listening-reading-detail-comparison",
        sources: [reading, listening],
        promptVi:
          `Với cùng cặp nguồn, tìm một chi tiết chỉ có trong bài đọc và một chi tiết chỉ có trong bài nghe; ghi dòng bằng chứng thay vì trộn hai nguồn.`,
        requiredResponseFieldsVi: [
          "Chi tiết chỉ bài đọc",
          "Chi tiết chỉ bài nghe",
          "Bằng chứng bài đọc",
          "Bằng chứng bài nghe",
        ],
        answerGuideVi: pair.differenceGuideVi,
        evidenceLineIds: pair.differenceEvidence,
      }),
    ];
  });

  const lessonItems = new Map([
    [firstLesson.lessonId, firstItems],
    [secondLesson.lessonId, secondItems],
    [thirdLesson.lessonId, thirdItems],
  ]);
  const lessons = HSK3_GUIDED_NOTES_LESSON_IDS.map((lessonId) => {
    const blueprint = blueprintById.get(lessonId);
    const promptUnits = lessonItems.get(lessonId);
    const reviewBatch = {
      batchId: `${lessonId}:guided-notes-review-v1`,
      lessonId,
      promptItemIds: promptUnits.map((item) => item.itemId),
      requiredRoles: REQUIRED_REVIEW_ROLES,
      state: "pending",
      approvals: [],
    };
    return {
      lessonId,
      blueprintTitleVi: blueprint.titleVi,
      blueprintObjectiveVi: blueprint.objectiveVi,
      contextDomainIds: blueprint.promptPlan.contextDomainIds,
      promptUnits,
      reviewBatch,
    };
  });
  const allItems = lessons.flatMap((lesson) => lesson.promptUnits);
  const counts = {
    lessons: lessons.length,
    completedGuidedProductionStages: 1,
    completedGuidedProductionLessons: 3,
    sourceTexts: sourceTexts.length,
    sourceTextLines: sourceTexts.flatMap((source) => source.text.lines).length,
    promptUnits: allItems.length,
    readingInputPromptUnits: allItems.filter((item) =>
      item.inputSkills.includes("reading")
    ).length,
    listeningInputPromptUnits: allItems.filter((item) =>
      item.inputSkills.includes("listening")
    ).length,
    integratedListeningReadingPromptUnits: allItems.filter(
      (item) => item.inputSkills.length === 2,
    ).length,
    revisionChecklists: allItems.length,
    audioDependentPromptUnits: allItems.filter(
      (item) => item.reviewedAudioRequiredForRelease,
    ).length,
    reviewedAudioPromptUnits: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  return {
    schemaVersion: 1,
    packId: "hsk3-main-idea-detail-notes-2026.07",
    level: 3,
    trackId: HSK3_GUIDED_NOTES_TRACK_ID,
    state: "ai-assisted-guided-production-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      narrationPrerequisitePackId: narrationBundle.pack.packId,
      narrationPrerequisitePackSha256: fileSha256(narrationBundle.packPath),
      paragraphSourceTipPackId: paragraphBundle.pack.packId,
      paragraphSourceTipPackSha256: fileSha256(paragraphBundle.packPath),
    },
    authorship: {
      method: "ai-assisted-integrated-note-production-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
      audioRightsReviewer: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      audioRightsRequiredWhereAudioDependent: true,
      sourceExposedPracticeCannotCalibrateAssessment: true,
    },
    masteryPolicy: {
      inputSkillsSeparatedFromWritingEvidence: true,
      modelRevealCannotGrantMastery: true,
      browserTtsCannotGrantListeningMastery: true,
      newCharacterOwnershipClaims: 0,
      sourceRecognitionCharacterMappings:
        blueprintBundle.pack.counts.recognitionCharacterBlueprintMappings,
    },
    coverageClaims: {
      stagePromptDraftsComplete: true,
      completedGuidedProductionStages: 1,
      completedGuidedProductionLessons: 3,
      allGuidedProductionLessonsComplete: false,
      reviewedContentComplete: false,
      assessmentCoverageComplete: false,
      hsk3Complete: false,
    },
    counts,
    sourceTexts,
    lessons,
    reviewBatches: lessons.map((lesson) => lesson.reviewBatch),
  };
};

export const serializeHsk3GuidedNotesPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_GUIDED_NOTES_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3GuidedNotesPack(
    buildHsk3GuidedNotesPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 guided-notes pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_GUIDED_NOTES_PACK_RELATIVE_PATH,
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
