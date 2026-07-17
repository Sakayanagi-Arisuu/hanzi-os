import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { SystemOnboarding } from "./components/SystemOnboarding";
import { useLearning } from "./store/LearningStore";

const AnalyticsPage = lazy(async () => ({ default: (await import("./pages/AnalyticsPage")).AnalyticsPage }));
const AssessmentPage = lazy(async () => ({ default: (await import("./pages/AssessmentPage")).AssessmentPage }));
const CharactersPage = lazy(async () => ({ default: (await import("./pages/CharactersPage")).CharactersPage }));
const DashboardPage = lazy(async () => ({ default: (await import("./pages/DashboardPage")).DashboardPage }));
const DictionaryPage = lazy(async () => ({ default: (await import("./pages/DictionaryPage")).DictionaryPage }));
const LessonPage = lazy(async () => ({ default: (await import("./pages/LessonPage")).LessonPage }));
const MistakesPage = lazy(async () => ({ default: (await import("./pages/MistakesPage")).MistakesPage }));
const PathPage = lazy(async () => ({ default: (await import("./pages/PathPage")).PathPage }));
const ProfilePage = lazy(async () => ({ default: (await import("./pages/ProfilePage")).ProfilePage }));
const PronunciationPage = lazy(async () => ({ default: (await import("./pages/PronunciationPage")).PronunciationPage }));
const ReaderPage = lazy(async () => ({ default: (await import("./pages/ReaderPage")).ReaderPage }));
const ReviewPage = lazy(async () => ({ default: (await import("./pages/ReviewPage")).ReviewPage }));

export default function App() {
  const { state } = useLearning();

  if (!state.profile.onboarded) return <SystemOnboarding />;

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
          <Route path="/pronunciation" element={<PronunciationPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/reader" element={<ReaderPage />} />
          <Route path="/dictionary" element={<DictionaryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
