// User SOP Agreements — ICH GCP E6(R3) C.4.1, §5.5.2
import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { userAgreements } from '../db/schemas/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// Current agreement versions that users must accept
const CURRENT_AGREEMENTS = {
    SOP:          { version: '2.0', title: 'System SOP & Data Integrity Agreement' },
    Data_Privacy: { version: '1.1', title: 'Data Privacy & UU PDP / GDPR Acknowledgment' },
    Training:     { version: '1.0', title: 'GCP Training Acknowledgment' },
};

// GET /api/agreements/required — check which agreements the current user still needs
router.get('/required', requireAuth, async (req, res) => {
    try {
        const existing = await db.select()
            .from(userAgreements)
            .where(eq(userAgreements.userId, req.user.id))
            .orderBy(desc(userAgreements.agreedAt));

        const agreedMap = {};
        for (const row of existing) {
            if (!agreedMap[row.agreementType]) agreedMap[row.agreementType] = row.agreementVersion;
        }

        const pending = [];
        for (const [type, { version, title }] of Object.entries(CURRENT_AGREEMENTS)) {
            if (agreedMap[type] !== version) {
                pending.push({ type, version, title });
            }
        }
        res.json({ pending, agreements: CURRENT_AGREEMENTS });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/agreements/text/:type — get agreement text content
router.get('/text/:type', requireAuth, (req, res) => {
    const texts = {
        SOP: `<h3>System SOP &amp; Data Integrity Agreement v2.0</h3>
<p>By acknowledging this agreement, I confirm that:</p>
<ul>
  <li>I have read and understood the Electronic Case Report Form (E-CRF) Standard Operating Procedures.</li>
  <li>I understand that all data I enter must be accurate, complete, and verifiable against source documents.</li>
  <li>I understand that all changes to clinical data require a documented reason for change (21 CFR Part 11 §11.10).</li>
  <li>I will not share my login credentials with any other person.</li>
  <li>I understand that all my actions in this system are recorded in an immutable audit trail (ICH E6(R3) Appendix C).</li>
  <li>I will report any system access concerns or data integrity issues immediately to the study team.</li>
  <li>I am aware that unauthorised data modification constitutes a serious GCP violation.</li>
</ul>`,
        Data_Privacy: `<h3>Data Privacy &amp; UU PDP / GDPR Acknowledgment v1.1</h3>
<p>By acknowledging this agreement, I confirm that:</p>
<ul>
  <li>I understand that subject data in this system is pseudonymised and must not be de-identified outside of the system.</li>
  <li>I will handle all personal data in accordance with UU PDP (Indonesia Personal Data Protection Law) and applicable GDPR principles.</li>
  <li>I will not export, copy, or transfer subject data to unauthorised parties or systems.</li>
  <li>I understand data breach obligations and will report any suspected breach within 24 hours to the Data Protection Officer.</li>
</ul>`,
        Training: `<h3>GCP Training Acknowledgment v1.0</h3>
<p>By acknowledging this agreement, I confirm that:</p>
<ul>
  <li>I have completed GCP training as required by ICH E6(R3) and have a valid training certificate on file.</li>
  <li>I understand my responsibilities as a clinical research professional under GCP guidelines.</li>
  <li>I will complete refresher GCP training as required (every 2 years or per protocol requirements).</li>
</ul>`,
    };
    const text = texts[req.params.type];
    if (!text) return res.status(404).json({ error: 'Agreement type not found' });
    res.json({ type: req.params.type, html: text, ...CURRENT_AGREEMENTS[req.params.type] });
});

// POST /api/agreements — record user agreement
router.post('/', requireAuth, async (req, res) => {
    try {
        const { agreementType } = req.body;
        if (!agreementType || !CURRENT_AGREEMENTS[agreementType]) {
            return res.status(400).json({ error: 'Invalid agreement type' });
        }
        const { version } = CURRENT_AGREEMENTS[agreementType];

        const [row] = await db.insert(userAgreements).values({
            userId:           req.user.id,
            agreementType,
            agreementVersion: version,
            ipAddress:        req.ip,
            userAgent:        req.headers['user-agent'] || null,
        }).returning();

        await writeAudit(db, {
            tableName: 'user_agreements', recordId: row.id, action: 'AGREE',
            fieldName: 'agreementType', newValue: `${agreementType} v${version}`,
            reason: 'User accepted agreement',
            user: req.user, ipAddress: req.ip,
        });
        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
