// OQ-06 — CDISC ODM-XML 1.3.2 export fidelity.
// Traces to URS-EXP-01/02; CDISC ODM 1.3.2; ICH E6(R3) §5.5.3 (data transfer).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOdmXml, xmlEsc, odmDataType, odmDateTime } from '../src/backend/lib/odm.js';

const NOW = new Date('2026-07-28T09:30:00.000Z');

const baseData = {
    studyName: 'LKT Trial',
    studyOID:  'ECRF.LKT.001',
    subjects: [{
        subject: {
            id: 1, subjectCode: '01LKT', initials: 'AB', sex: 'M',
            status: 'Active', enrolledAt: '2026-01-15T00:00:00.000Z',
        },
        site: { code: 'SITE01', name: 'RS Umum' },
    }],
    visits:  [{ id: 10, visitOrder: 2, visitName: 'Week 4' }],
    forms:   [{ id: 5, name: 'Lipid Panel', schemaJson: { fields: [
        { key: 'ldl', label: 'LDL', type: 'number', required: true, cdashVar: 'LBORRES', sdtmDomain: 'LB', sdtmVar: 'LBORRES', isCritical: true },
        { key: 'note', label: 'Note', type: 'text' },
    ] } }],
    entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { ldl: 230, note: 'ok' } }],
    adverseEvents: [],
    consents: [],
    signatures: [],
};

const build = (over = {}) => buildOdmXml({ ...baseData, ...over }, { now: NOW });

// ── XML escaping — the single highest-risk defect in any XML exporter ────────

test('all five XML predefined entities are escaped', () => {
    assert.equal(xmlEsc(`&<>"'`), '&amp;&lt;&gt;&quot;&apos;');
});

test('ampersands are escaped first, so entities are not double-encoded', () => {
    assert.equal(xmlEsc('a & b < c'), 'a &amp; b &lt; c');
    assert.equal(xmlEsc('&amp;'), '&amp;amp;');
});

test('null and undefined escape to an empty string, never the text "null"', () => {
    assert.equal(xmlEsc(null), '');
    assert.equal(xmlEsc(undefined), '');
});

test('numbers and booleans are stringified rather than dropped', () => {
    assert.equal(xmlEsc(0), '0');
    assert.equal(xmlEsc(false), 'false');
});

test('a clinical value containing markup cannot break out of its attribute', () => {
    const xml = build({
        entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5,
            dataJson: { note: '"/><script>alert(1)</script>' } }],
    });
    assert.ok(!xml.includes('<script>'), 'raw markup must never reach the document');
    assert.ok(xml.includes('&quot;/&gt;&lt;script&gt;'));
});

test('a subject code containing an ampersand is escaped in the SubjectKey', () => {
    const xml = build({ subjects: [{
        subject: { id: 1, subjectCode: 'A&B', status: 'Active' }, site: null,
    }] });
    assert.ok(xml.includes('SubjectKey="A&amp;B"'));
});

test('a study name with markup is escaped in both the header and GlobalVariables', () => {
    const xml = build({ studyName: 'Trial <A&B>' });
    assert.ok(!xml.includes('<A&B>'));
    assert.ok(xml.includes('<StudyName>Trial &lt;A&amp;B&gt;</StudyName>'));
});

// ── Document shell ───────────────────────────────────────────────────────────

test('the document declares ODM 1.3.2 in the CDISC namespace', () => {
    const xml = build();
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('xmlns="http://www.cdisc.org/ns/odm/v1.3"'));
    assert.ok(xml.includes('ODMVersion="1.3.2"'));
    assert.ok(xml.includes('FileType="Snapshot"'));
    assert.ok(xml.trimEnd().endsWith('</ODM>'));
});

test('the timestamp carries a timezone offset, not the JS "Z" suffix', () => {
    assert.equal(odmDateTime(NOW), '2026-07-28T09:30:00+00:00');
    assert.ok(build().includes('CreationDateTime="2026-07-28T09:30:00+00:00"'));
    assert.ok(!build().includes('CreationDateTime="2026-07-28T09:30:00.000Z"'));
});

test('the study OID is used consistently across FileOID, Study and ClinicalData', () => {
    const xml = build();
    assert.ok(xml.includes('FileOID="ECRF.LKT.001.EXPORT"'));
    assert.ok(xml.includes('<Study OID="ECRF.LKT.001">'));
    assert.ok(xml.includes('<ClinicalData StudyOID="ECRF.LKT.001" MetaDataVersionOID="ECRF.LKT.001.MDV.1">'));
});

