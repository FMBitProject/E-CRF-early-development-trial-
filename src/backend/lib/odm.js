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

function isoDay(value) {
    return value ? new Date(value).toISOString().split('T')[0] : '';
}

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

    // FormDef blocks
    for (const form of forms) {
        const fields = form.schemaJson?.fields ?? [];
        xml += `
      <FormDef OID="F.${form.id}" Name="${xmlEsc(form.name)}" Repeating="No">`;
        for (const field of fields) {
            xml += `
        <ItemGroupRef ItemGroupOID="IG.${form.id}.${xmlEsc(field.key)}" Mandatory="${field.required ? 'Yes' : 'No'}"/>`;
        }
        xml += `
      </FormDef>`;
    }

    // ItemGroupDef + ItemDef blocks (CDASH/SDTM annotations via Alias per ODM 1.3.2)
    for (const form of forms) {
        const fields = form.schemaJson?.fields ?? [];
        for (const field of fields) {
            const hasCdash = !!field.cdashVar;
            const hasSdtm  = !!(field.sdtmDomain && field.sdtmVar);
            const aliases = [
                hasCdash ? `        <Alias Context="CDASH" Name="${xmlEsc(field.cdashVar)}"/>` : '',
                hasSdtm  ? `        <Alias Context="SDTM"  Name="${xmlEsc(field.sdtmDomain + '.' + field.sdtmVar)}"/>` : '',
                field.isCritical ? `        <Alias Context="ICH-E6R3" Name="CriticalDataField"/>` : '',
            ].filter(Boolean).join('\n');
            xml += `
      <ItemGroupDef OID="IG.${form.id}.${xmlEsc(field.key)}" Name="${xmlEsc(field.label || field.key)}" Repeating="No">
        <ItemRef ItemOID="IT.${form.id}.${xmlEsc(field.key)}" Mandatory="${field.required ? 'Yes' : 'No'}"/>
      </ItemGroupDef>
      <ItemDef OID="IT.${form.id}.${xmlEsc(field.key)}" Name="${xmlEsc(field.label || field.key)}" DataType="${odmDataType(field.type)}"${hasSdtm ? ` SDSVarName="${xmlEsc(field.sdtmVar)}"` : ''}>
        <Question><TranslatedText>${xmlEsc(field.label || field.key)}</TranslatedText></Question>${aliases ? '\n' + aliases : ''}
      </ItemDef>`;
        }
    }

    xml += `
    </MetaDataVersion>
  </Study>

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
            xml += `
      <StudyEventData StudyEventOID="SE.V${String(visit?.visitOrder || visitId).padStart(2, '0')}" StudyEventRepeatKey="${visitId}">`;
            for (const entry of visitEntries) {
                const values = entry.dataJson || {};
                const sigs   = sigsByEntry.get(entry.id) || [];
                xml += `
        <FormData FormOID="F.${entry.formId}" TransactionType="Snapshot">`;
                for (const [key, value] of Object.entries(values)) {
                    xml += `
          <ItemGroupData ItemGroupOID="IG.${entry.formId}.${xmlEsc(key)}" TransactionType="Snapshot">
            <ItemData ItemOID="IT.${entry.formId}.${xmlEsc(key)}" Value="${xmlEsc(String(value ?? ''))}"/>
          </ItemGroupData>`;
                }
                for (const sig of sigs) {
                    xml += `
          <Signature>
            <UserRef UserOID="${xmlEsc(sig.userId)}"/>
            <LocationRef LocationOID="${xmlEsc(site?.code || 'UNKNOWN')}"/>
            <SignatureRef MethodOID="ESIG"/>
            <DateTimeStamp>${new Date(sig.signedAt).toISOString()}</DateTimeStamp>
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
          <ItemGroupData ItemGroupOID="IG.AE.${ae.id}" TransactionType="Snapshot">
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
          <ItemGroupData ItemGroupOID="IG.IC.${c.id}" TransactionType="Snapshot">
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
