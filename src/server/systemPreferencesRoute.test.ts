import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({list:vi.fn()}));
vi.mock('./d1',()=>({getD1Database:async()=>({})}));
vi.mock('./systemSettingsRepository',()=>({SystemSettingsRepository:class {list=mocks.list;}}));
import {GET} from '../../app/api/system/preferences/route';
beforeEach(()=>{mocks.list.mockReset();});
describe('public learner preferences',()=>{
  it.each([[5,10],[15,10],[20,20],[25,20],[120,30]])('maps %i minutes to supported %i without publishing private settings',async(value,expected)=>{
    mocks.list.mockResolvedValue([{key:'default_daily_minutes',value},{key:'maintenance_banner',value:'Lịch cập nhật'},{key:'account_registration_mode',value:'closed'}]);
    const response=await GET();expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({dailyMinutes:expected,announcement:'Lịch cập nhật'});
  });
  it('keeps onboarding available while the database is offline',async()=>{
    mocks.list.mockRejectedValue(Error('offline'));expect(await (await GET()).json()).toEqual({dailyMinutes:20,announcement:''});
  });
});
