/** Additive local migration only; never seed learner results as part of setup. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase} from './local-demo-database.mjs';
const name='0025_lesson_page_attempts.sql';
const apply=process.argv.includes('--apply');
const db=openDatabase(findLocalDemoDatabase(process.cwd()));
const quote=name=>'"'+name.replaceAll('"','""')+'"';
const fingerprint=name=>createHash('sha256').update(JSON.stringify(db.prepare(`SELECT * FROM ${quote(name)}`).all(),(_key,value)=>typeof value==='bigint'?String(value):value)).digest('hex');
try{
 const applied=db.prepare('SELECT 1 FROM d1_migrations WHERE name=?').get(name);
 const exists=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='lesson_page_attempts'").get();
 if(applied||exists){if(!applied||!exists)throw new Error('Inconsistent migration state');console.log({mode:'already-applied'});}
 else{
  if(!db.prepare('SELECT 1 FROM d1_migrations WHERE name=?').get('0024_thien_lo_media.sql'))throw new Error('Expected preceding migration absent');
  const backup=apply?await backupLocalDatabase(db,process.cwd(),'before-page-attempt-migration'):null;
  db.exec('BEGIN IMMEDIATE');
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r=>r.name);
  const before=new Map(tables.map(table=>[table,fingerprint(table)]));
  const schema=db.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  db.exec(readFileSync(new URL(`../../drizzle/${name}`,import.meta.url),'utf8'));
  for(const table of tables)if(fingerprint(table)!==before.get(table))throw new Error(`Existing data changed: ${table}`);
  for(const row of schema)if(db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(row.name)?.sql!==row.sql)throw new Error(`Existing schema changed: ${row.name}`);
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Foreign key violations');
  if(db.prepare('SELECT count(*) n FROM lesson_page_attempts').get().n!==0)throw new Error('Migration must not create attempts');
  db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run(name);
  db.exec(apply?'COMMIT':'ROLLBACK');
  console.log({mode:apply?'applied':'rehearsed-rollback',protectedTables:tables.length,backup,newAttempts:0});
 }
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
finally{db.close();}
