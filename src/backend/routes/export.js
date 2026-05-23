import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import {
    subjects, sites, visits, crfDataEntries, crfForms,
    adverseEvents, protocolDeviations, informedConsents,
    esignatures,
} from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// ── CDISC ODM-XML 1.3.2 Export ───────────────────────────────────────────────

function xmlEsc(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function isoNow() {
    return new Date().toISOString().replace(/\.\d+Z$/, '+00:00');
}

// GET /api/export/odm — CDISC ODM-XML 1.3.2 export (admin, cra)
router.get('/odm', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const sid = req.studyId;
        const [
            allSubjects,
            allVisits,
            allEntries,
            allForms,
            allAE,
            allConsents,
            allSigs,
        ] = await Promise.all([
            db.select().from(subjects).leftJoin(sites, eq(subjects.siteId, sites.id)).where(eq(subjects.studyId, sid)),
            db.select().from(visits),
            db.select().from(crfDataEntries),
            db.select().from(crfForms),
            db.select().from(adverseEvents).where(eq(adverseEvents.studyId, sid)),
            db.select().from(informedConsents).where(eq(informedConsents.studyId, sid)),
            db.select().from(esignatures),
        ]);

        const visitMap  = new Map(allVisits.map(v => [v.id, v]));
        const formMap   = new Map(allForms.map(f => [f.id, f]));
        const aeBySubj  = new Map();
        for (const ae of allAE) {
            if (!aeBySubj.has(ae.subjectId)) aeBySubj.set(ae.subjectId, []);
            aeBySubj.get(ae.subjectId).push(ae);
        }
        const consentBySubj = new Map();
        for (const c of allConsents) {
            if (!consentBySubj.has(c.subjectId)) consentBySubj.set(c.subjectId, []);
            consentBySubj.get(c.subjectId).push(c);
        }
        const entriesBySubj = new Map();
        for (const e of allEntries) {
            if (!entriesBySubj.has(e.subjectId)) entriesBySubj.set(e.subjectId, []);
            entriesBySubj.get(e.subjectId).push(e);
        }
        const sigsByEntry = new Map();
        for (const s of allSigs) {
            if (!sigsByEntry.has(s.entryId)) sigsByEntry.set(s.entryId, []);
            sigsByEntry.get(s.entryId).push(s);
        }

        const studyName = process.env.STUDY_NAME || 'E-CRF Clinical Study';
        const studyOID  = process.env.STUDY_OID  || 'ECRF.STUDY.001';

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
     ODMVersion="1.3.2"
     FileType="Snapshot"
     FileOID="${xmlEsc(studyOID)}.EXPORT"
     CreationDateTime="${isoNow()}"
     AsOfDateTime="${isoNow()}"
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
        for (const form of allForms) {
            const schema = form.schemaJson || {};
            const fields = schema.fields || [];
            xml += `
      <FormDef OID="F.${form.id}" Name="${xmlEsc(form.name)}" Repeating="No">`;
            for (const field of fields) {
                xml += `
        <ItemGroupRef ItemGroupOID="IG.${form.id}.${xmlEsc(field.key)}" Mandatory="${field.required ? 'Yes' : 'No'}"/>`;
            }
            xml += `
      </FormDef>`;
        }

        // ItemGroupDef + ItemDef blocks (CDASH/SDTM annotations via Alias elements per CDISC ODM 1.3.2)
        for (const form of allForms) {
            const schema = form.schemaJson || {};
            const fields = schema.fields || [];
            for (const field of fields) {
                const hasCdash = !!field.cdashVar;
                const hasSdtm  = !!(field.sdtmDomain && field.sdtmVar);
                const dataType = field.type === 'number'   ? 'float'
                               : field.type === 'date'     ? 'date'
                               : field.type === 'datetime' ? 'datetime'
                               : field.type === 'boolean'  ? 'boolean'
                               : 'text';
                const aliases = [
                    hasCdash ? `        <Alias Context="CDASH" Name="${xmlEsc(field.cdashVar)}"/>` : '',
                    hasSdtm  ? `        <Alias Context="SDTM"  Name="${xmlEsc(field.sdtmDomain + '.' + field.sdtmVar)}"/>` : '',
                    field.isCritical ? `        <Alias Context="ICH-E6R3" Name="CriticalDataField"/>` : '',
                ].filter(Boolean).join('\n');
                xml += `
      <ItemGroupDef OID="IG.${form.id}.${xmlEsc(field.key)}" Name="${xmlEsc(field.label || field.key)}" Repeating="No">
        <ItemRef ItemOID="IT.${form.id}.${xmlEsc(field.key)}" Mandatory="${field.required ? 'Yes' : 'No'}"/>
      </ItemGroupDef>
      <ItemDef OID="IT.${form.id}.${xmlEsc(field.key)}" Name="${xmlEsc(field.label || field.key)}" DataType="${dataType}"${hasSdtm ? ` SDSVarName="${xmlEsc(field.sdtmVar)}"` : ''}>
        <Question><TranslatedText>${xmlEsc(field.label || field.key)}</TranslatedText></Question>${aliases ? '\n' + aliases : ''}
      </ItemDef>`;
            }
        }

        xml += `
    </MetaDataVersion>
  </Study>

  <ClinicalData StudyOID="${xmlEsc(studyOID)}" MetaDataVersionOID="${xmlEsc(studyOID)}.MDV.1">`;

        // Subject data
        for (const row of allSubjects) {
            const subj = row.subjects ?? row;
            const site = row.sites    ?? null;
            const subjEntries = entriesBySubj.get(subj.id) || [];
            const subjAE      = aeBySubj.get(subj.id)       || [];
            const subjConsents = consentBySubj.get(subj.id)  || [];

            xml += `
    <SubjectData SubjectKey="${xmlEsc(subj.subjectCode)}"
                 mnemonic="${xmlEsc(subj.initials || '')}"
                 TransactionType="Snapshot">
      <SiteRef LocationOID="${xmlEsc(site?.code || 'UNKNOWN')}"/>`;

            // DM domain fields
            xml += `
      <StudyEventData StudyEventOID="SE.DEMOGRAPHICS" StudyEventRepeatKey="1">
        <FormData FormOID="F.DM" TransactionType="Snapshot">
          <ItemGroupData ItemGroupOID="IG.DM.SUBJECT" TransactionType="Snapshot">
            <ItemData ItemOID="IT.DM.SUBJID"  Value="${xmlEsc(subj.subjectCode)}"/>
            <ItemData ItemOID="IT.DM.SITEID"  Value="${xmlEsc(site?.code || '')}"/>
            <ItemData ItemOID="IT.DM.SEX"     Value="${xmlEsc(subj.sex || 'U')}"/>
            <ItemData ItemOID="IT.DM.GENDERIDENTITY" Value="${xmlEsc(subj.genderIdentity || '')}"/>
            <ItemData ItemOID="IT.DM.DTHFL"   Value="${subj.status === 'Withdrawn' ? 'Y' : 'N'}"/>
            <ItemData ItemOID="IT.DM.RFSTDTC" Value="${xmlEsc(subj.enrolledAt ? new Date(subj.enrolledAt).toISOString().split('T')[0] : '')}"/>
            <ItemData ItemOID="IT.DM.DSSTDTC" Value="${xmlEsc(subj.withdrawnAt ? new Date(subj.withdrawnAt).toISOString().split('T')[0] : '')}"/>
            <ItemData ItemOID="IT.DM.STATUS"  Value="${xmlEsc(subj.status)}"/>
          </ItemGroupData>
        </FormData>
      </StudyEventData>`;

            // CRF entries grouped by visit
            const visitGrouped = new Map();
            for (const entry of subjEntries) {
                const vid = entry.visitId;
                if (!visitGrouped.has(vid)) visitGrouped.set(vid, []);
                visitGrouped.get(vid).push(entry);
            }

            for (const [visitId, entries] of visitGrouped) {
                const visit = visitMap.get(visitId);
                xml += `
      <StudyEventData StudyEventOID="SE.V${String(visit?.visitOrder || visitId).padStart(2,'0')}" StudyEventRepeatKey="${visitId}">`;
                for (const entry of entries) {
                    const data = entry.dataJson || {};
                    const sigs = sigsByEntry.get(entry.id) || [];
                    xml += `
        <FormData FormOID="F.${entry.formId}" TransactionType="Snapshot">`;
                    for (const [key, value] of Object.entries(data)) {
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

            // Consent domain (UU PDP)
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

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="study_export_${Date.now()}.xml"`);

        await writeAudit(db, {
            tableName: 'export', recordId: sid, action: 'EXPORT',
            fieldName: 'format', newValue: 'ODM-XML',
            reason: 'Data export performed',
            user: req.user, ipAddress: req.ip,
        });

        res.send(xml);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Comprehensive CSV Export ─────────────────────────────────────────────────

// GET /api/export/csv?domain=DM|AE|CRF|DEV — domain CSV (admin, cra)
router.get('/csv', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const domain = (req.query.domain || 'DM').toUpperCase();

        let headers = [];
        let rows    = [];

        const sid = req.studyId;
        if (domain === 'DM') {
            headers = ['SUBJID','SITEID','SITE_NAME','SEX','GENDER_IDENTITY','DOB','ENRLDTC','STATUS','WDRAWDTC','WDRAWREASON'];
            const data = await db.select().from(subjects).leftJoin(sites, eq(subjects.siteId, sites.id)).where(eq(subjects.studyId, sid));
            rows = data.map(r => {
                const s = r.subjects ?? r;
                const site = r.sites ?? null;
                return [
                    s.subjectCode, site?.code || '', site?.name || '',
                    s.sex || 'U', s.genderIdentity || '', s.dateOfBirth || '',
                    s.enrolledAt ? new Date(s.enrolledAt).toISOString().split('T')[0] : '',
                    s.status || '',
                    s.withdrawnAt ? new Date(s.withdrawnAt).toISOString().split('T')[0] : '',
                    s.withdrawReason || '',
                ];
            });
        } else if (domain === 'AE') {
            headers = ['SUBJID','AESEQ','AETERM','AEDECOD','AESOC','AESTDTC','AEENDTC','AESEV','AESER','AEREL','AEOUT','AEACN','AESTATUS','CREATED_BY','CREATED_AT'];
            const data = await db.select().from(adverseEvents)
                .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
                .where(eq(adverseEvents.studyId, sid))
                .orderBy(adverseEvents.subjectId, adverseEvents.id);
            rows = data.map(r => {
                const ae = r.adverse_events ?? r;
                const subj = r.subjects ?? null;
                return [
                    subj?.subjectCode || '', ae.id,
                    ae.aeTerm, ae.meddraPt || '', ae.meddraSoc || '',
                    ae.onsetDate || '', ae.resolutionDate || '',
                    ae.severity, ae.isSerious ? 'Y' : 'N',
                    ae.causality || '', ae.outcome || '', ae.actionTaken || '',
                    ae.reportStatus, ae.createdByName || '',
                    ae.createdAt ? new Date(ae.createdAt).toISOString() : '',
                ];
            });
        } else if (domain === 'DEV') {
            headers = ['DEVID','SUBJID','TYPE','CATEGORY','DESCRIPTION','DEVIATION_DATE','DISCOVERY_DATE','ROOT_CAUSE','IMPACT','CAPA','REPORTED_TO_IRB','STATUS','CREATED_BY','CREATED_AT'];
            const data = await db.select().from(protocolDeviations)
                .leftJoin(subjects, eq(protocolDeviations.subjectId, subjects.id))
                .where(eq(protocolDeviations.studyId, sid))
                .orderBy(protocolDeviations.id);
            rows = data.map(r => {
                const d = r.protocol_deviations ?? r;
                const subj = r.subjects ?? null;
                return [
                    d.id, subj?.subjectCode || '', d.deviationType, d.category || '',
                    d.description, d.deviationDate || '', d.discoveryDate || '',
                    d.rootCause || '', d.impactOnSubject || '', d.capa || '',
                    d.reportedToIrb ? 'Y' : 'N', d.status,
                    d.createdByName || '',
                    d.createdAt ? new Date(d.createdAt).toISOString() : '',
                ];
            });
        } else if (domain === 'IC') {
            headers = ['ICID','SUBJID','VERSION','DATE','TYPE','LANGUAGE','WITNESS','WITHDRAWN','WITHDRAWN_DTC','WITHDRAWN_REASON','CREATED_BY','CREATED_AT'];
            const data = await db.select().from(informedConsents)
                .leftJoin(subjects, eq(informedConsents.subjectId, subjects.id))
                .orderBy(informedConsents.id);
            rows = data.map(r => {
                const c = r.informed_consents ?? r;
                const subj = r.subjects ?? null;
                return [
                    c.id, subj?.subjectCode || '', c.consentVersion, c.consentDate,
                    c.consentType, c.language, c.witnessName || '',
                    c.isWithdrawn ? 'Y' : 'N',
                    c.withdrawnAt ? new Date(c.withdrawnAt).toISOString().split('T')[0] : '',
                    c.withdrawnReason || '', c.createdByName || '',
                    c.createdAt ? new Date(c.createdAt).toISOString() : '',
                ];
            });
        } else {
            return res.status(400).json({ error: 'domain must be DM, AE, DEV, or IC' });
        }

        function csvRow(cells) {
            return cells.map(c => {
                const s = String(c ?? '');
                return s.includes(',') || s.includes('"') || s.includes('\n')
                    ? `"${s.replace(/"/g, '""')}"`
                    : s;
            }).join(',');
        }

        const csv = [csvRow(headers), ...rows.map(csvRow)].join('\r\n');
        res.set('Content-Type', 'text/csv; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="${domain}_${Date.now()}.csv"`);

        await writeAudit(db, {
            tableName: 'export', recordId: req.studyId, action: 'EXPORT',
            fieldName: 'domain', newValue: domain,
            reason: `CSV export — domain: ${domain}`,
            user: req.user, ipAddress: req.ip,
        });

        res.send('﻿' + csv); // BOM for Excel UTF-8
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
