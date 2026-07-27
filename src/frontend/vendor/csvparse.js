// Minimal RFC-4180 CSV parser (self-contained, no dependency). Handles quoted
// fields, embedded commas/newlines, doubled-quote escaping, a leading UTF-8 BOM,
// and CRLF or LF line endings. Returns { headers, rows } where each row is an
// object keyed by header. Pure — safe to unit-test in Node.

// Parse CSV into raw records (array of string arrays). Callers that need to pick
// a header row (grouped/merged spreadsheet headers) use this directly.
export function parseCSVRecords(text) {
    const src = String(text ?? '').replace(/^﻿/, '');   // strip BOM
    const records = [];
    let field = '';
    let record = [];
    let inQuotes = false;

    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (inQuotes) {
            if (c === '"') {
                if (src[i + 1] === '"') { field += '"'; i++; }   // escaped quote
                else inQuotes = false;
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            record.push(field); field = '';
        } else if (c === '\r') {
            // swallow; the \n (or end) closes the record
            if (src[i + 1] === '\n') i++;
            record.push(field); field = '';
            records.push(record); record = [];
        } else if (c === '\n') {
            record.push(field); field = '';
            records.push(record); record = [];
        } else {
            field += c;
        }
    }
    // flush trailing field/record (file not ending in newline)
    if (field !== '' || record.length) { record.push(field); records.push(record); }

    // drop fully-empty trailing records
    while (records.length && records[records.length - 1].every(v => v === '')) records.pop();
    return records;
}

// Convenience: first record = headers, rest = objects (simple flat CSVs).
export function parseCSV(text) {
    const records = parseCSVRecords(text);
    if (records.length === 0) return { headers: [], rows: [] };
    const headers = records[0].map(h => h.trim());
    const rows = records.slice(1).map(rec => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (rec[idx] ?? '').trim(); });
        return obj;
    });
    return { headers, rows };
}
