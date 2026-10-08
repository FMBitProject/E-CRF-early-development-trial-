/**
 * Minimal Office Open XML (.xlsx) writer for the study exports — pure, no DB,
 * no third-party dependency.
 *
 * Why not CSV: Excel opens a comma-separated file using the OS list separator,
 * which is ';' under Indonesian (and most European) regional settings, so the
 * whole row lands in column A. An .xlsx carries its own column structure and
 * opens the same everywhere.
 *
 * Cell typing is deliberately conservative — a clinical export must never turn
 * a subject code like "007" into the number 7:
 *   - JS numbers become numeric cells;
 *   - a string that is exactly a real calendar day (YYYY-MM-DD) becomes a date
 *     cell formatted yyyy-mm-dd;
 *   - a numeric-looking string becomes a number only in a column the caller
 *     lists in `numberColumns`;
 *   - everything else is an inline string. Inline strings are never evaluated,
 *     so a value starting with '=' cannot become a formula.
 */
import { deflateRawSync, crc32 } from 'node:zlib';

// ── Cell / sheet XML ─────────────────────────────────────────────────────────

/** Characters XML 1.0 forbids outright; free text pasted from devices carries them. */
const XML_ILLEGAL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export function xmlEscape(value) {
    return String(value)
        .replace(XML_ILLEGAL_RE, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
export function columnLetter(index) {
    let n = index + 1;
    let s = '';
    while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

/**
 * Excel serial day for a "YYYY-MM-DD" string, or null when the string is not a
 * day the calendar contains (JS would roll 2026-02-31 over to March).
 */
export function excelDateSerial(day) {
    if (typeof day !== 'string' || !DATE_ONLY_RE.test(day)) return null;
    const ms = Date.parse(`${day}T00:00:00Z`);
    if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== day) return null;
    return Math.round((ms - EXCEL_EPOCH_MS) / 86_400_000);
}

// Style indices into cellXfs in STYLES_XML.
const STYLE_HEADER = 1;
const STYLE_DATE   = 2;

function cellXml(ref, value, numeric) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') {
        return Number.isFinite(value) ? `<c r="${ref}"><v>${value}</v></c>` : '';
    }
    if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
    const s = String(value);
    const serial = excelDateSerial(s);
    if (serial !== null) return `<c r="${ref}" s="${STYLE_DATE}"><v>${serial}</v></c>`;
    if (numeric && NUMERIC_RE.test(s.trim()) && Number.isFinite(Number(s))) {
        return `<c r="${ref}"><v>${Number(s)}</v></c>`;
    }
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(s)}</t></is></c>`;
}

function columnWidths(headers, rows) {
    return headers.map((h, i) => {
        let max = String(h).length;
        for (const row of rows) {
            const v = row[i];
            if (v !== null && v !== undefined) max = Math.max(max, String(v).length);
            if (max >= 60) break;
        }
        return Math.min(Math.max(max + 2, 8), 60);
    });
}

export function sheetXml({ headers, rows, numberColumns = [] }) {
    const numeric = headers.map(h => numberColumns.includes(h));
    const lastCol = columnLetter(Math.max(headers.length - 1, 0));
    const lastRow = rows.length + 1;

    const cols = columnWidths(headers, rows)
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');

    const headerCells = headers.map((h, i) =>
        `<c r="${columnLetter(i)}1" s="${STYLE_HEADER}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(h)}</t></is></c>`).join('');

    const body = rows.map((row, r) => {
        const rn = r + 2;
        const cells = headers.map((_, c) => cellXml(`${columnLetter(c)}${rn}`, row[c], numeric[c])).join('');
        return `<row r="${rn}">${cells}</row>`;
    }).join('');

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        + `<dimension ref="A1:${lastCol}${lastRow}"/>`
        + '<sheetViews><sheetView workbookViewId="0">'
        + '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
        + '</sheetView></sheetViews>'
        + '<sheetFormatPr defaultRowHeight="15"/>'
        + (cols ? `<cols>${cols}</cols>` : '')
        + `<sheetData><row r="1">${headerCells}</row>${body}</sheetData>`
        + `<autoFilter ref="A1:${lastCol}${lastRow}"/>`
        + '</worksheet>';
}

