import {beforeEach,expect,it,vi} from 'vitest';
import {DEFAULT_LEARNING_PREFERENCES} from '../learning/learningPreferences';
const fixture=vi.hoisted(()=>({allowInference:true,lateRevoke:false,plans:[] as Array<{events:unknown[]}>}));
const historyRead=vi.hoisted(()=>vi.fn(async()=>({version:1,resetEpoch:0,entries:[]})));
vi.mock('../../app/chatgpt-auth',()=>({getAuthenticatedUser:async()=>({userId:'consent-fixture',email:'fixture@example.test'})}));
vi.mock('./d1',()=>({getD1Database:async()=>({})}));
vi.mock('./syncRepository',()=>({SyncRepository:class{
  resolveUser=async()=> 'consent-fixture';
  getLearningDocument=async()=>({document:{profile:{value:{learningPreferences:{allowInference:fixture.allowInference}}}}});
}}));
vi.mock('./mutationRateLimit',()=>({consumeMutationRateLimit:async()=>({allowed:true}),mutationRateLimitHeaders:()=>({})}));
vi.mock('./learningResetEpoch',()=>({requireCurrentLearningResetEpoch:async()=>undefined,LearningResetEpochConflictError:class extends Error{}}));
vi.mock('./learningProjectionRepository',()=>({LearningProjectionContentUnavailableError:class extends Error{},LearningProjectionRepository:class{read=async()=>({});}}));
vi.mock('./workspaceRepository',()=>({WorkspaceRepository:class{exchange=historyRead;}}));
vi.mock('./premiumAccess',()=>({requirePremiumLesson:async()=>null}));
vi.mock('./adaptivePilotPlan',async original=>({...await original<typeof import('./adaptivePilotPlan')>(),
  buildAccountAdaptivePilotPlan:async(input:{events:unknown[]})=>{fixture.plans.push(input);if(fixture.lateRevoke)fixture.allowInference=false;return {schemaVersion:1,executionEnabled:false};}}));
import {POST} from '../../app/api/learning/adaptive-plan/route';
import {deriveAccountKey} from '../lib/accountKey';
beforeEach(()=>{fixture.allowInference=true;fixture.lateRevoke=false;fixture.plans=[];historyRead.mockClear();});
async function request(inference:boolean){
  return new Request('http://localhost/api/learning/adaptive-plan?mode=practice',{method:'POST',headers:{'content-type':'application/json','x-learning-owner':await deriveAccountKey('consent-fixture')},
    body:JSON.stringify({resetEpoch:0,preferences:{...DEFAULT_LEARNING_PREFERENCES,allowInference:inference},context:{online:true,minutes:5},intent:{kind:'quantity',origin:'manual'}})});
}
it('does not read account history when the learner explicitly chooses no inference',async()=>{
  expect((await POST(await request(false))).status).toBe(200);
  expect(historyRead).not.toHaveBeenCalled();
  expect(fixture.plans[0]?.events).toEqual([]);
});
it('rejects stale client consent before history/planning and rechecks a late server opt-out',async()=>{
  fixture.allowInference=false;
  const rejected=await POST(await request(true));
  expect(rejected.status).toBe(409);expect(historyRead).not.toHaveBeenCalled();expect(fixture.plans).toHaveLength(0);
  fixture.allowInference=true;fixture.lateRevoke=true;
  const late=await POST(await request(true));
  expect(late.status).toBe(409);expect(await late.json()).toEqual({error:'PREFERENCE_CHANGED'});
  expect(late.headers.get('cache-control')).toContain('no-store');
});