test('every open element is closed — the document is balanced', () => {
    const xml = build({
        adverseEvents: [{ id: 1, subjectId: 1, aeTerm: 'Headache', severity: 'Mild', isSerious: false }],
        consents: [{ id: 1, subjectId: 1, consentVersion: '1.0', consentDate: '2026-01-10', consentType: 'Initial', language: 'id' }],
        signatures: [{ entryId: 100, userId: 'u1', signedAt: '2026-02-01T00:00:00.000Z' }],
    });
    for (const tag of ['ODM', 'Study', 'MetaDataVersion', 'ClinicalData', 'SubjectData', 'StudyEventData', 'FormData', 'ItemGroupData', 'FormDef', 'ItemGroupDef', 'ItemDef', 'Signature']) {
        const open  = (xml.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
        const close = (xml.match(new RegExp(`</${tag}>`, 'g')) || []).length;
        assert.equal(open, close, `<${tag}> is unbalanced: ${open} open vs ${close} close`);
    }
});

// ── Metadata ─────────────────────────────────────────────────────────────────

test('CRF field types map onto the ODM DataType vocabulary', () => {
    assert.equal(odmDataType('number'), 'float');
    assert.equal(odmDataType('date'), 'date');
    assert.equal(odmDataType('datetime'), 'datetime');
    assert.equal(odmDataType('boolean'), 'boolean');
    assert.equal(odmDataType('text'), 'text');
    assert.equal(odmDataType('select'), 'text', 'unknown types fall back to text');
    assert.equal(odmDataType(undefined), 'text');
});

test('a required field is Mandatory="Yes" and an optional one "No"', () => {
    const xml = build();
    assert.ok(xml.includes('<ItemRef ItemOID="IT.5.ldl" Mandatory="Yes"/>'));
    assert.ok(xml.includes('<ItemRef ItemOID="IT.5.note" Mandatory="No"/>'));
});

test('CDASH and SDTM annotations are emitted as Alias elements', () => {
    const xml = build();
    assert.ok(xml.includes('<Alias Context="CDASH" Name="LBORRES"/>'));
    assert.ok(xml.includes('<Alias Context="SDTM"  Name="LB.LBORRES"/>'));
    assert.ok(xml.includes('SDSVarName="LBORRES"'));
});

test('a critical data field is flagged for ICH E6(R3) risk-based monitoring', () => {
    assert.ok(build().includes('<Alias Context="ICH-E6R3" Name="CriticalDataField"/>'));
});

test('a field with no annotations emits no Alias elements', () => {
    const xml = build();
    const noteDef = xml.slice(xml.indexOf('<ItemDef OID="IT.5.note"'));
    assert.ok(!noteDef.slice(0, noteDef.indexOf('</ItemDef>')).includes('<Alias'));
});

test('a form with no schema does not crash the exporter', () => {
    const xml = buildOdmXml({ ...baseData, forms: [{ id: 9, name: 'Empty' }] }, { now: NOW });
    assert.ok(xml.includes('<FormDef OID="F.9" Name="Empty" Repeating="No">'));
});

// ── Clinical data ────────────────────────────────────────────────────────────

test('demographics are emitted for every subject', () => {
    const xml = build();
    assert.ok(xml.includes('<ItemData ItemOID="IT.DM.SUBJID"  Value="01LKT"/>'));
    assert.ok(xml.includes('<ItemData ItemOID="IT.DM.SITEID"  Value="SITE01"/>'));
    assert.ok(xml.includes('<ItemData ItemOID="IT.DM.RFSTDTC" Value="2026-01-15"/>'));
});

test('a subject with no sex recorded exports the SDTM "U" code, not an empty value', () => {
    const xml = build({ subjects: [{ subject: { id: 1, subjectCode: 'X', status: 'Active' }, site: null }] });
    assert.ok(xml.includes('<ItemData ItemOID="IT.DM.SEX"     Value="U"/>'));
});

test('a subject with no site falls back to LocationOID="UNKNOWN"', () => {
    const xml = build({ subjects: [{ subject: { id: 1, subjectCode: 'X', status: 'Active' }, site: null }] });
    assert.ok(xml.includes('<SiteRef LocationOID="UNKNOWN"/>'));
});

test('CRF data is grouped under a StudyEventOID derived from the visit order', () => {
    assert.ok(build().includes('StudyEventOID="SE.V02" StudyEventRepeatKey="10"'));
});

test('an entry whose visit is missing from the visit list exports as unscheduled', () => {
    // It used to fall back to the visit *id*, which is a different numbering
    // space from visitOrder: entry on visit id 10 came out as "SE.V10" and
    // merged with whatever real visit happened to be number 10. It also
    // referenced an OID that MetaDataVersion never declared.
    const xml = build({ visits: [] });
    assert.ok(xml.includes('StudyEventData StudyEventOID="SE.UNSCHEDULED"'));
    assert.ok(!xml.includes('StudyEventData StudyEventOID="SE.V10"'));
});

test('each captured field becomes an ItemData under its own ItemGroupData', () => {
    const xml = build();
    assert.ok(xml.includes('<ItemData ItemOID="IT.5.ldl" Value="230"/>'));
    assert.ok(xml.includes('<ItemData ItemOID="IT.5.note" Value="ok"/>'));
});

test('a null field value exports as an empty string, not "null"', () => {
    const xml = build({ entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { ldl: null } }] });
    assert.ok(xml.includes('<ItemData ItemOID="IT.5.ldl" Value=""/>'));
    assert.ok(!xml.includes('Value="null"'));
});

