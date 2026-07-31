/**
 * CDISC ODM-XML 1.3.2 serialiser — pure, no DB.
 *
 * Takes the already-fetched study data and renders a Snapshot ODM document:
 * a MetaDataVersion describing every form actually used, followed by ClinicalData
 * with one SubjectData block per subject (demographics, CRF data grouped by
 * visit, AEs, consents, and the electronic signatures attached to each form).
 *
 * Keeping this out of the route is what makes the export verifiable: the exact
 * bytes shipped to a regulator can be asserted in a unit test.
 */

import { isoDay, isoDateTime } from './isodate.js';

/** Escape all five XML predefined entities. Never emit an unescaped value. */
export function xmlEsc(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** ODM wants a timezone offset, not the JS "Z" suffix, and no sub-second precision. */
export function odmDateTime(d = new Date()) {
    return d.toISOString().replace(/\.\d+Z$/, '+00:00');
}

/** Map a CRF field type onto the ODM DataType vocabulary. */
export function odmDataType(fieldType) {
    switch (fieldType) {
        case 'number':   return 'float';
        case 'date':     return 'date';
        case 'datetime': return 'datetime';
        case 'boolean':  return 'boolean';
        default:         return 'text';
    }
}

/**
 * ODM DataType="boolean" only accepts 0/1/true/false, but the CRF stores the
 * answer the way the site sees it ("Yes"/"No"). Translate at export time so the
 * document validates without changing what is stored. An unrecognised value is
 * passed through rather than silently blanked — that is data to investigate,
 * not something the exporter should hide.
 */
function odmBoolean(value) {
    const v = String(value ?? '').trim().toLowerCase();
    if (v === '') return '';
    if (['yes', 'y', 'true', '1'].includes(v))  return 'true';
    if (['no',  'n', 'false', '0'].includes(v)) return 'false';
    return String(value);
}

/**
 * ODM restricts SDSVarName to an SAS name (8 characters). A longer value makes
 * the ItemDef invalid, so a well-meant mapping typed into the form builder could
 * take the whole document down with it. Drop it rather than emit it.
 */
function sdsVarName(v) {
    const s = String(v ?? '').trim();
    return /^[A-Za-z_][A-Za-z0-9_]{0,7}$/.test(s) ? s : '';
}

/**
 * UserOID for a signature. esignatures.user_id is nullable — the signing account
 * can be removed later — and an empty UserOID is a dangling reference just like
 * an undeclared one. Shared with the AdminData writer so both agree.
 */
function signerOid(sig) {
    return sig?.userId ? String(sig.userId) : 'UNKNOWN-USER';
}

/**
 * Application role → ODM UserType, whose vocabulary is fixed at Sponsor,
 * Investigator, SiteCoordinator, Subject, LabTechnician and Other.
 *
 * This used to emit UserType="Investigator" for anyone with a role at all,
 * which asserts a qualification the signer may not hold — in the document a
 * regulator reads to see who signed what. An unmapped role says Other rather
 * than guessing.
 */
const ODM_USER_TYPE = {
    investigator:   'Investigator',
    pi:             'Investigator',
    crc:            'SiteCoordinator',
    cra:            'Sponsor',
    data_manager:   'Sponsor',
    admin:          'Other',
    platform_owner: 'Other',
};

function odmUserType(role) {
    return ODM_USER_TYPE[String(role ?? '').toLowerCase()] || 'Other';
}

/**
 * Study event OID for a visit. Shared by MetaDataVersion and ClinicalData so
 * the two cannot drift — an OID that only one of them knows about is exactly
 * the defect this replaced.
 */
function studyEventOid(visitOrder) {
    return (visitOrder === null || visitOrder === undefined || visitOrder === '')
        ? 'SE.UNSCHEDULED'
        : `SE.V${String(visitOrder).padStart(2, '0')}`;
}

/**
 * DM, AE and IC are emitted from database tables rather than from a CRF schema,
 * so nothing generated their metadata: ClinicalData referenced F.DM, IT.AE.AETERM
 * and friends while MetaDataVersion declared none of them. The document did not
 * validate against the ODM 1.3.2 schema, which is the one thing a regulator's
 * loader checks before it will read the ClinicalData at all.
 *
 * Declaring them from a table keeps the definition next to the writer below:
 * adding a column in one place without the other shows up in a diff.
 * Items are [OID suffix, name, ODM DataType, SDTM variable or ''].
 */
const BUILTIN_DOMAINS = [
    {
        formOid: 'F.DM', formName: 'Demographics',
        groupOid: 'IG.DM.SUBJECT', groupName: 'Subject Demographics', repeating: 'No',
        items: [
            ['IT.DM.SUBJID',         'Subject Identifier',  'text', 'SUBJID'],
            ['IT.DM.SITEID',         'Site Identifier',     'text', 'SITEID'],
            ['IT.DM.SEX',            'Sex',                 'text', 'SEX'],
            ['IT.DM.GENDERIDENTITY', 'Gender Identity',     'text', ''],
            ['IT.DM.DTHFL',          'Withdrawn Flag',      'text', 'DTHFL'],
            ['IT.DM.RFSTDTC',        'Enrolment Date',      'date', 'RFSTDTC'],
            ['IT.DM.DSSTDTC',        'Withdrawal Date',     'date', 'DSSTDTC'],
            ['IT.DM.STATUS',         'Subject Status',      'text', ''],
        ],
    },
    {
        // One ItemGroupData per AE row, distinguished by ItemGroupRepeatKey —
        // the OID itself must stay constant or it cannot be declared here.
        formOid: 'F.AE', formName: 'Adverse Events',
        groupOid: 'IG.AE', groupName: 'Adverse Event', repeating: 'Yes',
        items: [
            ['IT.AE.AETERM',  'Reported Term',            'text', 'AETERM'],
            ['IT.AE.AEDECOD', 'MedDRA Preferred Term',    'text', 'AEDECOD'],
            ['IT.AE.AESOC',   'MedDRA System Organ Class', 'text', 'AESOC'],
            ['IT.AE.AESTDTC', 'Onset Date',               'date', 'AESTDTC'],
            ['IT.AE.AEENDTC', 'Resolution Date',          'date', 'AEENDTC'],
            ['IT.AE.AESEV',   'Severity',                 'text', 'AESEV'],
            ['IT.AE.AESER',   'Serious Event',            'text', 'AESER'],
            ['IT.AE.AEREL',   'Causality',                'text', 'AEREL'],
            ['IT.AE.AEOUT',   'Outcome',                  'text', 'AEOUT'],
            ['IT.AE.AEACN',   'Action Taken',             'text', 'AEACN'],
        ],
    },
    {
        formOid: 'F.IC', formName: 'Informed Consent',
        groupOid: 'IG.IC', groupName: 'Informed Consent', repeating: 'Yes',
        items: [
            ['IT.IC.VERSION',   'Consent Version',   'text', ''],
            ['IT.IC.DATE',      'Consent Date',      'date', ''],
            ['IT.IC.TYPE',      'Consent Type',      'text', ''],
            ['IT.IC.LANGUAGE',  'Language',          'text', ''],
            ['IT.IC.WITNESS',   'Witness Name',      'text', ''],
            ['IT.IC.WITHDRAWN', 'Consent Withdrawn', 'text', ''],
        ],
    },
];

function groupBy(rows, key) {
    const m = new Map();
    for (const r of rows) {
        if (!m.has(r[key])) m.set(r[key], []);
        m.get(r[key]).push(r);
    }
    return m;
}

/**
 * @param data.subjects       [{ subject, site }] — site may be null
 * @param data.visits         visit rows (used for the StudyEventOID visit number)
 * @param data.entries        crf_data_entries rows
 * @param data.forms          crf_forms rows, already filtered to the ones in use
 * @param data.adverseEvents  adverse_events rows
 * @param data.consents       informed_consents rows
 * @param data.signatures     esignatures rows
 * @param opts.now            injectable clock, so output is deterministic in tests
 */
export function buildOdmXml(data, { now = new Date() } = {}) {
    const {
        studyName = 'E-CRF Clinical Study',
        studyOID  = 'ECRF.STUDY.001',
        subjects  = [],
        visits    = [],
        entries   = [],
        forms     = [],
        adverseEvents = [],
        consents  = [],
        signatures = [],
    } = data;

    const stamp        = odmDateTime(now);
    const visitMap     = new Map(visits.map(v => [v.id, v]));
    // formId → (fieldKey → type), so a captured value can be rendered in the
    // representation its declared DataType requires.
    const typesByForm  = new Map(forms.map(f => [
        f.id, new Map((f.schemaJson?.fields ?? []).map(fd => [fd.key, fd.type])),
    ]));
    const aeBySubj     = groupBy(adverseEvents, 'subjectId');
    const consentBySubj = groupBy(consents, 'subjectId');
    const entriesBySubj = groupBy(entries, 'subjectId');
    const sigsByEntry   = groupBy(signatures, 'entryId');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
     ODMVersion="1.3.2"
     FileType="Snapshot"
     FileOID="${xmlEsc(studyOID)}.EXPORT"
     CreationDateTime="${stamp}"
     AsOfDateTime="${stamp}"
     Originator="E-CRF System"
     SourceSystem="E-CRF v1.0"
     Description="CDISC ODM Export — ${xmlEsc(studyName)}">

  <Study OID="${xmlEsc(studyOID)}">
    <GlobalVariables>
      <StudyName>${xmlEsc(studyName)}</StudyName>
      <StudyDescription>Electronic Case Report Form — Clinical Trial Data</StudyDescription>
      <ProtocolName>${xmlEsc(studyName)}</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="${xmlEsc(studyOID)}.MDV.1" Name="Version 1">`;

    // ── Study events ────────────────────────────────────────────────────────
    // MetaDataVersion children follow a fixed sequence in ODM 1.3.2:
    // Protocol, StudyEventDef*, FormDef*, ItemGroupDef*, ItemDef*. Emitting an
    // ItemGroupDef next to its ItemDef reads better but is schema-invalid, so
    // the two are built in separate passes below.
    // ── What the metadata has to cover ──────────────────────────────────────
    // Building FormDefs from `forms` alone was not enough. dataJson is stored
    // verbatim (routes/entries.js) and the import tool maps CSV columns onto
    // field keys without checking them against the schema (routes/import.js),
    // so a captured record can carry a key the schema does not declare — and a
    // form row can be deleted while its entries survive. Both cases put an OID
    // in ClinicalData that MetaDataVersion never defined, which is the whole
    // defect this section exists to prevent.
    //
    // So the metadata is built from the union of "what the schema declares" and
    // "what the data actually contains". An undeclared key is exported and
    // flagged, not dropped: it is real captured data, and hiding it from an
    // archive is worse than annotating it.
    const formById   = new Map(forms.map(f => [f.id, f]));
    const extraByForm = new Map();
    for (const e of entries) {
        const declared = typesByForm.get(e.formId);
        for (const key of Object.keys(e.dataJson || {})) {
            if (declared?.has(key)) continue;
            if (!extraByForm.has(e.formId)) extraByForm.set(e.formId, new Set());
            extraByForm.get(e.formId).add(key);
        }
    }
    const formSpecs = [...new Set([...formById.keys(), ...entries.map(e => e.formId)])]
        .map((id) => {
            const form = formById.get(id);
            const declared = (form?.schemaJson?.fields ?? []).filter(f => f?.key);
            const extra = [...(extraByForm.get(id) ?? [])].map(key => ({
                key, label: key, type: 'text', undeclared: true,
            }));
            return { id, name: form?.name ?? `Form ${id} (definition unavailable)`, fields: [...declared, ...extra] };
        });

    const formOids = new Set(formSpecs.map(f => `F.${f.id}`));

    // visits rows are per subject, so the same scheduled visit appears once per
    // enrolled subject. Collapse to one definition per event OID and union the
    // forms those rows expect, dropping any form this export did not declare.
    const eventDefs = new Map();
    const addEvent = (oid, name, type, repeating) => {
        if (!eventDefs.has(oid)) eventDefs.set(oid, { oid, name, type, repeating, forms: new Set() });
        return eventDefs.get(oid);
    };
    for (const v of visits) {
        const oid = studyEventOid(v.visitOrder);
        const ev  = oid === 'SE.UNSCHEDULED'
            ? addEvent(oid, 'Unscheduled', 'Unscheduled', 'Yes')
            : addEvent(oid, v.visitName || oid, v.visitType === 'Unscheduled' ? 'Unscheduled' : 'Scheduled', 'No');
        for (const fid of v.formIds ?? []) {
            if (formOids.has(`F.${fid}`)) ev.forms.add(`F.${fid}`);
        }
    }
    // Entries with an unresolvable visit land here, so it must always exist.
    addEvent('SE.UNSCHEDULED', 'Unscheduled', 'Unscheduled', 'Yes');
    // A visit that declared no form matrix still has to reference something, or
    // its FormData has no FormRef to validate against.
    for (const ev of eventDefs.values()) {
        if (ev.forms.size === 0) for (const oid of formOids) ev.forms.add(oid);
    }

    const orderedEvents = [
        { oid: 'SE.DEMOGRAPHICS', name: 'Demographics', type: 'Common', repeating: 'No', forms: new Set(['F.DM']) },
        ...[...eventDefs.values()].sort((a, b) => a.oid.localeCompare(b.oid)),
        { oid: 'SE.AE',      name: 'Adverse Events',   type: 'Common', repeating: 'No', forms: new Set(['F.AE']) },
        { oid: 'SE.CONSENT', name: 'Informed Consent', type: 'Common', repeating: 'No', forms: new Set(['F.IC']) },
    ];

    xml += `
      <Protocol>`;
    orderedEvents.forEach((ev, i) => {
        xml += `
        <StudyEventRef StudyEventOID="${xmlEsc(ev.oid)}" OrderNumber="${i + 1}" Mandatory="No"/>`;
    });
    xml += `
      </Protocol>`;

    for (const ev of orderedEvents) {
        xml += `
      <StudyEventDef OID="${xmlEsc(ev.oid)}" Name="${xmlEsc(ev.name)}" Repeating="${ev.repeating}" Type="${ev.type}">`;
        let n = 0;
        for (const oid of ev.forms) {
            xml += `
        <FormRef FormOID="${xmlEsc(oid)}" OrderNumber="${++n}" Mandatory="No"/>`;
        }
        xml += `
      </StudyEventDef>`;
    }

    // ── FormDef blocks ──────────────────────────────────────────────────────
    for (const d of BUILTIN_DOMAINS) {
        xml += `
      <FormDef OID="${d.formOid}" Name="${xmlEsc(d.formName)}" Repeating="No">
        <ItemGroupRef ItemGroupOID="${d.groupOid}" Mandatory="Yes"/>
      </FormDef>`;
    }
    for (const form of formSpecs) {
        xml += `
      <FormDef OID="F.${form.id}" Name="${xmlEsc(form.name)}" Repeating="No">`;
        for (const field of form.fields) {
            xml += `
        <ItemGroupRef ItemGroupOID="IG.${form.id}.${xmlEsc(field.key)}" Mandatory="${field.required ? 'Yes' : 'No'}"/>`;
        }
        xml += `
      </FormDef>`;
    }

    // ── ItemGroupDef blocks ─────────────────────────────────────────────────
    for (const d of BUILTIN_DOMAINS) {
        xml += `
      <ItemGroupDef OID="${d.groupOid}" Name="${xmlEsc(d.groupName)}" Repeating="${d.repeating}">`;
        for (const [oid] of d.items) {
            xml += `
        <ItemRef ItemOID="${oid}" Mandatory="No"/>`;
        }
        xml += `
      </ItemGroupDef>`;
    }
    for (const form of formSpecs) {
        for (const field of form.fields) {
            xml += `
      <ItemGroupDef OID="IG.${form.id}.${xmlEsc(field.key)}" Name="${xmlEsc(field.label || field.key)}" Repeating="No">
        <ItemRef ItemOID="IT.${form.id}.${xmlEsc(field.key)}" Mandatory="${field.required ? 'Yes' : 'No'}"/>
      </ItemGroupDef>`;
        }
    }

    // ── ItemDef blocks (CDASH/SDTM annotations via Alias per ODM 1.3.2) ─────
    for (const d of BUILTIN_DOMAINS) {
        for (const [oid, name, dataType, sdtmVar] of d.items) {
            const sds = sdsVarName(sdtmVar);
            xml += `
      <ItemDef OID="${oid}" Name="${xmlEsc(name)}" DataType="${dataType}"${sds ? ` SDSVarName="${sds}"` : ''}>
        <Question><TranslatedText>${xmlEsc(name)}</TranslatedText></Question>${sds ? `
        <Alias Context="SDTM" Name="${xmlEsc(`${d.formOid.slice(2)}.${sds}`)}"/>` : ''}
      </ItemDef>`;
        }
    }
    for (const form of formSpecs) {
        for (const field of form.fields) {
            const hasCdash = !!field.cdashVar;
            const hasSdtm  = !!(field.sdtmDomain && field.sdtmVar);
            const sds      = hasSdtm ? sdsVarName(field.sdtmVar) : '';
            const aliases = [
                hasCdash ? `        <Alias Context="CDASH" Name="${xmlEsc(field.cdashVar)}"/>` : '',
                hasSdtm  ? `        <Alias Context="SDTM"  Name="${xmlEsc(field.sdtmDomain + '.' + field.sdtmVar)}"/>` : '',
                field.isCritical ? `        <Alias Context="ICH-E6R3" Name="CriticalDataField"/>` : '',
                // The value exists in the record but not in the form schema.
                // A reviewer reconciling the export against the CRF needs to
                // see that, rather than wonder where the column came from.
                field.undeclared ? `        <Alias Context="E-CRF" Name="NotInCurrentFormSchema"/>` : '',
            ].filter(Boolean).join('\n');
            xml += `
      <ItemDef OID="IT.${form.id}.${xmlEsc(field.key)}" Name="${xmlEsc(field.label || field.key)}" DataType="${odmDataType(field.type)}"${sds ? ` SDSVarName="${sds}"` : ''}>
        <Question><TranslatedText>${xmlEsc(field.label || field.key)}</TranslatedText></Question>${aliases ? '\n' + aliases : ''}
      </ItemDef>`;
        }
    }

    xml += `
    </MetaDataVersion>
  </Study>`;

    // ── AdminData ───────────────────────────────────────────────────────────
    // Signature/SiteRef pointed at UserOIDs and LocationOIDs that nothing
    // declared, and SignatureRef MethodOID="ESIG" had no SignatureDef at all —
    // the same dangling-reference problem as the study events.
    const users = new Map();
    for (const sig of signatures) {
        const oid = signerOid(sig);
        if (!users.has(oid)) users.set(oid, sig);
    }
    const locations = new Set(subjects.map(({ site }) => site?.code || 'UNKNOWN'));

    xml += `

  <AdminData StudyOID="${xmlEsc(studyOID)}">`;
    for (const [userId, sig] of users) {
        xml += `
    <User OID="${xmlEsc(userId)}" UserType="${odmUserType(sig.userRole)}">
      <FullName>${xmlEsc(sig.userName || userId)}</FullName>
    </User>`;
    }
    for (const code of locations) {
        xml += `
    <Location OID="${xmlEsc(code)}" Name="${xmlEsc(code)}" LocationType="Site">
      <MetaDataVersionRef StudyOID="${xmlEsc(studyOID)}" MetaDataVersionOID="${xmlEsc(studyOID)}.MDV.1" EffectiveDate="${isoDay(now)}"/>
    </Location>`;
    }
    xml += `
    <SignatureDef OID="ESIG" Methodology="Electronic">
      <Meaning>Electronic signature applied by the signing user</Meaning>
      <LegalReason>FDA 21 CFR Part 11 §11.200 — electronic signature equivalent to a handwritten signature</LegalReason>
    </SignatureDef>
  </AdminData>

  <ClinicalData StudyOID="${xmlEsc(studyOID)}" MetaDataVersionOID="${xmlEsc(studyOID)}.MDV.1">`;

    for (const { subject: subj, site } of subjects) {
        const subjEntries  = entriesBySubj.get(subj.id)  || [];
        const subjAE       = aeBySubj.get(subj.id)       || [];
        const subjConsents = consentBySubj.get(subj.id)  || [];

        xml += `
    <SubjectData SubjectKey="${xmlEsc(subj.subjectCode)}"
                 mnemonic="${xmlEsc(subj.initials || '')}"
                 TransactionType="Snapshot">
      <SiteRef LocationOID="${xmlEsc(site?.code || 'UNKNOWN')}"/>`;

        // DM domain
        xml += `
      <StudyEventData StudyEventOID="SE.DEMOGRAPHICS" StudyEventRepeatKey="1">
        <FormData FormOID="F.DM" TransactionType="Snapshot">
          <ItemGroupData ItemGroupOID="IG.DM.SUBJECT" TransactionType="Snapshot">
            <ItemData ItemOID="IT.DM.SUBJID"  Value="${xmlEsc(subj.subjectCode)}"/>
            <ItemData ItemOID="IT.DM.SITEID"  Value="${xmlEsc(site?.code || '')}"/>
            <ItemData ItemOID="IT.DM.SEX"     Value="${xmlEsc(subj.sex || 'U')}"/>
            <ItemData ItemOID="IT.DM.GENDERIDENTITY" Value="${xmlEsc(subj.genderIdentity || '')}"/>
            <ItemData ItemOID="IT.DM.DTHFL"   Value="${subj.status === 'Withdrawn' ? 'Y' : 'N'}"/>
            <ItemData ItemOID="IT.DM.RFSTDTC" Value="${xmlEsc(isoDay(subj.enrolledAt))}"/>
            <ItemData ItemOID="IT.DM.DSSTDTC" Value="${xmlEsc(isoDay(subj.withdrawnAt))}"/>
            <ItemData ItemOID="IT.DM.STATUS"  Value="${xmlEsc(subj.status)}"/>
          </ItemGroupData>
        </FormData>
      </StudyEventData>`;

        // CRF entries grouped by visit
        for (const [visitId, visitEntries] of groupBy(subjEntries, 'visitId')) {
            const visit = visitMap.get(visitId);
            // An entry with no visit produced "SE.Vnull" and an empty repeat key.
            // Falling back to visitId was no better: a row id is not a visit
            // order, so an unresolvable visit invented an OID in the wrong
            // numbering space — one that could collide with a real visit and
            // that MetaDataVersion never declares. Unresolvable means unscheduled.
            const eventOid = studyEventOid(visit?.visitOrder);
            xml += `
      <StudyEventData StudyEventOID="${eventOid}" StudyEventRepeatKey="${xmlEsc(String(visitId ?? '1'))}">`;
            for (const entry of visitEntries) {
                const values = entry.dataJson || {};
                const sigs   = sigsByEntry.get(entry.id) || [];
                xml += `
        <FormData FormOID="F.${entry.formId}" TransactionType="Snapshot">`;
                const fieldTypes = typesByForm.get(entry.formId);
                for (const [key, value] of Object.entries(values)) {
                    const out = fieldTypes?.get(key) === 'boolean'
                        ? odmBoolean(value)
                        // A multi-select holds an array; ODM ItemData carries a
                        // single value, so join the way the CSV export does.
                        : Array.isArray(value) ? value.join('; ') : String(value ?? '');
                    xml += `
          <ItemGroupData ItemGroupOID="IG.${entry.formId}.${xmlEsc(key)}" TransactionType="Snapshot">
            <ItemData ItemOID="IT.${entry.formId}.${xmlEsc(key)}" Value="${xmlEsc(out)}"/>
          </ItemGroupData>`;
                }
                for (const sig of sigs) {
                    xml += `
          <Signature>
            <UserRef UserOID="${xmlEsc(signerOid(sig))}"/>
            <LocationRef LocationOID="${xmlEsc(site?.code || 'UNKNOWN')}"/>
            <SignatureRef MethodOID="ESIG"/>
            <DateTimeStamp>${isoDateTime(sig.signedAt)}</DateTimeStamp>
          </Signature>`;
                }
                xml += `
        </FormData>`;
            }
            xml += `
      </StudyEventData>`;
        }

        // AE domain
        if (subjAE.length > 0) {
            xml += `
      <StudyEventData StudyEventOID="SE.AE" StudyEventRepeatKey="1">`;
            for (const ae of subjAE) {
                xml += `
        <FormData FormOID="F.AE" TransactionType="Snapshot">
          <ItemGroupData ItemGroupOID="IG.AE" ItemGroupRepeatKey="${xmlEsc(String(ae.id))}" TransactionType="Snapshot">
            <ItemData ItemOID="IT.AE.AETERM"   Value="${xmlEsc(ae.aeTerm)}"/>
            <ItemData ItemOID="IT.AE.AEDECOD"  Value="${xmlEsc(ae.meddraPt || '')}"/>
            <ItemData ItemOID="IT.AE.AESOC"    Value="${xmlEsc(ae.meddraSoc || '')}"/>
            <ItemData ItemOID="IT.AE.AESTDTC"  Value="${xmlEsc(ae.onsetDate || '')}"/>
            <ItemData ItemOID="IT.AE.AEENDTC"  Value="${xmlEsc(ae.resolutionDate || '')}"/>
            <ItemData ItemOID="IT.AE.AESEV"    Value="${xmlEsc(ae.severity)}"/>
            <ItemData ItemOID="IT.AE.AESER"    Value="${ae.isSerious ? 'Y' : 'N'}"/>
            <ItemData ItemOID="IT.AE.AEREL"    Value="${xmlEsc(ae.causality || '')}"/>
            <ItemData ItemOID="IT.AE.AEOUT"    Value="${xmlEsc(ae.outcome || '')}"/>
            <ItemData ItemOID="IT.AE.AEACN"    Value="${xmlEsc(ae.actionTaken || '')}"/>
          </ItemGroupData>
        </FormData>`;
            }
            xml += `
      </StudyEventData>`;
        }

        // Consent domain (UU PDP / ICH E6(R3) §4.8)
        if (subjConsents.length > 0) {
            xml += `
      <StudyEventData StudyEventOID="SE.CONSENT" StudyEventRepeatKey="1">`;
            for (const c of subjConsents) {
                xml += `
        <FormData FormOID="F.IC" TransactionType="Snapshot">
          <ItemGroupData ItemGroupOID="IG.IC" ItemGroupRepeatKey="${xmlEsc(String(c.id))}" TransactionType="Snapshot">
            <ItemData ItemOID="IT.IC.VERSION"    Value="${xmlEsc(c.consentVersion)}"/>
            <ItemData ItemOID="IT.IC.DATE"       Value="${xmlEsc(c.consentDate)}"/>
            <ItemData ItemOID="IT.IC.TYPE"       Value="${xmlEsc(c.consentType)}"/>
            <ItemData ItemOID="IT.IC.LANGUAGE"   Value="${xmlEsc(c.language)}"/>
            <ItemData ItemOID="IT.IC.WITNESS"    Value="${xmlEsc(c.witnessName || '')}"/>
            <ItemData ItemOID="IT.IC.WITHDRAWN"  Value="${c.isWithdrawn ? 'Y' : 'N'}"/>
          </ItemGroupData>
        </FormData>`;
            }
            xml += `
      </StudyEventData>`;
        }

        xml += `
    </SubjectData>`;
    }

    xml += `
  </ClinicalData>
</ODM>`;

    return xml;
}
