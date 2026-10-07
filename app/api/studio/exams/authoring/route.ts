import { authorizeStudio, studioError } from '../../../../../src/server/contentStudioHttp';
import { loadPublishedEditorialExamItems } from '../../../../../src/server/hskMockExamEditorialRepository';
import { hskMockExamAuthoringChoices, hskMockExamEditorialSuggestions } from '../../../../../src/server/hskMockExamBank';
import { noStoreJsonHeaders } from '../../../../../src/sync/protocol';
export async function GET() {
  const authorized = await authorizeStudio('content:workspace:read');
  if (!authorized.ok) return authorized.response;
  try {
    const items=await loadPublishedEditorialExamItems(authorized.context.database);
    return Response.json({suggestions:hskMockExamEditorialSuggestions(items),choices:hskMockExamAuthoringChoices(items)}, {headers:noStoreJsonHeaders});
  } catch {return studioError(503,'EXAM_AUTHORING_UNAVAILABLE','Ngân hàng câu chưa sẵn sàng. Hãy thử tải lại trang.');}
}