test('an entry with no data produces a FormData block with no items', () => {
    const xml = build({ entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: {} }] });
    assert.ok(xml.includes('<FormData FormOID="F.5" TransactionType="Snapshot">'));
    assert.ok(!xml.includes('<ItemData ItemOID="IT.5.'));
});

test('electronic signatures are attached to the form they signed', () => {
    const xml = build({ signatures: [{ entryId: 100, userId: 'user-7', signedAt: '2026-02-01T08:00:00.000Z' }] });
    assert.ok(xml.includes('<UserRef UserOID="user-7"/>'));
    assert.ok(xml.includes('<SignatureRef MethodOID="ESIG"/>'));
    assert.ok(xml.includes('<DateTimeStamp>2026-02-01T08:00:00.000Z</DateTimeStamp>'));
});

test('a signature for another entry is not attached to this one', () => {
    const xml = build({ signatures: [{ entryId: 999, userId: 'user-7', signedAt: '2026-02-01T08:00:00.000Z' }] });
    assert.ok(!xml.includes('<Signature>'));
});

test('adverse events export into the SE.AE study event with SDTM item OIDs', () => {
    const xml = build({ adverseEvents: [{
        id: 3, subjectId: 1, aeTerm: 'Nyeri kepala', meddraPt: 'Headache',
        severity: 'Mild', isSerious: true, causality: 'Possible',
    }] });
    assert.ok(xml.includes('StudyEventOID="SE.AE"'));
    assert.ok(xml.includes('<ItemData ItemOID="IT.AE.AETERM"   Value="Nyeri kepala"/>'));
    assert.ok(xml.includes('<ItemData ItemOID="IT.AE.AESER"    Value="Y"/>'));
});

test('a non-serious AE exports AESER="N"', () => {
    const xml = build({ adverseEvents: [{ id: 3, subjectId: 1, aeTerm: 'x', severity: 'Mild', isSerious: false }] });
    assert.ok(xml.includes('<ItemData ItemOID="IT.AE.AESER"    Value="N"/>'));
});

test('a subject with no AEs emits no SE.AE data block at all', () => {
    // SE.AE is always *declared* in MetaDataVersion — metadata describes the
    // study design, not what one subject happens to have. What must be absent
    // is the ClinicalData block.
    const xml = build();
    assert.ok(!xml.includes('<StudyEventData StudyEventOID="SE.AE"'));
    assert.ok(xml.includes('<StudyEventDef OID="SE.AE"'), 'still declared in metadata');
});

test('consent records export into SE.CONSENT with a withdrawal flag', () => {
    const xml = build({ consents: [{
        id: 2, subjectId: 1, consentVersion: '2.1', consentDate: '2026-01-10',
        consentType: 'Re-consent', language: 'id', isWithdrawn: true,
    }] });
    assert.ok(xml.includes('StudyEventOID="SE.CONSENT"'));
    assert.ok(xml.includes('<ItemData ItemOID="IT.IC.VERSION"    Value="2.1"/>'));
    assert.ok(xml.includes('<ItemData ItemOID="IT.IC.WITHDRAWN"  Value="Y"/>'));
});

