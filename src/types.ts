import type { State } from "ts-fsrs";
import type { StartingLevel } from "./learning/startingLevels";

export type { StartingLevel } from "./learning/startingLevels";

export type Skill =
  | "pronunciation"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "vocabulary"
  | "grammar";

export type LearningGoal = "conversation" | "hsk" | "career" | "travel";

export type ContentReleaseState =
  | "draft"
  | "review"
  | "beta"
  | "published"
  | "retired";

export type MandarinTone = 0 | 1 | 2 | 3 | 4;

export type MandarinSyllable = {
  index: number;
  spelling: string;
  marked: string;
  numbered: string;
  initial: string;
  final: string;
  lexicalTone: MandarinTone;
  surfaceTone: MandarinTone;
  neutralTone: boolean;
};

export type ExerciseKind =
  | "meaning"
  | "pinyin"
  | "tone"
  | "tone-pair"
  | "listening"
  | "sentence"
  | "recall";

export type Profile = {
  name: string;
  goal: LearningGoal;
  dailyMinutes: 10 | 20 | 30;
  script: "simplified" | "traditional";
  startingLevel: StartingLevel;
  onboarded: boolean;
};

export type VocabularyItem = {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNumbered: string;
  syllables: MandarinSyllable[];
  meaning: string;
  partOfSpeech: string;
  example: string;
  examplePinyin: string;
  exampleMeaning: string;
  hsk: number;
  tags: string[];
};

export type Lesson = {
  id: string;
  unitId: string;
  title: string;
  chineseTitle: string;
  objective: string;
  minutes: number;
  xp: number;
  skills: Skill[];
  wordIds: string[];
  prerequisiteIds: string[];
  releaseState: ContentReleaseState;
  contentVersion: string;
};

export type CourseUnit = {
  id: string;
  code: string;
  stage: string;
  title: string;
  chineseTitle: string;
  description: string;
  color: "jade" | "gold" | "vermilion" | "cyan" | "magenta";
  lessons: Lesson[];
};

export type Story = {
  id: string;
  level: string;
  title: string;
  chineseTitle: string;
  summary: string;
  estimatedMinutes: number;
  releaseState: ContentReleaseState;
  contentVersion: string;
  sentences: Array<{
    chinese: string;
    pinyin: string;
    translation: string;
    wordIds: string[];
  }>;
  comprehension: Array<{
    id: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
};

export type StoredFsrsCard = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: string;
};

export type SkillMastery = Record<Skill, number>;

export type KnowledgeTrace = {
  attempts: number;
  correct: number;
  currentStreak: number;
  mastery: number;
  lastSeenAt: string;
};

export type MistakeRecord = {
  id: string;
  lessonId: string;
  questionId: string;
  wordId?: string;
  kind: ExerciseKind;
  skill: Skill;
  prompt: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  occurrences: number;
  correctedStreak: number;
  resolved: boolean;
  lastAttemptAt: string;
};

export type StudyEvent = {
  id: string;
  type: "lesson" | "review" | "correction" | "diagnostic" | "practice";
  label: string;
  xp: number;
  occurredAt: string;
};

export type DiagnosticResult = {
  completed: boolean;
  score: number;
  recommendedLessonId: string;
  completedAt: string | null;
};

export type AnswerEvidence = {
  lessonId: string;
  questionId: string;
  wordId?: string;
  kind: ExerciseKind;
  skill: Skill;
  prompt: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
  idempotencyKey?: string;
  activityVersion?: string;
  requiredForPass?: boolean;
};

export type EvidenceSource =
  | "lesson"
  | "reader"
  | "writing"
  | "pronunciation"
  | "mistake"
  | "review"
  | "diagnostic";

export type EvidenceOutcome =
  | "correct"
  | "incorrect"
  | "completed"
  | "unverified";

export type EvidenceMethod =
  | "meaning-selection"
  | "phonology-recognition"
  | "listening-selection"
  | "typed-character-recall"
  | "reading-comprehension"
  | "stroke-quiz"
  | "speech-transcript"
  | "remediation-recall"
  | "fsrs-rating"
  | "diagnostic-selection"
  | "lesson-completion";

export type LearningEvidence = {
  id: string;
  idempotencyKey: string;
  schemaVersion: 1;
  contentVersion: string;
  activityVersion: string;
  source: EvidenceSource;
  method: EvidenceMethod;
  activityId: string;
  skill: Skill;
  outcome: EvidenceOutcome;
  score: number | null;
  verified: boolean;
  masteryEligible: boolean;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type PracticeEvidenceInput = Omit<
  LearningEvidence,
  | "id"
  | "schemaVersion"
  | "occurredAt"
  | "contentVersion"
  | "verified"
  | "masteryEligible"
> & {
  contentVersion?: string;
};

export type LearningState = {
  schemaVersion: 2;
  contentVersion: string;
  profile: Profile;
  xp: number;
  dailyXp: number;
  streak: number;
  lastStudyDate: string | null;
  completedLessons: Record<string, {
    score: number;
    bestScore: number;
    attempts: number;
    completedAt: string;
  }>;
  savedWords: string[];
  fsrsCards: Record<string, StoredFsrsCard>;
  reviewCount: number;
  skillMastery: SkillMastery;
  knowledge: Record<string, KnowledgeTrace>;
  mistakes: MistakeRecord[];
  activityLog: StudyEvent[];
  diagnostic: DiagnosticResult;
  evidence: LearningEvidence[];
};
