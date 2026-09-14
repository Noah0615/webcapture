import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CaptureEngine } from '../core/capture.mjs';
import { parseUrls } from '../src/lib/urls.ts';
import { buildPptx, buildXlsx } from '../src/lib/export.ts';
import type { CaptureItem } from '../src/lib/types.ts';
const file=process.argv[2];
if(!file){console.error('Usage: npm run capture -- urls.txt [output-directory]');process.exit(1);}
const {urls,invalid,duplicates}=parseUrls(await readFile(file,'utf8'));
console.log(`${urls.length} URLs · ${duplicates} duplicates · ${invalid.length} invalid`);
const output=path.resolve(process.argv[3]||'test-output');await mkdir(output,{recursive:true});
const items:CaptureItem[]=urls.map((url,index)=>({id:String(index),url,title:new URL(url).hostname,note:'',selected:true,status:'queued'}));
const engine=new CaptureEngine();
process.once('SIGINT',()=>void engine.cancel());
await engine.run(items,{mode:'viewport',device:'desktop',clean:true,concurrency:3},update=>{Object.assign(items.find(item=>item.id===update.id)!,update);console.log(`${update.id}: ${update.status}`);});
const done=items.filter(item=>item.status==='done');
await writeFile(path.join(output,'results.json'),JSON.stringify(items.map(({image,...item})=>item),null,2));
if(!done.length){console.error('No successful captures');process.exit(1);}
await (await buildPptx(done,'detail','SnapDeck Research')).writeFile({fileName:path.join(output,'research.pptx')});
await (await buildXlsx(done,'SnapDeck Research')).xlsx.writeFile(path.join(output,'research.xlsx'));
console.log(`Exported ${done.length} captures to ${output}`);