test('a withdrawn subject sets the DM death/discontinuation flag and date', () => {
    const xml = build({ subjects: [{
        subject: { id: 1, subjectCode: 'X', status: 'Withdrawn', withdrawnAt: '2026-03-02T00:00:00.000Z' },
        site: null,
    }] });
    assert.ok(xml.includes('<ItemData ItemOID="IT.DM.DTHFL"   Value="Y"/>'));
    assert.ok(xml.includes('<ItemData ItemOID="IT.DM.DSSTDTC" Value="2026-03-02"/>'));
});

test('data belonging to one subject never leaks into another subject block', () => {
    const xml = build({
        subjects: [
            { subject: { id: 1, subjectCode: 'S1', status: 'Active' }, site: null },
            { subject: { id: 2, subjectCode: 'S2', status: 'Active' }, site: null },
        ],
        entries: [{ id: 100, subjectId: 2, visitId: 10, formId: 5, dataJson: { ldl: 99 } }],
    });
    const s1 = xml.slice(xml.indexOf('SubjectKey="S1"'), xml.indexOf('SubjectKey="S2"'));
    assert.ok(!s1.includes('Value="99"'), 'S2 data must not appear inside the S1 block');
    assert.ok(xml.slice(xml.indexOf('SubjectKey="S2"')).includes('Value="99"'));
});

test('an empty study still produces a well-formed, importable document', () => {
    const xml = buildOdmXml({ subjects: [], forms: [], entries: [] }, { now: NOW });
    assert.ok(xml.includes('<ClinicalData'));
    assert.ok(xml.trimEnd().endsWith('</ODM>'));
});

test('the exporter falls back to a default study name and OID', () => {
    const xml = buildOdmXml({}, { now: NOW });
    assert.ok(xml.includes('<StudyName>E-CRF Clinical Study</StudyName>'));
    assert.ok(xml.includes('<Study OID="ECRF.STUDY.001">'));
});

// ── Robustness and type fidelity (added after the self-review) ───────────────

test('a malformed stored date degrades one value instead of failing the export', () => {
    const xml = build({ subjects: [{
        subject: { id: 1, subjectCode: 'S1', status: 'Active', enrolledAt: 'garbage' }, site: null,
    }] });
    assert.ok(xml.includes('<ItemData ItemOID="IT.DM.RFSTDTC" Value=""/>'));
    assert.ok(xml.trimEnd().endsWith('</ODM>'), 'the rest of the document is still produced');
});

test('a malformed signature timestamp does not abort the export', () => {
    assert.doesNotThrow(() => build({
        signatures: [{ entryId: 100, userId: 'u1', signedAt: 'not-a-date' }],
    }));
    const xml = build({ signatures: [{ entryId: 100, userId: 'u1', signedAt: 'not-a-date' }] });
    assert.ok(xml.includes('<DateTimeStamp></DateTimeStamp>'));
});

test('a Yes/No answer is exported as an ODM-legal boolean', () => {
    // DataType="boolean" only accepts 0/1/true/false — "Yes" makes the document
    // invalid against the ODM schema.
    const forms = [{ id: 5, name: 'F', schemaJson: { fields: [{ key: 'smoker', label: 'Smoker', type: 'boolean' }] } }];
    const yes = build({ forms, entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { smoker: 'Yes' } }] });
    const no  = build({ forms, entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { smoker: 'No' } }] });
    assert.ok(yes.includes('<ItemData ItemOID="IT.5.smoker" Value="true"/>'));
    assert.ok(no.includes('<ItemData ItemOID="IT.5.smoker" Value="false"/>'));
    assert.ok(yes.includes('DataType="boolean"'));
});

test('an unanswered boolean stays empty rather than becoming false', () => {
    const forms = [{ id: 5, name: 'F', schemaJson: { fields: [{ key: 'smoker', label: 'S', type: 'boolean' }] } }];
    const xml = build({ forms, entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { smoker: '' } }] });
    assert.ok(xml.includes('<ItemData ItemOID="IT.5.smoker" Value=""/>'));
});

