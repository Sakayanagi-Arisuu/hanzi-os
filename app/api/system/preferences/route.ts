import { getD1Database } from '../../../../src/server/d1';
import { SystemSettingsRepository } from '../../../../src/server/systemSettingsRepository';
import { noStoreJsonHeaders } from '../../../../src/sync/protocol';
export const dynamic='force-dynamic';
export async function GET() {
  try {
    const settings=await new SystemSettingsRepository(await getD1Database()).list().catch(()=>[]);
    const minutes=Number(settings.find(item=>item.key==='default_daily_minutes')?.value??20);
    const dailyMinutes=minutes<=15?10:minutes<=25?20:30;
    return Response.json({dailyMinutes,announcement:String(settings.find(item=>item.key==='maintenance_banner')?.value??'')},{headers:noStoreJsonHeaders});
  }catch{return Response.json({dailyMinutes:20,announcement:''},{headers:noStoreJsonHeaders});}
}
