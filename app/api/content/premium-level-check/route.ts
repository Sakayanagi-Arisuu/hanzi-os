import {
  HSK4_LEVEL_CHECK_BANK_ID,
  HSK4_LEVEL_CHECK_DISCLOSURE,
  HSK4_LEVEL_CHECK_FORM_VERSION,
  HSK4_LEVEL_CHECK_ITEMS,
} from "../../../../src/data/hsk4LevelCheck";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    schemaVersion: 1,
    bankId: HSK4_LEVEL_CHECK_BANK_ID,
    formVersion: HSK4_LEVEL_CHECK_FORM_VERSION,
    disclosure: HSK4_LEVEL_CHECK_DISCLOSURE,
    items: HSK4_LEVEL_CHECK_ITEMS,
  }, { headers: noStoreJsonHeaders });
}
