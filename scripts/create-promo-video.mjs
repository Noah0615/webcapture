import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

const W=1920,H=1080,outDir=path.resolve('marketing/video'),sceneDir=path.join(outDir,'scenes');
await mkdir(sceneDir,{recursive:true});
const font="Apple SD Gothic Neo, Arial, sans-serif";
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const svg=(body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="1920" height="1080" fill="#f5f7f4"/>${body}</svg>`);
const text=(x,y,value,size=60,weight=700,color='#1b2420',anchor='start')=>`<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(value)}</text>`;
const logo=()=>`<g transform="translate(110 85)"><rect width="76" height="76" rx="22" fill="#c5f27c"/><path d="M22 29v-8h8M54 29v-8h-8M22 47v8h8M54 47v8h-8" fill="none" stroke="#27372b" stroke-width="5" stroke-linecap="round"/><rect x="31" y="31" width="14" height="14" rx="3" fill="none" stroke="#27372b" stroke-width="4"/></g>${text(208,140,'snapdeck',46,750)}<circle cx="420" cy="111" r="5" fill="#26362b"/>`;
const pill=(x,y,w,label,fill='#eaf1e4',color='#587247')=>`<rect x="${x}" y="${y}" width="${w}" height="54" rx="27" fill="${fill}"/>${text(x+w/2,y+36,label,23,650,color,'middle')}`;
const card=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="#fff" stroke="#dfe6dc" stroke-width="2"/><rect x="${x+2}" y="${y+2}" width="${w-4}" height="${h-4}" rx="26" fill="none" stroke="#fff" stroke-width="2"/>`;

async function render(name,body,composite=[]){
  await sharp(svg(body)).composite(composite).png().toFile(path.join(sceneDir,`${name}.png`));
}

await render('01-hook',`${logo()}${pill(110,264,270,'15초 제품 데모')}${text(110,440,'웹사이트 30개,',94,760)}${text(110,550,'직접 캡처하고 있나요?',94,760)}${text(114,655,'반복 캡처와 문서 정리를 한 번에.',34,500,'#718078')}<g transform="translate(1270 190) rotate(5)">${card(0,0,480,690)}<rect x="38" y="42" width="404" height="252" rx="12" fill="#dbeacb"/>${text(40,355,'01',22,700,'#7a916b')}${text(40,410,'COMPETITOR A',28,700)}<rect x="40" y="450" width="330" height="16" rx="8" fill="#d6ddd2"/><rect x="40" y="492" width="390" height="12" rx="6" fill="#e5e9e2"/><rect x="40" y="526" width="355" height="12" rx="6" fill="#e5e9e2"/><rect x="40" y="600" width="120" height="42" rx="21" fill="#c5f27c"/></g>`);

const lines=['https://competitor-a.com','https://competitor-b.com','https://competitor-c.com','https://competitor-d.com','https://competitor-e.com'];
await render('02-input',`${logo()}${text(110,280,'URL 목록만 넣으세요.',72,760)}${text(112,345,'TXT · CSV · XLSX도 그대로.',29,500,'#718078')}${card(110,420,1050,490)}${pill(146,454,190,'01  링크 모으기')}${lines.map((l,i)=>`${text(164,570+i*61,String(i+1).padStart(2,'0'),21,600,'#a5afa1')}${text(235,570+i*61,l,27,500,'#4b6045')}`).join('')}<g transform="translate(1260 430)">${pill(0,0,260,'중복 자동 정리','#dff0d1')}${pill(0,86,260,'최대 300개','#eef2eb')}${pill(0,172,260,'4가지 화면 크기','#eef2eb')}<path d="M130 260v140m0 0-32-38m32 38 32-38" fill="none" stroke="#789854" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>${text(130,475,'한 번에',28,650,'#5b714c','middle')}</g>`);

const samples=['studio','forma','journal'];
await render('03-capture',`${logo()}${text(110,275,'캡처는 자동으로.',72,760)}${text(112,340,'같은 크기로 정리하고, 배너를 숨기고, 메모까지.',29,500,'#718078')}${samples.map((_,i)=>`${card(110+i*570,430,520,400)}<rect x="${134+i*570}" y="454" width="472" height="295" rx="14" fill="#e9eee5"/>${pill(134+i*570,772,105,`0${i+1}`)}${text(260+i*570,807,['North Studio','Forma','Fieldnotes'][i],25,650)}`).join('')}`,samples.map((name,i)=>({input:path.resolve(`public/samples/${name}.jpg`),top:454,left:134+i*570,blend:'over'})));

await render('04-export',`${logo()}${text(110,265,'바로 공유할 문서로.',72,760)}${text(112,330,'PowerPoint와 Excel 중 원하는 결과를 선택하세요.',29,500,'#718078')}${card(110,420,770,470)}<rect x="154" y="464" width="682" height="300" rx="15" fill="#edf2e8"/>${text(154,820,'POWERPOINT',23,700,'#ad6345')}${text(154,858,'1 · 2 · 4개 비교 슬라이드',27,600)}${card(1010,420,770,470)}<rect x="1054" y="464" width="682" height="70" rx="10" fill="#e3eee3"/>${[0,1,2,3].map(i=>`<rect x="1054" y="${550+i*54}" width="682" height="42" rx="5" fill="${i%2?'#fafbf9':'#f2f5f0'}"/><rect x="1072" y="${558+i*54}" width="62" height="26" rx="4" fill="#d7e3d4"/>`).join('')}${text(1054,820,'EXCEL',23,700,'#487458')}${text(1054,858,'이미지 · URL · 상태 · 메모',27,600)}`);

await render('05-cta',`${logo()}${pill(110,260,290,'무료 베타 테스트')}${text(960,460,'캡처는 줄이고,',88,760,'#1b2420','middle')}${text(960,565,'인사이트에 집중하세요.',88,760,'#1b2420','middle')}${text(960,690,'webcapture-ashen.vercel.app',38,650,'#527545','middle')}<rect x="720" y="770" width="480" height="92" rx="46" fill="#c5f27c"/>${text(960,828,'지금 샘플 체험하기  →',29,700,'#263d23','middle')}${text(960,970,'SNAPDECK  ·  LOCAL-FIRST CAPTURE STUDIO',19,650,'#8b9887','middle')}`);

const inputs=[];for(let i=1;i<=5;i++)inputs.push('-loop','1','-t','3.4','-i',path.join(sceneDir,`0${i}-${['hook','input','capture','export','cta'][i-1]}.png`));
const filter=`[0:v]fps=30,format=yuv420p[s0];[1:v]fps=30,format=yuv420p[s1];[2:v]fps=30,format=yuv420p[s2];[3:v]fps=30,format=yuv420p[s3];[4:v]fps=30,format=yuv420p[s4];[s0][s1]xfade=transition=fade:duration=0.5:offset=2.9[x1];[x1][s2]xfade=transition=fade:duration=0.5:offset=5.8[x2];[x2][s3]xfade=transition=fade:duration=0.5:offset=8.7[x3];[x3][s4]xfade=transition=fade:duration=0.5:offset=11.6,format=yuv420p[v]`;
const output=path.join(outDir,'snapdeck-promo-15s.mp4');
await new Promise((resolve,reject)=>{const p=spawn(ffmpegPath.path,[...inputs,'-filter_complex',filter,'-map','[v]','-t','15','-an','-c:v','libx264','-preset','medium','-crf','18','-movflags','+faststart','-pix_fmt','yuv420p','-y',output],{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('close',code=>code===0?resolve():reject(new Error(err)));});
console.log(output);
