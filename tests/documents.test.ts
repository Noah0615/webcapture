import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { buildPptx, buildXlsx } from '../src/lib/export.ts';
import type { CaptureItem, Template } from '../src/lib/types.ts';
const buffer=await sharp({create:{width:800,height:500,channels:3,background:'#c2ef86'}}).jpeg().toBuffer();
const items:CaptureItem[]=Array.from({length:5},(_,i)=>({id:String(i),url:`https://example.com/${i}`,title:`테스트 페이지 ${i+1}`,note:'검증용 메모',image:`data:image/jpeg;base64,${buffer.toString('base64')}`,width:800,height:500,capturedAt:'2026-09-15T00:00:00.000Z',httpStatus:200,selected:true,status:'done'}));
await mkdir('test-output',{recursive:true});
for(const template of ['detail','compare2','compare4'] as Template[])test(`PPTX ${template} creates correct number of slides and embedded images`,async()=>{
  const pptx=await buildPptx(items,template,'검증용 프로젝트');
  await pptx.writeFile({fileName:`test-output/${template}.pptx`});
  assert.equal(pptx._slides.length,Math.ceil(5/(template==='detail'?1:template==='compare2'?2:4)));
});
test('XLSX embeds images, preserves clickable URLs and frozen headings',async()=>{
  const workbook=await buildXlsx(items,'검증용 프로젝트');
  await workbook.xlsx.writeFile('test-output/report.xlsx');
  const sheet=workbook.getWorksheet('Captures')!;
  assert.equal(sheet.rowCount,6);assert.equal(sheet.getImages().length,5);
  assert.equal((sheet.getCell('C2').value as {hyperlink:string}).hyperlink,'https://example.com/0');
  assert.equal(sheet.views[0].state,'frozen');
});
