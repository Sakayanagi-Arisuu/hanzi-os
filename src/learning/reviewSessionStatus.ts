export function reviewQueueCanComplete(input:{networkVerified:boolean;availableCount:number;records:readonly {status:string}[]|null}){
  return input.networkVerified&&input.availableCount===0&&input.records!==null&&input.records.every(record=>record.status==='acknowledged');
}
