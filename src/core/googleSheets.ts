import type { State } from './types.ts';
import { localDay } from './csv.ts';
import { toSheets } from './excel.ts';
import type { Cell } from './xlsx.ts';

/** A deployed Apps Script web app. Records are never sent anywhere else. */
export const isScriptUrl = (url: string) => /^https:\/\/script\.google\.com\/(macros|a\/macros\/[^/\s]+)\/s\/[A-Za-z0-9_-]+\/exec$/.test(url);

const pad = (n: number) => String(n).padStart(2, '0');

function value(cell: Cell): string | number {
  if (cell === null) return '';
  // Sheets would run text such as "=1+1" as a formula.
  if (typeof cell === 'string') return /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
  if ('value' in cell) return cell.value;
  if ('day' in cell) return localDay(cell.day);
  const d = new Date(cell.date);
  return `${localDay(cell.date)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The tabs to write, each starting with its headings. */
export const sheetsData = (state: State, now = Date.now()) =>
  toSheets(state, now).map((sheet) => ({ name: `Moneylah ${sheet.name}`, rows: [sheet.columns.map((c) => c.title as string | number), ...sheet.rows.map((row) => row.map(value))] }));

/** The script the user pastes into their own spreadsheet. `secret` stops anyone else writing to it. */
export const appsScript = (secret: string) => `// Moneylah! backup. Keep this private: it contains your key.
const SECRET = '${secret}';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return reply({ ok: false, error: 'The key does not match. Paste the latest script and deploy a new version.' });
    const book = SpreadsheetApp.getActiveSpreadsheet();
    body.sheets.forEach(function (tab) {
      const sheet = book.getSheetByName(tab.name) || book.insertSheet(tab.name);
      const rows = tab.rows.length;
      const columns = tab.rows[0].length;
      if (sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
      if (sheet.getMaxColumns() < columns) sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
      sheet.getRange(1, 1, rows, columns).setValues(tab.rows);
      // Remove rows left from a longer, earlier backup.
      const extra = sheet.getLastRow() - rows;
      if (extra > 0) sheet.getRange(rows + 1, 1, extra, columns).clearContent();
      sheet.setFrozenRows(1);
    });
    return reply({ ok: true });
  } catch (error) {
    return reply({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function reply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
`;
