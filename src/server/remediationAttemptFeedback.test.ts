import {describe,expect,it} from "vitest";
import {CONTENT_VERSION,RELEASED_LESSONS,WORD_BY_ID} from "../data/curriculum";
import type {LearningAttemptCommandV1} from "../learning/attemptProtocol";
import {remediationAttemptFeedback} from "./remediationAttemptFeedback";

const lesson=RELEASED_LESSONS[0];
const word=WORD_BY_ID.get(lesson.wordIds[0])!;
const command:LearningAttemptCommandV1={
 protocolVersion:1,idempotencyKey:"feedback-test",installationId:"test",deviceId:"test",
 deviceSequence:1,resetEpoch:0,contentVersion:CONTENT_VERSION,
 activityId:`${lesson.id}:${word.id}-meaning`,activityVersion:`${lesson.contentVersion}:${lesson.id}:1`,
 source:"mistake",method:"meaning-selection",occurredAt:"2026-09-18T00:00:00.000Z",
 response:{kind:"answer",answer:"incorrect",usedHint:false},
};
describe("post-answer remediation feedback",()=>{
 it("resolves the released answer for an incorrect remediation response",()=>{
  expect(remediationAttemptFeedback(command)).toMatchObject({correctAnswer:word.meaning});
  expect(remediationAttemptFeedback(command)?.explanation).toContain(word.meaning);
 });
 it("does not reveal feedback for another source, method, version or activity",()=>{
  for(const changed of [
   {...command,source:"lesson" as const},
   {...command,source:"reader" as const},
   {...command,activityVersion:`${command.activityVersion}:stale`},
   {...command,activityId:"unknown"},
   {...command,method:"typed-character-recall" as const},
  ])expect(remediationAttemptFeedback(changed)).toBeUndefined();
 });
});
