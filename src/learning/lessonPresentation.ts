import { LESSON_BY_ID } from '../data/curriculum';

export const LESSON_ART = {
  campus: { src:'/lessons/ngoc-dien/campus.webp', alt:'Sinh viên trao đổi trong khuôn viên trường' },
  city: { src:'/lessons/ngoc-dien/city.webp', alt:'Tình huống giao tiếp trong khu phố' },
  work: { src:'/lessons/ngoc-dien/work.webp', alt:'Đồng nghiệp trao đổi công việc' },
  reading: { src:'/lessons/ngoc-dien/reading.webp', alt:'Không gian đọc và suy ngẫm' },
  sound: { src:'/lessons/ngoc-dien/sound.webp', alt:'Góc luyện nghe và phát âm' },
} as const;
export type LessonArtKey = keyof typeof LESSON_ART;
export function lessonPresentation(lessonId?: string) {
  const lesson=lessonId?LESSON_BY_ID.get(lessonId):undefined;
  const text=`${lesson?.unitId} ${lesson?.title} ${lesson?.objective}`.toLocaleLowerCase('vi');
  const family = /boot|phát âm|thanh điệu/.test(text)?'sound':/viết|lập luận|trình bày|tóm tắt/.test(text)?'writing':/đọc|văn bản|suy luận/.test(text)?'reading':/ngữ pháp|bổ ngữ|cấu trúc|so sánh/.test(text)?'grammar':'conversation';
  const art:LessonArtKey=family==='sound'?'sound':/trường học|sinh viên|học sinh|khuôn viên/.test(text)?'campus':/công việc|nghề|kinh doanh|dự án/.test(text)?'work':family==='reading'||family==='writing'?'reading':/ăn|uống|mua|đường|du lịch|thời gian|daily/.test(text)?'city':'campus';
  return {lesson,family,art,contextTitle:family==='reading'?'Đọc và tìm bằng chứng':family==='writing'?'Quan sát cách triển khai ý':family==='sound'?'Nghe và nhận ra âm':'Gặp trong tình huống',taskTitle:family==='writing'?'Tự viết và chỉnh sửa':family==='reading'?'Tóm lược bằng lời của bạn':'Đổi vai và vận dụng'};
}
