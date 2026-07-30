import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4LongFormDomainPack,
  serializeHsk4LongFormDomainPack,
} from "./hsk4-long-form-domain-builder.mjs";
import {
  HSK4_EDUCATION_WORK_DOMAIN_ID,
  HSK4_EDUCATION_WORK_LESSON_IDS,
  HSK4_EDUCATION_WORK_LONG_FORM_CONFIG,
  HSK4_EDUCATION_WORK_LONG_FORM_RELATIVE_PATH,
} from "../../src/content/hsk4EducationWorkLongFormPack.mjs";
import {
  loadHsk4PersonalCommunityLongFormPackBundle,
} from "../../src/content/hsk4PersonalCommunityLongFormPack.mjs";

const V = (sequence) =>
  `hsk-vocab-${String(sequence).padStart(5, "0")}`;

const VI_GLOSS_BY_SEQUENCE = {
  1024: "bậc đại học; cử nhân",
  1256: "công nhân",
  1431: "khóa học; môn học",
  1702: "thạc sĩ",
  1950: "nghề nghiệp",
  1969: "chuyên ngành; chuyên môn",
  1282: "quá trình",
  1736: "điều kiện",
  1778: "bài viết",
  1995: "tác phẩm; sản phẩm sáng tạo",
  1377: "giáo dục",
  1565: "cuối kỳ",
  1624: "nhập học",
  1737: "kỹ năng nghe",
  1980: "tự; bản thân",
  1984: "tự học",
  1025: "vốn dĩ; ban đầu",
  1197: "từ bỏ",
  1526: "khó quên",
  1811: "tin tức; thông báo",
  1881: "ưu điểm",
  1018: "đăng ký; ghi danh",
  1029: "tốt nghiệp",
  1087: "lại từ đầu; làm lại",
  1380: "tiếp nhận; chấp nhận",
  1411: "nêu ví dụ",
  1484: "trôi chảy",
  1521: "kiên nhẫn",
  1596: "đạt được; giành được",
  1807: "chi tiết",
  1982: "tự học có tổ chức; phòng tự học",
  1162: "điều tra; khảo sát",
  1382: "kết quả",
  1629: "bàn bạc",
  1735: "điền; điền vào",
  1809: "ý tưởng; suy nghĩ",
  1055: "không những",
  1090: "xuất hiện",
  1699: "cách nói; quan điểm",
  1879: "dùng để",
  1194: "phương thức; cách thức",
  1234: "làm việc chân tay; làm việc",
  1269: "then chốt",
  1308: "thư trả lời",
  1412: "tổ chức; tiến hành",
  1485: "để lại; lưu lại",
  1698: "thứ tự; trình tự",
  1952: "chỉ ra",
  1992: "cách làm",
  1557: "thường ngày",
  1056: "không hài lòng",
  1126: "số lượng lớn",
  1273: "quản lý",
  1349: "giảm; bớt",
  1416: "từ chối",
  1599: "toàn bộ",
  1668: "sử dụng",
  1955: "chất lượng",
  1919: "buổi sáng",
  1311: "việc; công việc; sống",
};

const q = (
  kind,
  prompt,
  options,
  answer,
  evidence,
  rationale,
  boundary = null,
) => [kind, prompt, options, answer, evidence, rationale, boundary];
const map = (nodes, relations) => ({ nodes, relations });

const ID = {
  concept: `${HSK4_EDUCATION_WORK_DOMAIN_ID}-concept-actor-map`,
  process: `${HSK4_EDUCATION_WORK_DOMAIN_ID}-process-timeline`,
  cause: `${HSK4_EDUCATION_WORK_DOMAIN_ID}-cause-condition-result`,
  compare: `${HSK4_EDUCATION_WORK_DOMAIN_ID}-comparison-variation`,
  evidence: `${HSK4_EDUCATION_WORK_DOMAIN_ID}-claim-evidence-inference`,
  viewpoint: `${HSK4_EDUCATION_WORK_DOMAIN_ID}-viewpoint-synthesis`,
};

