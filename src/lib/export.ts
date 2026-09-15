import type { CaptureItem, Template } from './types';

function contain(i: CaptureItem, x: number, y: number, w: number, h: number) {
  const ratio = (i.width || 1920) / (i.height || 1080);
  const width = Math.min(w, h * ratio), height = width / ratio;
  return { x: x + (w - width) / 2, y: y + (h - height) / 2, w: width, h: height };
}
export async function buildPptx(items: CaptureItem[], template: Template, title: string) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'SnapDeck'; pptx.subject = title; pptx.title = title;
  pptx.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' };
  const count = template === 'detail' ? 1 : template === 'compare2' ? 2 : 4;
  for (let start = 0; start < items.length; start += count) {
    const slide = pptx.addSlide();
    slide.background = { color: 'F6F7F8' };
    slide.addText(title, { x: 0.5, y: 0.3, w: 11.5, h: 0.45, fontSize: 20, bold: true, color: '182120', breakLine: false });
    slide.addText('SNAPDECK', {x: 11.65, y: 0.4, w: 1.1, h: 0.2, fontSize: 9, charSpacing: 2, color: '4D665A'});
    items.slice(start, start + count).forEach((item, index) => {
      const cols = count === 1 ? 1 : 2;
      const col = index % cols, row = Math.floor(index / cols);
      const boxW = count === 1 ? 12.33 : 6.04;
      const boxH = count === 4 ? 2.7 : 5.7;
      const x = 0.5 + col * 6.3, y = 1.05 + row * 2.95;
      slide.addShape(pptx.ShapeType.rect, {x, y, w: boxW, h: boxH, fill: {color:'FFFFFF'}, line: {color:'E3E8E5', width:0.6}});
      const imageW = count === 1 ? 8.55 : boxW - 0.3;
      const imageH = count === 4 ? 1.75 : count === 1 ? 5.35 : 4.35;
      if (item.image) slide.addImage({data: item.image, ...contain(item, x + 0.15, y + 0.15, imageW, imageH)});
      const tx = count === 1 ? x + 8.95 : x + 0.2;
      const ty = count === 1 ? y + 0.65 : y + imageH + 0.25;
      const tw = count === 1 ? 3.05 : boxW - 0.4;
      slide.addText(item.title, {x:tx, y:ty, w:tw, h:count === 1 ? 0.85 : 0.32, fontSize:count === 1 ? 20 : 12, bold:true, color:'1D2724', fit:'shrink'});
      slide.addText(item.url, {x:tx, y:ty + (count === 1 ? 1 : 0.35), w:tw, h:0.3, fontSize:9, color:'427253', ...(item.url ? {hyperlink:{url:item.url}} : {}), fit:'shrink'});
      if (count !== 4) slide.addText(item.note || ' ', {x:tx, y:ty + (count === 1 ? 1.7 : 0.7), w:tw, h:count === 1 ? 2.2 : 0.2, fontSize:11, color:'66716B', fit:'shrink'});
      if (count === 1) slide.addText(`${item.capturedAt ? new Date(item.capturedAt).toLocaleString('ko-KR') : ''}${item.httpStatus ? `\nHTTP ${item.httpStatus}` : ''}`, {x:tx,y:y+4.85,w:tw,h:0.5,fontSize:9,color:'748078',fit:'shrink'});
    });
    slide.addText(`${start + 1}–${Math.min(start + count, items.length)} / ${items.length}   ·   ${new Date().toLocaleDateString('ko-KR')}`, {x:0.5,y:7.12,w:12.33,h:0.18,fontSize:8,color:'748078'});
  }
  return pptx;
}
export async function buildXlsx(items: CaptureItem[], title: string) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook(); workbook.creator = 'SnapDeck';
  const sheet = workbook.addWorksheet('Captures', { views:[{state:'frozen',ySplit:1}], properties:{defaultRowHeight:24} });
  sheet.columns = [{header:'스크린샷',key:'image',width:48},{header:'사이트명',key:'title',width:35},{header:'URL',key:'url',width:55},{header:'캡처 일시',key:'date',width:25},{header:'HTTP 상태',key:'status',width:14},{header:'메모',key:'note',width:45}];
  sheet.getRow(1).height = 32;
  sheet.getRow(1).eachCell(cell => {cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1C2822'}};cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.alignment={vertical:'middle'};});
  for (const item of items) {
    const row = sheet.addRow({title:item.title,url:item.url ? {text:item.url,hyperlink:item.url} : '',date:item.capturedAt || '',status:item.httpStatus || '',note:item.note});
    row.height = 150;
    row.eachCell(cell=>{cell.alignment={vertical:'middle',wrapText:true};cell.font={size:11,color:{argb:'FF293E32'}};});
    if (item.image) {
      const id=workbook.addImage({base64:item.image,extension:item.image.startsWith('data:image/png')?'png':'jpeg'});
      const ratio=(item.width || 1920)/(item.height || 1080), width=Math.min(320,185*ratio),height=width/ratio;
      sheet.addImage(id,{tl:{col:0.1,row:row.number-1+0.05},ext:{width,height},editAs:'oneCell'});
    }
  }
  sheet.autoFilter = {from:'A1',to:`F${items.length+1}`};
  workbook.title=title;
  return workbook;
}
export function downloadBlob(blob: Blob, name: string) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export async function exportDocument(items: CaptureItem[], format:'pptx'|'xlsx', template:Template, title:string) {
  if (!items.length) throw new Error('완료된 캡처를 먼저 선택해 주세요.');
  const filename=(title.trim() || 'SnapDeck').replace(/[<>:"/\\|?*]/g,'_');
  if(format==='pptx') await (await buildPptx(items,template,title)).writeFile({fileName:`${filename}.pptx`});
  else {
    const buffer=await (await buildXlsx(items,title)).xlsx.writeBuffer();
    downloadBlob(new Blob([new Uint8Array(buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${filename}.xlsx`);
  }
}
