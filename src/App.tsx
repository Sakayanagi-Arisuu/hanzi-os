import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "./components/AppShell";

const AnalyticsPage = lazy(async () => ({ default: (await import("./screens/AnalyticsPage")).AnalyticsPage }));
const AssessmentPage = lazy(async () => ({ default: (await import("./screens/AssessmentPage")).AssessmentPage }));
const Hsk1LevelCheckPage = lazy(async () => ({ default: (await import("./screens/Hsk1LevelCheckPage")).Hsk1LevelCheckPage }));
const Hsk2LevelCheckPage = lazy(async () => ({ default: (await import("./screens/Hsk2LevelCheckPage")).Hsk2LevelCheckPage }));
const Hsk3LevelCheckPage = lazy(async () => ({ default: (await import("./screens/Hsk3LevelCheckPage")).Hsk3LevelCheckPage }));
const Hsk4LevelCheckPage = lazy(async () => ({ default: (await import("./screens/Hsk4LevelCheckPage")).Hsk4LevelCheckPage }));
const CharactersPage = lazy(async () => ({ default: (await import("./screens/CharactersPage")).CharactersPage }));
const DashboardPage = lazy(async () => ({ default: (await import("./screens/DashboardPage")).DashboardPage }));
const DictionaryPage = lazy(async () => ({ default: (await import("./screens/DictionaryPage")).DictionaryPage }));
const LessonPage = lazy(async () => ({ default: (await import("./screens/LessonPage")).LessonPage }));
const MistakesPage = lazy(async () => ({ default: (await import("./screens/MistakesPage")).MistakesPage }));
const MockExamsPage = lazy(async () => ({ default: (await import("./screens/MockExamsPage")).MockExamsPage }));
const PathPage = lazy(async () => ({ default: (await import("./screens/PathPage")).PathPage }));
const ProfilePage = lazy(async () => ({ default: (await import("./screens/ProfilePage")).ProfilePage }));
const PronunciationPage = lazy(async () => ({ default: (await import("./screens/PronunciationPage")).PronunciationPage }));
const ReaderPage = lazy(async () => ({ default: (await import("./screens/ReaderPage")).ReaderPage }));
const ReaderSeriesPage = lazy(async () => ({ default: (await import("./screens/ReaderSeriesPage")).ReaderSeriesPage }));
const ReaderChapterPage = lazy(async () => ({ default: (await import("./screens/ReaderChapterPage")).ReaderChapterPage }));
const ReaderChallengePage = lazy(async () => ({ default: (await import("./screens/ReaderChallengePage")).ReaderChallengePage }));
const ReviewPage = lazy(async () => ({ default: (await import("./screens/ReviewPage")).ReviewPage }));

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<div className="route-loader"><span /><strong>Đang đồng bộ cảnh giới...</strong></div>}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/path" element={<PathPage />} />
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/assessment/hsk1" element={<Hsk1LevelCheckPage />} />
          <Route path="/assessment/hsk2" element={<Hsk2LevelCheckPage />} />
          <Route path="/assessment/hsk3" element={<Hsk3LevelCheckPage />} />
          <Route path="/assessment/hsk4" element={<Hsk4LevelCheckPage />} />
          <Route path="/exams" element={<MockExamsPage mode="catalog" />} />
          <Route path="/exams/history" element={<MockExamsPage mode="history" />} />
          <Route path="/exams/:level/:form" element={<MockExamsPage mode="runner" />} />
          <Route path="/pronunciation" element={<PronunciationPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/reader" element={<ReaderPage />} />
          <Route path="/reader/series/:seriesId" element={<ReaderSeriesPage />} />
          <Route path="/reader/series/:seriesId/chapter/:chapterId" element={<ReaderChapterPage />} />
          <Route path="/reader/challenge" element={<ReaderChallengePage />} />
          <Route path="/dictionary" element={<DictionaryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