const CONTENT = {
  [ID.concept]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "从本科课程到职业选择",
        titleVi: "Từ chương trình cử nhân đến lựa chọn nghề nghiệp",
        targetVocabularyIds: [
          V(1024), V(1431), V(1702), V(1950), V(1969),
        ],
        paragraphs: [
          [
            "大学信息中心跟踪了三十名本科生怎样选择专业和职业。学生入学时先完成基础课程，由课程老师介绍不同学科的问题和方法；第二年，专业导师帮助他们比较能力、兴趣与行业要求。中心发现，学生并不是听完一次介绍就作出决定，而是在多门课和多次谈话中逐步形成方向。",
            "Trung tâm thông tin đại học theo dõi cách ba mươi sinh viên cử nhân chọn chuyên ngành và nghề nghiệp. Khi nhập học, họ hoàn thành môn cơ sở; giáo viên giới thiệu vấn đề và phương pháp các ngành. Năm hai, cố vấn giúp so năng lực, sở thích với yêu cầu ngành nghề. Hướng đi không hình thành sau một buổi giới thiệu mà qua nhiều môn và nhiều cuộc trao đổi.",
          ],
          [
            "其中六名学生希望以后读硕士，便参加研究项目，学习提出问题和整理资料；另外九人更关心直接就业，于是到企业观察岗位。导师的角色不是替学生选择，而是说明不同道路需要什么证据，例如研究方向要有文章和长期阅读，就业方向则要展示合作经验和解决实际问题的能力。",
            "Sáu sinh viên muốn học thạc sĩ nên tham gia dự án nghiên cứu, học đặt câu hỏi và xử lý tài liệu; chín người quan tâm đi làm trực tiếp nên quan sát vị trí ở doanh nghiệp. Cố vấn không chọn thay mà chỉ ra bằng chứng mỗi đường cần: hướng nghiên cứu cần bài viết và đọc dài hạn, hướng việc làm cần kinh nghiệm phối hợp và giải quyết vấn đề thực.",
          ],
          [
            "第三年末，学生向由教师、毕业生和企业人员组成的小组说明计划。小组只提供反馈，不负责录取或招聘。有人根据反馈换了专业，也有人保留原计划。调查因此把“决定者”“信息提供者”和“机会提供者”分开，避免把导师的建议误认为学校保证的结果。",
            "Cuối năm ba, sinh viên trình bày kế hoạch trước nhóm gồm giáo viên, cựu sinh viên và nhân sự doanh nghiệp. Nhóm chỉ phản hồi, không quyết định tuyển sinh hay tuyển dụng. Có người đổi chuyên ngành, có người giữ kế hoạch. Khảo sát tách “người quyết định”, “người cung cấp thông tin” và “người tạo cơ hội” để tránh coi lời cố vấn là kết quả được trường bảo đảm.",
          ],
        ],
        questions: [
          q("main-claim", "Bài đọc chủ yếu làm rõ điều gì?", [
            "Vai trò khác nhau trong quá trình chọn chuyên ngành và nghề",
            "Cách trường bảo đảm việc làm cho mọi sinh viên",
            "Lý do tất cả sinh viên phải học thạc sĩ",
            "Bảng xếp hạng các môn học khó nhất",
          ], 0, ["rp1", "rp2", "rp3"],
          "Ba đoạn phân vai giáo viên, cố vấn, nhóm phản hồi và sinh viên."),
          q("supported-detail", "Ai là người đưa ra quyết định cuối về hướng đi?", [
            "Chính sinh viên",
            "Nhóm doanh nghiệp",
            "Giáo viên môn cơ sở",
            "Trung tâm thông tin",
          ], 0, ["rp2", "rp3"],
          "Cố vấn không chọn thay và nhóm cuối chỉ phản hồi."),
          q("cross-paragraph-evidence", "Chi tiết nào thể hiện quá trình quyết định dùng nhiều nguồn?", [
            "Môn học, tư vấn, dự án hoặc quan sát việc làm và phản hồi cuối",
            "Chỉ một bài kiểm tra nhập học",
            "Chỉ ý kiến của doanh nghiệp",
            "Chỉ một bài viết của sinh viên",
          ], 0, ["rp1", "rp2", "rp3"],
          "Mỗi đoạn bổ sung một nguồn thông tin hoặc trải nghiệm."),
          q("bounded-inference", "Có thể suy ra vì sao bài tách ba loại vai trò?", [
            "Để tránh biến lời khuyên thành lời bảo đảm kết quả",
            "Để loại giáo viên khỏi quá trình",
            "Để doanh nghiệp chọn chuyên ngành thay sinh viên",
            "Để mọi sinh viên đi cùng một con đường",
          ], 0, ["rp2", "rp3"],
          "Đoạn cuối nói rõ mục đích tránh hiểu nhầm quyền hạn của cố vấn.",
          "Nguồn chỉ mô tả thiết kế hỗ trợ của trường này, không chứng minh mọi trường phân vai giống vậy."),
          q("scope-limit", "Kết luận nào vượt quá dữ liệu?", [
            "Một số sinh viên đổi chuyên ngành sau phản hồi",
            "Nhóm phản hồi không trực tiếp tuyển dụng",
            "Mọi sinh viên theo hướng nghiên cứu đều chắc chắn vào cao học",
            "Bằng chứng cần thiết khác nhau theo hướng đi",
          ], 2, ["rp2", "rp3"],
          "Bài không có kết quả tuyển sinh và cảnh báo không coi tư vấn là bảo đảm."),
        ],
        noteMap: map([
          ["student", "Người quyết định", "Sinh viên tích lũy bằng chứng và chọn hướng.", ["rp1", "rp3"]],
          ["teacher", "Giáo viên", "Giới thiệu câu hỏi, phương pháp và môn học.", ["rp1"]],
          ["advisor", "Cố vấn", "So năng lực, yêu cầu và loại bằng chứng.", ["rp1", "rp2"]],
          ["providers", "Người tạo cơ hội", "Dự án nghiên cứu và doanh nghiệp cho trải nghiệm.", ["rp2"]],
          ["panel", "Nhóm phản hồi", "Góp ý nhưng không tuyển sinh hoặc tuyển dụng.", ["rp3"]],
        ], [
          ["teacher", "cung cấp nền cho", "student"],
          ["advisor", "giúp đánh giá", "student"],
          ["providers", "cung cấp bằng chứng cho", "student"],
          ["panel", "phản hồi kế hoạch của", "student"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "工人与工程师共同完成的作品",
        titleVi: "Sản phẩm do công nhân và kỹ sư cùng hoàn thành",
        targetVocabularyIds: [
          V(1256), V(1282), V(1736), V(1778), V(1995),
        ],
        paragraphs: [
          [
            "职业学校介绍了一项桥梁模型课程。工程老师先写设计文章，说明材料和安全条件；学生根据文章画图，再由有经验的工人师傅展示切割和连接方法。学校强调，图纸、说明和动手操作都是作品的一部分，不能只把最后的模型当成学习结果。",
            "Trường nghề giới thiệu khóa mô hình cầu. Giáo viên kỹ thuật viết bài thiết kế giải thích vật liệu và điều kiện an toàn; học sinh vẽ theo, rồi công nhân lành nghề trình diễn cắt và nối. Trường nhấn mạnh bản vẽ, thuyết minh và thao tác đều là phần của sản phẩm, không chỉ mô hình cuối.",
          ],
          [
            "制作过程分成四步。学生先预测哪一处最容易受力，再做小样测试；工人师傅观察工具使用，工程老师检查计算。第一次测试失败时，师傅没有直接修好，而是指出连接不整齐；老师则要求学生回到数据，说明为什么要改变设计。两种反馈关注的对象不同。",
            "Quá trình làm gồm bốn bước. Học sinh dự đoán điểm chịu lực rồi thử mẫu nhỏ; thợ quan sát dùng dụng cụ, giáo viên kiểm tra tính toán. Khi lần thử đầu thất bại, thợ không sửa hộ mà chỉ ra mối nối lệch; giáo viên yêu cầu quay lại dữ liệu và giải thích lý do đổi thiết kế. Hai phản hồi tập trung đối tượng khác nhau.",
          ],
          [
            "课程结束后，学校展出了模型、测试记录和修改说明。参观者可以看到，安全条件由老师把关，操作质量由师傅指导，设计选择由学生解释。展览没有比较哪一类人更重要，而是展示知识怎样在不同角色之间传递。课程目前只有一个班参加，效果还要与下一届比较。",
            "Kết thúc khóa, trường trưng bày mô hình, sổ thử nghiệm và thuyết minh sửa đổi. Khách thấy giáo viên kiểm điều kiện an toàn, thợ hướng dẫn chất lượng thao tác, còn học sinh giải thích lựa chọn thiết kế. Triển lãm không so ai quan trọng hơn mà cho thấy tri thức truyền qua vai trò. Hiện chỉ một lớp tham gia nên cần so với khóa sau.",
          ],
        ],
        questions: [
          q("main-claim", "Bài nghe giải thích cấu trúc hợp tác nào?", [
            "Giáo viên, thợ và học sinh giữ trách nhiệm khác nhau trong một sản phẩm",
            "Thợ làm toàn bộ mô hình thay học sinh",
            "Chỉ tính toán được xem là kết quả",
            "Triển lãm dùng để tuyển công nhân",
          ], 0, ["lp1", "lp2", "lp3"],
          "Ba đoạn chỉ rõ nhiệm vụ và đối tượng phản hồi của từng vai trò."),
          q("supported-detail", "Khi thử nghiệm thất bại, người thợ làm gì?", [
            "Chỉ ra mối nối không đều nhưng không sửa hộ",
            "Viết lại toàn bộ bài thiết kế",
            "Hủy khóa học",
            "Thay học sinh giải thích dữ liệu",
          ], 0, ["lp2"],
          "Đoạn 2 nêu rõ thợ phát hiện lỗi thao tác và để học sinh tự sửa."),
          q("cross-paragraph-evidence", "Những thành phần nào cùng được tính là sản phẩm học tập?", [
            "Bản vẽ, mô hình, dữ liệu thử và giải thích sửa đổi",
            "Chỉ chiếc cầu cuối",
            "Chỉ bài viết của giáo viên",
            "Chỉ cách dùng dụng cụ",
          ], 0, ["lp1", "lp3"],
          "Đoạn đầu mở rộng khái niệm sản phẩm; đoạn cuối trưng bày đủ bằng chứng."),
          q("bounded-inference", "Có thể suy ra vì sao hai loại phản hồi được giữ riêng?", [
            "Chúng kiểm tra kỹ năng thao tác và lập luận thiết kế khác nhau",
            "Giáo viên và thợ không được nói chuyện",
            "Học sinh không cần hiểu an toàn",
            "Mô hình không cần dữ liệu",
          ], 0, ["lp2", "lp3"],
          "Thợ theo dõi thao tác, giáo viên theo dõi tính toán và lý do thiết kế.",
          "Có thể kết luận về sự bổ sung vai trò, chưa thể xếp hạng vai trò nào tạo ảnh hưởng lớn hơn."),
          q("scope-limit", "Nguồn chưa chứng minh điều nào?", [
            "Khóa học kết hợp lý thuyết và thực hành",
            "Chỉ một lớp đã tham gia",
            "Mô hình này hiệu quả hơn mọi khóa nghề khác",
            "Triển lãm có hồ sơ sửa đổi",
          ], 2, ["lp3"],
          "Không có nhóm so sánh và bài nói rõ cần theo dõi khóa sau."),
        ],
        noteMap: map([
          ["design", "Thiết kế", "Bài viết, điều kiện và bản vẽ.", ["lp1"]],
          ["practice", "Thực hành", "Cắt, nối và dùng dụng cụ.", ["lp1", "lp2"]],
          ["test", "Kiểm tra", "Dự đoán, mẫu nhỏ và dữ liệu.", ["lp2"]],
          ["feedback", "Phản hồi", "Thợ chỉ thao tác; giáo viên hỏi lập luận.", ["lp2"]],
          ["evidence", "Hồ sơ cuối", "Mô hình, kết quả thử và sửa đổi.", ["lp3"]],
        ], [
          ["design", "được hiện thực qua", "practice"],
          ["practice", "được kiểm tra bởi", "test"],
          ["test", "tạo ra", "feedback"],
          ["feedback", "được lưu trong", "evidence"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán so sánh vai trò và loại bằng chứng trong lựa chọn nghề nghiệp và khóa làm mô hình; nêu rõ ai quyết định, ai phản hồi và giới hạn dữ liệu.",
      requiredElements: [
        "vai trò sinh viên và cố vấn",
        "bằng chứng nghiên cứu/việc làm",
        "vai trò giáo viên, thợ, học sinh",
        "hồ sơ quá trình làm mô hình",
        "giới hạn của hai trường hợp",
      ],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi:
        "选择专业时，学生是决定者，教师、导师和企业提供不同信息与机会；研究文章、合作经验和解决问题的记录帮助学生说明计划，但反馈不等于录取保证。模型课程中，学生解释设计，工程老师检查计算和安全，工人师傅指导操作，最后用模型、测试和修改说明共同证明学习。两份材料都把决定、指导和机会分开，也都只跟踪有限学生或一个班，不能说明这些安排一定适合所有学校。",
      modelVi:
        "Khi chọn chuyên ngành, sinh viên là người quyết định, còn giáo viên, cố vấn và doanh nghiệp cung cấp thông tin cùng cơ hội; bài nghiên cứu, kinh nghiệm hợp tác và hồ sơ giải quyết vấn đề giúp trình bày kế hoạch nhưng phản hồi không bảo đảm trúng tuyển. Trong khóa mô hình, học sinh giải thích thiết kế, giáo viên kiểm tính toán/an toàn, thợ hướng dẫn thao tác; mô hình, thử nghiệm và thuyết minh sửa cùng chứng minh việc học. Hai nguồn đều tách quyết định, hướng dẫn, cơ hội và chỉ theo dõi nhóm nhỏ nên không thể nói phù hợp mọi trường.",
    },
  },
  [ID.process]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "听力小组的一学期",
        titleVi: "Một học kỳ của nhóm luyện nghe",
        targetVocabularyIds: [
          V(1377), V(1565), V(1624), V(1737), V(1980),
        ],
        paragraphs: [
          [
            "九月入学时，八名新生组成听力自学小组。他们本来每天一起听新闻，却只比较听懂多少，没有记录错误。教育中心的老师建议把一周分成三步：第一次只抓主题，第二次补人物和数字，第三次对照文字找出漏听原因。小组从第二周开始使用同一张记录表。",
            "Tháng chín khi nhập học, tám tân sinh viên lập nhóm tự học nghe. Ban đầu họ nghe tin mỗi ngày nhưng chỉ so hiểu bao nhiêu, không ghi lỗi. Giáo viên trung tâm đề nghị chia tuần thành ba bước: lần một bắt chủ đề, lần hai bổ sung người/số, lần ba đối chiếu chữ tìm nguyên nhân bỏ sót. Từ tuần hai nhóm dùng cùng một bảng.",
          ],
          [
            "十月，成员发现速度并不是唯一困难：有人不认识关键词，有人知道词却分不清连续语音。于是每个人从记录中选择一个问题，分别练词汇、停顿或复述。十一月的小测显示，主题题进步最快，数字题仍常出错。小组没有放弃原计划，而是把数字听写增加到每周两次。",
            "Tháng mười, thành viên nhận ra tốc độ không phải khó khăn duy nhất: có người không biết từ khóa, có người biết từ nhưng không tách được lời nói liền. Mỗi người chọn một vấn đề để luyện từ, ngắt hoặc thuật lại. Kiểm tra tháng mười một cho thấy câu chủ đề tiến nhanh nhất, câu số vẫn sai; nhóm không bỏ kế hoạch mà tăng chép số hai lần mỗi tuần.",
          ],
          [
            "期末时，八人都完成了前后两次同难度任务。六人的总分提高，但错误类型不同；两人分数变化小，却能更详细地说明自己为什么没听懂。小组把这项能力也写进总结，因为自学不仅要有结果，还要能判断下一步。不过一个小组的一学期不能代表全部新生。",
            "Cuối kỳ, cả tám làm hai nhiệm vụ cùng độ khó trước/sau. Sáu người tăng tổng điểm nhưng loại lỗi khác nhau; hai người đổi điểm ít song giải thích chi tiết hơn vì sao không hiểu. Nhóm ghi cả năng lực này vào tổng kết vì tự học không chỉ cần kết quả mà còn phải biết bước kế. Tuy nhiên một nhóm trong một học kỳ không đại diện mọi tân sinh viên.",
          ],
        ],
        questions: [
          q("main-claim", "Dòng thời gian của nhóm nghe cho thấy điều gì?", [
            "Từ nghe chung không chẩn đoán đến luyện theo lỗi và đánh giá cuối kỳ",
            "Từ học nghe sang bỏ hoàn toàn tin tức",
            "Từ tám người thành một trăm người",
            "Từ kiểm tra số sang chỉ học viết",
          ], 0, ["rp1", "rp2", "rp3"],
          "Ba đoạn lần lượt là thiết lập quy trình, điều chỉnh và đánh giá."),
          q("supported-detail", "Sau kiểm tra tháng mười một, nhóm thay đổi gì?", [
            "Tăng chép số lên hai lần mỗi tuần",
            "Ngừng nghe hoàn toàn",
            "Chỉ học từ mới",
            "Đổi sang nhóm thể thao",
          ], 0, ["rp2"],
          "Đoạn 2 nối lỗi số với điều chỉnh tần suất luyện."),
          q("cross-paragraph-evidence", "Điều gì cho thấy đánh giá cuối kỳ rộng hơn điểm số?", [
            "Nhóm ghi cả khả năng giải thích lỗi và chọn bước tiếp",
            "Mọi người nghe cùng một bản tin",
            "Có tám thành viên",
            "Giáo viên đưa bảng ghi",
          ], 0, ["rp1", "rp3"],
          "Bảng ghi lỗi từ đầu cho phép cuối kỳ xem cả tự chẩn đoán."),
          q("bounded-inference", "Có thể suy ra vì sao hai người ít tăng điểm vẫn được ghi nhận tiến bộ?", [
            "Họ hiểu rõ hơn nguyên nhân và hướng luyện tiếp",
            "Họ được đổi đáp án",
            "Họ không làm nhiệm vụ cuối",
            "Nhóm bỏ tiêu chí điểm",
          ], 0, ["rp3"],
          "Đoạn cuối coi khả năng giải thích và lập kế hoạch là phần của tự học.",
          "Nguồn ghi nhận một loại tiến bộ, không chứng minh nó tương đương hoàn toàn với nghe hiểu."),
          q("scope-limit", "Khái quát nào bị nguồn giới hạn?", [
            "Quy trình này chắc chắn hiệu quả với toàn bộ tân sinh viên",
            "Một số thành viên tăng điểm",
            "Lỗi số vẫn tồn tại giữa kỳ",
            "Nhóm dùng nhiệm vụ cùng độ khó trước và sau",
          ], 0, ["rp3"],
          "Bài nói rõ mẫu tám người không đại diện mọi sinh viên."),
        ],
        noteMap: map([
          ["start", "Tháng 9", "Nghe chung nhưng không phân loại lỗi.", ["rp1"]],
          ["routine", "Quy trình mới", "Ba lần nghe với ba mục tiêu.", ["rp1"]],
          ["diagnosis", "Tháng 10", "Tách lỗi từ vựng, lời liền và tốc độ.", ["rp2"]],
          ["adjustment", "Tháng 11", "Tăng luyện chép số theo kết quả.", ["rp2"]],
          ["final", "Cuối kỳ", "So điểm và khả năng giải thích bước tiếp.", ["rp3"]],
        ], [
          ["start", "được thay bằng", "routine"],
          ["routine", "tạo dữ liệu cho", "diagnosis"],
          ["diagnosis", "dẫn đến", "adjustment"],
          ["adjustment", "được xem lại ở", "final"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "校园消息怎样变成一次难忘的活动",
        titleVi: "Một thông báo trường học trở thành hoạt động đáng nhớ",
        targetVocabularyIds: [
          V(1025), V(1197), V(1526), V(1811), V(1881),
        ],
        paragraphs: [
          [
            "学生会本来计划在十月举行校园读书夜，第一条消息只写了日期和“欢迎参加”。三天后，报名人数很少，有人以为活动只是听老师讲话，也有人不知道可以带自己的书。组织者没有放弃，而是访问了十名学生，了解他们最想知道的信息。",
            "Hội sinh viên ban đầu định tổ chức đêm đọc sách tháng mười; thông báo đầu chỉ ghi ngày và “hoan nghênh tham gia”. Ba ngày sau rất ít người đăng ký; có người tưởng chỉ nghe giáo viên nói, có người không biết được mang sách riêng. Ban tổ chức không bỏ cuộc mà hỏi mười sinh viên xem họ cần thông tin gì.",
          ],
          [
            "第二条消息增加了时间表：先交换书，再分小组朗读，最后推荐一本书；还说明不愿朗读的人可以只听。报名很快增加，但活动当天突然下雨，原来的院子不能使用。组织者把活动移到三个教室，并用校园广播告诉大家新的地点。",
            "Thông báo thứ hai thêm lịch: đổi sách, đọc theo nhóm, cuối cùng giới thiệu một cuốn; người không muốn đọc có thể chỉ nghe. Đăng ký tăng nhanh, nhưng ngày tổ chức mưa bất ngờ khiến sân không dùng được. Ban tổ chức chuyển sang ba phòng và dùng loa trường báo địa điểm mới.",
          ],
          [
            "活动结束后，参加者说最难忘的不是人数，而是可以选择朗读或倾听，也能认识不同专业的同学。组织者总结了两项优点：具体消息降低了不确定感，备用教室使变化没有中断活动。不过反馈来自愿意填写问卷的人，不能说明没参加者为什么缺席。",
            "Sau hoạt động, người tham gia nói điều khó quên không phải số người mà là được chọn đọc hoặc nghe và quen bạn khác ngành. Ban tổ chức tổng kết hai ưu điểm: thông báo cụ thể giảm mơ hồ, phòng dự phòng giúp thay đổi không làm gián đoạn. Nhưng phản hồi chỉ từ người chịu điền khảo sát, không giải thích người vắng mặt.",
          ],
        ],
        questions: [
          q("main-claim", "Quá trình tổ chức thay đổi nhờ điều gì?", [
            "Phản hồi giúp làm rõ thông báo và chuẩn bị phương án dự phòng",
            "Ban tổ chức bỏ hoạt động sau ba ngày",
            "Mưa làm mọi người về nhà",
            "Giáo viên bắt buộc toàn trường tham gia",
          ], 0, ["lp1", "lp2", "lp3"],
          "Nguồn theo dõi thông báo mơ hồ, sửa nội dung, ứng phó mưa và tổng kết."),
          q("supported-detail", "Thông báo thứ hai bổ sung lựa chọn nào?", [
            "Người không muốn đọc có thể chỉ nghe",
            "Mọi người phải mua sách mới",
            "Chỉ sinh viên một chuyên ngành được vào",
            "Hoạt động chỉ diễn ra ngoài sân",
          ], 0, ["lp2"],
          "Đoạn 2 nêu trực tiếp lựa chọn tham gia."),
          q("cross-paragraph-evidence", "Chi tiết nào nối đúng vấn đề và điều chỉnh?", [
            "Không rõ hoạt động làm gì; thông báo mới thêm lịch và lựa chọn",
            "Ngày tổ chức tháng mười; trời có mưa",
            "Có mười người được hỏi; có ba phòng",
            "Có sách; có loa trường",
          ], 0, ["lp1", "lp2"],
          "Đoạn 1 nêu cách hiểu khác nhau, đoạn 2 cung cấp thông tin giải quyết."),
          q("bounded-inference", "Có thể suy ra vai trò của phòng dự phòng là gì?", [
            "Giữ hoạt động tiếp tục khi địa điểm ngoài trời không dùng được",
            "Làm số người tăng trước khi đăng ký",
            "Thay thế toàn bộ thông báo",
            "Đo nguyên nhân người vắng mặt",
          ], 0, ["lp2", "lp3"],
          "Hoạt động được chuyển vào ba phòng và bản tổng kết gọi đây là yếu tố duy trì.",
          "Có thể kết luận phương án dự phòng giúp lần này, không biết nó đủ cho mọi tình huống."),
          q("scope-limit", "Phản hồi cuối không trả lời được câu hỏi nào?", [
            "Vì sao người không tham gia đã vắng mặt",
            "Người tham gia thích lựa chọn nào",
            "Địa điểm đã đổi ra sao",
            "Thông báo mới có ưu điểm gì",
          ], 0, ["lp3"],
          "Mẫu phản hồi chỉ gồm người tham gia và tự nguyện điền."),
        ],
        noteMap: map([
          ["initial", "Thông báo đầu", "Chỉ ngày và lời mời chung.", ["lp1"]],
          ["feedback", "Phản hồi sớm", "Người học thiếu mô tả hoạt động và lựa chọn.", ["lp1"]],
          ["revision", "Thông báo sửa", "Có lịch trình và cách tham gia.", ["lp2"]],
          ["disruption", "Sự cố", "Mưa làm sân không sử dụng được.", ["lp2"]],
          ["outcome", "Kết quả/giới hạn", "Hoạt động tiếp tục nhưng khảo sát chỉ có người tham gia.", ["lp3"]],
        ], [
          ["initial", "tạo ra", "feedback"],
          ["feedback", "dẫn tới", "revision"],
          ["disruption", "được xử lý trong", "outcome"],
          ["revision", "góp phần vào", "outcome"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán dựng hai quá trình cải tiến: nhóm luyện nghe và đêm đọc sách; nêu dữ liệu gây thay đổi, bước điều chỉnh và giới hạn đánh giá.",
      requiredElements: [
        "quy trình nghe ban đầu và mới",
        "kết quả giữa/cuối kỳ",
        "thông báo đầu và phản hồi",
        "ứng phó thay đổi địa điểm",
        "giới hạn mẫu của cả hai",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp1"], [1, "lp3"]],
      modelHanzi:
        "听力小组先只比较听懂多少，后来用三次听力记录错误；十月按错误类型练习，十一月增加数字听写，期末同时看分数和自我诊断。读书夜最初的消息太简单，访问学生后才补充流程与选择；下雨时，备用教室和广播保证活动继续。两项改进都由反馈推动，也保留下一步行动。但前者只有八名学生，后者只调查愿意填写的参加者，因此不能代表全部学生。",
      modelVi:
        "Nhóm nghe ban đầu chỉ so mức hiểu, sau dùng ba lượt nghe để ghi lỗi; tháng mười luyện theo loại lỗi, tháng mười một tăng chép số và cuối kỳ xem cả điểm lẫn tự chẩn đoán. Đêm đọc sách ban đầu có thông báo quá đơn giản; sau phỏng vấn mới thêm quy trình và lựa chọn, còn phòng dự phòng cùng loa giúp tiếp tục khi mưa. Cả hai cải tiến do phản hồi thúc đẩy và giữ bước tiếp theo. Tuy vậy, nhóm đầu chỉ tám sinh viên, nhóm sau chỉ khảo sát người tham gia tự nguyện nên không đại diện toàn bộ.",
    },
  },
  [ID.cause]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "毕业前的自习支持为什么有效",
        titleVi: "Vì sao hỗ trợ tự học trước tốt nghiệp có tác dụng",
        targetVocabularyIds: [
          V(1018), V(1029), V(1087), V(1380), V(1982),
        ],
        paragraphs: [
          [
            "学院为准备毕业考试的学生开放晚间自习项目。第一周有一百人报名，却只有四十人连续到场。调查显示，部分学生不能接受固定三小时的安排，另一些人到了教室也不知道先做什么。仅仅延长开放时间，并没有自动带来稳定学习。",
            "Học viện mở chương trình tự học buổi tối cho sinh viên chuẩn bị thi tốt nghiệp. Tuần đầu một trăm người đăng ký nhưng chỉ bốn mươi người đến liên tục. Khảo sát cho thấy có người không phù hợp lịch cố định ba tiếng, có người tới phòng vẫn không biết bắt đầu gì. Chỉ kéo dài giờ mở chưa tự tạo học ổn định.",
          ],
          [
            "第二阶段把项目重新设计成九十分钟单元，学生进门先写当晚目标，结束时记录完成情况。导师不讲新课，只在学生卡住时帮助拆分任务。学校还允许线上登记后临时取消，避免学生因一次缺席就放弃整个项目。四周后，持续参加的人增加到七十二人。",
            "Giai đoạn hai thiết kế lại thành đơn vị chín mươi phút; vào phòng sinh viên ghi mục tiêu, cuối buổi ghi kết quả. Cố vấn không dạy bài mới, chỉ giúp chia nhiệm vụ khi bị kẹt. Trường cho phép đăng ký trực tuyến rồi hủy tạm, tránh bỏ cả chương trình vì một lần vắng. Sau bốn tuần, người tham gia đều tăng lên bảy mươi hai.",
          ],
          [
            "学院没有把增长全部归因于导师。时间变短、目标更具体、取消规则更灵活都可能起作用，而且考试临近也会提高学习动力。下一轮将分别比较有无目标卡的时段。现有结果说明多项条件共同支持坚持，但还不能指出哪一个条件是唯一原因。",
            "Học viện không quy toàn bộ tăng trưởng cho cố vấn. Thời gian ngắn hơn, mục tiêu cụ thể, quy tắc hủy linh hoạt đều có thể tác động; kỳ thi đến gần cũng tăng động lực. Đợt sau sẽ so ca có/không thẻ mục tiêu. Kết quả hiện tại cho thấy nhiều điều kiện cùng hỗ trợ duy trì, chưa chỉ ra một nguyên nhân duy nhất.",
          ],
        ],
        questions: [
          q("main-claim", "Bài đọc giải thích điều gì về chương trình tự học?", [
            "Nhiều điều kiện cùng làm mức tham gia ổn định hơn",
            "Chỉ mở cửa lâu là đủ",
            "Cố vấn dạy thêm mọi môn",
            "Sinh viên không được phép hủy",
          ], 0, ["rp1", "rp2", "rp3"],
          "Nguồn đối chiếu thiết kế đầu, gói điều chỉnh và giới hạn nhân quả."),
          q("supported-detail", "Cố vấn làm gì ở giai đoạn hai?", [
            "Giúp chia nhỏ nhiệm vụ khi sinh viên mắc kẹt",
            "Dạy toàn bộ bài mới",
            "Chấm điểm tốt nghiệp",
            "Buộc học đủ ba tiếng",
          ], 0, ["rp2"],
          "Đoạn 2 giới hạn rõ vai trò của cố vấn."),
          q("cross-paragraph-evidence", "Yếu tố nào phản hồi trực tiếp vấn đề “không biết bắt đầu gì”?", [
            "Viết mục tiêu khi vào và ghi kết quả khi ra",
            "Mở phòng vào buổi tối",
            "Kỳ thi sắp tới",
            "Cho hủy đăng ký",
          ], 0, ["rp1", "rp2"],
          "Vấn đề ở đoạn 1 được đáp bằng thẻ mục tiêu ở đoạn 2."),
          q("bounded-inference", "Có thể suy ra vì sao đợt sau so ca có và không có thẻ mục tiêu?", [
            "Để tách tác động của một điều kiện khỏi gói thay đổi",
            "Để bỏ chương trình tự học",
            "Để chứng minh cố vấn không cần thiết",
            "Để thay kỳ thi tốt nghiệp",
          ], 0, ["rp2", "rp3"],
          "Nhiều biến cùng đổi nên so sánh riêng giúp kiểm tra vai trò của thẻ.",
          "Thiết kế mới chỉ được đề xuất; chưa thể nói thẻ mục tiêu là nguyên nhân mạnh nhất."),
          q("scope-limit", "Nhận định nào nguồn không ủng hộ?", [
            "Số người tham gia đều đã tăng",
            "Tất cả tăng trưởng chỉ do cố vấn",
            "Thời gian ngắn hơn có thể góp phần",
            "Cần thử tiếp để tách nguyên nhân",
          ], 1, ["rp3"],
          "Đoạn 3 chủ động bác cách quy toàn bộ cho một yếu tố."),
        ],
        noteMap: map([
          ["problem", "Vấn đề", "Đăng ký nhiều nhưng duy trì thấp.", ["rp1"]],
          ["causes", "Nguyên nhân khả dĩ", "Lịch dài và mục tiêu không rõ.", ["rp1"]],
          ["bundle", "Gói điều chỉnh", "Ca ngắn, thẻ mục tiêu, cố vấn và hủy linh hoạt.", ["rp2"]],
          ["outcome", "Kết quả", "Người tham gia đều tăng từ 40 lên 72.", ["rp2"]],
          ["confound", "Yếu tố chưa tách", "Nhiều thay đổi và kỳ thi đến gần.", ["rp3"]],
        ], [
          ["causes", "góp vào", "problem"],
          ["bundle", "đáp lại", "causes"],
          ["bundle", "đi trước", "outcome"],
          ["confound", "giới hạn giải thích", "outcome"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "怎样让办公培训真正被接受",
        titleVi: "Làm sao để đào tạo văn phòng thực sự được tiếp nhận",
        targetVocabularyIds: [
          V(1411), V(1484), V(1521), V(1596), V(1807),
        ],
        paragraphs: [
          [
            "公司上线新的报销系统后，第一次培训只用了二十分钟。讲师操作得很流利，却没有举例说明发票不完整或出差取消时怎么办。员工回到办公室后仍不断问问题，财务人员需要重复解释。管理层最初认为员工不够耐心，但问卷显示，培训缺少特殊情况的详细步骤。",
            "Công ty đưa hệ thống thanh toán mới lên mạng; buổi đào tạo đầu chỉ hai mươi phút. Giảng viên thao tác trôi chảy nhưng không nêu ví dụ hóa đơn thiếu hay hủy chuyến. Về văn phòng, nhân viên vẫn hỏi liên tục và tài chính phải giải thích lại. Quản lý ban đầu nghĩ nhân viên thiếu kiên nhẫn, nhưng khảo sát chỉ ra đào tạo thiếu bước chi tiết cho tình huống đặc biệt.",
          ],
          [
            "第二次培训改成三个案例。参加者先自己完成普通报销，再处理缺文件和改行程，讲师只在关键步骤暂停说明。财务部门把常见错误做成一页检查表，并在一周内记录新问题。两周后，基本报销的错误减少了一半，特殊情况的处理时间也缩短。",
            "Buổi hai đổi sang ba tình huống. Người học tự làm thanh toán thường rồi xử lý thiếu giấy tờ và đổi lịch; giảng viên chỉ dừng ở bước then chốt. Tài chính làm bảng kiểm lỗi phổ biến và ghi câu hỏi mới một tuần. Hai tuần sau, lỗi cơ bản giảm một nửa và thời gian xử lý tình huống đặc biệt ngắn hơn.",
          ],
          [
            "不过，公司没有宣布培训已经取得长期成功。新系统刚上线时问题本来会比较多，员工也可能因为重复使用而熟悉。为区分这些因素，财务部门将在三个月后再次检查错误率，并比较参加与未参加第二次培训的员工。当前证据支持案例教学有帮助，但不支持把全部改善都归给它。",
            "Tuy vậy, công ty chưa tuyên bố đào tạo thành công dài hạn. Hệ thống mới lên thường nhiều lỗi, nhân viên cũng có thể quen nhờ dùng lặp lại. Để phân biệt, tài chính sẽ kiểm tra tỷ lệ lỗi sau ba tháng và so người có/không dự buổi hai. Bằng chứng hiện hỗ trợ dạy theo tình huống có ích, không hỗ trợ quy mọi cải thiện cho nó.",
          ],
        ],
        questions: [
          q("main-claim", "Nguồn giải thích vì sao buổi đào tạo thứ hai tốt hơn theo hướng nào?", [
            "Tình huống chi tiết và thực hành có thể giúp, nhưng còn yếu tố cạnh tranh",
            "Giảng viên nói nhanh hơn nên mọi lỗi biến mất",
            "Nhân viên bị buộc làm thêm giờ",
            "Hệ thống cũ được khôi phục",
          ], 0, ["lp1", "lp2", "lp3"],
          "Bài đi từ thiếu ví dụ đến đào tạo tình huống và giới hạn nhân quả."),
          q("supported-detail", "Bảng kiểm được tạo từ đâu?", [
            "Các lỗi phổ biến trong quá trình thực hành và câu hỏi",
            "Tên của mọi nhân viên",
            "Giá máy tính",
            "Lịch nghỉ của giảng viên",
          ], 0, ["lp2"],
          "Tài chính tổng hợp lỗi thường gặp thành một trang."),
          q("cross-paragraph-evidence", "Chi tiết nào nối khảo sát với thiết kế mới?", [
            "Khảo sát nói thiếu tình huống; buổi hai dùng ba ca cụ thể",
            "Buổi đầu hai mươi phút; buổi hai có một tuần",
            "Nhân viên hỏi; quản lý trả lời",
            "Có hóa đơn; có máy tính",
          ], 0, ["lp1", "lp2"],
          "Vấn đề nội dung ở đoạn 1 được xử lý trực tiếp bằng ba tình huống."),
          q("bounded-inference", "Có thể suy ra vì sao công ty so người dự và không dự buổi hai?", [
            "Để tách hiệu quả đào tạo khỏi việc quen hệ thống theo thời gian",
            "Để cấm nhóm không dự dùng hệ thống",
            "Để chọn người được hoàn tiền",
            "Để thay mọi dữ liệu trước đó",
          ], 0, ["lp3"],
          "Đoạn 3 nêu rõ lặp lại sử dụng là một cách giải thích khác.",
          "So sánh giúp kiểm tra nhưng vẫn chưa tự loại bỏ mọi khác biệt giữa hai nhóm."),
          q("scope-limit", "Kết luận mạnh nhất được nguồn cho phép là gì?", [
            "Đào tạo theo ca có dấu hiệu hữu ích trong ngắn hạn",
            "Nó chắc chắn gây mọi cải thiện dài hạn",
            "Mọi nhân viên đã thao tác hoàn hảo",
            "Buổi đầu không cung cấp thông tin nào",
          ], 0, ["lp2", "lp3"],
          "Có kết quả hai tuần nhưng đánh giá dài hạn vẫn chờ."),
        ],
        noteMap: map([
          ["first", "Buổi đầu", "Thao tác nhanh nhưng thiếu tình huống.", ["lp1"]],
          ["diagnosis", "Chẩn đoán", "Khảo sát chỉ ra thiếu bước đặc biệt.", ["lp1"]],
          ["second", "Buổi hai", "Ba ca, tự làm và dừng ở bước then chốt.", ["lp2"]],
          ["short", "Kết quả ngắn hạn", "Lỗi và thời gian xử lý giảm.", ["lp2"]],
          ["alternatives", "Giải thích cạnh tranh", "Quen hệ thống theo thời gian.", ["lp3"]],
        ], [
          ["first", "tạo nhu cầu cho", "diagnosis"],
          ["diagnosis", "định hình", "second"],
          ["second", "đi trước", "short"],
          ["alternatives", "giới hạn cách đọc", "short"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán phân biệt vấn đề, điều kiện can thiệp, kết quả và nguyên nhân cạnh tranh trong chương trình tự học và đào tạo văn phòng.",
      requiredElements: [
        "duy trì thấp của tự học",
        "gói thay đổi và kết quả",
        "thiếu ví dụ trong đào tạo",
        "dạy theo tình huống và kết quả",
        "lý do chưa kết luận nhân quả duy nhất",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp1"], [1, "lp3"]],
      modelHanzi:
        "晚间自习最初报名多、坚持少，固定三小时和目标不清都是可能原因。改成短单元、目标卡、导师支持和灵活取消后，持续参加者增加，但考试临近也可能提高动力。报销培训最初缺少特殊案例，第二次用三个案例和检查表后，错误与处理时间下降；同时，员工也可能因反复使用而熟悉系统。两项结果都支持新设计有帮助，却因多项条件同时变化，不能证明某一项是唯一原因。",
      modelVi:
        "Tự học buổi tối ban đầu đăng ký nhiều nhưng duy trì ít; lịch ba tiếng và mục tiêu mơ hồ đều là nguyên nhân có thể. Sau khi đổi ca ngắn, thẻ mục tiêu, cố vấn và hủy linh hoạt, người đều tăng, nhưng kỳ thi gần cũng có thể tăng động lực. Đào tạo thanh toán ban đầu thiếu ca đặc biệt; sau ba tình huống và bảng kiểm, lỗi cùng thời gian giảm, song nhân viên có thể quen nhờ dùng lặp lại. Cả hai kết quả ủng hộ thiết kế mới có ích nhưng nhiều điều kiện đổi đồng thời nên chưa chứng minh một yếu tố là nguyên nhân duy nhất.",
    },
  },
  [ID.compare]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "两种工作表现记录的比较",
        titleVi: "So sánh hai cách ghi nhận hiệu suất công việc",
        targetVocabularyIds: [
          V(1162), V(1382), V(1629), V(1735), V(1809),
        ],
        paragraphs: [
          [
            "一家公司调查了两种工作表现记录。销售组每周填写数字表，记录完成数量和客户回复时间；设计组则每两周开会，成员说明自己的想法、修改和合作困难。两组都想让工作更透明，但一个强调可数结果，一个强调过程信息。",
            "Một công ty khảo sát hai cách ghi hiệu suất. Nhóm bán hàng điền bảng số mỗi tuần về số việc và thời gian phản hồi khách; nhóm thiết kế họp hai tuần một lần, thành viên trình bày ý tưởng, sửa đổi và khó khăn phối hợp. Cả hai muốn minh bạch nhưng một nhấn kết quả đếm được, một nhấn thông tin quá trình.",
          ],
          [
            "半年后，销售经理发现数字表容易比较，却不能说明复杂客户为什么需要更多时间。设计组的讨论能解释背景，但记录方式不统一，很难比较前后变化。员工代表与经理商量后，决定保留两种优点：每组都填写少量共同指标，同时增加一段不超过一百字的情况说明。",
            "Sau nửa năm, quản lý bán hàng thấy bảng số dễ so nhưng không giải thích vì sao khách phức tạp cần lâu. Thảo luận thiết kế giải thích bối cảnh nhưng ghi không thống nhất, khó so trước/sau. Đại diện nhân viên và quản lý bàn giữ ưu điểm hai bên: ít chỉ số chung cộng đoạn giải thích tối đa một trăm chữ.",
          ],
          [
            "试行三个月的结果并不完全相同。销售组觉得说明文字减少了误解，设计组却认为每周填表增加负担。公司没有要求所有部门用同样频率，而是保留共同字段，允许部门选择每周或每两周提交。下一次调查将分别看信息质量、填写时间和员工接受度。",
            "Kết quả ba tháng không giống hẳn. Nhóm bán hàng thấy phần chữ giảm hiểu nhầm, nhóm thiết kế lại cho rằng điền hàng tuần tăng gánh nặng. Công ty không buộc mọi phòng cùng tần suất; giữ trường chung và cho chọn hàng tuần hoặc hai tuần. Khảo sát sau sẽ xét chất lượng thông tin, thời gian điền và mức chấp nhận.",
          ],
        ],
        questions: [
          q("main-claim", "Bài đọc so sánh hai cách ghi để đi đến điều gì?", [
            "Một cấu trúc chung nhưng cho phép tần suất khác theo công việc",
            "Xóa toàn bộ dữ liệu định lượng",
            "Buộc mọi phòng họp mỗi ngày",
            "Chỉ dùng ý kiến của quản lý",
          ], 0, ["rp1", "rp2", "rp3"],
          "Bài nhận diện ưu/nhược rồi tạo giải pháp kết hợp có ngoại lệ."),
          q("supported-detail", "Nhược điểm của ghi chép nhóm thiết kế là gì?", [
            "Không thống nhất nên khó so thay đổi",
            "Không có bất kỳ bối cảnh nào",
            "Chỉ có con số khách hàng",
            "Không ai tham gia họp",
          ], 0, ["rp2"],
          "Đoạn 2 nói rõ ghi bối cảnh nhưng thiếu chuẩn chung."),
          q("cross-paragraph-evidence", "Phương án kết hợp lấy gì từ mỗi cách cũ?", [
            "Chỉ số chung từ bảng số và giải thích bối cảnh từ thảo luận",
            "Tần suất mỗi ngày và cuộc họp dài",
            "Chỉ số khách hàng và tên nhân viên",
            "Không lấy yếu tố nào",
          ], 0, ["rp1", "rp2"],
          "Hai đặc trưng ở đoạn đầu được kết hợp trong đoạn 2."),
          q("bounded-inference", "Có thể suy ra vì sao công ty cho phép hai tần suất?", [
            "Cùng mẫu nhưng chi phí ghi chép khác theo loại công việc",
            "Công ty không cần dữ liệu",
            "Nhóm bán hàng từ chối mọi thay đổi",
            "Thiết kế luôn quan trọng hơn bán hàng",
          ], 0, ["rp2", "rp3"],
          "Nhóm thiết kế báo gánh nặng khi điền hàng tuần nên tần suất được linh hoạt.",
          "Có thể suy ra quyết định nhằm cân bằng chi phí, chưa biết tần suất nào cho dữ liệu tốt hơn."),
          q("scope-limit", "Kết luận nào không được kết quả thử nghiệm hỗ trợ?", [
            "Hai nhóm phản ứng khác nhau",
            "Một tần suất duy nhất phù hợp mọi bộ phận",
            "Phần chữ có thể giảm hiểu nhầm",
            "Cần đo cả chất lượng và thời gian điền",
          ], 1, ["rp3"],
          "Phản ứng khác nhau chính là lý do không dùng một tần suất."),
        ],
        noteMap: map([
          ["numeric", "Cách định lượng", "Dễ so nhưng thiếu bối cảnh.", ["rp1", "rp2"]],
          ["narrative", "Cách giải thích", "Có bối cảnh nhưng khó chuẩn hóa.", ["rp1", "rp2"]],
          ["hybrid", "Phương án kết hợp", "Chỉ số chung cộng đoạn giải thích ngắn.", ["rp2"]],
          ["variation", "Phản ứng khác", "Bán hàng giảm hiểu lầm; thiết kế tăng gánh nặng.", ["rp3"]],
          ["next", "Đo tiếp", "Chất lượng, thời gian và chấp nhận.", ["rp3"]],
        ], [
          ["numeric", "được kết hợp với", "narrative"],
          ["hybrid", "kết hợp", "numeric"],
          ["variation", "làm thay đổi cách dùng", "hybrid"],
          ["next", "sẽ đánh giá", "hybrid"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "自学平台上的两种说法",
        titleVi: "Hai cách nhìn về nền tảng tự học",
        targetVocabularyIds: [
          V(1984), V(1055), V(1090), V(1699), V(1879),
        ],
        paragraphs: [
          [
            "学校测试一个用来自学语言的平台。第一组学生说，它不仅能安排练习，还能提醒复习，所以比纸质计划方便。第二组却出现另一种说法：提醒太多会打断学习，而且平台推荐的顺序不一定符合个人弱点。两组都使用四周，但学习目标并不完全相同。",
            "Trường thử nền tảng dùng để tự học ngôn ngữ. Nhóm một nói nó không chỉ sắp bài mà còn nhắc ôn nên tiện hơn giấy. Nhóm hai có cách nhìn khác: quá nhiều nhắc nhở làm gián đoạn và thứ tự gợi ý không nhất thiết hợp điểm yếu cá nhân. Cả hai dùng bốn tuần nhưng mục tiêu học không hoàn toàn giống.",
          ],
          [
            "研究人员比较日志后发现，第一组打开平台次数更多，完成的短练习也多；第二组每次学习时间更长，并在自己的笔记中增加了难题。若只看登录次数，第一组似乎更积极；若看连续学习时间，第二组并不落后。不同指标使同一批行为得到不同解释。",
            "So nhật ký, nhà nghiên cứu thấy nhóm một mở nền tảng nhiều và làm nhiều bài ngắn; nhóm hai mỗi lần học lâu hơn và thêm câu khó vào sổ riêng. Nếu chỉ nhìn lượt đăng nhập, nhóm một có vẻ tích cực hơn; nhìn thời gian liên tục, nhóm hai không kém. Chỉ số khác tạo cách giải thích khác cho hành vi.",
          ],
          [
            "学校决定下一轮让学生先选择目标，再决定提醒频率，同时保留平台日志和个人学习记录。研究人员不会用一次测试判断哪种说法永远正确，因为样本只有两个班，目标也不同。他们要检查的是：在什么条件下，自动提醒帮助坚持；在什么条件下，自主安排更合适。",
            "Trường quyết định đợt sau cho sinh viên chọn mục tiêu rồi chọn tần suất nhắc, đồng thời giữ cả nhật ký nền tảng và sổ cá nhân. Nhà nghiên cứu không dùng một thử nghiệm để quyết cách nhìn nào luôn đúng vì chỉ hai lớp và mục tiêu khác. Họ sẽ kiểm tra điều kiện nào nhắc tự động hỗ trợ duy trì và điều kiện nào tự sắp phù hợp hơn.",
          ],
        ],
        questions: [
          q("main-claim", "Bài nghe đối chiếu điều gì?", [
            "Hai cách dùng và hai bộ chỉ số dẫn tới đánh giá khác nhau",
            "Nền tảng và một trò chơi thể thao",
            "Hai trường không dùng công nghệ",
            "Giấy và bút có giá khác nhau",
          ], 0, ["lp1", "lp2", "lp3"],
          "Nguồn nối ý kiến, hành vi đo được và thiết kế thử tiếp."),
          q("supported-detail", "Nếu chỉ nhìn lượt đăng nhập, nhóm nào có vẻ tích cực hơn?", [
            "Nhóm một",
            "Nhóm hai",
            "Hai nhóm bằng nhau tuyệt đối",
            "Không nhóm nào dùng nền tảng",
          ], 0, ["lp2"],
          "Nhóm một mở nền tảng nhiều lần hơn."),
          q("cross-paragraph-evidence", "Vì sao không thể nói ngay nhóm một tự học tốt hơn?", [
            "Nhóm hai học mỗi lần lâu hơn và mục tiêu hai nhóm khác",
            "Nhóm hai không có học sinh",
            "Nhóm một không hoàn thành bài nào",
            "Nền tảng không lưu nhật ký",
          ], 0, ["lp1", "lp2"],
          "Mục tiêu khác và chỉ số thời lượng tạo cách đọc khác."),
          q("bounded-inference", "Có thể suy ra mục đích giữ cả nhật ký nền tảng và sổ cá nhân?", [
            "Giảm nguy cơ đánh giá bằng một chỉ số duy nhất",
            "Tăng số thông báo cho mọi người",
            "Loại quyền chọn mục tiêu",
            "Chứng minh giấy luôn tốt hơn",
          ], 0, ["lp2", "lp3"],
          "Hai nguồn dữ liệu ghi các hành vi khác nhau và giúp so điều kiện.",
          "Có thể suy ra mục tiêu mở rộng bằng chứng, chưa thể nói dữ liệu mới sẽ giải quyết mọi khác biệt."),
          q("scope-limit", "Nhà nghiên cứu từ chối kết luận nào?", [
            "Một cách dùng luôn đúng trong mọi điều kiện",
            "Nhóm một đăng nhập nhiều hơn",
            "Nhóm hai có phiên học dài hơn",
            "Mẫu chỉ gồm hai lớp",
          ], 0, ["lp3"],
          "Đoạn cuối nêu rõ không chọn một cách nói đúng vĩnh viễn."),
        ],
        noteMap: map([
          ["claim1", "Cách nhìn 1", "Nhắc và bài ngắn giúp tiện, đều.", ["lp1"]],
          ["claim2", "Cách nhìn 2", "Nhắc gây gián đoạn, thứ tự chưa cá nhân hóa.", ["lp1"]],
          ["metric1", "Chỉ số 1", "Lượt mở và số bài ngắn.", ["lp2"]],
          ["metric2", "Chỉ số 2", "Thời gian liên tục và ghi chú riêng.", ["lp2"]],
          ["design", "Thử tiếp", "Chọn mục tiêu/tần suất và giữ hai nguồn dữ liệu.", ["lp3"]],
        ], [
          ["metric1", "ủng hộ một phần", "claim1"],
          ["metric2", "ủng hộ một phần", "claim2"],
          ["claim1", "được đối chiếu với", "claim2"],
          ["design", "kiểm tra điều kiện của", "claim1"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán so sánh hai hệ thống ghi nhận; nêu chỉ số, bối cảnh, ngoại lệ và lý do không thể dùng một cách đo cho mọi nhóm.",
      requiredElements: [
        "bảng số và thảo luận",
        "phương án kết hợp",
        "lượt đăng nhập và thời lượng",
        "mục tiêu khác nhau",
        "thiết kế đo tiếp",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp1"], [1, "lp2"]],
      modelHanzi:
        "工作表现记录中，数字表容易比较，却缺少复杂任务的背景；讨论能解释过程，却不够统一，所以公司尝试共同指标加短说明，并允许不同频率。自学平台中，登录次数支持第一组更活跃的说法，连续时间和个人笔记却显示第二组并不落后，而且两组目标不同。两份材料都说明指标会突出不同方面。合理评价要同时保留可比较数据和情境信息，并根据工作或学习目标解释，不能把一个数字用于所有人。",
      modelVi:
        "Trong ghi nhận công việc, bảng số dễ so nhưng thiếu bối cảnh nhiệm vụ phức tạp; thảo luận giải thích quá trình nhưng thiếu thống nhất, nên công ty thử chỉ số chung cộng thuyết minh và cho tần suất khác. Trên nền tảng tự học, lượt đăng nhập ủng hộ cách nói nhóm một tích cực hơn, nhưng thời gian liên tục cùng sổ riêng cho thấy nhóm hai không kém, lại có mục tiêu khác. Hai nguồn chỉ ra chỉ số làm nổi khía cạnh khác nhau; đánh giá hợp lý cần dữ liệu so được, thông tin bối cảnh và giải thích theo mục tiêu.",
    },
  },
  [ID.evidence]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "实习经历能证明什么",
        titleVi: "Kinh nghiệm thực tập có thể chứng minh điều gì",
        targetVocabularyIds: [
          V(1194), V(1234), V(1269), V(1485), V(1952),
        ],
        paragraphs: [
          [
            "一名毕业生在求职信中写道，自己在工厂实习三个月，熟悉团队干活儿的方式，因此适合担任项目助理。他列出每天整理工具、记录进度和参加早会等任务。这些经历能证明他见过工作流程，却还不能直接证明他能独立协调一个项目。",
            "Một sinh viên tốt nghiệp viết trong thư xin việc rằng đã thực tập nhà máy ba tháng, quen cách đội nhóm làm việc nên phù hợp vị trí trợ lý dự án. Anh liệt kê việc sắp dụng cụ, ghi tiến độ, dự họp sáng. Kinh nghiệm chứng minh anh đã thấy quy trình, nhưng chưa chứng minh có thể độc lập điều phối dự án.",
          ],
          [
            "面试官指出，关键不是任务数量，而是候选人在问题出现时做了什么。毕业生补充了一个例子：材料晚到时，他先确认影响的顺序，再把信息告诉师傅和办公室，最后留下书面记录。主管的评价信也说明，他按要求报告，没有擅自改变生产计划。",
            "Người phỏng vấn chỉ ra then chốt không phải số nhiệm vụ mà là ứng xử khi có vấn đề. Ứng viên bổ sung ví dụ: vật liệu tới muộn, anh xác nhận thứ tự ảnh hưởng, báo cho thợ và văn phòng, rồi để lại ghi chép. Thư đánh giá của quản lý cũng nói anh báo đúng yêu cầu, không tự đổi kế hoạch sản xuất.",
          ],
          [
            "公司据此认为，他具备信息整理和按流程沟通的证据，可以进入下一轮；但“独立协调项目”仍需通过情境任务检查。这个判断既没有否定实习，也没有让一封评价信代替全部能力证据。它把已证明、可能具备和仍待验证的部分分开。",
            "Công ty cho rằng anh có bằng chứng xử lý thông tin và giao tiếp theo quy trình, đủ vào vòng sau; còn “điều phối độc lập” cần bài tình huống kiểm tra. Phán đoán không phủ nhận thực tập, cũng không để một thư đánh giá thay toàn bộ năng lực. Nó tách phần đã chứng minh, có thể có và còn cần xác minh.",
          ],
        ],
        questions: [
          q("main-claim", "Bài đọc đánh giá bằng chứng thực tập theo cách nào?", [
            "Tách năng lực đã chứng minh khỏi năng lực còn phải kiểm tra",
            "Coi ba tháng thực tập là đủ cho mọi vị trí",
            "Bỏ qua hoàn toàn thư của quản lý",
            "Chỉ đếm số nhiệm vụ hằng ngày",
          ], 0, ["rp1", "rp2", "rp3"],
          "Ba đoạn thu hẹp luận điểm bằng ví dụ và bằng chứng độc lập."),
          q("supported-detail", "Thư quản lý xác nhận điều gì?", [
            "Ứng viên báo cáo theo yêu cầu và không tự đổi kế hoạch",
            "Ứng viên đã quản lý toàn nhà máy",
            "Ứng viên tự tuyển nhân viên",
            "Ứng viên viết mọi quy trình",
          ], 0, ["rp2"],
          "Đây là phạm vi xác nhận trực tiếp của thư."),
          q("cross-paragraph-evidence", "Bằng chứng nào hỗ trợ kỹ năng giao tiếp theo quy trình?", [
            "Ví dụ vật liệu muộn và thư quản lý xác nhận cách báo cáo",
            "Danh sách dụng cụ và thời gian ba tháng",
            "Tên nhà máy và buổi phỏng vấn",
            "Mong muốn làm trợ lý",
          ], 0, ["rp2", "rp3"],
          "Ví dụ hành vi cùng nguồn xác nhận hỗ trợ kết luận hẹp."),
          q("bounded-inference", "Có thể suy ra vì sao công ty dùng thêm bài tình huống?", [
            "Để kiểm tra năng lực điều phối chưa được thực tập chứng minh",
            "Để phủ nhận mọi kinh nghiệm trước",
            "Để thay vòng phỏng vấn bằng điểm danh",
            "Để kiểm tra tốc độ sử dụng công cụ",
          ], 0, ["rp1", "rp3"],
          "Bài tách việc nhìn thấy quy trình khỏi tự điều phối.",
          "Có thể suy ra mục tiêu kiểm tra khoảng trống; chưa biết ứng viên sẽ làm tốt bài tình huống."),
          q("scope-limit", "Kết luận nào vượt bằng chứng?", [
            "Ứng viên biết ghi và chuyển thông tin theo yêu cầu",
            "Ứng viên chắc chắn có thể lãnh đạo mọi dự án",
            "Ứng viên đã gặp tình huống vật liệu muộn",
            "Công ty cho vào vòng tiếp theo",
          ], 1, ["rp1", "rp3"],
          "Năng lực lãnh đạo độc lập vẫn được ghi là cần kiểm tra."),
        ],
        noteMap: map([
          ["claim", "Tự tuyên bố", "Thực tập nên phù hợp trợ lý dự án.", ["rp1"]],
          ["tasks", "Dữ kiện nhiệm vụ", "Dụng cụ, tiến độ và họp sáng.", ["rp1"]],
          ["incident", "Bằng chứng hành vi", "Xử lý thông tin khi vật liệu muộn.", ["rp2"]],
          ["corroboration", "Nguồn xác nhận", "Quản lý xác nhận báo đúng quy trình.", ["rp2"]],
          ["boundary", "Phần chưa chứng minh", "Điều phối dự án độc lập.", ["rp3"]],
        ], [
          ["tasks", "ủng hộ hẹp", "claim"],
          ["incident", "tăng sức nặng cho", "claim"],
          ["corroboration", "xác nhận", "incident"],
          ["boundary", "giới hạn", "claim"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一场职业分享会后的判断",
        titleVi: "Phán đoán sau một buổi chia sẻ nghề nghiệp",
        targetVocabularyIds: [
          V(1308), V(1412), V(1698), V(1992), V(1557),
        ],
        paragraphs: [
          [
            "学院举行职业分享会，请三位毕业生介绍平常工作。一位先讲任务顺序，一位说明与客户沟通的做法，第三位展示失败后怎样修改。会后问卷中，七成听众写信说“更了解职业”，学院很快收到许多感谢回信。",
            "Học viện tổ chức chia sẻ nghề nghiệp, mời ba cựu sinh viên kể công việc thường ngày. Một người nói thứ tự nhiệm vụ, một người giải thích cách giao tiếp khách, người thứ ba trình bày sửa sau thất bại. Khảo sát sau buổi có bảy phần mười người viết “hiểu nghề hơn”, học viện nhận nhiều thư cảm ơn.",
          ],
          [
            "有老师认为问卷证明分享会非常有效，但另一位老师检查后发现，问题只问“是否更了解”，没有要求听众举例，也没有比较会前水平。愿意回复的人可能本来就更感兴趣。感谢信说明活动受到欢迎，却不能单独证明听众能正确判断岗位要求。",
            "Một giáo viên cho rằng khảo sát chứng minh buổi rất hiệu quả, nhưng giáo viên khác thấy câu hỏi chỉ hỏi “hiểu hơn không”, không yêu cầu ví dụ hay so mức trước. Người trả lời có thể vốn hứng thú hơn. Thư cảm ơn cho thấy hoạt động được đón nhận nhưng không tự chứng minh người nghe đánh giá đúng yêu cầu vị trí.",
          ],
          [
            "学院决定下次保留满意度问卷，同时增加两项任务：会前写出对岗位的理解，会后根据案例排列处理顺序并说明理由。若答案变化与分享内容一致，才能更有根据地说知识增加。现阶段合理结论是活动受欢迎、听众自报理解增加；能力变化仍待验证。",
            "Học viện quyết định giữ khảo sát hài lòng và thêm hai nhiệm vụ: trước buổi viết hiểu biết về vị trí, sau buổi sắp thứ tự xử lý ca và giải thích. Nếu đáp án đổi phù hợp nội dung chia sẻ mới có cơ sở nói kiến thức tăng. Hiện chỉ kết luận hoạt động được ưa thích và người nghe tự báo hiểu hơn; thay đổi năng lực còn chờ kiểm tra.",
          ],
        ],
        questions: [
          q("main-claim", "Nguồn đánh giá lại nhận định “buổi chia sẻ rất hiệu quả” như thế nào?", [
            "Giữ bằng chứng về mức yêu thích nhưng yêu cầu đo năng lực rõ hơn",
            "Khẳng định thư cảm ơn chứng minh mọi kỹ năng",
            "Hủy mọi buổi chia sẻ nghề",
            "Chỉ quan tâm số diễn giả",
          ], 0, ["lp1", "lp2", "lp3"],
          "Bài phân biệt phản hồi tự báo với bằng chứng thay đổi hiểu biết."),
          q("supported-detail", "Khảo sát cũ thiếu điều gì?", [
            "Ví dụ cụ thể và mức hiểu trước buổi",
            "Tên người tham gia",
            "Thời gian bắt đầu",
            "Số lượng diễn giả",
          ], 0, ["lp2"],
          "Đoạn 2 nêu hai khoảng trống đo lường."),
          q("cross-paragraph-evidence", "Dữ liệu nào hỗ trợ kết luận “được ưa thích” nhưng chưa đủ cho “năng lực tăng”?", [
            "Thư cảm ơn và câu trả lời tự báo",
            "Ba bài nói và phòng học",
            "Thứ tự nhiệm vụ của diễn giả",
            "Ngày tổ chức",
          ], 0, ["lp1", "lp2"],
          "Hai loại phản hồi thể hiện thái độ, không đo chính xác năng lực."),
          q("bounded-inference", "Có thể suy ra vì sao nhiệm vụ mới yêu cầu sắp thứ tự và nêu lý do?", [
            "Để biến hiểu biết thành bằng chứng hành động có thể so trước/sau",
            "Để thay tất cả diễn giả",
            "Để buộc mọi người viết thư cảm ơn",
            "Để chỉ đo trí nhớ tên nghề",
          ], 0, ["lp2", "lp3"],
          "Thiết kế mới thêm hành vi áp dụng nội dung và cơ sở so sánh.",
          "Có thể suy ra mục đích đo tốt hơn, chưa thể khẳng định thiết kế mới đã được hiệu chuẩn."),
          q("scope-limit", "Kết luận hiện tại nào là hợp lý?", [
            "Người nghe tự báo hiểu hơn, còn năng lực chưa xác minh",
            "Mọi người đã chọn nghề đúng",
            "Buổi chia sẻ chắc chắn tăng kỹ năng",
            "Người không trả lời đều không quan tâm",
          ], 0, ["lp2", "lp3"],
          "Đoạn cuối ghi đúng hai mức claim."),
        ],
        noteMap: map([
          ["event", "Hoạt động", "Ba diễn giả trình bày nhiệm vụ và cách làm.", ["lp1"]],
          ["positive", "Dữ liệu tích cực", "Tự báo hiểu hơn và thư cảm ơn.", ["lp1"]],
          ["gaps", "Khoảng trống", "Không ví dụ, không pretest và thiên lệch trả lời.", ["lp2"]],
          ["claim", "Claim được phép", "Được yêu thích và tự báo hiểu tăng.", ["lp3"]],
          ["next", "Đo tiếp", "Prewrite và bài sắp thứ tự có lý do.", ["lp3"]],
        ], [
          ["positive", "ủng hộ", "claim"],
          ["gaps", "giới hạn", "claim"],
          ["event", "cung cấp nội dung cho", "next"],
          ["next", "sẽ kiểm tra vượt khỏi", "claim"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán đánh giá hai claim về năng lực nghề; nêu bằng chứng trực tiếp, nguồn xác nhận, thiên lệch và phần còn phải kiểm tra.",
      requiredElements: [
        "claim của ứng viên",
        "ví dụ và thư quản lý",
        "claim về buổi chia sẻ",
        "hạn chế khảo sát/thư cảm ơn",
        "bài kiểm tra tiếp theo",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi:
        "实习生用三个月经历支持自己适合项目助理，任务清单只能证明他见过流程；材料晚到的例子和主管评价信进一步证明他会按顺序报告，但独立协调仍需情境任务。职业分享会的问卷和感谢信说明活动受欢迎、听众自报理解增加，却没有会前比较、具体例子，而且回复者可能更感兴趣。因此，两项判断都应把已证实的部分和待验证能力分开，再用情境任务或前后任务补充证据。",
      modelVi:
        "Ứng viên dùng ba tháng thực tập để ủng hộ mình hợp vị trí trợ lý; danh sách nhiệm vụ chỉ chứng minh đã thấy quy trình. Ví dụ vật liệu muộn và thư quản lý tăng bằng chứng anh biết báo theo thứ tự, nhưng điều phối độc lập vẫn cần bài tình huống. Khảo sát cùng thư cảm ơn của buổi nghề chứng minh hoạt động được thích và người nghe tự báo hiểu hơn, song thiếu so trước, ví dụ cụ thể và có thiên lệch người trả lời. Vì vậy cả hai phải tách phần đã chứng minh khỏi năng lực chờ xác minh và bổ sung bài tình huống hoặc nhiệm vụ trước/sau.",
    },
  },
  [ID.viewpoint]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "大量加班之后的管理选择",
        titleVi: "Lựa chọn quản lý sau giai đoạn tăng ca nhiều",
        targetVocabularyIds: [
          V(1056), V(1126), V(1273), V(1349), V(1416),
        ],
        paragraphs: [
          [
            "软件公司连续两个月大量加班后，员工调查显示六成人对工作安排不满。项目经理解释，客户临时改变要求，若拒绝可能失去合同；员工代表则指出，需求变化是真的，但很多任务没有重新排优先顺序，所有小组都被要求同时完成。",
            "Sau hai tháng tăng ca nhiều, khảo sát công ty phần mềm cho thấy sáu phần mười nhân viên không hài lòng với sắp việc. Quản lý dự án nói khách đổi yêu cầu đột ngột, từ chối có thể mất hợp đồng; đại diện nhân viên cho rằng thay đổi là thật nhưng nhiệm vụ không được xếp lại ưu tiên, mọi nhóm bị yêu cầu hoàn thành đồng thời.",
          ],
          [
            "管理层提出增加奖金，认为收入能补偿辛苦。员工代表不反对奖金，却说主要问题是时间不可预测和休息被打断。双方查看记录后发现，有三分之一加班来自等待审批后的集中返工。于是讨论从“要不要加钱”转向“怎样减少不必要的加班”。",
            "Ban quản lý đề xuất tăng thưởng, cho rằng thu nhập bù vất vả. Đại diện nhân viên không phản đối nhưng nói vấn đề chính là thời gian không đoán được và nghỉ bị gián đoạn. Xem hồ sơ, hai bên thấy một phần ba tăng ca đến từ làm lại tập trung sau chờ duyệt. Tranh luận chuyển từ “có thêm tiền không” sang “giảm tăng ca không cần thiết thế nào”.",
          ],
          [
            "最后，公司保留高峰奖金，同时规定新需求必须说明优先级；负责人若增加一项任务，就要指出哪一项延期。审批超过一天会自动提醒，团队每周检查返工原因。这个方案承认客户和收入的压力，也承认员工需要可预测时间。三个月试行尚未开始，所以目前不能说加班一定会减少。",
            "Cuối cùng, công ty giữ thưởng cao điểm, đồng thời yêu cầu nhu cầu mới phải có ưu tiên; nếu thêm một việc, người phụ trách phải chỉ việc nào hoãn. Phê duyệt quá một ngày tự nhắc và nhóm kiểm nguyên nhân làm lại hàng tuần. Phương án thừa nhận áp lực khách hàng/thu nhập lẫn nhu cầu thời gian dự đoán. Thử ba tháng chưa bắt đầu nên chưa thể nói tăng ca chắc chắn giảm.",
          ],
        ],
        questions: [
          q("main-claim", "Bài đọc tổng hợp hai góc nhìn thành giải pháp nào?", [
            "Giữ bồi thường nhưng thay cả cách xếp ưu tiên và phê duyệt",
            "Chỉ tăng tiền và không đổi quy trình",
            "Từ chối mọi yêu cầu khách hàng",
            "Bỏ khảo sát nhân viên",
          ], 0, ["rp1", "rp2", "rp3"],
          "Giải pháp cuối phản hồi cả áp lực hợp đồng và vấn đề quy trình/thời gian."),
          q("supported-detail", "Một phần ba tăng ca có liên quan điều gì?", [
            "Làm lại tập trung sau khi chờ phê duyệt",
            "Nhân viên đi làm muộn",
            "Thiếu máy tính",
            "Khách hàng không có hợp đồng",
          ], 0, ["rp2"],
          "Hồ sơ chỉ ra cụ thể nguồn tăng ca này."),
          q("cross-paragraph-evidence", "Chi tiết nào làm tranh luận chuyển từ tiền sang quy trình?", [
            "Nhân viên nêu thời gian khó đoán và dữ liệu cho thấy làm lại do chờ duyệt",
            "Quản lý nói về khách hàng và tăng thưởng",
            "Có sáu phần mười không hài lòng",
            "Thử nghiệm kéo dài ba tháng",
          ], 0, ["rp1", "rp2"],
          "Góc nhìn nhân viên cùng dữ liệu làm lại chỉ ra vấn đề không chỉ là thu nhập."),
          q("bounded-inference", "Có thể suy ra quy tắc “thêm một thì hoãn một” nhằm làm gì?", [
            "Buộc ưu tiên rõ và tránh coi mọi việc cùng khẩn",
            "Giảm lương nhân viên",
            "Cấm khách hàng thay đổi",
            "Loại toàn bộ phê duyệt",
          ], 0, ["rp1", "rp3"],
          "Đoạn đầu cho thấy mọi việc bị yêu cầu đồng thời; quy tắc mới tạo đánh đổi rõ.",
          "Có thể suy ra mục đích thiết kế, nhưng thử nghiệm chưa chạy nên chưa biết hiệu quả."),
          q("scope-limit", "Nhận định nào chưa thể nói ở thời điểm hiện tại?", [
            "Phương án mới chắc chắn giảm tăng ca",
            "Công ty vẫn giữ thưởng cao điểm",
            "Nhân viên quan tâm tính dự đoán",
            "Cần ghi nguyên nhân làm lại",
          ], 0, ["rp3"],
          "Đoạn cuối nói thử nghiệm chưa bắt đầu."),
        ],
        noteMap: map([
          ["management", "Góc nhìn quản lý", "Hợp đồng và bồi thường bằng thưởng.", ["rp1", "rp2"]],
          ["employee", "Góc nhìn nhân viên", "Ưu tiên, thời gian và nghỉ bị gián đoạn.", ["rp1", "rp2"]],
          ["evidence", "Dữ liệu chung", "Một phần ba tăng ca do chờ duyệt và làm lại.", ["rp2"]],
          ["solution", "Giải pháp", "Thưởng, ưu tiên, nhắc duyệt và rà soát.", ["rp3"]],
          ["boundary", "Giới hạn", "Thử nghiệm chưa bắt đầu.", ["rp3"]],
        ], [
          ["management", "được cân bằng với", "employee"],
          ["evidence", "định hình", "solution"],
          ["solution", "phản hồi", "employee"],
          ["boundary", "giới hạn claim về", "solution"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "工作环境的质量由谁定义",
        titleVi: "Ai định nghĩa chất lượng môi trường làm việc?",
        targetVocabularyIds: [
          V(1599), V(1668), V(1955), V(1919), V(1311),
        ],
        paragraphs: [
          [
            "一家设计公司搬办公室前，请全部员工讨论空间质量。管理人员希望使用开放区域，认为交流更快；需要集中写作的人担心声音影响工作。早晨到公司的员工喜欢阳光充足的位置，晚班员工却更关心灯光、空调和回家交通。",
            "Trước khi chuyển văn phòng, một công ty thiết kế mời toàn bộ nhân viên bàn chất lượng không gian. Quản lý muốn dùng khu mở để trao đổi nhanh; người cần tập trung viết lo tiếng ồn ảnh hưởng việc. Người đến buổi sáng thích chỗ nhiều nắng, ca tối quan tâm đèn, điều hòa và đường về.",
          ],
          [
            "最初的设计把一半空间做成开放区，另一半安排固定座位。试用两周后，员工发现“开放”和“安静”不是简单对立：小组讨论需要开放桌，个人写作需要安静房，短电话只需要几个隔音位置。不同任务在同一天内也会变化，一个人可能上午讨论、下午独立写作。",
            "Thiết kế đầu chia nửa khu mở, nửa ghế cố định. Sau hai tuần, nhân viên thấy “mở” và “yên” không đối lập đơn giản: thảo luận cần bàn mở, viết cá nhân cần phòng yên, gọi ngắn chỉ cần vài điểm cách âm. Nhiệm vụ trong ngày cũng đổi; một người có thể sáng họp, chiều viết riêng.",
          ],
          [
            "公司因此不再按人员类型分区，而按活动设置可预约空间，并每月收集噪音、使用率和完成任务的自评。这个做法综合了交流与集中两种观点，也承认交通和班次问题不能只靠室内设计解决。新办公室尚未正式启用，满意度和工作结果都只是待测指标。",
            "Công ty thôi chia theo loại người, chuyển sang không gian đặt theo hoạt động và hàng tháng lấy tiếng ồn, tỷ lệ dùng, tự đánh giá hoàn thành. Cách này tổng hợp giao tiếp với tập trung, đồng thời thừa nhận giao thông và ca làm không thể chỉ giải bằng nội thất. Văn phòng chưa chính thức dùng nên hài lòng và kết quả đều còn phải đo.",
          ],
        ],
        questions: [
          q("main-claim", "Nguồn đi tới cách định nghĩa chất lượng nào?", [
            "Theo hoạt động và bằng nhiều chỉ số, không theo một kiểu người cố định",
            "Chỉ cần càng nhiều không gian mở càng tốt",
            "Chỉ nhân viên buổi sáng được quyết định",
            "Mọi nhiệm vụ cần phòng riêng",
          ], 0, ["lp1", "lp2", "lp3"],
          "Các góc nhìn và thử dùng dẫn đến thiết kế theo hoạt động."),
          q("supported-detail", "Cuộc gọi ngắn cần loại không gian nào?", [
            "Một số vị trí cách âm",
            "Bàn mở lớn",
            "Phòng họp cả ngày",
            "Khu ngoài trời",
          ], 0, ["lp2"],
          "Đoạn 2 phân biệt yêu cầu của ba loại hoạt động."),
          q("cross-paragraph-evidence", "Vì sao chia cố định theo loại người không phù hợp?", [
            "Một người đổi giữa thảo luận và viết trong cùng ngày",
            "Mọi người làm đúng một việc",
            "Chỉ có ca sáng sử dụng văn phòng",
            "Không ai dùng khu mở",
          ], 0, ["lp1", "lp2"],
          "Góc nhìn ban đầu khác nhau nhưng nhiệm vụ của cùng người cũng thay đổi."),
          q("bounded-inference", "Có thể suy ra vì sao công ty đo cả tiếng ồn, tỷ lệ dùng và tự đánh giá?", [
            "Chất lượng có nhiều mặt và một chỉ số không đủ",
            "Để thay toàn bộ ý kiến nhân viên",
            "Để chứng minh nội thất giải được giao thông",
            "Để chỉ đo người ca tối",
          ], 0, ["lp1", "lp3"],
          "Nguồn nêu nhu cầu đa dạng và tách vấn đề ngoài thiết kế.",
          "Có thể suy ra mục đích đo đa chiều; chưa có dữ liệu để biết chỉ số nào thay đổi."),
          q("scope-limit", "Kết luận nào chưa có bằng chứng?", [
            "Văn phòng mới đã làm kết quả công việc tăng",
            "Nhân viên có nhu cầu không gian khác nhau",
            "Thiết kế chuyển sang đặt theo hoạt động",
            "Giao thông không chỉ do nội thất",
          ], 0, ["lp3"],
          "Văn phòng chưa vận hành chính thức."),
        ],
        noteMap: map([
          ["management", "Góc nhìn quản lý", "Không gian mở cho trao đổi.", ["lp1"]],
          ["focus", "Góc nhìn tập trung", "Không gian yên cho viết.", ["lp1"]],
          ["shift", "Phát hiện", "Nhu cầu đổi theo hoạt động trong ngày.", ["lp2"]],
          ["design", "Tổng hợp", "Không gian đặt theo hoạt động.", ["lp3"]],
          ["metrics", "Đánh giá", "Tiếng ồn, sử dụng và tự đánh giá.", ["lp3"]],
        ], [
          ["management", "được cân bằng với", "focus"],
          ["shift", "làm thay đổi", "design"],
          ["design", "được kiểm tra bằng", "metrics"],
          ["focus", "được phản hồi trong", "design"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán tổng hợp quan điểm quản lý và nhân viên trong hai nguồn; chỉ ra dữ liệu chung, giải pháp có điều kiện và claim còn chờ kiểm chứng.",
      requiredElements: [
        "áp lực khách hàng/thưởng",
        "ưu tiên và thời gian của nhân viên",
        "góc nhìn không gian mở/yên",
        "thiết kế theo hoạt động",
        "hai thử nghiệm chưa có kết quả",
      ],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp1"], [1, "lp3"]],
      modelHanzi:
        "加班争论中，管理层重视合同和奖金，员工更关心优先级与可预测时间；等待审批造成的返工使双方同意保留奖金，同时明确任务取舍并检查审批。办公室争论中，开放区有利交流，安静区有利写作，而同一人的任务会变化，所以公司改为按活动预约空间，并用多项指标评价。两个方案都综合不同观点，也都尚未完成试行，因此只能说明设计回应了问题，不能声称加班减少或工作质量提高。",
      modelVi:
        "Trong tranh luận tăng ca, quản lý coi trọng hợp đồng và thưởng, nhân viên quan tâm ưu tiên cùng thời gian dự đoán; dữ liệu làm lại do chờ duyệt giúp hai bên giữ thưởng nhưng làm rõ đánh đổi nhiệm vụ và theo dõi duyệt. Trong tranh luận văn phòng, khu mở hỗ trợ trao đổi, khu yên hỗ trợ viết, trong khi nhiệm vụ một người thay đổi nên công ty chuyển sang đặt không gian theo hoạt động và đo nhiều chỉ số. Cả hai phương án tổng hợp góc nhìn nhưng chưa thử xong, nên chỉ nói thiết kế phản hồi vấn đề, chưa thể tuyên bố tăng ca giảm hay chất lượng tăng.",
    },
  },
};

export const buildHsk4EducationWorkLongFormPack = (
  root = process.cwd(),
) => buildHsk4LongFormDomainPack({
  root,
  ...HSK4_EDUCATION_WORK_LONG_FORM_CONFIG,
  lessonIds: HSK4_EDUCATION_WORK_LESSON_IDS,
  content: CONTENT,
  vietnameseGlossBySequence: VI_GLOSS_BY_SEQUENCE,
  prerequisitePackBundles: [
    loadHsk4PersonalCommunityLongFormPackBundle(root),
  ],
});

export const serializeHsk4EducationWorkLongFormPack = (
  pack = buildHsk4EducationWorkLongFormPack(),
) => serializeHsk4LongFormDomainPack(pack);

const main = () => {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write") && args.has("--check")) {
    throw new Error("Choose either --write or --check");
  }
  const root = process.cwd();
  const outputPath = resolve(root, HSK4_EDUCATION_WORK_LONG_FORM_RELATIVE_PATH);
  const serialized = serializeHsk4EducationWorkLongFormPack(
    buildHsk4EducationWorkLongFormPack(root),
  );
  if (args.has("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
    console.log(`Wrote ${outputPath}`);
    return;
  }
  if (args.has("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error(`${HSK4_EDUCATION_WORK_LONG_FORM_RELATIVE_PATH} is stale`);
    }
    console.log(`${HSK4_EDUCATION_WORK_LONG_FORM_RELATIVE_PATH} is current`);
    return;
  }
  process.stdout.write(serialized);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
