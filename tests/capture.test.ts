import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { CaptureEngine, validateUrl } from '../core/capture.mjs';
test('rejects non-web protocols and embedded credentials before browser launch',()=>{
  for(const url of ['file:///etc/passwd','javascript:alert(1)','https://user:password@example.com'])assert.throws(()=>validateUrl(url));
});
test('capture engine handles real viewport, clean capture, selector and failed page',{timeout:60000},async()=>{
  const server=http.createServer((req,res)=>{
    if(req.url==='/missing'){res.writeHead(404);res.end('Missing');return;}
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Capture fixture</title><style>body{margin:0;background:#f4f8ee}main{width:320px;height:250px;background:#c2ef86}#onetrust-consent-sdk{position:fixed;inset:0;background:red}</style><main>Actual capture fixture</main><div id="onetrust-consent-sdk">Cookie banner</div>');
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address() as {port:number};const base=`http://127.0.0.1:${address.port}`;
  try{
    // GitHub's hosted Ubuntu runner disables the user namespace required by Chromium's sandbox.
    // The production app keeps the sandbox enabled; only this fixture browser opts out.
    const engine=new CaptureEngine({chromiumSandbox:false});const result:any[]=[];
    await engine.run([{id:'ok',url:base},{id:'fail',url:`${base}/missing`}],{mode:'viewport',device:'mobile',clean:true,concurrency:2},i=>result.push(i));
    const done=result.find(i=>i.id==='ok'&&i.status==='done');assert.ok(done);assert.equal(done.width,393);assert.equal(done.height,852);assert.equal(done.title,'Capture fixture');assert.ok(result.find(i=>i.id==='fail'&&i.status==='error'));
    const selected:any[]=[];await engine.run([{id:'selector',url:base}],{mode:'selector',device:'desktop',selector:'main',clean:true,concurrency:1},i=>selected.push(i));
    assert.equal(selected.at(-1).width,320);assert.equal(selected.at(-1).height,250);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
