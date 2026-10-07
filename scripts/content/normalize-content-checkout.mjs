/** Restore LF only when the complete result is byte-identical to the Git index. */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const apply=process.argv.includes('--apply');
const files=execFileSync('git',['ls-files','-z','--','content'],{encoding:'utf8'}).split('\0').filter(path=>path.endsWith('.json')||(path.includes('/snapshots/')&&path.endsWith('.ts')));
const changes=[];
for(const path of files){
 const attribute=execFileSync('git',['check-attr','eol','--',path],{encoding:'utf8'}).trim();
 if(!attribute.endsWith(': lf'))continue;
 const original=readFileSync(path);
 const text=original.toString('utf8');
 if(!text.includes('\r\n'))continue;
 const normalized=Buffer.from(text.replaceAll('\r\n','\n'));
 const indexed=execFileSync('git',['show',`:${path}`],{maxBuffer:64*1024*1024});
 if(!indexed.equals(normalized))throw new Error(`Content differs from index; preserve edits: ${path}`);
 if(path.includes('/snapshots/')){
  const [packagePath,artifact]=path.split('/snapshots/');
  const manifest=JSON.parse(readFileSync(`${packagePath}/manifest.json`,'utf8'));
  const hash=`sha256:${createHash('sha256').update(normalized).digest('hex')}`;
  if(manifest.artifacts[artifact]!==hash)throw new Error(`Pinned artifact mismatch: ${path}`);
 }
 changes.push({path,original,normalized});
}
// Validate every candidate before the first write, and guard concurrent edits.
if(apply)for(const {path,original,normalized} of changes){
 if(!readFileSync(path).equals(original))throw new Error(`Concurrent edit: ${path}`);
 writeFileSync(path,normalized);
}
console.log(JSON.stringify({mode:apply?'apply':'read-only',files:changes.map(c=>c.path),count:changes.length},null,2));
