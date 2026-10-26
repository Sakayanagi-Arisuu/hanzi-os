import { useEffect, useRef, useState } from "react";
import { premiumPlan, type PremiumPlanId } from "./policy";
type Order = { id:string; planId:PremiumPlanId; amount:number; status:string; bankSnapshot:string; refundRequestedAt:number|null };
function bankFields(snapshot: string): Record<string, string> {
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!value || typeof value !== 'object') return {};
    return Object.fromEntries(Object.entries(value).filter(([key, field]) => ['bankName','bankAccount','bankHolder','supportEmail'].includes(key) && typeof field === 'string'));
  } catch { return {}; }
}
export function BankTransferCheckout({ planId, amount, authenticated, onChanged }: { planId:PremiumPlanId; amount?:number; authenticated:boolean; onChanged:()=>void }) {
  const [data,setData]=useState<{enabled:boolean;orders:Order[]}|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [version,setVersion]=useState(0);
  const [refund,setRefund]=useState<string|null>(null);const [reason,setReason]=useState('');
  const key=useRef<{plan:PremiumPlanId;amount:number;key:string}|null>(null);
  useEffect(()=>{const controller=new AbortController();fetch('/api/commerce/bank-transfer',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();setData(await response.json());}).catch(()=>{if(!controller.signal.aborted)setError('Chưa tải được thông tin chuyển khoản. Hãy thử lại.');});return()=>controller.abort();},[version,authenticated]);
  const mutate=async(input:Record<string,unknown>)=>{if(busy)return;setBusy(true);setError('');try{const response=await fetch('/api/commerce/bank-transfer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});const body=await response.json();if(!response.ok)throw new Error(body.error?.message??'Chưa xử lý được đơn.');key.current=null;setRefund(null);setVersion(v=>v+1);onChanged();}catch(cause){setError(cause instanceof Error?cause.message:'Chưa kết nối được.');}finally{setBusy(false);}};
  return <section className="premium-bank-checkout" aria-label="Thanh toán chuyển khoản">
    {error&&<p role="alert">{error}</p>}
    {!data ? <p role="status">Đang kiểm tra phương thức thanh toán…</p> : data.enabled ? <><p>Chuyển khoản ngân hàng · quyền Premium được mở sau khi đối soát tiền vào. Không tự gia hạn.</p><button className="primary-button premium-buy" disabled={busy||!authenticated||!amount} onClick={()=>{if(!amount)return;if(key.current?.plan!==planId||key.current.amount!==amount)key.current={plan:planId,amount,key:crypto.randomUUID()};void mutate({action:'create',planId,key:key.current.key,expectedAmount:amount});}}>Tạo đơn chuyển khoản{amount?` · ${amount.toLocaleString('vi-VN')} ₫`:''}</button></> : <p>Thanh toán VNĐ chưa mở. Bạn chưa cần chuyển tiền.</p>}
    <button className="secondary-button" type="button" disabled={busy} onClick={()=>{setError('');setVersion(v=>v+1);onChanged();}}>Kiểm tra trạng thái đơn</button>
    {data?.orders.map(order=><details key={order.id} open={order.status==='pending'}><summary>{premiumPlan(order.planId)?.label} · {order.amount.toLocaleString('vi-VN')} ₫ · {({pending:'Chờ đối soát',paid:'Đã thanh toán',refunded:'Đã hoàn tiền',cancelled:'Đã hủy',failed:'Thất bại'} as Record<string,string>)[order.status]}</summary>
      {order.status==='pending'&&<><dl>{Object.entries(bankFields(order.bankSnapshot)).map(([field,value])=><div key={field}><dt>{({bankName:'Ngân hàng',bankAccount:'Số tài khoản',bankHolder:'Chủ tài khoản',supportEmail:'Email hỗ trợ'} as Record<string,string>)[field]??field}</dt><dd>{value}</dd></div>)}<div><dt>Nội dung chuyển khoản</dt><dd>HANZI {order.id}</dd></div><div><dt>Số tiền chính xác</dt><dd>{order.amount.toLocaleString('vi-VN')} ₫</dd></div></dl><p>Sau khi chuyển, không tạo đơn mới hoặc chuyển lần nữa. Giữ biên nhận và chờ đối soát.</p><button className="secondary-button" disabled={busy} onClick={()=>{if(window.confirm('Chỉ hủy nếu bạn chưa chuyển tiền. Bạn xác nhận chưa chuyển tiền cho đơn này?'))void mutate({action:'cancel',orderId:order.id});}}>Hủy đơn chưa chuyển tiền</button></>}
      {order.status==='paid'&&(order.refundRequestedAt?<p>Đã gửi yêu cầu hoàn tiền, đang chờ hỗ trợ.</p>:<button className="secondary-button" onClick={()=>{setRefund(order.id);setReason('');}}>Yêu cầu hoàn tiền</button>)}
      {refund===order.id&&<form onSubmit={event=>{event.preventDefault();void mutate({action:'refund',orderId:order.id,reason});}}><label>Lý do yêu cầu<textarea required minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="primary-button" disabled={busy}>Gửi yêu cầu</button><button type="button" className="secondary-button" onClick={()=>setRefund(null)}>Đóng</button></form>}
    </details>)}
  </section>;
}
