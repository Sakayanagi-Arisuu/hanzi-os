import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "./components/AppShell";

const recoverLocalLazyRoute = async (
  routeLabel: string,
  error: unknown,
): Promise<never> => {
  console.error(`HANZI.OS ${routeLabel} route load failure`, error);
  const recoverable = error instanceof Error
    && error.name === "SyntaxError"
    && /invalid or unexpected token/iu.test(error.message);
  if (
    recoverable
    && typeof window !== "undefined"
    && ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    const detail = `${error.name}: ${error.message} | ${error.stack ?? "no stack"}`;
    void fetch("/api/dev/runtime-error", {
      body: JSON.stringify({ detail, route: window.location.pathname }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }).catch(() => undefined);

    const alreadyRecovered = new URLSearchParams(window.location.search)
      .get("dev-recovered") === "v15";
    if (!alreadyRecovered) {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(
        `/dev-recover.html?returnTo=${encodeURIComponent(returnTo)}`,
      );
      return new Promise<never>(() => undefined);
    }
  }
  throw error;
};

const AnalyticsPage = lazy(async () => ({ default: (await import("./screens/AnalyticsPage")).AnalyticsPage }));
const AssessmentPage = lazy(async () => ({ default: (await import("./screens/AssessmentPage")).AssessmentPage }));
const Hsk1LevelCheckPage = lazy(async () => ({ default: (await import("./screens/Hsk1LevelCheckPage")).Hsk1LevelCheckPage }));
const Hsk2LevelCheckPage = lazy(async () => ({ default: (await import("./screens/Hsk2LevelCheckPage")).Hsk2LevelCheckPage }));
const Hsk3LevelCheckPage = lazy(async () => ({ default: (await import("./screens/Hsk3LevelCheckPage")).Hsk3LevelCheckPage }));
const Hsk4LevelCheckPage = lazy(async () => ({ default: (await import("./screens/Hsk4LevelCheckPage")).Hsk4LevelCheckPage }));
const CharactersPage = lazy(async () => ({ default: (await import("./screens/CharactersPage")).CharactersPage }));
const CharacterForgeSessionPage = lazy(async () => ({ default: (await import("./screens/CharacterForgeSessionPage")).CharacterForgeSessionPage }));
const DashboardPage = lazy(async () => ({ default: (await import("./screens/DashboardPage")).DashboardPage }));
const DictionaryPage = lazy(async () => ({ default: (await import("./screens/DictionaryPage")).DictionaryPage }));
const LessonPage = lazy(async () => ({ default: (await import("./screens/LessonPage")).LessonPage }));
const MistakesPage = lazy(async () => ({ default: (await import("./screens/MistakesPage")).MistakesPage }));
const MegaLexiconPage = lazy(async () => ({ default: (await import("./screens/MegaLexiconPage")).MegaLexiconPage }));
const MockExamsPage = lazy(async () => {
  try {
    return {
      default: (
        await import("./screens/MockExamsPage.tsx?route-entry-v14")
      ).MockExamsPage,
    };
  } catch (error) {
    return recoverLocalLazyRoute("mock-exam", error);
  }
});
const PathPage = lazy(async () => ({ default: (await import("./screens/PathPage")).PathPage }));
const ProfilePage = lazy(async () => ({ default: (await import("./screens/ProfilePage")).ProfilePage }));
const PronunciationPage = lazy(async () => ({ default: (await import("./screens/PronunciationQuestPage")).PronunciationQuestPage }));
const ReaderPage = lazy(async () => ({ default: (await import("./screens/ReaderPage")).ReaderPage }));
const ReaderSeriesPage = lazy(async () => ({ default: (await import("./screens/ReaderSeriesPage")).ReaderSeriesPage }));
const ReaderChapterPage = lazy(async () => ({ default: (await import("./screens/ReaderChapterPage")).ReaderChapterPage }));
const ReaderChallengePage = lazy(async () => ({ default: (await import("./screens/ReaderChallengePage")).ReaderChallengePage }));
const ReviewPage = lazy(async () => {
  try {
    return { default: (await import("./screens/ReviewPage")).ReviewPage };
  } catch (error) {
    return recoverLocalLazyRoute("review", error);
  }
});

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<div className="route-loader"><span /><strong>Đang đồng bộ cảnh giới...</strong></div>}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/path" element={<PathPage />} />
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/path/expansion" element={<MegaLexiconPage />} />
          <Route path="/path/expansion/:missionId" element={<MegaLexiconPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/assessment/hsk1" element={<Hsk1LevelCheckPage />} />
          <Route path="/assessment/hsk2" element={<Hsk2LevelCheckPage />} />
          <Route path="/assessment/hsk3" element={<Hsk3LevelCheckPage />} />
          <Route path="/assessment/hsk4" element={<Hsk4LevelCheckPage />} />
          <Route path="/assessment/placement/hsk1" element={<Hsk1LevelCheckPage placement />} />
          <Route path="/assessment/placement/hsk2" element={<Hsk2LevelCheckPage placement />} />
          <Route path="/assessment/placement/hsk3" element={<Hsk3LevelCheckPage placement />} />
          <Route path="/assessment/placement/hsk4" element={<Hsk4LevelCheckPage placement />} />
          <Route path="/exams" element={<MockExamsPage mode="catalog" />} />
          <Route path="/exams/history" element={<MockExamsPage mode="history" />} />
          <Route path="/exams/:level/:form" element={<MockExamsPage mode="runner" />} />
          <Route path="/pronunciation" element={<PronunciationPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/characters/session" element={<CharacterForgeSessionPage />} />
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
