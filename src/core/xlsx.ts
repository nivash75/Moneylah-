import { zip } from './zip.ts';

/** `decimals` picks the number format; `date` shows a time stamp as a local date and time. */
export type Cell = string | { value: number; decimals: number } | { date: number } | { day: number } | null;
export interface Sheet { name: string; columns: { title: string; width: number }[]; rows: Cell[][] }

// Positions in the style list below.
const STYLE = { header: 1, date: 2, day: 3, decimals: [4, 5, 6, 7] };

/** Removes characters XML can't hold, then escapes the rest. Text cells are never run as formulas. */
export const xmlText = (text: string) =>
  text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 0 is A, 26 is AA. */
export const columnName = (index: number): string => (index < 26 ? '' : columnName(Math.floor(index / 26) - 1)) + String.fromCharCode(65 + (index % 26));

/** Spreadsheets count days from 30 December 1899, in local time. */
export function serialDate(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) / 86_400_000 + 25569;
}

function cellXml(cell: Cell, ref: string, style = 0): string {
  if (cell === null || cell === '') return '';
  if (typeof cell === 'string') return `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${xmlText(cell)}</t></is></c>`;
  if ('value' in cell) return `<c r="${ref}" s="${STYLE.decimals[cell.decimals] ?? STYLE.decimals[2]}"><v>${cell.value}</v></c>`;
  if ('date' in cell) return `<c r="${ref}" s="${STYLE.date}"><v>${serialDate(cell.date)}</v></c>`;
  return `<c r="${ref}" s="${STYLE.day}"><v>${Math.floor(serialDate(cell.day))}</v></c>`;
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function sheetXml(sheet: Sheet): string {
  const rows = [sheet.columns.map((c) => c.title) as Cell[], ...sheet.rows]
    .map((row, r) => `<row r="${r + 1}">${row.map((cell, i) => cellXml(cell, `${columnName(i)}${r + 1}`, r === 0 ? STYLE.header : 0)).join('')}</row>`)
    .join('');
  const widths = sheet.columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`).join('');
  const range = `A1:${columnName(sheet.columns.length - 1)}${sheet.rows.length + 1}`;
  // The heading row stays in view and can filter and sort.
  return `${XML}<worksheet xmlns="${MAIN}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${rows}</sheetData><autoFilter ref="${range}"/></worksheet>`;
}

const STYLES = `${XML}<styleSheet xmlns="${MAIN}">
<numFmts count="3"><numFmt numFmtId="164" formatCode="d mmm yyyy hh:mm"/><numFmt numFmtId="165" formatCode="d mmm yyyy"/><numFmt numFmtId="166" formatCode="#,##0.000"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
${[164, 165, 3, 166, 4, 166].map((id) => `<xf numFmtId="${id}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`).join('')}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** An .xlsx workbook, readable by Excel, Numbers and Google Sheets. */
export function toXlsx(sheets: Sheet[]): Uint8Array {
  const each = (make: (sheet: Sheet, n: number) => string) => sheets.map((s, i) => make(s, i + 1)).join('');
  // Excel refuses to filter without these names.
  const filters = each((s, n) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${n - 1}" hidden="1">'${xmlText(s.name)}'!$A$1:$${columnName(s.columns.length - 1)}$${s.rows.length + 1}</definedName>`);
  return zip([
    { name: '[Content_Types].xml', text: `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${each((_, n) => `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)}</Types>` },
    { name: '_rels/.rels', text: `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RELS}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', text: `${XML}<workbook xmlns="${MAIN}" xmlns:r="${RELS}"><sheets>${each((s, n) => `<sheet name="${xmlText(s.name)}" sheetId="${n}" r:id="rId${n}"/>`)}</sheets><definedNames>${filters}</definedNames></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', text: `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${each((_, n) => `<Relationship Id="rId${n}" Type="${RELS}/worksheet" Target="worksheets/sheet${n}.xml"/>`)}<Relationship Id="rId${sheets.length + 1}" Type="${RELS}/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', text: STYLES },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(s) })),
  ]);
}