test('boolean conversion only applies to fields declared boolean', () => {
    const forms = [{ id: 5, name: 'F', schemaJson: { fields: [{ key: 'answer', label: 'A', type: 'text' }] } }];
    const xml = build({ forms, entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { answer: 'Yes' } }] });
    assert.ok(xml.includes('<ItemData ItemOID="IT.5.answer" Value="Yes"/>'), 'a text answer keeps its wording');
});

test('a multi-select array is joined rather than exported as "[object Object]"', () => {
    const forms = [{ id: 5, name: 'F', schemaJson: { fields: [{ key: 'sx', label: 'Symptoms', type: 'checkbox', options: ['A', 'B'] }] } }];
    const xml = build({ forms, entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { sx: ['A', 'B'] } }] });
    assert.ok(xml.includes('<ItemData ItemOID="IT.5.sx" Value="A; B"/>'));
});

test('an entry with no visit gets an unscheduled study event, not "SE.Vnull"', () => {
    const xml = build({ visits: [], entries: [{ id: 100, subjectId: 1, visitId: null, formId: 5, dataJson: { ldl: 1 } }] });
    assert.ok(!xml.includes('SE.Vnull'));
    assert.ok(xml.includes('StudyEventOID="SE.UNSCHEDULED"'));
});

// ── Referential integrity ───────────────────────────────────────────────────
// An ODM document is only useful if a regulator's loader will read it, and the
// first thing a loader does is resolve OIDs. MetaDataVersion used to declare
// nothing for DM/AE/IC or for any study event, so ClinicalData referenced 42
// OIDs that did not exist and the document failed schema validation outright.
// Asserting on individual OIDs would not have caught that — the check has to be
// "every reference resolves", run over a document that exercises every branch.

const RICH = {
    studyName: 'LKT Trial', studyOID: 'ECRF.LKT.001',
    subjects: [
        { subject: { id: 1, subjectCode: '01LKT', initials: 'AB', sex: 'M', status: 'Active', enrolledAt: '2026-01-15T00:00:00.000Z' }, site: { code: 'SITE01', name: 'RS Umum' } },
        { subject: { id: 2, subjectCode: '02LKT', sex: 'F', status: 'Withdrawn', enrolledAt: '2026-02-01T00:00:00.000Z' }, site: null },
    ],
    visits: [
        { id: 10, visitOrder: 2, visitName: 'Week 4',   visitType: 'Scheduled',   formIds: [5] },
        { id: 11, visitOrder: 1, visitName: 'Baseline', visitType: 'Scheduled',   formIds: [5, 6] },
        { id: 12, visitOrder: null, visitName: 'Ad hoc', visitType: 'Unscheduled', formIds: [] },
    ],
    forms: [
        { id: 5, name: 'Lipid Panel', schemaJson: { fields: [
            { key: 'ldl', label: 'LDL', type: 'number', required: true, sdtmDomain: 'LB', sdtmVar: 'LBORRES' },
            { key: 'ok',  label: 'Tolerated?', type: 'boolean' },
        ] } },
        { id: 6, name: 'Vitals', schemaJson: { fields: [{ key: 'sbp', label: 'SBP', type: 'number' }] } },
    ],
    entries: [
        { id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { ldl: 230, ok: 'Yes' } },
        { id: 101, subjectId: 1, visitId: 11, formId: 6, dataJson: { sbp: 120 } },
        { id: 102, subjectId: 2, visitId: 99, formId: 5, dataJson: { ldl: 1 } },  // visit not in the list
        { id: 103, subjectId: 2, visitId: 12, formId: 5, dataJson: { ldl: 2 } },  // unscheduled visit
    ],
    adverseEvents: [{ id: 3, subjectId: 1, aeTerm: 'Headache', severity: 'Mild', isSerious: false }],
    consents: [{ id: 2, subjectId: 1, consentVersion: '2.1', consentDate: '2026-01-10', consentType: 'Initial', language: 'id', isWithdrawn: false }],
    signatures: [{ entryId: 100, userId: 'u-1', userName: 'Dr Sari', userRole: 'pi', signedAt: '2026-03-01T02:00:00.000Z' }],
};