// ── Sheet names ──────────────────────────────────────────────────────────────

/**
 * Excel rejects (and "repairs") a workbook whose sheet names exceed 31 chars,
 * contain : \ / ? * [ ], or collide case-insensitively. CRF form names are
 * user-authored, so sanitise and de-duplicate them.
 */
export function uniqueSheetNames(names) {
    const used = new Set();
    return names.map(raw => {
        const base = String(raw ?? '').replace(/[:\\/?*[\]]/g, ' ').replace(/^'+|'+$/g, '')
            .replace(/\s+/g, ' ').trim() || 'Sheet';
        let name = base.slice(0, 31);
        for (let n = 2; used.has(name.toLowerCase()); n++) {
            const suffix = ` (${n})`;
            name = base.slice(0, 31 - suffix.length) + suffix;
        }
        used.add(name.toLowerCase());
        return name;
    });
}

// ── Package parts ────────────────────────────────────────────────────────────

const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts>'
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
    + '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    + '<fills count="3"><fill><patternFill patternType="none"/></fill>'
    + '<fill><patternFill patternType="gray125"/></fill>'
    + '<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="3">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
    + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '</cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>';

function workbookParts(sheets) {
    const names = uniqueSheetNames(sheets.map(s => s.name));
    const files = [];

    files.push(['[Content_Types].xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
        + '</Types>']);

    files.push(['_rels/.rels',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        + '</Relationships>']);

    const filterNames = sheets.map((s, i) => {
        const lastCol = columnLetter(Math.max(s.headers.length - 1, 0));
        const quoted = `'${names[i].replace(/'/g, "''")}'`;
        return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${xmlEscape(quoted)}!$A$1:$${lastCol}$${s.rows.length + 1}</definedName>`;
    }).join('');

    files.push(['xl/workbook.xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + '<sheets>'
        + names.map((n, i) => `<sheet name="${xmlEscape(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
        + '</sheets>'
        + (filterNames ? `<definedNames>${filterNames}</definedNames>` : '')
        + '</workbook>']);

    files.push(['xl/_rels/workbook.xml.rels',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
        + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
        + '</Relationships>']);

    files.push(['xl/styles.xml', STYLES_XML]);
    sheets.forEach((s, i) => files.push([`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]));
    return files;
}

// ── ZIP container ────────────────────────────────────────────────────────────

/**
 * Deflate-compressed ZIP. Timestamps are fixed at the DOS epoch so the same
 * data always produces the same bytes (the export date lives in the filename
 * and the audit trail).
 */
export function zip(files) {
    const locals = [];
    const centrals = [];
    let offset = 0;

    for (const [name, content] of files) {
        const nameBuf = Buffer.from(name, 'utf8');
        const raw = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
        const data = deflateRawSync(raw);
        const crc = crc32(raw);

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);          // version needed
        local.writeUInt16LE(0x0800, 6);      // UTF-8 names
        local.writeUInt16LE(8, 8);           // deflate
        local.writeUInt16LE(0, 10);          // time
        local.writeUInt16LE(0x21, 12);       // date 1980-01-01
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(data.length, 18);
        local.writeUInt32LE(raw.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);
        locals.push(local, nameBuf, data);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);        // version made by
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(8, 10);
        central.writeUInt16LE(0, 12);
        central.writeUInt16LE(0x21, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(data.length, 20);
        central.writeUInt32LE(raw.length, 24);
        central.writeUInt16LE(nameBuf.length, 28);
        central.writeUInt32LE(offset, 42);
        centrals.push(central, nameBuf);

        offset += local.length + nameBuf.length + data.length;
    }

    const centralBuf = Buffer.concat(centrals);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralBuf.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, centralBuf, end]);
}

/**
 * @param {{ name: string, headers: string[], rows: any[][], numberColumns?: string[] }[]} sheets
 * @returns {Buffer} an .xlsx workbook
 */
export function buildXlsx(sheets) {
    if (!Array.isArray(sheets) || sheets.length === 0) throw new Error('A workbook needs at least one sheet');
    return zip(workbookParts(sheets));
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
