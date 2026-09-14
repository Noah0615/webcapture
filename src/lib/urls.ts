export function parseUrls(text: string) {
  const urls: string[] = [], invalid: string[] = [];
  let duplicates = 0;
  const seen = new Set<string>();
  for (const raw of text.split(/[\n\r\t,;]+/)) {
    let candidate = raw.trim().replace(/^['"]|['"]$/g, '');
    if (!candidate) continue;
    if (!candidate.includes('://') && !/^[a-z]+:/i.test(candidate)) candidate = `https://${candidate}`;
    try {
      const url = new URL(candidate);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') && url.hostname !== 'localhost') throw new Error();
      url.hash = '';
      const normalized = url.href;
      if (seen.has(normalized)) duplicates++;
      else { seen.add(normalized); urls.push(normalized); }
    } catch { invalid.push(raw.trim()); }
  }
  return { urls, invalid, duplicates };
}

export async function readUrlFile(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error('10MB 이하의 파일을 선택해 주세요.');
  if (/\.xlsx$/i.test(file.name)) {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const values: string[] = [];
    workbook.worksheets[0]?.eachRow((row) => {
      const cell = row.getCell(1);
      const value = cell.value;
      if (value && typeof value === 'object' && 'hyperlink' in value) values.push(value.hyperlink);
      else if (/https?:\/\/|^[\w.-]+\.[a-z]{2,}/i.test(cell.text)) values.push(cell.text);
    });
    return values.join('\n');
  }
  if (!/\.(txt|csv)$/i.test(file.name)) throw new Error('TXT, CSV 또는 XLSX 파일을 선택해 주세요.');
  const text = await file.text();
  if (/\.csv$/i.test(file.name)) return text.split(/\r?\n/).map(line => line.match(/^\s*"((?:[^"]|"")*)"|^([^,;]*)/)?.slice(1).find(v => v !== undefined)?.replace(/""/g, '"') || '').filter(value => /https?:\/\/|^[\w.-]+\.[a-z]{2,}/i.test(value)).join('\n');
  return text;
}
