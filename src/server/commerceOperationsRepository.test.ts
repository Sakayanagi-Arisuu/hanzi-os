import { BankTransferRepository, bankOrderForAccess, cashLedgerEnabled } from "./bankTransferRepository";
import { premiumAccess } from "../commerce/policy";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { CommerceOperationsRepository } from "./commerceOperationsRepository";
import { parseMerchantSettings, merchantReadiness } from "../commerce/merchant";
class Statement implements D1PreparedStatement {
  private values: (string | number | null)[] = [];
  constructor(private statement: StatementSync) {}
  bind(...values: unknown[]) { this.values = values as (string | number | null)[]; return this; }
  async first<T = Record<string, unknown>>(): Promise<T | null> { return (this.statement.get(...this.values) as T | undefined) ?? null; }
  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> { return { success: true, results: this.statement.all(...this.values) as T[] }; }
  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    const result = this.statement.run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

function fixture() {
 const sqlite=new DatabaseSync(":memory:");
 sqlite.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES ('u');
 CREATE TABLE profiles(user_id TEXT,display_name TEXT); INSERT INTO profiles VALUES('u','Hành giả');
 CREATE TABLE hanzi_password_credentials(user_id TEXT,normalized_username TEXT); INSERT INTO hanzi_password_credentials VALUES('u','learner');
 CREATE TABLE commerce_sandbox_orders(id TEXT,user_id TEXT,plan_id TEXT,status TEXT,created_at INTEGER);
 CREATE TABLE hanzi_premium_orders(id TEXT,user_id TEXT,plan_id TEXT,status TEXT,paid_at INTEGER,amount INTEGER);
 CREATE TABLE audit_events(id TEXT,category TEXT CHECK(category IN ('config','account')),action TEXT,outcome TEXT,actor_user_id TEXT,actor_session_id TEXT,target_type TEXT,target_id TEXT,request_id TEXT,metadata_json TEXT,created_at INTEGER);`);
 for(const file of ['0035_commerce_operations.sql','0036_commerce_cash_event_guard.sql','0037_bank_transfer_orders.sql']) sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
 const db:D1Database={prepare(sql){return new Statement(sqlite.prepare(sql));},async batch<T>(statements:D1PreparedStatement[]){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run<T>());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 return {sqlite,db,repository:new CommerceOperationsRepository(db,Date.UTC(2026,9,8))};
}
describe('commerce operations',()=>{
 it('keeps sandbox and Hanzi out of cash revenue, uses refund date and subtracts fees',async()=>{
  const {sqlite,repository}=fixture();const now=Date.UTC(2026,9,8);
  sqlite.exec("INSERT INTO commerce_sandbox_orders VALUES('s','u','hsk4-month','paid',1); INSERT INTO hanzi_premium_orders VALUES('h','u','hsk4-month','paid',1,1000)");
  expect(await repository.revenue()).toMatchObject({gross:0,net:0,paidOrders:0});
  sqlite.prepare("INSERT INTO commerce_cash_orders (id,user_id,plan_id,amount,currency,provider,provider_order_id,status,created_at,paid_at) VALUES('o','u','hsk4-month',79000,'VND','test-provider','p1','paid',?,?)").run(now-10000,now-10000);
  const event=sqlite.prepare('INSERT INTO commerce_cash_events VALUES(?,?,?,?,?,?,?,?)');
  event.run('e1','o','test-provider','evt1','capture',79000,now-9000,now-9000);
  event.run('e2','o','test-provider','evt2','refund',10000,now-8000,now-8000);
  event.run('e3','o','test-provider','evt3','fee',1000,now-7000,now-7000);
  expect(await repository.revenue()).toMatchObject({gross:79000,refunded:10000,fees:1000,net:68000,paidOrders:1});
  expect(()=>event.run('e4','o','test-provider','evt4','capture',79000,now,now)).toThrow();
  expect(()=>event.run('e5','o','test-provider','evt5','refund',79000,now,now)).toThrow();
  expect(()=>sqlite.exec("UPDATE commerce_cash_events SET amount=1")).toThrow();
  const old=now-40*86400000;sqlite.prepare("INSERT INTO commerce_cash_orders (id,user_id,plan_id,amount,currency,provider,provider_order_id,status,created_at,paid_at) VALUES('old','u','hsk4-month',100,'VND','test-provider','p2','refunded',?,?)").run(old,old);
  event.run('old1','old','test-provider','old1','capture',100,old,old);
  event.run('old2','old','test-provider','old2','refund',100,now,now);
  expect(await repository.revenue()).toMatchObject({gross:79000,refunded:10100,net:67900});sqlite.close();
 });
 it('filters all ledgers, bounds pagination, and uses customer names without SQL interpolation',async()=>{
  const {sqlite,repository}=fixture();
  const insert=sqlite.prepare("INSERT INTO hanzi_premium_orders VALUES(?,'u','hsk4-month','paid',?,1000)");for(let n=0;n<31;n++)insert.run('h'+n,n);
  expect(await repository.orders({method:'hanzi',query:'learner',page:99})).toMatchObject({total:31,page:2,pages:2});
  expect((await repository.orders({method:'hanzi',query:'learner',page:2})).rows).toHaveLength(6);
  expect((await repository.orders({query:"' OR 1=1 --"})).total).toBe(0);
  expect((await repository.orders({method:'vnd'})).total).toBe(0);sqlite.close();
 });
 it('saves settings with atomic audit and refuses stale revisions or invalid URLs',async()=>{
  const {sqlite,repository}=fixture();const settings=await repository.settings();
  const value={...settings.value,businessName:'Hanzi Shop',supportEmail:'help@example.com'};
  await repository.saveSettings(value,0,'admin','session','request');
  expect((await repository.settings()).revision).toBe(1);
  await expect(repository.saveSettings({...value,businessName:'Stale'},0,'admin','session','stale')).rejects.toThrow();
  expect((await repository.settings()).value.businessName).toBe('Hanzi Shop');
  sqlite.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'audit failed'); END");
  await expect(repository.saveSettings({...value,businessName:'Rollback'},1,'admin',null,'failed')).rejects.toThrow();
  expect((await repository.settings()).value.businessName).toBe('Hanzi Shop');
  expect(()=>parseMerchantSettings({...value,website:'javascript:alert(1)'})).toThrow();
  expect(()=>parseMerchantSettings({...value,provider:'__proto__'})).toThrow();
  expect(merchantReadiness(value).at(-1)?.ready).toBe(false);sqlite.close();
 });
});

describe('manual bank transfer',()=>{
 it('is closed by default and always closed on localhost',()=>{
  expect(cashLedgerEnabled('https://shop.example')).toBe(false);
  vi.stubEnv('HANZI_CASH_LEDGER_ENABLED','1');vi.stubEnv('NODE_ENV','production');
  try{expect(cashLedgerEnabled('http://localhost:3000')).toBe(false);expect(cashLedgerEnabled('https://localhost')).toBe(false);expect(cashLedgerEnabled('https://shop.example')).toBe(true);}finally{vi.unstubAllEnvs();}
 });
 it('locks the purchase price, grants only after audited exact reconciliation and revokes on a verified full refund',async()=>{
  const {sqlite,db,repository}=fixture();const now=Date.UTC(2026,9,8);const bank=new BankTransferRepository(db,now);
  sqlite.exec("CREATE TABLE premium_vnd_prices(plan_id TEXT PRIMARY KEY,amount INTEGER);INSERT INTO premium_vnd_prices VALUES('hsk4-month',79000)");
  const value={...(await repository.settings()).value,website:'https://shop.example',refundPolicyUrl:'https://shop.example/refunds',supportEmail:'help@shop.example',bankName:'Test Bank',bankAccount:'123456',bankHolder:'Test Holder'};
  await repository.saveSettings(value,0,'admin',null,'setup');
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('HANZI_CASH_LEDGER_ENABLED','1');vi.stubEnv('HANZI_BANK_TRANSFER_ENABLED','1');
  try{
   expect((await bank.availability('https://other.example')).enabled).toBe(false);
   await expect(bank.create('u','hsk4-month','key-12345678901234',1,'https://shop.example')).rejects.toThrow();
   const order=await bank.create('u','hsk4-month','key-12345678901234',79000,'https://shop.example');
   expect((await bank.create('u','hsk4-month','key-12345678901234',79000,'https://shop.example')).id).toBe(order.id);
   expect(premiumAccess((await bank.orders('u')).map(bankOrderForAccess),now).active).toBe(false);
   await expect(bank.reconcile(order.id,'capture','BANK0001',1,'admin','session','bad')).rejects.toThrow();
   sqlite.exec("CREATE TRIGGER fail_bank_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'audit offline'); END");
   await expect(bank.reconcile(order.id,'capture','BANK0001',79000,'admin','session','rollback')).rejects.toThrow();
   expect((await bank.orders('u'))[0].status).toBe('pending');expect((await repository.revenue()).gross).toBe(0);
   sqlite.exec('DROP TRIGGER fail_bank_audit');
   sqlite.exec("UPDATE premium_vnd_prices SET amount=99000");
   await bank.reconcile(order.id,'capture','BANK0001',79000,'admin','session','capture');
   expect(premiumAccess((await bank.orders('u')).map(bankOrderForAccess),now).active).toBe(true);
   await expect(bank.reconcile(order.id,'capture','BANK0001',79000,'admin','session','duplicate')).rejects.toThrow();
   expect((await repository.revenue()).gross).toBe(79000);
   expect(await repository.cashCustomers()).toEqual({active:1,expiring:0});
   await expect(bank.requestRefund('other',order.id,'Request refund please')).rejects.toThrow();
   await bank.requestRefund('u',order.id,'Request refund please');
   await bank.reconcile(order.id,'refund','BANK0002',79000,'admin','session','refund');
   expect(premiumAccess((await bank.orders('u')).map(bankOrderForAccess),now).active).toBe(false);
   expect(await repository.revenue()).toMatchObject({gross:79000,refunded:79000,net:0});
   expect(await repository.cashCustomers()).toEqual({active:0,expiring:0});
  }finally{vi.unstubAllEnvs();sqlite.close();}
 });
});
