import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authorize:vi.fn(), get:vi.fn(), update:vi.fn(), scan:vi.fn() }));
vi.mock("./adminHttp",()=>({authorizeAdmin:mocks.authorize}));
vi.mock("./contentStudioRepository",async importOriginal=>({...(await importOriginal<typeof import("./contentStudioRepository")>()),ContentStudioRepository:class { getRevision=mocks.get; updateDraft=mocks.update; }}));
vi.mock("../reader/editorialReaderLexiconScan",async importOriginal=>({...(await importOriginal<typeof import("../reader/editorialReaderLexiconScan")>()),scanEditorialReaderVocabulary:mocks.scan}));
vi.mock("./editorialReaderLexiconScan",()=>({lookupEditorialReaderSurface:vi.fn()}));
vi.mock("../reader/library/readerManifest",()=>({READER_SERIES_BY_ID:new Map()}));
import { PUT } from "../../app/api/studio/reader-series/route";
import { ContentStudioConcurrencyError } from "./contentStudioRepository";
import type { EditorialReaderBook } from "../reader/editorialReaderContent";

const book:EditorialReaderBook={schemaVersion:1,seriesId:"test-reader",titleZh:"城市",titleVi:"Thành phố",synopsisVi:"Một câu chuyện mới.",hookVi:"Sau cơn mưa.",genreIds:["Đời sống"],shelfId:"doi-song",levelBand:{min:"HSK2",max:"HSK3",label:"HSK2–3"},cover:{src:"/cover.webp",altVi:"Thành phố",tone:"jade"},chapters:[{titleZh:"早上",titleVi:"Buổi sáng",hookVi:"Ngày mới.",estimatedMinutes:5,paragraphs:[{zhHans:"今天下雨了。",pinyin:"Jīntiān xiàyǔ le.",vi:"Hôm nay trời mưa."},{zhHans:"我在家。",pinyin:"Wǒ zài jiā.",vi:"Tôi ở nhà."}],background:{src:"/background.webp",altVi:"Mưa",focalPoint:"center"}}],rights:{textProvenanceVi:"Nguyên bản",coverProvenanceVi:"Nguyên bản",backgroundProvenanceVi:"Nguyên bản",editorAttestsRights:true},humanReviewed:false};
const request=(input:Record<string,unknown>={},origin="https://hanzi.test")=>new Request("https://hanzi.test/api/studio/reader-series",{method:"PUT",headers:{origin,"content-type":"application/json"},body:JSON.stringify({book,revisionId:"revision-one",expectedRowVersion:3,idempotencyKey:"reader-update:test-1",...input})});
beforeEach(()=>{
 vi.clearAllMocks();
 mocks.authorize.mockResolvedValue({ok:true,context:{database:{},account:{userId:"editor"},sessionId:"session"}});
 mocks.get.mockResolvedValue({id:"revision-one",stableKey:"reader.series.test-reader",content:{contentKind:"reader-series",readerSeries:book}});
 mocks.scan.mockResolvedValue({marker:"fresh-scan"});
 mocks.update.mockResolvedValue({id:"revision-one",rowVersion:4});
});
describe("reopening a reader book in Studio",()=>{
 it("updates the same revision, preserves book/chapter data and rescans changed vocabulary",async()=>{
   const edited={...book,titleVi:"Thành phố sau mưa"};
   const response=await PUT(request({book:edited,quality:{accuracy:true,humanReviewed:true}}));
   expect(response.status).toBe(200);
   expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({revisionId:"revision-one",expectedRowVersion:3,title:"Vạn Quyển Các · Thành phố sau mưa",content:expect.objectContaining({readerSeries:expect.objectContaining({seriesId:book.seriesId,chapters:book.chapters,rights:book.rights,lexiconScan:{marker:"fresh-scan"},humanReviewed:false}),review:expect.objectContaining({humanReviewed:false,aiSelfReview:expect.objectContaining({accuracy:true,originality:false})})})}));
   expect(mocks.scan).toHaveBeenCalledWith(book.chapters,expect.any(Function));
 });
 it("blocks cross-origin and users without editing permission",async()=>{
   expect((await PUT(request({},"https://elsewhere.test"))).status).toBe(403);
   mocks.authorize.mockResolvedValue({ok:false,response:new Response(null,{status:403})});
   expect((await PUT(request())).status).toBe(403);
   expect(mocks.update).not.toHaveBeenCalled();
 });
 it("rejects changing stable book identity or removing existing chapters",async()=>{
   expect((await PUT(request({book:{...book,seriesId:"another-book"}}))).status).toBe(422);
   mocks.get.mockResolvedValue({id:"revision-one",stableKey:"reader.series.test-reader",content:{contentKind:"reader-series",readerSeries:{...book,chapters:[...book.chapters,...book.chapters]}}});
   expect((await PUT(request())).status).toBe(422);
   expect(mocks.update).not.toHaveBeenCalled();
 });
 it("retains the optimistic concurrency guard",async()=>{
   mocks.update.mockRejectedValue(new ContentStudioConcurrencyError("Changed elsewhere"));
   expect((await PUT(request())).status).toBe(409);
 });
});
