import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({identity:vi.fn(),database:vi.fn(),resolve:vi.fn(),read:vi.fn()}));
vi.mock('../../app/chatgpt-auth',()=>({getChatGPTUser:mocks.identity}));
vi.mock('./d1',()=>({getD1Database:mocks.database}));
vi.mock('./syncRepository',()=>({SyncRepository:class{resolveUser=mocks.resolve;}}));
vi.mock('./reviewHistoryRepository',()=>({ReviewHistoryRepository:class{readPage=mocks.read;}}));
import {GET} from '../../app/api/learning/review-history/route';
import {deriveAccountKey} from '../lib/accountKey';
import {LearningResetEpochConflictError} from './learningResetEpoch';
beforeEach(()=>{vi.resetAllMocks();mocks.identity.mockResolvedValue({userId:'a'});mocks.database.mockResolvedValue({});mocks.resolve.mockResolvedValue('a');mocks.read.mockResolvedValue({schemaVersion:1,events:[]});});
const request=(query='resetEpoch=0',owner?:string)=>new Request(`https://hanzi.invalid/api/learning/review-history?${query}`,{headers:owner?{'x-learning-owner':owner}:{}});
it('derives owner from auth, blocks cookie switches, returns no-store and never writes analytics',async()=>{
  mocks.identity.mockResolvedValueOnce(null);expect((await GET(request())).status).toBe(401);
  expect((await GET(request('resetEpoch=0',await deriveAccountKey('b')))).status).toBe(409);
  expect(mocks.read).not.toHaveBeenCalled();
  const response=await GET(request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');
  expect(mocks.read).toHaveBeenCalledWith('a',await deriveAccountKey('a'),0,{limit:50,cursor:null});
});
it.each(['','resetEpoch=x','resetEpoch=-1','resetEpoch=0&cursor=bad','resetEpoch=0&cursor=[]'])('rejects malformed query %s',async query=>{
  expect((await GET(request(query))).status).toBe(400);expect(mocks.read).not.toHaveBeenCalled();
});
it('keeps reset/backend errors retryable, without a replacement or empty history success',async()=>{
  mocks.read.mockRejectedValueOnce(new LearningResetEpochConflictError());expect((await GET(request())).status).toBe(409);
  mocks.read.mockRejectedValueOnce(new Error('storage'));expect((await GET(request())).status).toBe(503);
});
