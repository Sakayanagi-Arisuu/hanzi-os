import { getD1Database } from "../../../../../src/server/d1";
import { EditorialReaderRepository } from "../../../../../src/server/editorialReaderRepository";
import { noStoreJsonHeaders } from "../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const series = await new EditorialReaderRepository(await getD1Database()).listPublishedSeries();
    return Response.json({ series }, { headers: noStoreJsonHeaders });
  } catch {
    return Response.json({ series: [] }, { headers: noStoreJsonHeaders });
  }
}
