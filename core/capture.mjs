import { chromium } from 'playwright';
import sharp from 'sharp';
import PQueue from 'p-queue';
import { existsSync } from 'node:fs';

const presets={desktop:{width:1920,height:1080},laptop:{width:1440,height:900},tablet:{width:820,height:1180},mobile:{width:393,height:852}};
export function validateUrl(raw){
  if(typeof raw!=='string'||raw.length>8192)throw new Error('올바른 URL을 입력해 주세요.');
  const url=new URL(raw);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('인증 정보가 포함되지 않은 HTTP(S) URL만 사용할 수 있습니다.');
  return url.href;
}
export function validateOptions(options){
  if(!options||!Object.hasOwn(presets,options.device)||!['viewport','fullpage','selector'].includes(options.mode))throw new Error('캡처 설정이 올바르지 않습니다.');
  if(options.mode==='selector'&&(typeof options.selector!=='string'||!options.selector.trim()||options.selector.length>500))throw new Error('CSS 선택자를 입력해 주세요.');
  return {...options,concurrency:Math.min(6,Math.max(1,Number(options.concurrency)||3))};
}
export async function launchBrowser({headless=true,chromiumSandbox=true}={}){
  const bundled=chromium.executablePath();
  if(existsSync(bundled))return chromium.launch({headless,chromiumSandbox});
  try{return await chromium.launch({channel:'chrome',headless,chromiumSandbox});}
  catch{throw new Error('캡처 브라우저가 없습니다. Google Chrome을 설치하거나 프로젝트에서 npx playwright install chromium을 실행해 주세요.');}
}
export async function cleanPage(page){
  // Only known consent/chat containers; do not remove generic dialogs or paywalls.
  await page.evaluate(()=>{
    const selectors=['#onetrust-consent-sdk','#CybotCookiebotDialog','#CybotCookiebotDialogBodyUnderlay','.cc-window','#cookie-law-info-bar','#intercom-container','#ch-plugin','.crisp-client','[data-testid="cookie-banner"]'];
    for(const selector of selectors)for(const node of document.querySelectorAll(selector))node.style.setProperty('display','none','important');
  });
}
async function screenshotPage(page,url,options){
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:18000});
  if(response&&response.status()>=400)throw new Error(`페이지 응답 오류 (HTTP ${response.status()})`);
  await page.waitForLoadState('networkidle',{timeout:2500}).catch(()=>{});
  await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1200))]));
  if(options.mode==='fullpage'){
    await page.evaluate(async()=>{
      const max=Math.min(document.documentElement.scrollHeight,14000);
      for(let y=0;y<max;y+=800){scrollTo(0,y);await new Promise(resolve=>setTimeout(resolve,70));}
      scrollTo(0,0);
    });
  }
  if(options.clean)await cleanPage(page);
  await page.waitForTimeout(250);
  let buffer;
  if(options.mode==='selector'){
    const locator=page.locator(options.selector).first();
    await locator.waitFor({state:'visible',timeout:4000});
    buffer=await locator.screenshot({type:'jpeg',quality:88,animations:'disabled',timeout:4000});
  }else{
    const height=await page.evaluate(()=>document.documentElement.scrollHeight);
    if(options.mode==='fullpage'&&height>16000)throw new Error('페이지가 너무 깁니다 (16,000px 초과). 첫 화면 또는 특정 영역을 선택해 주세요.');
    buffer=await page.screenshot({fullPage:options.mode==='fullpage',type:'jpeg',quality:88,animations:'disabled',timeout:4000});
  }
  const result=await sharp(buffer).resize({width:1920,withoutEnlargement:true}).jpeg({quality:85,mozjpeg:true}).toBuffer({resolveWithObject:true});
  return {title:await page.title()||new URL(url).hostname,image:`data:image/jpeg;base64,${result.data.toString('base64')}`,width:result.info.width,height:result.info.height,httpStatus:response?.status()||0,capturedAt:new Date().toISOString(),status:'done'};
}
export class CaptureEngine{
  browser=null;queue=null;cancelled=false;busy=false;
  constructor({chromiumSandbox=true}={}){this.chromiumSandbox=chromiumSandbox;}
  async run(items,rawOptions,onProgress,session){
    if(this.busy)throw new Error('이미 캡처가 진행 중입니다.');
    if(!Array.isArray(items)||!items.length||items.length>300)throw new Error('1~300개 URL을 입력해 주세요.');
    const options=validateOptions(rawOptions);
    items.forEach(item=>{if(typeof item.id!=='string'||item.id.length>128)throw new Error('작업 ID가 올바르지 않습니다.');validateUrl(item.url);});
    this.busy=true;this.cancelled=false;
    try{
      this.browser=await launchBrowser({chromiumSandbox:this.chromiumSandbox});this.queue=new PQueue({concurrency:options.concurrency});
      await Promise.all(items.map(item=>this.queue.add(async()=>{
        if(this.cancelled){onProgress({id:item.id,status:'queued'});return;}
        onProgress({id:item.id,status:'capturing',error:undefined});
        let context,timer,timedOut=false;
        try{
          const sessionMatches=session&&new URL(item.url).origin===session.origin;
          context=await this.browser.newContext({viewport:presets[options.device],deviceScaleFactor:1,isMobile:options.device==='mobile',hasTouch:options.device==='mobile',storageState:sessionMatches?session.state:undefined,acceptDownloads:false,serviceWorkers:'block'});
          // Every target uses an isolated context, released immediately after capture.
          timer=setTimeout(()=>{timedOut=true;void context.close().catch(()=>{});},25000);
          const page=await context.newPage();
          await context.route('**/*',route=>{const protocol=new URL(route.request().url()).protocol;return ['http:','https:','data:','blob:','about:'].includes(protocol)?route.continue():route.abort();});
          page.on('dialog',dialog=>void dialog.dismiss());
          page.on('popup',popup=>void popup.close());
          const result=await screenshotPage(page,item.url,options);
          if(!this.cancelled)onProgress({id:item.id,...result});else onProgress({id:item.id,status:'queued'});
        }catch(error){onProgress({id:item.id,status:this.cancelled?'queued':'error',error:this.cancelled?undefined:timedOut?'25초 안에 페이지를 캡처하지 못했습니다.':String(error.message||error).split('\n')[0].slice(0,220)});}
        finally{clearTimeout(timer);await context?.close().catch(()=>{});}
      })));
    }finally{await this.browser?.close().catch(()=>{});this.browser=null;this.queue=null;this.busy=false;}
  }
  async cancel(){this.cancelled=true;await this.browser?.close().catch(()=>{});}
}