test('every OID referenced anywhere in the document is declared', () => {
    const xml = buildOdmXml(RICH, { now: NOW });
    const all = (re) => [...xml.matchAll(re)].map(m => m[1]);
    const declared = {
        StudyEvent: new Set(all(/<StudyEventDef OID="([^"]+)"/g)),
        Form:       new Set(all(/<FormDef OID="([^"]+)"/g)),
        ItemGroup:  new Set(all(/<ItemGroupDef OID="([^"]+)"/g)),
        Item:       new Set(all(/<ItemDef OID="([^"]+)"/g)),
        User:       new Set(all(/<User OID="([^"]+)"/g)),
        Location:   new Set(all(/<Location OID="([^"]+)"/g)),
        Signature:  new Set(all(/<SignatureDef OID="([^"]+)"/g)),
    };
    const refs = [
        ['StudyEvent', /<StudyEventRef StudyEventOID="([^"]+)"/g,  'Protocol/StudyEventRef'],
        ['StudyEvent', /<StudyEventData StudyEventOID="([^"]+)"/g, 'ClinicalData/StudyEventData'],
        ['Form',       /<FormRef FormOID="([^"]+)"/g,              'StudyEventDef/FormRef'],
        ['Form',       /<FormData FormOID="([^"]+)"/g,             'ClinicalData/FormData'],
        ['ItemGroup',  /<ItemGroupRef ItemGroupOID="([^"]+)"/g,    'FormDef/ItemGroupRef'],
        ['ItemGroup',  /<ItemGroupData ItemGroupOID="([^"]+)"/g,   'ClinicalData/ItemGroupData'],
        ['Item',       /<ItemRef ItemOID="([^"]+)"/g,              'ItemGroupDef/ItemRef'],
        ['Item',       /<ItemData ItemOID="([^"]+)"/g,             'ClinicalData/ItemData'],
        ['User',       /<UserRef UserOID="([^"]+)"/g,              'Signature/UserRef'],
        ['Location',   /<SiteRef LocationOID="([^"]+)"/g,          'SubjectData/SiteRef'],
        ['Location',   /<LocationRef LocationOID="([^"]+)"/g,      'Signature/LocationRef'],
        ['Signature',  /<SignatureRef MethodOID="([^"]+)"/g,       'Signature/SignatureRef'],
    ];
    const dangling = [];
    for (const [kind, re, where] of refs) {
        for (const oid of new Set(all(re))) {
            if (!declared[kind].has(oid)) dangling.push(`${where} → ${kind}OID="${oid}"`);
        }
    }
    assert.deepEqual(dangling, [], `unresolvable OID reference(s):\n  ${dangling.join('\n  ')}`);
});

test('MetaDataVersion children follow the ODM 1.3.2 sequence', () => {
    // The schema declares a sequence, not a choice: Protocol, StudyEventDef,
    // FormDef, ItemGroupDef, ItemDef. Emitting an ItemGroupDef beside its
    // ItemDef reads better and is invalid.
    const xml  = buildOdmXml(RICH, { now: NOW });
    const mdv  = xml.slice(xml.indexOf('<MetaDataVersion'), xml.indexOf('</MetaDataVersion>'));
    const rank = { Protocol: 0, StudyEventDef: 1, FormDef: 2, ItemGroupDef: 3, ItemDef: 4 };
    const seen = [...mdv.matchAll(/<(Protocol|StudyEventDef|FormDef|ItemGroupDef|ItemDef)\b/g)].map(m => m[1]);
    assert.ok(seen.length > 0, 'metadata must not be empty');
    for (let i = 1; i < seen.length; i++) {
        assert.ok(rank[seen[i]] >= rank[seen[i - 1]], `<${seen[i]}> may not follow <${seen[i - 1]}>`);
    }
});

test('SDSVarName stays a valid SAS name even when the builder was given a long one', () => {
    // SDSVarName is capped at 8 characters. A well-meant mapping typed into the
    // form builder would otherwise make every ItemDef in the export invalid.
    const forms = [{ id: 5, name: 'F', schemaJson: { fields: [
        { key: 'a', label: 'A', type: 'text', sdtmDomain: 'XX', sdtmVar: 'WAYTOOLONGNAME' },
    ] } }];
    const xml = buildOdmXml({ ...RICH, forms, entries: [] }, { now: NOW });
    assert.ok(!xml.includes('SDSVarName="WAYTOOLONGNAME"'), 'an over-long name must be dropped');
    for (const v of [...xml.matchAll(/SDSVarName="([^"]+)"/g)].map(m => m[1])) {
        assert.match(v, /^[A-Za-z_][A-Za-z0-9_]{0,7}$/, `SDSVarName="${v}" is not a SAS name`);
    }
    // The mapping is still recorded, just where length is not constrained.
    assert.ok(xml.includes('<Alias Context="SDTM"  Name="XX.WAYTOOLONGNAME"/>'));
});

