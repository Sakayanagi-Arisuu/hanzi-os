import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { isMistakeFromActivePathContent } from "../lib/adaptive";
import { resolveLearningPathAuthority } from "./learningAuthority";
import { localAnalyticsActivity, withDevicePractice } from "./analyticsActivity";
import { useAnalyticsActivity } from "./useAnalyticsActivity";
import { readGuestAccessDays } from "./useAccessDays";
import {useLocalPagePractice} from './useLocalPagePractice';
import {withLocalPagePractice} from './localPagePractice';
import { useLocalPageMistakeCount } from '../mistakes/useLocalPageMistakeCount';
import { usePracticeMistakes } from '../mistakes/usePracticeMistakes';

/** One definition of path, practice and access counts for both overview surfaces. */
export function useLearnerOverview(enabled = true) {
  const { state, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const authenticated = sync.session?.authenticated === true;
  const practice = usePracticeMistakes(sync.ownerKey, authenticated, enabled);
  const pageMistakes = useLocalPageMistakeCount(sync.ownerKey, enabled && !authenticated);
  const pageSnapshots=useLocalPagePractice(sync.ownerKey,enabled&&!authenticated,state.evidence);
  const account = useAnalyticsActivity(sync.session?.authenticated ? sync.session.accountKey : null,
    normalized.resetEpoch, normalized.coverageProjection?.cursor, enabled);
  const activity = authenticated ? withDevicePractice(account.activity, state.evidence) : withLocalPagePractice(localAnalyticsActivity(state.evidence),pageSnapshots);
  const accessDays = authenticated ? activity?.accessDays ?? null : readGuestAccessDays();
  const authority = resolveLearningPathAuthority({ authenticated, localState: state,
    projection: normalized.projection, authoritativeProgress: normalized.authoritativeProgress });
  const legacyCount = state.mistakes.filter(mistake =>
    !mistake.resolved && isMistakeFromActivePathContent(mistake, state.profile.startingLevel)).length;
  const supplemental = practice.ready && !practice.error ? practice.items.filter(item => !item.resolved).length : null;
  const base = authenticated ? account.openCount : pageMistakes === null ? null : legacyCount + pageMistakes;
  const unresolved = base === null || supplemental === null ? null : base + supplemental;
  return { activity, accessDays, authority, unresolved, authenticated, account };
}