test('the electronic signature method and its signer are declared in AdminData', () => {
    const xml = buildOdmXml(RICH, { now: NOW });
    assert.ok(xml.includes('<SignatureDef OID="ESIG" Methodology="Electronic">'));
    assert.ok(xml.includes('<FullName>Dr Sari</FullName>'));
    assert.ok(xml.includes('<Location OID="SITE01"'));
    assert.ok(xml.includes('<Location OID="UNKNOWN"'), 'the SiteRef fallback needs a declaration too');
});

test('a signature whose user account is gone still resolves to a declared User', () => {
    // esignatures.user_id is nullable. An empty UserOID is a dangling reference
    // in exactly the same way an undeclared one is.
    const xml = buildOdmXml({
        ...RICH,
        signatures: [{ entryId: 100, userId: null, userName: null, signedAt: '2026-03-01T02:00:00.000Z' }],
    }, { now: NOW });
    assert.ok(!xml.includes('UserOID=""'), 'must never emit an empty UserOID');
    const used = [...xml.matchAll(/<UserRef UserOID="([^"]+)"/g)].map(m => m[1]);
    const dec  = new Set([...xml.matchAll(/<User OID="([^"]+)"/g)].map(m => m[1]));
    for (const oid of used) assert.ok(dec.has(oid), `UserOID="${oid}" is not declared`);
});

// No ODM 1.3.2 XSD ships with this repo and xmllint is not available, so these
// encode the schema rules that can be checked structurally. They are not a
// substitute for validating against the real XSD before a regulatory
// submission — attribute cardinality and datatype formats remain unchecked.

test('no OID is declared twice', () => {
    // Two definitions sharing an OID make the reference ambiguous; a loader may
    // take either. Field keys are unique per form and form ids are unique, but
    // nothing enforced that across the built-in domains.
    const xml = buildOdmXml(RICH, { now: NOW });
    for (const el of ['StudyEventDef', 'FormDef', 'ItemGroupDef', 'ItemDef', 'User', 'Location', 'SignatureDef']) {
        const oids = [...xml.matchAll(new RegExp(`<${el} OID="([^"]+)"`, 'g'))].map(m => m[1]);
        const dupes = oids.filter((o, i) => oids.indexOf(o) !== i);
        assert.deepEqual([...new Set(dupes)], [], `duplicate <${el}> OID(s)`);
    }
});

test('every enumerated attribute carries a value the vocabulary allows', () => {
    const xml = buildOdmXml(RICH, { now: NOW });
    const enums = {
        Repeating:    ['Yes', 'No'],
        Mandatory:    ['Yes', 'No'],
        Type:         ['Scheduled', 'Unscheduled', 'Common'],
        UserType:     ['Sponsor', 'Investigator', 'SiteCoordinator', 'Subject', 'LabTechnician', 'Other'],
        LocationType: ['Sponsor', 'Site', 'CRO', 'Lab', 'Other'],
        Methodology:  ['Electronic', 'Digital'],
        DataType:     ['text', 'integer', 'float', 'date', 'datetime', 'time', 'string', 'boolean', 'double', 'hexBinary', 'base64Binary', 'hexFloat', 'base64Float', 'partialDate', 'partialTime', 'partialDatetime', 'durationDatetime', 'intervalDatetime', 'incompleteDatetime', 'incompleteDate', 'incompleteTime', 'URI'],
        FileType:     ['Snapshot', 'Transactional'],
    };
    for (const [attr, allowed] of Object.entries(enums)) {
        for (const v of new Set([...xml.matchAll(new RegExp(`\\b${attr}="([^"]*)"`, 'g'))].map(m => m[1]))) {
            assert.ok(allowed.includes(v), `${attr}="${v}" is not in the ODM vocabulary`);
        }
    }
});

test('a signer is typed by their actual role, not assumed to be an investigator', () => {
    const sig = (userRole) => buildOdmXml({
        ...RICH, signatures: [{ entryId: 100, userId: 'u-1', userName: 'X', userRole, signedAt: '2026-03-01T02:00:00.000Z' }],
    }, { now: NOW });
    assert.ok(sig('pi').includes('UserType="Investigator"'));
    assert.ok(sig('crc').includes('UserType="SiteCoordinator"'));
    assert.ok(sig('cra').includes('UserType="Sponsor"'));
    assert.ok(sig('data_manager').includes('UserType="Sponsor"'));
    // The bug: any role at all was reported as Investigator.
    assert.ok(!sig('cra').includes('UserType="Investigator"'), 'a monitor is not an investigator');
    assert.ok(sig(null).includes('UserType="Other"'), 'unknown role must not be guessed');
});

// ── Captured data that the schema no longer describes ───────────────────────

test('a dataJson key missing from the schema is still declared and exported', () => {
    // dataJson is stored verbatim and the import tool maps CSV columns onto
    // field keys without checking them against the schema, so a record can
    // carry a key the form does not declare. Emitting it with no ItemDef left a
    // dangling OID — the exact defect the metadata rewrite set out to remove.
    const xml = buildOdmXml({
        ...RICH,
        entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { ldl: 230, retired_field: 'keep me' } }],
    }, { now: NOW });

    assert.ok(xml.includes('<ItemData ItemOID="IT.5.retired_field" Value="keep me"/>'), 'the value must survive');
    assert.ok(xml.includes('<ItemDef OID="IT.5.retired_field"'), 'and must be declared');
    assert.ok(xml.includes('<ItemGroupDef OID="IG.5.retired_field"'));
    assert.ok(xml.includes('<Alias Context="E-CRF" Name="NotInCurrentFormSchema"/>'), 'flagged for the reviewer');
});

test('an entry whose form row is gone still resolves to a FormDef', () => {
    const xml = buildOdmXml({
        ...RICH, forms: [],
        entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { ldl: 1 } }],
    }, { now: NOW });
    assert.ok(xml.includes('<FormDef OID="F.5"'), 'a deleted form still needs a definition');
    const declared = new Set([...xml.matchAll(/<FormDef OID="([^"]+)"/g)].map(m => m[1]));
    for (const oid of [...xml.matchAll(/<FormData FormOID="([^"]+)"/g)].map(m => m[1])) {
        assert.ok(declared.has(oid), `FormOID="${oid}" is not declared`);
    }
});

test('a role that collides with an Object prototype key does not leak a function', () => {
    // ODM_USER_TYPE is an object literal, so it inherits from Object.prototype.
    // A lowercase inherited key ("constructor") satisfied the `|| 'Other'`
    // fallback and put "function Object() { [native code] }" in the attribute.
    const enums = ['Sponsor', 'Investigator', 'SiteCoordinator', 'Subject', 'LabTechnician', 'Other'];
    for (const role of ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'prototype', '']) {
        const xml = buildOdmXml({
            ...RICH,
            signatures: [{ entryId: 100, userId: 'u-1', userName: 'X', userRole: role, signedAt: '2026-03-01T02:00:00.000Z' }],
        }, { now: NOW });
        const got = /UserType="([^"]*)"/.exec(xml)?.[1];
        assert.ok(enums.includes(got), `role ${JSON.stringify(role)} produced UserType=${JSON.stringify(got)}`);
    }
});

test('a legacy schema with duplicate field keys does not produce duplicate OIDs', () => {
    // validateFormSchema rejects duplicate keys today, but rows written before
    // it existed can still hold them. Two ItemDefs sharing an OID make the
    // reference ambiguous — the "no OID is declared twice" test above only ever
    // saw clean fixtures.
    const xml = buildOdmXml({
        ...RICH,
        forms: [{ id: 5, name: 'Legacy', schemaJson: { fields: [
            { key: 'ldl', label: 'LDL', type: 'number' },
            { key: 'ldl', label: 'LDL again', type: 'text' },
        ] } }],
        entries: [{ id: 100, subjectId: 1, visitId: 10, formId: 5, dataJson: { ldl: 1 } }],
    }, { now: NOW });
    for (const el of ['ItemGroupDef', 'ItemDef']) {
        const oids = [...xml.matchAll(new RegExp(`<${el} OID="([^"]+)"`, 'g'))].map(m => m[1]);
        assert.deepEqual(oids.filter((o, i) => oids.indexOf(o) !== i), [], `duplicate <${el}> OID`);
    }
});
