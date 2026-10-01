# Complete files — code review fixes

Setiap bagian berikut berisi isi file lengkap setelah perbaikan CRITICAL dan MEDIUM. Temuan MINOR hanya ditandai dengan komentar TODO.

## `src/backend/db/schemas/schema.js`

````javascript
import {
    pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, varchar, uniqueIndex
} from 'drizzle-orm/pg-core';

// ─── Better Auth required tables ────────────────────────────────────────────

export const user = pgTable('user', {
    id:            text('id').primaryKey(),
    name:          text('name').notNull(),
    displayName:   text('display_name'),
    email:         text('email').notNull().unique(),   // global identity (one login per person)
    emailVerified: boolean('email_verified').notNull().default(false),
    image:         text('image'),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
    updatedAt:     timestamp('updated_at').notNull().defaultNow(),
    role:          varchar('role', { length: 20 }).notNull().default('investigator'),
    // Tenant the user belongs to. NULL only for platform_owner (cross-tenant
    // SaaS operator). Every other role must have an organizationId.
    organizationId: integer('organization_id'),
    siteId:        integer('site_id'),
    isActive:      boolean('is_active').notNull().default(true),
});

export const session = pgTable('session', {
    id:        text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token:     text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
    id:                    text('id').primaryKey(),
    accountId:             text('account_id').notNull(),
    providerId:            text('provider_id').notNull(),
    userId:                text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken:           text('access_token'),
    refreshToken:          text('refresh_token'),
    idToken:               text('id_token'),
    accessTokenExpiresAt:  timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope:                 text('scope'),
    password:              text('password'),
    createdAt:             timestamp('created_at').notNull().defaultNow(),
    updatedAt:             timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
    id:         text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value:      text('value').notNull(),
    expiresAt:  timestamp('expires_at').notNull(),
    createdAt:  timestamp('created_at').defaultNow(),
    updatedAt:  timestamp('updated_at').defaultNow(),
});

// ─── Organizations (Tenant — top-level SaaS isolation boundary) ─────────────
// Each customer (sponsor/CRO) is one organization. Users, studies, and sites
// belong to an organization; all clinical data inherits tenancy through
// studyId → study.organizationId. The `platform_owner` role has a NULL
// organizationId and is the only role permitted to act across tenants.

export const organizations = pgTable('organizations', {
    id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name:        text('name').notNull(),
    slug:        text('slug').notNull().unique(),   // URL-safe tenant key
    status:      text('status').notNull().default('Active'), // Active | Suspended | Closed
    plan:        text('plan').default('standard'),           // trial | standard | enterprise
    subscriptionStatus: text('subscription_status').default('Active'), // Trialing | Active | PastDue | Canceled
    trialEndsAt: timestamp('trial_ends_at'),
    billingCustomerId:     text('billing_customer_id'),     // e.g. Stripe customer id
    billingSubscriptionId: text('billing_subscription_id'), // e.g. Stripe subscription id
    createdAt:   timestamp('created_at').notNull().defaultNow(),
    updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});

// ─── Studies / Trials (Tier 4 multi-study isolation) ────────────────────────

export const studies = pgTable('studies', {
    id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').references(() => organizations.id),
    title:       text('title').notNull(),
    // Unique per organization (composite index in migration), not globally.
    protocolNo:  text('protocol_no').notNull(),
    phase:       text('phase'),          // Phase I | II | III | IV | N/A
    sponsor:     text('sponsor'),
    indication:  text('indication'),
    // Per-protocol Inclusion/Exclusion criteria: { inclusion:[{key,label}], exclusion:[{key,label}] }.
    // NULL means "use the app's default criteria set" (see frontend DEFAULT_IE_CRITERIA).
    ieCriteria:  jsonb('ie_criteria'),
    // Per-protocol visit schedule template: [{ name, studyDay, windowDays, order }].
    // Subjects who pass screening get these visits generated automatically.
    // NULL means no template — visits are added manually, nothing is invented.
    visitSchedule: jsonb('visit_schedule'),
    status:      text('status').notNull().default('Active'), // Active | Completed | Suspended | Terminated
    startDate:   timestamp('start_date'),
    endDate:     timestamp('end_date'),
    createdBy:   text('created_by').references(() => user.id),
    createdByName: text('created_by_name'),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
    updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});

export const studyUsers = pgTable('study_users', {
    id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:     integer('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
    userId:      text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    assignedAt:  timestamp('assigned_at').notNull().defaultNow(),
    assignedBy:  text('assigned_by').references(() => user.id),
});

// ─── Phase 1: Core Clinical Modules ─────────────────────────────────────────

export const medicalHistory = pgTable('medical_history', {
    id:                    integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:               integer('study_id').references(() => studies.id),
    subjectId:             integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    condition:             text('condition').notNull(),
    icdCode:               text('icd_code'),
    icdVersion:            text('icd_version').default('ICD-10'),
    onsetDate:             text('onset_date'),
    resolutionDate:        text('resolution_date'),
    status:                text('status').notNull().default('Active'), // Active | Resolved | Unknown
    severity:              text('severity'),                            // Mild | Moderate | Severe | Unknown
    isRelatedToIndication: boolean('is_related_to_indication').notNull().default(false),
    notes:                 text('notes'),
    createdBy:             text('created_by').references(() => user.id),
    createdByName:         text('created_by_name'),
    createdAt:             timestamp('created_at').notNull().defaultNow(),
    updatedBy:             text('updated_by').references(() => user.id),
    updatedAt:             timestamp('updated_at').notNull().defaultNow(),
});

export const concomitantMeds = pgTable('concomitant_meds', {
    id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:          integer('study_id').references(() => studies.id),
    subjectId:        integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    drugName:         text('drug_name').notNull(),
    whoDrugName:      text('who_drug_name'),
    whoDrugCode:      text('who_drug_code'),
    atcCode:          text('atc_code'),
    indication:       text('indication'),
    dose:             text('dose'),
    doseUnit:         text('dose_unit'),
    frequency:        text('frequency'),   // QD | BID | TID | QID | PRN | Other
    route:            text('route'),       // Oral | IV | IM | SC | Topical | Inhaled | Other
    startDate:        text('start_date'),
    stopDate:         text('stop_date'),
    isOngoing:        boolean('is_ongoing').notNull().default(true),
    notes:            text('notes'),
    createdBy:        text('created_by').references(() => user.id),
    createdByName:    text('created_by_name'),
    createdAt:        timestamp('created_at').notNull().defaultNow(),
    updatedBy:        text('updated_by').references(() => user.id),
    updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

export const vitalSigns = pgTable('vital_signs', {
    id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:          integer('study_id').references(() => studies.id),
    subjectId:        integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    visitId:          integer('visit_id').references(() => visits.id),
    assessmentDate:   text('assessment_date').notNull(),
    assessmentTime:   text('assessment_time'),
    position:         text('position').default('Sitting'), // Supine | Sitting | Standing
    systolicBp:       integer('systolic_bp'),
    diastolicBp:      integer('diastolic_bp'),
    heartRate:        integer('heart_rate'),
    respiratoryRate:  integer('respiratory_rate'),
    temperature:      text('temperature'),
    temperatureUnit:  text('temperature_unit').default('C'),
    weight:           text('weight'),
    weightUnit:       text('weight_unit').default('kg'),
    height:           text('height'),
    heightUnit:       text('height_unit').default('cm'),
    bmi:              text('bmi'),
    oxygenSaturation: text('oxygen_saturation'),
    notes:            text('notes'),
    createdBy:        text('created_by').references(() => user.id),
    createdByName:    text('created_by_name'),
    createdAt:        timestamp('created_at').notNull().defaultNow(),
    updatedBy:        text('updated_by').references(() => user.id),
    updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

export const labResults = pgTable('lab_results', {
    id:                   integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:              integer('study_id').references(() => studies.id),
    subjectId:            integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    visitId:              integer('visit_id').references(() => visits.id),
    panelName:            text('panel_name'),          // Hematology | Chemistry | Urinalysis | Coagulation
    testName:             text('test_name').notNull(),
    testCode:             text('test_code'),
    specimenType:         text('specimen_type'),
    specimenCollectedAt:  text('specimen_collected_at'),
    labName:              text('lab_name'),
    valueNumeric:         text('value_numeric'),
    valueText:            text('value_text'),
    unit:                 text('unit'),
    refRangeLow:          text('ref_range_low'),
    refRangeHigh:         text('ref_range_high'),
    refRangeText:         text('ref_range_text'),
    abnormalityFlag:      text('abnormality_flag'),    // L | H | LL | HH | A (abnormal) | null
    clinicalSignificance: text('clinical_significance').default('NCS'), // CS | NCS | NA
    isAbnormal:           boolean('is_abnormal').notNull().default(false),
    assessedBy:           text('assessed_by').references(() => user.id),
    assessedByName:       text('assessed_by_name'),
    assessmentDate:       text('assessment_date'),
    loincCodingStatus:    text('loinc_coding_status').notNull().default('Custom'), // LOINC | Custom | Pending
    status:               text('status').notNull().default('Pending'), // Pending | Verified | Queried
    notes:                text('notes'),
    createdBy:            text('created_by').references(() => user.id),
    createdByName:        text('created_by_name'),
    createdAt:            timestamp('created_at').notNull().defaultNow(),
    updatedBy:            text('updated_by').references(() => user.id),
    updatedAt:            timestamp('updated_at').notNull().defaultNow(),
});

// ─── Phase 2: Regulatory & Quality ──────────────────────────────────────────

export const protocolAmendments = pgTable('protocol_amendments', {
    id:              integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:         integer('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
    amendmentNo:     text('amendment_no').notNull(),   // e.g. "Amendment 1", "v2.0"
    effectiveDate:   text('effective_date').notNull(),
    summary:         text('summary').notNull(),
    changes:         text('changes'),                  // detailed description
    requiresReconsent: boolean('requires_reconsent').notNull().default(false),
    reconsentReason: text('reconsent_reason'),
    irbApprovalDate: text('irb_approval_date'),
    irbRefNo:        text('irb_ref_no'),
    status:          text('status').notNull().default('Draft'), // Draft | Approved | Implemented
    createdBy:       text('created_by').references(() => user.id),
    createdByName:   text('created_by_name'),
    createdAt:       timestamp('created_at').notNull().defaultNow(),
    updatedAt:       timestamp('updated_at').notNull().defaultNow(),
});

export const blindDataReviews = pgTable('blind_data_reviews', {
    id:              integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:         integer('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
    reviewDate:      text('review_date').notNull(),
    status:          text('status').notNull().default('In Progress'), // In Progress | Completed | Rejected
    checklistJson:   jsonb('checklist_json').notNull().default('{}'),
    openQueries:     integer('open_queries').default(0),
    missingCritical: integer('missing_critical').default(0),
    openDeviations:  integer('open_deviations').default(0),
    pendingSaes:     integer('pending_saes').default(0),
    notes:           text('notes'),
    completedBy:     text('completed_by').references(() => user.id),
    completedByName: text('completed_by_name'),
    completedAt:     timestamp('completed_at'),
    createdBy:       text('created_by').references(() => user.id),
    createdByName:   text('created_by_name'),
    createdAt:       timestamp('created_at').notNull().defaultNow(),
});

// ─── Phase 3: Quality Management ────────────────────────────────────────────

export const qualityToleranceLimits = pgTable('quality_tolerance_limits', {
    id:            integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:       integer('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
    indicator:     text('indicator').notNull(),   // missing_data_rate | query_rate | ae_rate | deviation_rate | consent_rate
    label:         text('label').notNull(),
    threshold:     text('threshold').notNull(),   // numeric, stored as text (%)
    unit:          text('unit').default('%'),
    alertLevel:    text('alert_level').default('warning'), // warning | critical
    description:   text('description'),
    createdBy:     text('created_by').references(() => user.id),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
    updatedAt:     timestamp('updated_at').notNull().defaultNow(),
});

export const systemValidationLog = pgTable('system_validation_log', {
    id:              integer('id').primaryKey().generatedAlwaysAsIdentity(),
    version:         text('version').notNull(),
    validationDate:  text('validation_date').notNull(),
    validationType:  text('validation_type').notNull(), // IQ | OQ | PQ | Re-validation
    status:          text('status').notNull().default('Pending'), // Validated | Pending | Failed
    performedBy:     text('performed_by'),
    summary:         text('summary'),
    changesSince:    text('changes_since'),
    approvedBy:      text('approved_by'),
    approvedAt:      timestamp('approved_at'),
    createdBy:       text('created_by').references(() => user.id),
    createdAt:       timestamp('created_at').notNull().defaultNow(),
});

// Multi-site assignment: one user can work at multiple sites across studies
export const userSites = pgTable('user_sites', {
    id:         integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId:     text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    siteId:     integer('site_id').notNull(),
    studyId:    integer('study_id').notNull(),
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
    assignedBy: text('assigned_by').references(() => user.id),
});

// ─── Clinical tables ─────────────────────────────────────────────────────────

export const siteStatusEnum = pgEnum('site_status', ['Active', 'Inactive']);

export const sites = pgTable('sites', {
    id:        integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').references(() => organizations.id),
    name:      text('name').notNull(),
    // Unique per organization (composite index in migration), not globally.
    code:      varchar('code', { length: 20 }).notNull(),
    country:   text('country'),
    piName:    text('pi_name'),
    status:    siteStatusEnum('status').notNull().default('Active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const subjectStatusEnum = pgEnum('subject_status', ['Active', 'Completed', 'Withdrawn', 'Screen Failed']);

export const subjects = pgTable('subjects', {
    id:             integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:        integer('study_id').references(() => studies.id),
    subjectCode:    varchar('subject_code', { length: 30 }).notNull().unique(),
    siteId:         integer('site_id').references(() => sites.id),
    initials:       varchar('initials', { length: 10 }),
    dateOfBirth:    text('date_of_birth'),
    sex:            varchar('sex', { length: 1 }),
    genderIdentity: varchar('gender_identity', { length: 50 }),
    enrolledAt:     timestamp('enrolled_at').notNull().defaultNow(),
    enrolledBy:     text('enrolled_by').references(() => user.id),
    status:         subjectStatusEnum('status').notNull().default('Active'),
    withdrawnAt:    timestamp('withdrawn_at'),
    withdrawReason: text('withdraw_reason'),
    updatedAt:      timestamp('updated_at').notNull().defaultNow(),
});

export const visitStatusEnum = pgEnum('visit_status', ['Scheduled', 'In Progress', 'Completed', 'Missed']);

export const visits = pgTable('visits', {
    id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId:        integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    visitName:        text('visit_name').notNull(),
    visitOrder:       integer('visit_order'),
    visitType:        text('visit_type').default('Scheduled'),
    plannedDate:      text('planned_date'),
    actualDate:       text('actual_date'),
    visitDate:        text('visit_date'),
    windowDays:       integer('window_days'),
    studyDay:         integer('study_day'),
    windowCompliance: text('window_compliance'),
    missedReason:     text('missed_reason'),
    createdByName:    text('created_by_name'),
    formIds:          integer('form_ids').array().notNull().default([]),
    status:           visitStatusEnum('status').notNull().default('Scheduled'),
    investigatorSigned:         boolean('investigator_signed').notNull().default(false),
    investigatorSignedAt:       timestamp('investigator_signed_at'),
    investigatorSignedBy:       text('investigator_signed_by').references(() => user.id),
    investigatorSignedByName:   text('investigator_signed_by_name'),
    investigatorUnsignedAt:     timestamp('investigator_unsigned_at'),
    investigatorUnsignedBy:     text('investigator_unsigned_by').references(() => user.id),
    investigatorUnsignedByName: text('investigator_unsigned_by_name'),
    investigatorUnsignReason:   text('investigator_unsign_reason'),
    createdAt:        timestamp('created_at').notNull().defaultNow(),
    updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

export const crfForms = pgTable('crf_forms', {
    id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').references(() => organizations.id),
    name:        text('name').notNull(),
    description: text('description'),
    version:     varchar('version', { length: 20 }).notNull().default('1.0'),
    schemaJson:  jsonb('schema_json').notNull(),
    isActive:    boolean('is_active').notNull().default(true),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export const entryStatusEnum = pgEnum('entry_status', ['Draft', 'Saved', 'Signed', 'Locked']);

export const crfDataEntries = pgTable('crf_data_entries', {
    id:           integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId:    integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    visitId:      integer('visit_id').notNull().references(() => visits.id, { onDelete: 'cascade' }),
    formId:       integer('form_id').notNull().references(() => crfForms.id),
    dataJson:     jsonb('data_json').notNull().default('{}'),
    status:       entryStatusEnum('status').notNull().default('Draft'),
    lockedAt:     timestamp('locked_at'),
    lockedBy:     text('locked_by').references(() => user.id),
    lockReason:   text('lock_reason'),
    unlockedAt:   timestamp('unlocked_at'),
    unlockedBy:   text('unlocked_by').references(() => user.id),
    unlockReason: text('unlock_reason'),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
    createdBy:    text('created_by').references(() => user.id),
    updatedAt:    timestamp('updated_at').notNull().defaultNow(),
    updatedBy:    text('updated_by').references(() => user.id),
});
// NOTE: crf_data_entries carries a unique index idx_crf_entry_unique on
// (subject_id, visit_id, form_id) — a form is filled once per visit, and both
// writers (routes/entries.js, routes/import.js) check-then-insert without a
// lock, which nothing but the database can settle.
//
// It is created by the guarded migration in server.js, not declared here, and
// deliberately so. Every index in this schema lives in that list and none is
// declared in this file; declaring only this one would put it in both places
// at once. That matters because the two paths are not equivalent — the
// server.js version refuses to create the index on a database that already
// holds duplicates and prints how to find them, whereas a drizzle-kit
// migration generated from a declaration here would fail hard with a raw
// postgres error. If index declarations ever do move into this file, the
// duplicate guard has to move with them.

export const auditActionEnum = pgEnum('audit_action', ['INSERT', 'UPDATE', 'DELETE', 'LOCK', 'UNLOCK', 'LOGIN', 'LOGOUT', 'EXPORT', 'SIGN', 'AGREE']);

export const auditTrails = pgTable('audit_trails', {
    id:        integer('id').primaryKey().generatedAlwaysAsIdentity(),
    tableName: text('table_name').notNull(),
    recordId:  text('record_id').notNull(),
    action:    auditActionEnum('action').notNull(),
    fieldName: text('field_name'),
    oldValue:  text('old_value'),
    newValue:  text('new_value'),
    reason:    text('reason'),
    userId:    text('user_id').references(() => user.id),
    userName:  text('user_name'),
    userRole:  text('user_role'),
    ipAddress: text('ip_address'),
    auditHash: text('audit_hash'),
    organizationId: integer('organization_id'),   // tenant of the acting user
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Electronic Signatures (FDA 21 CFR Part 11) ─────────────────────────────

export const esignatures = pgTable('esignatures', {
    id:        integer('id').primaryKey().generatedAlwaysAsIdentity(),
    entryId:   integer('entry_id').references(() => crfDataEntries.id, { onDelete: 'cascade' }),
    userId:    text('user_id').references(() => user.id),
    userName:  text('user_name'),
    userRole:  text('user_role'),
    meaning:   text('meaning').notNull(),
    ipAddress: text('ip_address'),
    signedAt:  timestamp('signed_at').notNull().defaultNow(),
});

// ─── Inclusion / Exclusion Assessments ──────────────────────────────────────

export const ieAssessments = pgTable('ie_assessments', {
    id:              integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId:       integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
    criteriaJson:    jsonb('criteria_json').notNull().default('[]'),
    passed:          boolean('passed').notNull(),
    assessedBy:      text('assessed_by').references(() => user.id),
    assessedByName:  text('assessed_by_name'),
    assessedAt:      timestamp('assessed_at').notNull().defaultNow(),
});

// ─── Adverse Events / SAE ────────────────────────────────────────────────────

export const adverseEvents = pgTable('adverse_events', {
    id:                      integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:                 integer('study_id').references(() => studies.id),
    subjectId:               integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    aeTerm:                  text('ae_term').notNull(),
    meddraPt:                text('meddra_pt'),
    meddraPtCode:            text('meddra_pt_code'),
    meddraSoc:               text('meddra_soc'),
    meddraSocCode:           text('meddra_soc_code'),
    meddraVersion:           text('meddra_version'),
    codingStatus:            text('coding_status').notNull().default('Uncoded'),
    onsetDate:               text('onset_date'),
    resolutionDate:          text('resolution_date'),
    outcome:                 text('outcome'),
    severity:                text('severity').notNull(),
    isSerious:               boolean('is_serious').notNull().default(false),
    seriousCriteria:         jsonb('serious_criteria').default('[]'),
    causality:               text('causality'),
    actionTaken:             text('action_taken'),
    narrative:               text('narrative'),
    reportStatus:            text('report_status').notNull().default('Draft'),
    reportedToSponsorAt:     timestamp('reported_to_sponsor_at'),
    reportedToIrbAt:         timestamp('reported_to_irb_at'),
    requiresExpeditedReport: boolean('requires_expedited_report').notNull().default(false),
    expeditedDeadline:       timestamp('expedited_deadline'),
    createdBy:               text('created_by').references(() => user.id),
    createdByName:           text('created_by_name'),
    createdAt:               timestamp('created_at').notNull().defaultNow(),
    updatedBy:               text('updated_by').references(() => user.id),
    updatedAt:               timestamp('updated_at').notNull().defaultNow(),
});

// ─── Protocol Deviations ─────────────────────────────────────────────────────

export const protocolDeviations = pgTable('protocol_deviations', {
    id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:          integer('study_id').references(() => studies.id),
    subjectId:        integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
    visitId:          integer('visit_id').references(() => visits.id, { onDelete: 'set null' }),
    autoGenerated:    boolean('auto_generated').notNull().default(false),
    deviationType:    text('deviation_type').notNull(),
    category:         text('category'),
    description:      text('description').notNull(),
    deviationDate:    text('deviation_date'),
    discoveryDate:    text('discovery_date'),
    rootCause:        text('root_cause'),
    impactOnSubject:  text('impact_on_subject'),
    capa:             text('capa'),
    reportedToIrb:    boolean('reported_to_irb').notNull().default(false),
    reportedToIrbAt:  timestamp('reported_to_irb_at'),
    status:           text('status').notNull().default('Open'),
    createdBy:        text('created_by').references(() => user.id),
    createdByName:    text('created_by_name'),
    createdAt:        timestamp('created_at').notNull().defaultNow(),
    updatedBy:        text('updated_by').references(() => user.id),
    updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

// ─── Informed Consent (UU PDP / ICH GCP) ────────────────────────────────────

export const informedConsents = pgTable('informed_consents', {
    id:              integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:         integer('study_id').references(() => studies.id),
    subjectId:       integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    consentVersion:  text('consent_version').notNull(),
    consentDate:     text('consent_date').notNull(),
    // Time of signature (HH:MM). GCP requires consent BEFORE any study procedure;
    // on same-day screening the date alone cannot evidence the sequence.
    consentTime:     text('consent_time'),
    consentType:     text('consent_type').notNull().default('Initial'),
    language:        text('language').notNull().default('Indonesian'),
    // Investigator/delegate who conducted the consent discussion — distinct from
    // createdBy (whoever keyed the record into the EDC). Validated against the
    // delegation log task "Informed Consent Process" (ICH GCP E6(R3) §4.1.5).
    obtainedBy:      text('obtained_by').references(() => user.id),
    obtainedByName:  text('obtained_by_name'),
    witnessName:     text('witness_name'),
    // Why a witness was present — the regulatory consequence differs per type
    witnessType:     text('witness_type'),  // Impartial Witness | Legally Authorized Representative | Parent/Guardian
    // Assent for minors / subjects unable to give full consent (ICH GCP §4.8.12)
    assentObtained:  boolean('assent_obtained').notNull().default(false),
    assentDate:      text('assent_date'),
    // Subject received a signed copy of the ICF (ICH GCP §4.8.11)
    copyProvided:    boolean('copy_provided').notNull().default(false),
    notes:           text('notes'),
    amendmentId:     integer('amendment_id').references(() => protocolAmendments.id),
    isWithdrawn:     boolean('is_withdrawn').notNull().default(false),
    withdrawnAt:     timestamp('withdrawn_at'),
    withdrawnReason: text('withdrawn_reason'),
    createdBy:       text('created_by').references(() => user.id),
    createdByName:   text('created_by_name'),
    createdAt:       timestamp('created_at').notNull().defaultNow(),
});

// ─── Randomization ───────────────────────────────────────────────────────────

export const randomizationList = pgTable('randomization_list', {
    id:                integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:           integer('study_id').references(() => studies.id),
    randCode:          text('rand_code').notNull(),
    treatmentArm:      text('treatment_arm').notNull(),
    stratum:           text('stratum'),
    isUsed:            boolean('is_used').notNull().default(false),
    uploadedBy:        text('uploaded_by').references(() => user.id),
    uploadedAt:        timestamp('uploaded_at').notNull().defaultNow(),
}, table => [
    uniqueIndex('randomization_list_study_code_unique').on(table.studyId, table.randCode),
]);

export const subjectRandomization = pgTable('subject_randomization', {
    id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId:        integer('subject_id').notNull().unique().references(() => subjects.id),
    randCode:         text('rand_code').notNull(),
    treatmentArm:     text('treatment_arm').notNull(),
    stratum:          text('stratum'),
    isBlinded:        boolean('is_blinded').notNull().default(true),
    unblindedAt:      timestamp('unblinded_at'),
    unblindedBy:      text('unblinded_by').references(() => user.id),
    unblindReason:    text('unblind_reason'),
    randomizedAt:     timestamp('randomized_at').notNull().defaultNow(),
    randomizedBy:     text('randomized_by').references(() => user.id),
    randomizedByName: text('randomized_by_name'),
});

// ─── Account Security (ICH GCP E6(R3) Appendix C.4.3) ───────────────────────

export const loginAttempts = pgTable('login_attempts', {
    id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
    email:       text('email').notNull(),
    ipAddress:   text('ip_address'),
    success:     boolean('success').notNull().default(false),
    attemptedAt: timestamp('attempted_at').notNull().defaultNow(),
});

export const accountLocks = pgTable('account_locks', {
    id:            integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId:        text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    email:         text('email').notNull().unique(),
    failedCount:   integer('failed_count').notNull().default(0),
    lockedAt:      timestamp('locked_at').notNull().defaultNow(),
    autoUnlockAt:  timestamp('auto_unlock_at'),
    unlockedAt:    timestamp('unlocked_at'),
    unlockedBy:    text('unlocked_by').references(() => user.id),
    unlockReason:  text('unlock_reason'),
});

export const passwordHistory = pgTable('password_history', {
    id:           integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId:       text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    passwordHash: text('password_hash').notNull(),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
});

export const passwordMeta = pgTable('password_meta', {
    userId:       text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
    lastChangedAt: timestamp('last_changed_at').notNull().defaultNow(),
    mustChange:   boolean('must_change').notNull().default(false),
});

// ─── Study Database Lock (ICH GCP E6(R3) §5.5.7) ────────────────────────────

export const studyDbLock = pgTable('study_db_lock', {
    id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:          integer('study_id').references(() => studies.id),
    status:           text('status').notNull().default('Unlocked'),
    preCheckJson:     jsonb('pre_check_json').default('{}'),
    initiatedBy:      text('initiated_by').references(() => user.id),
    initiatedByName:  text('initiated_by_name'),
    initiatedAt:      timestamp('initiated_at'),
    craSigned:        boolean('cra_signed').notNull().default(false),
    craSignedAt:      timestamp('cra_signed_at'),
    craSignedBy:      text('cra_signed_by').references(() => user.id),
    craSignedByName:  text('cra_signed_by_name'),
    adminSigned:      boolean('admin_signed').notNull().default(false),
    adminSignedAt:    timestamp('admin_signed_at'),
    adminSignedBy:    text('admin_signed_by').references(() => user.id),
    adminSignedByName: text('admin_signed_by_name'),
    lockedAt:         timestamp('locked_at'),
    notes:            text('notes'),
    createdAt:        timestamp('created_at').notNull().defaultNow(),
});

// ─── Delegation Log & Training (ICH GCP E6(R3) §4.1.5, §8.3) ───────────────

export const delegationLog = pgTable('delegation_log', {
    id:                integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:           integer('study_id').references(() => studies.id),
    userId:            text('user_id').notNull().references(() => user.id),
    userName:          text('user_name').notNull(),
    userRole:          text('user_role').notNull(),
    siteId:            integer('site_id').references(() => sites.id),
    delegatedTasks:    jsonb('delegated_tasks').notNull().default('[]'),
    delegationStart:   text('delegation_start').notNull(),
    delegationEnd:     text('delegation_end'),
    status:            text('status').notNull().default('Active'),
    signedAt:          timestamp('signed_at'),
    signedByName:      text('signed_by_name'),
    notes:             text('notes'),
    createdBy:         text('created_by').references(() => user.id),
    createdByName:     text('created_by_name'),
    createdAt:         timestamp('created_at').notNull().defaultNow(),
    updatedAt:         timestamp('updated_at').notNull().defaultNow(),
});

export const trainingRecords = pgTable('training_records', {
    id:             integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').references(() => organizations.id),
    // NULL = a qualification of the person, valid across every study they work
    // on (a GCP certificate); set = training on that study's protocol. See
    // lib/trainingrules.js — a study's file shows its own records plus every
    // person-level one, which keeps each TMF complete without duplication.
    studyId:        integer('study_id').references(() => studies.id),
    userId:         text('user_id').notNull().references(() => user.id),
    userName:       text('user_name').notNull(),
    trainingType:   text('training_type').notNull(),
    trainingDate:   text('training_date').notNull(),
    expiryDate:     text('expiry_date'),
    certificateRef: text('certificate_ref'),
    notes:          text('notes'),
    recordedBy:     text('recorded_by').references(() => user.id),
    recordedByName: text('recorded_by_name'),
    recordedAt:     timestamp('recorded_at').notNull().defaultNow(),
});

// ─── SAE Expedited Reports (ICH E2A §4) ─────────────────────────────────────

export const saeReports = pgTable('sae_reports', {
    id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
    aeId:             integer('ae_id').notNull().references(() => adverseEvents.id, { onDelete: 'cascade' }),
    reportType:       text('report_type').notNull(),        // Initial | Follow-up | Final
    reportNumber:     integer('report_number').notNull().default(1),
    day0Date:         text('day0_date').notNull(),          // date first knowledge of SAE
    deadlineDays:     integer('deadline_days').notNull(),   // 7 or 15
    deadlineDate:     timestamp('deadline_date').notNull(),
    submittedAt:      timestamp('submitted_at'),
    submissionRef:    text('submission_ref'),
    submittedTo:      text('submitted_to'),                 // BPOM | IRB/IEC | Sponsor | All
    narrative:        text('narrative'),
    status:           text('status').notNull().default('Pending'), // Pending | Submitted | Overdue
    submittedBy:      text('submitted_by').references(() => user.id),
    submittedByName:  text('submitted_by_name'),
    signedBy:         text('signed_by').references(() => user.id),
    signedByName:     text('signed_by_name'),
    signedAt:         timestamp('signed_at'),
    signingMeaning:   text('signing_meaning'),
    createdBy:        text('created_by').references(() => user.id),
    createdByName:    text('created_by_name'),
    createdAt:        timestamp('created_at').notNull().defaultNow(),
    updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

// ─── Monitoring Visits & SDV (ICH GCP E6(R3) §5.18) ─────────────────────────

export const monitoringVisits = pgTable('monitoring_visits', {
    id:                  integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:             integer('study_id').references(() => studies.id),
    visitDate:           text('visit_date').notNull(),
    siteId:              integer('site_id').references(() => sites.id),
    siteName:            text('site_name'),
    visitType:           text('visit_type').notNull(), // Site Initiation | Routine Monitoring | Close-out | Remote
    craId:               text('cra_id').references(() => user.id),
    craName:             text('cra_name').notNull(),
    findings:            text('findings'),
    actionItems:         jsonb('action_items').default('[]'),    // [{item, responsible, dueDate, status}]
    subjectsReviewed:    jsonb('subjects_reviewed').default('[]'), // [subjectCode, ...]'
    status:              text('status').notNull().default('Draft'), // Draft | Submitted | Acknowledged
    submittedAt:         timestamp('submitted_at'),
    acknowledgedBy:      text('acknowledged_by').references(() => user.id),
    acknowledgedByName:  text('acknowledged_by_name'),
    acknowledgedAt:      timestamp('acknowledged_at'),
    piComments:          text('pi_comments'),
    nextVisitDate:       text('next_visit_date'),
    notes:               text('notes'),
    createdAt:           timestamp('created_at').notNull().defaultNow(),
    updatedAt:           timestamp('updated_at').notNull().defaultNow(),
});

export const sdvRecords = pgTable('sdv_records', {
    id:                 integer('id').primaryKey().generatedAlwaysAsIdentity(),
    monitoringVisitId:  integer('monitoring_visit_id').notNull().references(() => monitoringVisits.id, { onDelete: 'cascade' }),
    subjectId:          integer('subject_id').references(() => subjects.id),
    subjectCode:        text('subject_code').notNull(),
    visitId:            integer('visit_id').references(() => visits.id),
    visitName:          text('visit_name'),
    formId:             integer('form_id').references(() => crfForms.id),
    formName:           text('form_name'),
    sdvStatus:          text('sdv_status').notNull().default('Not Reviewed'), // Verified | Discrepant | Not Reviewed | N/A
    discrepancyNote:    text('discrepancy_note'),
    verifiedBy:         text('verified_by').references(() => user.id),
    verifiedByName:     text('verified_by_name'),
    verifiedAt:         timestamp('verified_at'),
    createdAt:          timestamp('created_at').notNull().defaultNow(),
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export const queryStatusEnum = pgEnum('query_status', ['Open', 'Resolved', 'Closed']);

export const queries = pgTable('queries', {
    id:             integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:        integer('study_id').references(() => studies.id),
    subjectId:      integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    visitId:        integer('visit_id').references(() => visits.id),
    formId:         integer('form_id').references(() => crfForms.id),
    entryId:        integer('entry_id').references(() => crfDataEntries.id),
    fieldKey:       text('field_key'),
    fieldLabel:     text('field_label'),
    queryText:      text('query_text').notNull(),
    status:         queryStatusEnum('status').notNull().default('Open'),
    raisedBy:       text('raised_by').references(() => user.id),
    raisedByName:   text('raised_by_name'),
    raisedAt:       timestamp('raised_at').notNull().defaultNow(),
    resolutionText: text('resolution_text'),
    resolvedBy:     text('resolved_by').references(() => user.id),
    resolvedByName: text('resolved_by_name'),
    resolvedAt:     timestamp('resolved_at'),
    closedBy:       text('closed_by').references(() => user.id),
    closedAt:       timestamp('closed_at'),
});

// ─── Screening Log (ICH E6(R3) §8.3.20) ─────────────────────────────────────

export const screeningLog = pgTable('screening_log', {
    id:                  integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:             integer('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
    siteId:              integer('site_id').references(() => sites.id),
    screeningDate:       text('screening_date').notNull(),
    screeningCode:       varchar('screening_code', { length: 30 }).notNull(),
    subjectInitials:     varchar('subject_initials', { length: 10 }),
    disposition:         text('disposition').notNull().default('Pending'), // Enrolled | Screen Failed | Pending | Withdrawn
    failReason:          text('fail_reason'),
    eligibilityCriteria: text('eligibility_criteria'),
    notes:               text('notes'),
    enrolledSubjectId:   integer('enrolled_subject_id').references(() => subjects.id),
    createdBy:           text('created_by').references(() => user.id),
    createdByName:       text('created_by_name'),
    createdAt:           timestamp('created_at').notNull().defaultNow(),
    updatedAt:           timestamp('updated_at').notNull().defaultNow(),
});

// ─── IP Accountability / Drug Dispensing (ICH E6(R3) §8.3.19) ───────────────

export const ipAccountability = pgTable('ip_accountability', {
    id:                integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:           integer('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
    siteId:            integer('site_id').references(() => sites.id),
    subjectId:         integer('subject_id').references(() => subjects.id),
    recordType:        text('record_type').notNull(), // Receipt | Dispensing | Return | Destruction
    transactionDate:   text('transaction_date').notNull(),
    drugName:          text('drug_name').notNull(),
    batchNo:           text('batch_no'),
    quantityIn:        text('quantity_in'),
    quantityOut:       text('quantity_out'),
    unit:              text('unit'),
    expiryDate:        text('expiry_date'),
    supplierRef:       text('supplier_ref'),
    returnedQuantity:  text('returned_quantity'),
    destroyedQuantity: text('destroyed_quantity'),
    destructionRef:    text('destruction_ref'),
    balance:           text('balance'),
    notes:             text('notes'),
    createdBy:         text('created_by').references(() => user.id),
    createdByName:     text('created_by_name'),
    createdAt:         timestamp('created_at').notNull().defaultNow(),
    updatedAt:         timestamp('updated_at').notNull().defaultNow(),
});

// ─── Essential Documents (ICH E6(R3) §8) ─────────────────────────────────────

export const essentialDocuments = pgTable('essential_documents', {
    id:           integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:      integer('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
    siteId:       integer('site_id').references(() => sites.id),
    section:        text('section').notNull(),       // 8.1/8.2/8.3 per ICH GCP E6(R3) §8
    documentType:   text('document_type').notNull(), // document label (e.g. 'Protocol (Signed)')
    tmfArtifactId:  text('tmf_artifact_id'),         // DIA TMF Reference Model artifact ID (e.g. '01.004')
    isRequired:     boolean('is_required').notNull().default(false),
    documentRef:    text('document_ref'),             // file path, URL, or doc number
    version:        text('version'),
    documentDate:   text('document_date'),
    expiryDate:     text('expiry_date'),
    status:         text('status').notNull().default('Pending'), // Pending | Received | Current | Superseded | Not Applicable
    notes:          text('notes'),
    uploadedBy:     text('uploaded_by').references(() => user.id),
    uploadedByName: text('uploaded_by_name'),
    uploadedAt:     timestamp('uploaded_at').notNull().defaultNow(),
    updatedAt:      timestamp('updated_at').notNull().defaultNow(),
});

// ─── User SOP Agreements (ICH E6(R3) C.4.1, §5.5.2) ─────────────────────────

export const userAgreements = pgTable('user_agreements', {
    id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId:           text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    agreementType:    text('agreement_type').notNull().default('SOP'), // SOP | Data_Privacy | Training
    agreementVersion: text('agreement_version').notNull(),
    agreedAt:         timestamp('agreed_at').notNull().defaultNow(),
    ipAddress:        text('ip_address'),
    userAgent:        text('user_agent'),
});

// ─── Risk-Based Monitoring Plan (ICH E6(R3) §5.18.3) ─────────────────────────

export const monitoringPlans = pgTable('monitoring_plans', {
    id:                 integer('id').primaryKey().generatedAlwaysAsIdentity(),
    studyId:            integer('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
    version:            text('version').notNull().default('1.0'),
    status:             text('status').notNull().default('Draft'), // Draft | Approved | Superseded
    riskLevel:          text('risk_level'),   // Low | Medium | High
    scope:              text('scope'),
    sdvStrategy:        text('sdv_strategy'),   // 100% | Risk-Based | Remote
    sdvPercentage:      integer('sdv_percentage'),
    onSiteFrequency:    text('on_site_frequency'),
    remoteFrequency:    text('remote_frequency'),
    criticalDataFields: jsonb('critical_data_fields').default('[]'),
    riskFactors:        jsonb('risk_factors').default('[]'),
    actionThresholds:   jsonb('action_thresholds').default('{}'),
    approvedBy:         text('approved_by').references(() => user.id),
    approvedByName:     text('approved_by_name'),
    approvedAt:         timestamp('approved_at'),
    notes:              text('notes'),
    createdBy:          text('created_by').references(() => user.id),
    createdByName:      text('created_by_name'),
    createdAt:          timestamp('created_at').notNull().defaultNow(),
    updatedAt:          timestamp('updated_at').notNull().defaultNow(),
});
````

## `src/backend/db/seed.js`

````javascript
import crypto from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
/**
 * Seed script — run once to populate demo data.
 * Usage: npm run db:seed
 */
import 'dotenv/config';
import { eq, isNull } from 'drizzle-orm';
import { db } from './connection.js';
import { auth } from '../auth/better-auth.js';
import { organizations, sites, subjects, visits, crfForms, user } from './schemas/schema.js';

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seed is disabled. Only explicitly enabled development databases may be seeded.');
}
if (!process.env.SEED_CREDENTIALS_FILE) throw new Error('Set SEED_CREDENTIALS_FILE to a private, new file path');

// ─── Sites ───────────────────────────────────────────────────────────────────
const seedSites = [
    { name: 'Jakarta General Hospital', code: 'JKT-001', country: 'Indonesia', piName: 'Dr. Budi Santoso' },
    { name: 'Surabaya Medical Center',  code: 'SBY-001', country: 'Indonesia', piName: 'Dr. Siti Rahayu' },
];

// ─── Demo users (Better Auth email/password) ─────────────────────────────────
const seedUserSpecs = [
    { name: 'Admin User',       email: 'admin@ecrf.local',        role: 'admin' },
    { name: 'Dr. Investigator', email: 'investigator@ecrf.local', role: 'investigator' },
    { name: 'CRA Monitor',      email: 'cra@ecrf.local',          role: 'cra' },
];

function readCredentialManifest() {
    try {
        const parsed = JSON.parse(readFileSync(process.env.SEED_CREDENTIALS_FILE, 'utf8'));
        if (!Array.isArray(parsed)) throw new Error('Seed credential manifest must be an array');
        const byEmail = new Map(parsed.map(row => [row?.email, row]));
        return seedUserSpecs.map(spec => {
            const saved = byEmail.get(spec.email);
            if (!saved || typeof saved.password !== 'string' || !saved.password) {
                throw new Error(`Seed credential manifest is missing ${spec.email}`);
            }
            return { ...spec, password: saved.password };
        });
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const generated = seedUserSpecs.map(spec => ({
            ...spec,
            password: crypto.randomBytes(24).toString('base64url'),
        }));
        // Persist before account creation so a partial run can safely reuse the
        // exact same passwords instead of producing a misleading replacement file.
        writeFileSync(process.env.SEED_CREDENTIALS_FILE, JSON.stringify(generated, null, 2), { flag: 'wx', mode: 0o600 });
        return generated;
    }
}

// ─── CRF Form templates ───────────────────────────────────────────────────────
const seedForms = [
    {
        name: 'Vital Signs',
        description: 'Blood pressure, heart rate, temperature, weight, height measurements',
        version: '1.0',
        schemaJson: {
            fields: [
                { key: 'visit_date',   label: 'Visit Date',       type: 'date',   required: true },
                { key: 'visit_time',   label: 'Visit Time',       type: 'time',   required: true },
                { key: 'systolic_bp',  label: 'Systolic BP (mmHg)', type: 'number', required: true,
                  validation: { hardMin: 50, hardMax: 300, softMin: 80, softMax: 200 } },
                { key: 'diastolic_bp', label: 'Diastolic BP (mmHg)', type: 'number', required: true,
                  validation: { hardMin: 30, hardMax: 200, softMin: 50, softMax: 130 } },
                { key: 'heart_rate',   label: 'Heart Rate (bpm)',  type: 'number', required: true,
                  validation: { hardMin: 20, hardMax: 300, softMin: 40, softMax: 180 } },
                { key: 'temperature',  label: 'Temperature (°C)',  type: 'number', required: false,
                  validation: { hardMin: 32, hardMax: 43, softMin: 35, softMax: 40 } },
                { key: 'weight_kg',    label: 'Weight (kg)',       type: 'number', required: false,
                  validation: { hardMin: 1, hardMax: 300, softMin: 20, softMax: 250 } },
                { key: 'height_cm',    label: 'Height (cm)',       type: 'number', required: false,
                  validation: { hardMin: 30, hardMax: 250, softMin: 100, softMax: 220 } },
                { key: 'notes',        label: 'Clinical Notes',   type: 'textarea', required: false },
            ],
        },
    },
    {
        name: 'Adverse Events',
        description: 'Adverse event reporting per ICH E2A guidelines',
        version: '1.0',
        schemaJson: {
            fields: [
                { key: 'ae_term',       label: 'AE Term',            type: 'text',   required: true },
                { key: 'onset_date',    label: 'Onset Date',         type: 'date',   required: true },
                { key: 'resolution_date', label: 'Resolution Date',  type: 'date',   required: false },
                { key: 'severity',      label: 'Severity',           type: 'select', required: true,
                  options: ['Mild', 'Moderate', 'Severe', 'Life-threatening', 'Fatal'] },
                { key: 'relationship',  label: 'Relationship to Study Drug', type: 'select', required: true,
                  options: ['Unrelated', 'Unlikely', 'Possible', 'Probable', 'Definite'] },
                { key: 'serious',       label: 'Serious AE?',        type: 'radio',  required: true,
                  options: ['Yes', 'No'] },
                { key: 'action_taken',  label: 'Action Taken',       type: 'select', required: true,
                  options: ['None', 'Dose Reduced', 'Drug Interrupted', 'Drug Discontinued', 'Other'] },
                { key: 'outcome',       label: 'Outcome',            type: 'select', required: false,
                  options: ['Recovered', 'Recovering', 'Not Recovered', 'Recovered with Sequelae', 'Fatal', 'Unknown'] },
                { key: 'description',   label: 'Detailed Description', type: 'textarea', required: false },
            ],
        },
    },
    {
        name: 'Concomitant Medications',
        description: 'Concurrent medications taken during the study',
        version: '1.0',
        schemaJson: {
            fields: [
                { key: 'drug_name',    label: 'Drug Name',      type: 'text',   required: true },
                { key: 'indication',   label: 'Indication',     type: 'text',   required: true },
                { key: 'dose',         label: 'Dose',           type: 'text',   required: true },
                { key: 'route',        label: 'Route',          type: 'select', required: true,
                  options: ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation', 'Other'] },
                { key: 'frequency',    label: 'Frequency',      type: 'select', required: true,
                  options: ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed', 'Other'] },
                { key: 'start_date',   label: 'Start Date',     type: 'date',   required: true },
                { key: 'end_date',     label: 'End Date',       type: 'date',   required: false },
                { key: 'ongoing',      label: 'Ongoing?',       type: 'radio',  required: true,
                  options: ['Yes', 'No'] },
            ],
        },
    },
];

// ─── Demo subjects ────────────────────────────────────────────────────────────
const seedSubjects = [
    { subjectCode: 'JKT-001-001', initials: 'A.B.', sex: 'Male',   dateOfBirth: '1975-04-12' },
    { subjectCode: 'JKT-001-002', initials: 'C.D.', sex: 'Female', dateOfBirth: '1988-09-23' },
    { subjectCode: 'SBY-001-001', initials: 'E.F.', sex: 'Male',   dateOfBirth: '1962-01-07' },
];

async function main() {
    const seedUsers = readCredentialManifest();
    console.log('🌱 Seeding database...\n');

    // 0. Default organization (tenant that owns all seeded data)
    console.log('→ Organization');
    await db.insert(organizations)
        .values({ name: 'Default Organization', slug: 'default' })
        .onConflictDoNothing();
    const [defaultOrg] = await db.select().from(organizations).where(eq(organizations.slug, 'default'));
    console.log(`   default org id=${defaultOrg.id}\n`);

    // 1. Sites (owned by the default org)
    console.log('→ Sites');
    const insertedSites = await db.insert(sites)
        .values(seedSites.map(s => ({ ...s, organizationId: defaultOrg.id })))
        .onConflictDoNothing().returning();
    console.log(`   ${insertedSites.length} sites inserted\n`);

    // 2. Users via Better Auth (creates user + account + hashes password)
    console.log('→ Users');
    for (const u of seedUsers) {
        const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, u.email));
        if (!existing) {
            await auth.api.signUpEmail({ body: { name: u.name, email: u.email, password: u.password } });
            console.log(`   ✓ ${u.email} (${u.role})`);
        } else {
            console.log(`   ~ ${u.email} already exists; reusing the persisted seed manifest`);
        }
        // role/siteId/org are input:false in Better Auth (privilege-escalation
        // guard) — assign them server-side after signup, and into the default org.
        await db.update(user)
            .set({ role: u.role, organizationId: defaultOrg.id, emailVerified: true })
            .where(eq(user.email, u.email.toLowerCase()));
    }
    // Safety net: any remaining untenanted users → default org
    await db.update(user).set({ organizationId: defaultOrg.id }).where(isNull(user.organizationId));
    console.log();

    // 3. CRF Forms (owned by the default org)
    console.log('→ CRF Form Templates');
    const insertedForms = await db.insert(crfForms)
        .values(seedForms.map(f => ({ ...f, organizationId: defaultOrg.id })))
        .onConflictDoNothing().returning();
    console.log(`   ${insertedForms.length} forms inserted\n`);

    // 4. Subjects (attach to first site)
    console.log('→ Subjects');
    const allSites = await db.select().from(sites);
    const siteMap  = Object.fromEntries(allSites.map(s => [s.code, s.id]));

    const subjectData = seedSubjects.map(s => ({
        ...s,
        siteId: s.subjectCode.startsWith('JKT') ? siteMap['JKT-001'] : siteMap['SBY-001'],
    }));
    const insertedSubjects = await db.insert(subjects).values(subjectData).onConflictDoNothing().returning();
    console.log(`   ${insertedSubjects.length} subjects inserted\n`);

    // 5. Visits for each subject
    console.log('→ Visits');
    const visitTemplates = ['Screening', 'Baseline (Day 1)', 'Week 4', 'Week 8', 'End of Study'];
    const allSubjects = await db.select().from(subjects);
    const visitData = allSubjects.flatMap(sub =>
        visitTemplates.map(name => ({ subjectId: sub.id, visitName: name }))
    );
    const insertedVisits = await db.insert(visits).values(visitData).onConflictDoNothing().returning();
    console.log(`   ${insertedVisits.length} visits inserted\n`);

    console.log('✅ Seed complete!\n');
    console.log('Generated demo credentials are in the private SEED_CREDENTIALS_FILE.');

    process.exit(0);
}

main().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
````

## `src/backend/lib/audit.js`

````javascript
import crypto from 'crypto';
import { auditTrails } from '../db/schemas/schema.js';

function computeHash(params, createdAt) {
    const raw = [
        params.tableName,
        String(params.recordId),
        params.action,
        params.fieldName  ?? '',
        params.oldValue   ?? '',
        params.newValue   ?? '',
        params.user?.id   ?? '',
        params.ipAddress  ?? '',
        createdAt.toISOString(),
    ].join('|');
    return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function writeAudit(db, {
    tableName, recordId, action,
    fieldName, oldValue, newValue, reason,
    user, ipAddress,
}) {
    const createdAt = new Date();
    const auditHash = computeHash(
        { tableName, recordId, action, fieldName, oldValue, newValue, user, ipAddress },
        createdAt,
    );
    const values = {
        tableName,
        recordId:  String(recordId),
        action,
        fieldName:  fieldName  ?? null,
        oldValue:   oldValue   ?? null,
        newValue:   newValue   ?? null,
        reason:     reason     ?? null,
        userId:     user?.id   ?? null,
        userName:   user?.name ?? null,
        userRole:   user?.role ?? null,
        ipAddress:  ipAddress  ?? null,
        auditHash,
        organizationId: user?.organizationId ?? null,
        createdAt,
    };
    if (typeof db.insert === 'function') {
        await db.insert(auditTrails).values(values);
        return;
    }
    // postgres.js transaction objects are callable SQL tags. Supporting both
    // transaction types keeps the state change and its audit record atomic.
    if (typeof db === 'function') {
        await db`INSERT INTO audit_trails
            (table_name, record_id, action, field_name, old_value, new_value, reason,
             user_id, user_name, user_role, ip_address, audit_hash, organization_id, created_at)
            VALUES (${values.tableName}, ${values.recordId}, ${values.action}, ${values.fieldName},
                    ${values.oldValue}, ${values.newValue}, ${values.reason}, ${values.userId},
                    ${values.userName}, ${values.userRole}, ${values.ipAddress}, ${values.auditHash},
                    ${values.organizationId}, ${values.createdAt.toISOString()})`;
        return;
    }
    throw new TypeError('Unsupported audit database adapter');
}

export async function writeFieldDiffAudit(db, { tableName, recordId, oldData, newData, reason, user, ipAddress }) {
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    const writes = [];
    for (const key of allKeys) {
        const ov = String(oldData?.[key] ?? '');
        const nv = String(newData?.[key] ?? '');
        if (ov !== nv) {
            writes.push(writeAudit(db, {
                tableName, recordId, action: 'UPDATE',
                fieldName: key, oldValue: ov, newValue: nv,
                reason, user, ipAddress,
            }));
        }
    }
    await Promise.all(writes);
}
````

## `src/backend/lib/sitescope.js`

````javascript
// Site-level data isolation — ICH GCP: site staff (PI, investigator, CRC)
// work with their own site's subjects only. Admin, CRA/monitor, and data
// manager operate across sites (monitoring/oversight functions).
//
// null means an explicitly unrestricted role; [] means no assigned sites.

import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { userSites, subjects } from '../db/schemas/schema.js';

export const SITE_BOUND_ROLES = ['pi', 'investigator', 'crc'];

// Site-bound roles must have an explicit assignment. Database errors propagate.
export async function computeSiteScope(user, studyId) {
    if (!SITE_BOUND_ROLES.includes(user.role)) return null;

    const ids = new Set();
    if (user.siteId) ids.add(user.siteId);
    {
        const rows = await db.select({ siteId: userSites.siteId }).from(userSites)
            .where(and(eq(userSites.userId, user.id), eq(userSites.studyId, studyId)));
        for (const r of rows) ids.add(r.siteId);
    }

    return [...ids];
}

// Drizzle condition limiting a query (joined to subjects) to the caller's
// sites. Returns undefined when unscoped, for use inside and(...) chains.
export function siteCondition(req) {
    if (req.siteScope === null) return undefined;
    if (!Array.isArray(req.siteScope) || !req.siteScope.length) return sql`false`;
    return inArray(subjects.siteId, req.siteScope);
}

// True when the caller may access the given subject (by id).
// Study-level records (subjectId null) are visible to all study members.
export async function subjectInSiteScope(req, subjectId) {
    if (req.siteScope === null) return true;
    if (!Array.isArray(req.siteScope) || !req.siteScope.length) return false;
    if (subjectId === null || subjectId === undefined) return true;
    // TODO: Validate the complete subject ID and bind this helper query to req.studyId; parseInt accepts trailing garbage.
    const [s] = await db.select({ siteId: subjects.siteId }).from(subjects)
        .where(eq(subjects.id, parseInt(subjectId)));
    return !!s && req.siteScope.includes(s.siteId);
}
````

## `src/backend/middleware/auth.js`

````javascript
import { readSessionToken } from '../lib/session.js';
import { tokenDigest } from '../lib/security-crypto.js';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { session as sessionTable, user, accountLocks, passwordMeta, organizations } from '../db/schemas/schema.js';

// Paths still allowed while a forced password change is pending — the user
// must be able to change the password and read why they are blocked.
const MUST_CHANGE_ALLOWED = new Set([
    '/api/security/change-password',
    '/api/security/password-status',
    '/api/mfa/logout',
    '/api/auth/sign-out',
]);

export async function requireAuth(req, res, next) {
    const token = readSessionToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const [row] = await db
            .select({
                expiresAt:   sessionTable.expiresAt,
                userId:      user.id,
                name:        user.name,
                displayName: user.displayName,
                email:       user.email,
                role:        user.role,
                siteId:      user.siteId,
                organizationId: user.organizationId,
                orgStatus:   organizations.status,
                isActive:    user.isActive,
            })
            .from(sessionTable)
            .innerJoin(user, eq(sessionTable.userId, user.id))
            .leftJoin(organizations, eq(user.organizationId, organizations.id))
            .where(eq(sessionTable.token, tokenDigest(token)));

        if (!row || new Date(row.expiresAt) < new Date()) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Deactivated staff must not retain access (ICH GCP E6(R3) C.4.2) —
        // enforced here so every API route is covered even if a session survives.
        if (row.isActive === false) {
            return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
        }

        // Tenant lifecycle: users of a suspended/closed organization lose access
        // (platform_owner has no org and is exempt). One level above isActive.
        if (row.role !== 'platform_owner' && (row.organizationId == null || row.orgStatus !== 'Active')) {
            return res.status(403).json({ error: 'Account is not attached to an active organization. Contact your administrator.' });
        }
        if (row.role === 'platform_owner' && row.organizationId != null) {
            return res.status(403).json({ error: 'Invalid platform account configuration. Contact your administrator.' });
        }

        // ICH GCP E6(R3) C.4.3 — reject requests from locked accounts
        // Fail closed if security tables cannot be checked.
        {
            const [lock] = await db.select().from(accountLocks)
                .where(eq(accountLocks.userId, row.userId));
            if (lock && !lock.unlockedAt && lock.lockedAt) {
                if (!lock.autoUnlockAt || new Date(lock.autoUnlockAt) > new Date()) {
                    return res.status(423).json({ error: 'Account is locked. Contact your administrator.' });
                }
            }
        }

        // Admin-forced password reset: block the API (not just the UI) until
        // the password is actually changed (ICH GCP E6(R3) C.4.3).
        {
            const url = (req.originalUrl || req.url || '').split('?')[0];
            if (!MUST_CHANGE_ALLOWED.has(url)) {
                const [meta] = await db.select({ mustChange: passwordMeta.mustChange })
                    .from(passwordMeta).where(eq(passwordMeta.userId, row.userId));
                if (meta?.mustChange) {
                    return res.status(403).json({
                        error: 'Password change required before continuing.',
                        mustChangePassword: true,
                    });
                }
            }
        }

        req.authTokenHash = tokenDigest(token);
        req.sessionExpiresAt = row.expiresAt;
        req.user = {
            id:          row.userId,
            name:        row.name,
            displayName: row.displayName ?? null,
            email:       row.email,
            role:        row.role,
            siteId:      row.siteId ?? null,
            organizationId: row.organizationId ?? null,
        };

        // Tenant the request acts within. Normal users are bound to their own
        // organization. platform_owner (cross-tenant SaaS operator) may target
        // a specific tenant via X-Org-ID, or act globally (null) without it.
        if (row.role === 'platform_owner') {
            const rawOrg = req.headers['x-org-id'];
            req.orgId = rawOrg && !isNaN(parseInt(rawOrg)) ? parseInt(rawOrg) : null;
        } else {
            req.orgId = row.organizationId ?? null;
        }

        next();
    } catch (err) {
        console.error('requireAuth error:', err.message);
        return res.status(503).json({ error: 'Authentication temporarily unavailable' });
    }
}
````

## `src/backend/middleware/study.js`

````javascript
// Study context middleware — validates X-Study-ID header and user access
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { studyUsers, studies, studyDbLock } from '../db/schemas/schema.js';
import { computeSiteScope } from '../lib/sitescope.js';
import { isPlatformOwner, sameOrg } from '../lib/tenantscope.js';

const CLOSED_STATUSES = new Set(['Terminated', 'Completed', 'Suspended']);

const EXEMPT_WRITE_PATTERNS = [
    /^\/api\/dblock\/\d+\/sign-cra$/,
    /^\/api\/dblock\/\d+\/sign-admin$/,
    /^\/api\/queries\/\d+\/resolve$/,
    /^\/api\/monitoring\/\d+\/acknowledge$/,
    /^\/api\/export\//,
];

export async function requireStudy(req, res, next) {
    const raw = req.headers['x-study-id'];
    if (!raw) return res.status(400).json({ error: 'X-Study-ID header is required' });

    const id = Number(raw);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid study ID' });

    try {
        const [study] = await db.select({ id: studies.id, status: studies.status, organizationId: studies.organizationId })
            .from(studies).where(eq(studies.id, id));
        if (!study) return res.status(404).json({ error: 'Study not found' });

        // TENANT BOUNDARY: the study must belong to the caller's organization.
        // Cross-tenant → 404 (never reveal that another tenant's study exists).
        // This replaces the old blanket admin bypass — admin is now org-scoped.
        if (!sameOrg(req, study.organizationId)) {
            return res.status(404).json({ error: 'Study not found' });
        }

        // Within the org: admin (and platform_owner) reach any study; other
        // roles must be explicitly assigned to it.
        if (req.user.role !== 'admin' && !isPlatformOwner(req.user)) {
            const [assignment] = await db.select({ id: studyUsers.id })
                .from(studyUsers)
                .where(and(eq(studyUsers.studyId, id), eq(studyUsers.userId, req.user.id)));
            if (!assignment) {
                return res.status(403).json({ error: 'You are not assigned to this study' });
            }
        }

        req.studyId     = id;
        req.studyStatus = study.status;

        // Site-level isolation: PI/investigator/CRC are limited to their
        // assigned sites' subjects (null = unscoped). Routes consume this via
        // lib/sitescope.js siteCondition()/subjectInSiteScope().
        req.siteScope = await computeSiteScope(req.user, id);

        if (req.method !== 'GET') {
            const url = req.originalUrl.split('?')[0];
            const isExempt = EXEMPT_WRITE_PATTERNS.some(p => p.test(url));
            if (!isExempt) {
                if (CLOSED_STATUSES.has(study.status)) {
                    return res.status(423).json({
                        error: `Study is ${study.status}. Data modifications are not permitted.`,
                        studyStatus: study.status,
                    });
                }
                // ICH GCP E6(R3) §5.5.7 — enforce database lock
                const [lock] = await db
                    .select({ status: studyDbLock.status })
                    .from(studyDbLock)
                    .where(and(eq(studyDbLock.studyId, id), eq(studyDbLock.status, 'Locked')))
                    .limit(1);
                if (lock) {
                    return res.status(423).json({
                        error: 'Database is locked. No data modifications are permitted (ICH GCP E6(R3) §5.5.7).',
                        dbLocked: true,
                    });
                }
            }
        }

        next();
    } catch (err) {
        // TODO: Return a generic server error with a support reference instead of exposing raw database errors.
        res.status(500).json({ error: err.message });
    }
}
````

## `src/backend/routes/mfa.js`

````javascript
import { Router } from 'express';
import crypto from 'node:crypto';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin, generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { verifyPassword, hashPassword } from '@better-auth/utils/password';
import { client, db } from '../db/connection.js';
import { POLICY } from '../lib/passwordpolicy.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitAuth } from '../middleware/ratelimit.js';
import { writeAudit } from '../lib/audit.js';
import { asyncRoute, validCredentials } from '../lib/http-security.js';
import { encryptSecret, decryptSecret, backupDigest, tokenDigest, equalDigest, credentialFingerprint } from '../lib/security-crypto.js';
import { createSession, setSessionCookie, clearSessionCookie, readSessionToken } from '../lib/session.js';

const router = Router();
const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
// Match password verification cost for unknown users without storing any credential.
let dummyHash;
const codeIsValidInput = code => typeof code === 'string' && /^[a-zA-Z0-9\s]{6,24}$/.test(code);
const validateLoginInput = (req, res, next) => validCredentials(req.body)
    ? next()
    : res.status(400).json({ error: 'Invalid email or password format.' });
const validateChallengeInput = (req, res, next) => {
    const { tempToken, totpCode } = req.body ?? {};
    return typeof tempToken === 'string' && /^[a-f0-9]{64}$/.test(tempToken) && codeIsValidInput(totpCode)
        ? next()
        : res.status(400).json({ error: 'Invalid verification input.' });
};

function jsonArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function lockEmail(tx, email) {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 19))`;
}

async function recordFailure(tx, email, userId, ip) {
    await tx`INSERT INTO login_attempts (email, ip_address, success) VALUES (${email}, ${ip || 'unknown'}, FALSE)`;
    const [row] = await tx`
        INSERT INTO account_locks (user_id, email, failed_count, unlocked_at) VALUES (${userId}, ${email}, 1, NOW())
        ON CONFLICT (email) DO UPDATE SET failed_count = account_locks.failed_count + 1,
            user_id = COALESCE(EXCLUDED.user_id, account_locks.user_id)
        RETURNING id, failed_count
    `;
    if (row.failed_count >= POLICY.maxFailedAttempts) {
        await tx`UPDATE account_locks SET locked_at = NOW(), unlocked_at = NULL,
            unlocked_by = NULL, unlock_reason = NULL,
            auto_unlock_at = ${new Date(Date.now() + POLICY.lockoutMinutes * 60000).toISOString()} WHERE id = ${row.id}`;
    }
}

async function resetFailures(tx, email, ip) {
    await tx`UPDATE account_locks SET failed_count = 0, auto_unlock_at = NULL,
        unlocked_at = NOW(), unlock_reason = 'Successful authentication' WHERE email = ${email}`;
    await tx`INSERT INTO login_attempts (email, ip_address, success) VALUES (${email}, ${ip || 'unknown'}, TRUE)`;
}

async function checkAccount(tx, userId) {
    const [user] = await tx`SELECT u.*, o.status AS org_status FROM "user" u
        LEFT JOIN organizations o ON o.id = u.organization_id WHERE u.id = ${userId} FOR UPDATE OF u`;
    if (!user || !user.is_active || !user.email_verified ||
        (user.role !== 'platform_owner' && user.org_status !== 'Active')) return null;
    const [lock] = await tx`SELECT * FROM account_locks WHERE email = ${user.email}`;
    if (lock?.locked_at && !lock.unlocked_at && (!lock.auto_unlock_at || new Date(lock.auto_unlock_at) > new Date())) return null;
    return user;
}

function publicUser(user) {
    return { id: user.id, name: user.name, displayName: user.display_name ?? null, role: user.role };
}

async function verifyTotp(code, row) {
    if (!codeIsValidInput(code)) return false;
    const secret = decryptSecret(row.secret, row.user_id); // decryption/configuration failures must propagate
    try { return (await totp.verify(code.replace(/\s/g, ''), { secret })).valid; }
    catch { return false; }
}

async function loginAudit(store, user, req, reason) {
    await writeAudit(store, {
        tableName: 'user', recordId: user.id, action: 'LOGIN', reason,
        user: { ...user, organizationId: user.organization_id }, ipAddress: req.ip,
    });
}

router.post('/initiate', validateLoginInput, rateLimitAuth, asyncRoute(async (req, res) => {
    const email = req.body.email.trim().toLowerCase();
    const result = await client.begin(async tx => {
        await lockEmail(tx, email);
        const [record] = await tx`SELECT u.id, a.password FROM "user" u JOIN account a ON a.user_id = u.id
            AND a.provider_id = 'credential' WHERE u.email = ${email}`;
        const [lock] = await tx`SELECT * FROM account_locks WHERE email = ${email}`;
        if (lock?.locked_at && !lock.unlocked_at) {
            if (!lock.auto_unlock_at || new Date(lock.auto_unlock_at) > new Date()) return { locked: true };
            await tx`UPDATE account_locks SET failed_count = 0, unlocked_at = NOW(), auto_unlock_at = NULL WHERE id = ${lock.id}`;
        }
        dummyHash ??= hashPassword(crypto.randomBytes(32).toString('hex'));
        const valid = await verifyPassword(record?.password || await dummyHash, req.body.password);
        if (!record || !valid) {
            await recordFailure(tx, email, record?.id ?? null, req.ip);
            return { invalid: true };
        }
        const user = await checkAccount(tx, record.id);
        if (!user) return { invalid: true };
        // Lock/read the current credential again to detect a concurrent password change.
        const [current] = await tx`SELECT password FROM account WHERE user_id = ${user.id} AND provider_id = 'credential'`;
        if (current?.password !== record.password) return { invalid: true };
        const [mfa] = await tx`SELECT * FROM user_totp WHERE user_id = ${user.id}`;
        if (mfa?.is_enabled) {
            decryptSecret(mfa.secret, user.id); // fail closed until legacy secrets have been migrated
            const tempToken = crypto.randomBytes(32).toString('hex');
            await tx`DELETE FROM verification WHERE identifier = ${`mfa:${user.id}`}`;
            await tx`INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at)
                VALUES (${tokenDigest(tempToken)}, ${`mfa:${user.id}`},
                    ${JSON.stringify({ userId: user.id, email, credential: credentialFingerprint(current.password), secretVersion: tokenDigest(mfa.secret), attempts: 0 })},
                    ${new Date(Date.now() + 10 * 60000).toISOString()}, NOW(), NOW())`;
            return { tempToken };
        }
        const token = await createSession(tx, user.id, req);
        await resetFailures(tx, email, req.ip);
        await loginAudit(tx, user, req, 'Successful login');
        return { token, user };
    });
    if (result.locked) return res.status(423).json({ error: 'Account temporarily locked.' });
    if (result.invalid) return res.status(401).json({ error: 'Invalid email or password.' });
    if (result.tempToken) return res.json({ status: 'totp_required', tempToken: result.tempToken });
    setSessionCookie(res, result.token);
    res.json({ status: 'authenticated', user: publicUser(result.user) });
}));

router.post('/totp-verify', validateChallengeInput, rateLimitAuth, asyncRoute(async (req, res) => {
    const { tempToken, totpCode } = req.body ?? {};
    const id = tokenDigest(tempToken);
    const result = await client.begin(async tx => {
        // Resolve only this indexed challenge; never scan all verification records.
        const [preview] = await tx`SELECT value FROM verification WHERE id = ${id} AND expires_at > NOW()`;
        if (!preview) return null;
        const context = JSON.parse(preview.value);
        await lockEmail(tx, context.email);
        const user = await checkAccount(tx, context.userId);
        if (!user) return null;
        const [challenge] = await tx`SELECT * FROM verification WHERE id = ${id} AND identifier = ${`mfa:${user.id}`}
            AND expires_at > NOW() FOR UPDATE`;
        if (!challenge) return null;
        const data = JSON.parse(challenge.value);
        const [credential] = await tx`SELECT password FROM account WHERE user_id = ${user.id} AND provider_id = 'credential'`;
        const [mfa] = await tx`SELECT * FROM user_totp WHERE user_id = ${user.id} FOR UPDATE`;
        if (data.attempts >= 5 || !credential || !mfa?.is_enabled ||
            !equalDigest(data.credential, credentialFingerprint(credential.password)) ||
            !equalDigest(data.secretVersion, tokenDigest(mfa.secret))) return null;
        let valid = await verifyTotp(totpCode, mfa);
        if (!valid) {
            const codes = jsonArray(mfa.backup_codes);
            const digest = backupDigest(totpCode, user.id);
            const match = codes.find(code => !code.used && equalDigest(code.digest, digest));
            if (match) {
                match.used = true;
                await tx`UPDATE user_totp SET backup_codes = ${JSON.stringify(codes)} WHERE user_id = ${user.id}`;
                valid = true;
            }
        }
        if (!valid) {
            data.attempts++;
            await tx`UPDATE verification SET value = ${JSON.stringify(data)} WHERE id = ${id}`;
            await recordFailure(tx, user.email, user.id, req.ip);
            return null;
        }
        await tx`DELETE FROM verification WHERE id = ${id}`;
        await resetFailures(tx, user.email, req.ip);
        const token = await createSession(tx, user.id, req);
        await loginAudit(tx, user, req, 'Successful login (TOTP verified)');
        return { token, user };
    });
    if (!result) return res.status(401).json({ error: 'Invalid or expired verification.' });
    setSessionCookie(res, result.token);
    res.json({ user: publicUser(result.user) });
}));

router.get('/totp/status', requireAuth, asyncRoute(async (req, res) => {
    const [row] = await client`SELECT * FROM user_totp WHERE user_id = ${req.user.id}`;
    res.json({ enabled: !!row?.is_enabled, enabledAt: row?.enabled_at ?? null,
        backupCodesRemaining: jsonArray(row?.backup_codes).filter(code => !code.used).length });
}));

router.post('/totp/setup', requireAuth, asyncRoute(async (req, res) => {
    const secret = generateSecret();
    const encrypted = encryptSecret(secret, req.user.id);
    const result = await client.begin(async tx => {
        await tx`SELECT id FROM "user" WHERE id = ${req.user.id} FOR UPDATE`;
        const [row] = await tx`INSERT INTO user_totp (user_id, secret, is_enabled)
            VALUES (${req.user.id}, ${encrypted}, FALSE)
            ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret, backup_codes = '[]', enabled_at = NULL
            WHERE user_totp.is_enabled = FALSE RETURNING id`;
        return row;
    });
    if (!result) return res.status(409).json({ error: 'Verify and disable the existing authenticator before replacing it.' });
    const otpauthUrl = generateURI({ type: 'totp', label: req.user.email, secret, issuer: 'E-CRF System' });
    res.json({ secret, otpauthUrl, qrDataUrl: await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 2 }) });
}));

router.post('/totp/enable', requireAuth, asyncRoute(async (req, res) => {
    if (!codeIsValidInput(req.body?.totpCode)) return res.status(400).json({ error: 'Invalid code.' });
    const result = await client.begin(async tx => {
        await tx`SELECT id FROM "user" WHERE id = ${req.user.id} FOR UPDATE`;
        const [row] = await tx`SELECT * FROM user_totp WHERE user_id = ${req.user.id} FOR UPDATE`;
        if (!row || row.is_enabled || !await verifyTotp(req.body.totpCode, row)) return null;
        const codes = Array.from({ length: 8 }, () => crypto.randomBytes(10).toString('hex').toUpperCase());
        await tx`UPDATE user_totp SET is_enabled = TRUE, enabled_at = NOW(),
            backup_codes = ${JSON.stringify(codes.map(code => ({ digest: backupDigest(code, req.user.id), used: false })))}
            WHERE user_id = ${req.user.id}`;
        await tx`DELETE FROM session WHERE user_id = ${req.user.id} AND token <> ${req.authTokenHash}`;
        await tx`DELETE FROM verification WHERE identifier = ${`mfa:${req.user.id}`}`;
        await writeAudit(tx, { tableName: 'user_totp', recordId: row.id, action: 'UPDATE',
            fieldName: 'is_enabled', newValue: 'true', reason: 'Enabled TOTP', user: req.user, ipAddress: req.ip });
        return { id: row.id, codes };
    });
    if (!result) return res.status(400).json({ error: 'Invalid code or authenticator already enabled.' });
    res.json({ enabled: true, backupCodes: result.codes });
}));

router.delete('/totp/disable', requireAuth, asyncRoute(async (req, res) => {
    if (!codeIsValidInput(req.body?.totpCode)) return res.status(400).json({ error: 'Invalid code.' });
    const row = await client.begin(async tx => {
        await tx`SELECT id FROM "user" WHERE id = ${req.user.id} FOR UPDATE`;
        const [mfa] = await tx`SELECT * FROM user_totp WHERE user_id = ${req.user.id} FOR UPDATE`;
        if (!mfa?.is_enabled || !await verifyTotp(req.body.totpCode, mfa)) return null;
        await tx`DELETE FROM user_totp WHERE user_id = ${req.user.id}`;
        await tx`DELETE FROM verification WHERE identifier = ${`mfa:${req.user.id}`}`;
        await tx`DELETE FROM session WHERE user_id = ${req.user.id} AND token <> ${req.authTokenHash}`;
        await writeAudit(tx, { tableName: 'user_totp', recordId: mfa.id, action: 'UPDATE',
            fieldName: 'is_enabled', newValue: 'false', reason: 'Disabled TOTP', user: req.user, ipAddress: req.ip });
        return mfa;
    });
    if (!row) return res.status(401).json({ error: 'Invalid code or authenticator disabled.' });
    res.json({ enabled: false });
}));

for (const path of ['/verify', '/direct-login', '/resend']) {
    router.post(path, (_req, res) => res.status(410).json({ error: 'Use /api/mfa/initiate and /api/mfa/totp-verify.' }));
}

// Logout also works for locked/deactivated users, and is idempotent.
export const logout = asyncRoute(async (req, res) => {
    const token = readSessionToken(req);
    if (token) {
        const rows = await client`DELETE FROM session WHERE token = ${tokenDigest(token)} RETURNING user_id`;
        if (rows.length) {
            try {
                await writeAudit(db, { tableName: 'user', recordId: rows[0].user_id, action: 'LOGOUT',
                    reason: 'Session revoked', user: null, ipAddress: req.ip });
            } catch (error) {
                console.error('Logout audit failed:', error.message);
            }
        }
    }
    clearSessionCookie(res);
    res.json({ ok: true });
});
router.post('/logout', logout);

export default router;
````

## `src/backend/routes/randomization.js`

````javascript
import { siteCondition } from '../lib/sitescope.js';
import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { randomizationList, subjectRandomization, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { isUniqueViolation } from '../lib/dberrors.js';
import {
    BLINDED_LABEL, maskTreatmentArms, validateRandList, normalizeRandList,
    canRandomize, canUnblind, noSlotError, randomizationStats,
} from '../lib/randomrules.js';

const router = Router();

// GET /api/randomization/list — view the randomization list (admin only, shows arms)
router.get('/list', requireRole('admin'), async (req, res) => {
    try {
        const rows = await db.select().from(randomizationList)
            .where(eq(randomizationList.studyId, req.studyId))
            .orderBy(randomizationList.id);
        res.json(rows);
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/randomization/list — upload randomization list (admin only)
// Body: { entries: [{ randCode, treatmentArm, stratum }] }
router.post('/list', requireRole('admin'), async (req, res) => {
    try {
        const { entries } = req.body;
        const guard = validateRandList(entries);
        if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

        const values = normalizeRandList(entries).map(e => ({
            ...e,
            studyId:    req.studyId,
            uploadedBy: req.user.id,
        }));

        const inserted = await db.transaction(async tx => {
            const rows = await tx.insert(randomizationList).values(values).returning();
            await writeAudit(tx, {
                tableName: 'randomization_list', recordId: 0, action: 'INSERT',
                newValue: `${rows.length} codes uploaded`,
                reason: 'Randomization list uploaded by admin',
                user: req.user, ipAddress: req.ip,
            });
            return rows;
        });

        res.status(201).json({ uploaded: inserted.length, total: entries.length });
    } catch (err) {
        if (isUniqueViolation(err)) {
            return res.status(409).json({ error: 'One or more randomization codes already exist in this study.' });
        }
        // TODO: Return a generic server error with a support reference instead of exposing raw database errors.
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/randomization — get assignment for ?subjectId= or all assignments
router.get('/', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const conditions = [eq(subjects.studyId, req.studyId), siteCondition(req)];
        if (subjectId) {
            const sid = Number(subjectId);
            if (!Number.isSafeInteger(sid) || sid <= 0) {
                return res.status(400).json({ error: 'Invalid subjectId' });
            }
            conditions.push(eq(subjectRandomization.subjectId, sid));
        }

        const rows = await db
            .select({
                id:               subjectRandomization.id,
                subjectId:        subjectRandomization.subjectId,
                subjectCode:      subjects.subjectCode,
                randCode:         subjectRandomization.randCode,
                treatmentArm:     subjectRandomization.treatmentArm,
                stratum:          subjectRandomization.stratum,
                isBlinded:        subjectRandomization.isBlinded,
                unblindedAt:      subjectRandomization.unblindedAt,
                unblindReason:    subjectRandomization.unblindReason,
                randomizedAt:     subjectRandomization.randomizedAt,
                randomizedByName: subjectRandomization.randomizedByName,
            })
            .from(subjectRandomization)
            .leftJoin(subjects, eq(subjectRandomization.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(subjectRandomization.randomizedAt);

        // Blind treatment arm for non-admin users
        res.json(maskTreatmentArms(rows, req.user.role));
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/randomization — assign next available slot to a subject (admin, investigator)
router.post('/', requireRole('admin', 'investigator', 'pi'), async (req, res) => {
    try {
        const { subjectId, stratum } = req.body;
        if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });

        const sid = Number(subjectId);
        if (!Number.isSafeInteger(sid) || sid <= 0) {
            return res.status(400).json({ error: 'Invalid subjectId' });
        }

        const assignment = await db.transaction(async tx => {
            // Check subject exists in this study, is at the caller's site, and is Active
            const [subject] = await tx.select().from(subjects)
                .where(and(eq(subjects.id, sid), eq(subjects.studyId, req.studyId)))
                .for('update');
            const [existing] = await tx.select().from(subjectRandomization)
                .where(eq(subjectRandomization.subjectId, sid));

            const guard = canRandomize({ subject, existingAssignment: existing, siteScope: req.siteScope });
            if (!guard.ok) throw Object.assign(new Error(guard.error), { status: guard.status });

            // Find next available slot (matching stratum if provided, scoped to study)
            const listConditions = [eq(randomizationList.isUsed, false), eq(randomizationList.studyId, req.studyId)];
            if (stratum) listConditions.push(eq(randomizationList.stratum, stratum));

            const [slot] = await tx.select().from(randomizationList)
                .where(and(...listConditions))
                .orderBy(randomizationList.id)
                .limit(1).for('update', { skipLocked: true });

            if (!slot) throw Object.assign(new Error(noSlotError(stratum)), { status: 409 });

            // Mark slot as used
            await tx.update(randomizationList)
                .set({ isUsed: true })
                .where(eq(randomizationList.id, slot.id));

            // Create assignment
            const [assignment] = await tx.insert(subjectRandomization).values({
                subjectId:        sid,
                randCode:         slot.randCode,
                treatmentArm:     slot.treatmentArm,
                stratum:          slot.stratum ?? null,
                isBlinded:        true,
                randomizedBy:     req.user.id,
                randomizedByName: req.user.name,
            }).returning();

            await writeAudit(tx, {
                tableName: 'subject_randomization', recordId: assignment.id, action: 'INSERT',
                newValue: `Subject ${subject.subjectCode} → Code ${slot.randCode}`,
                reason: 'Subject randomized',
                user: req.user, ipAddress: req.ip,
            });

            return assignment;
        });

        res.status(201).json({
            ...assignment,
            treatmentArm: BLINDED_LABEL, // always blind at creation
        });
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// PATCH /api/randomization/:id/unblind — emergency or final unblinding (admin only)
router.patch('/:id/unblind', requireRole('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'Invalid randomization id' });
        }
        const { reason } = req.body;

        const updated = await db.transaction(async tx => {
            const [locked] = await tx.select({ assignment: subjectRandomization })
                .from(subjectRandomization)
                .innerJoin(subjects, eq(subjectRandomization.subjectId, subjects.id))
                .where(and(
                    eq(subjectRandomization.id, id),
                    eq(subjects.studyId, req.studyId),
                    siteCondition(req),
                ))
                .for('update');

            const guard = canUnblind(locked?.assignment, { reason });
            if (!guard.ok) throw Object.assign(new Error(guard.error), { status: guard.status });

            const [row] = await tx.update(subjectRandomization)
                .set({ isBlinded: false, unblindedAt: new Date(), unblindedBy: req.user.id, unblindReason: reason })
                .where(and(eq(subjectRandomization.id, id), eq(subjectRandomization.isBlinded, true)))
                .returning();
            if (!row) throw Object.assign(new Error('Already unblinded'), { status: 409 });

            await writeAudit(tx, {
                tableName: 'subject_randomization', recordId: id, action: 'UPDATE',
                fieldName: 'is_blinded', oldValue: 'true', newValue: 'false',
                reason: `Unblinding: ${reason}`,
                user: req.user, ipAddress: req.ip,
            });
            return row;
        });

        res.json(updated);
    } catch (err) {
        // TODO: Return a generic server error with a support reference instead of exposing raw database errors.
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/randomization/stats
router.get('/stats', async (req, res) => {
    try {
        const allList = await db.select({ isUsed: randomizationList.isUsed }).from(randomizationList)
            .where(eq(randomizationList.studyId, req.studyId));
        const assignments = await db.select({ isBlinded: subjectRandomization.isBlinded })
            .from(subjectRandomization)
            .leftJoin(subjects, eq(subjectRandomization.subjectId, subjects.id))
            .where(and(eq(subjects.studyId, req.studyId), siteCondition(req)));

        res.json(randomizationStats(allList, assignments));
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

export default router;
````

## `src/backend/routes/security.js`

````javascript
import crypto from 'node:crypto';
import { tokenDigest } from '../lib/security-crypto.js';
import { setSessionCookie } from '../lib/session.js';
// Security management — ICH GCP E6(R3) Appendix C.4.3
// Password change, account lockout management, password expiry status

import { Router } from 'express';
import { eq, desc, and, gt, isNull } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { user, account, accountLocks, loginAttempts, passwordHistory, passwordMeta, session, verification } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { validatePassword, POLICY, checkPasswordExpiry } from '../lib/passwordpolicy.js';
import { verifyPassword, hashPassword } from '@better-auth/utils/password';
import { orgCondition, sameOrg } from '../lib/tenantscope.js';

const router = Router();

// TENANT BOUNDARY: /unlock/:userId and /force-password-reset/:userId target a
// user by id — reject any user outside the caller's organization (404).
router.param('userId', async (req, res, next, userId) => {
    try {
        const [target] = await db.select({ organizationId: user.organizationId }).from(user)
            .where(eq(user.id, userId));
        if (!target || !sameOrg(req, target.organizationId)) {
            return res.status(404).json({ error: 'User not found' });
        }
        next();
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/security/password-status — check expiry for current user
router.get('/password-status', async (req, res) => {
    try {
        let [meta] = await db.select().from(passwordMeta)
            .where(eq(passwordMeta.userId, req.user.id));
        // Auto-initialize for accounts created before password_meta existed
        if (!meta) {
            const now = new Date();
            await db.insert(passwordMeta)
                .values({ userId: req.user.id, lastChangedAt: now, mustChange: false })
                .onConflictDoNothing();
            meta = { lastChangedAt: now, mustChange: false };
        }
        const expiry = checkPasswordExpiry(meta.lastChangedAt);
        res.json({
            lastChangedAt: meta.lastChangedAt,
            mustChange:    meta.mustChange,
            ...expiry,
            policy: {
                minLength:   POLICY.minLength,
                expiryDays:  POLICY.expiryDays,
                historyCount: POLICY.historyCount,
            },
        });
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/security/change-password — self-service password change
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 256 || typeof newPassword !== 'string' || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }

        // Validate new password against policy
        const policyErrors = validatePassword(newPassword, req.user.email);
        if (policyErrors.length > 0) {
            return res.status(400).json({ error: 'Password does not meet policy requirements', details: policyErrors });
        }

        const replacementToken = 'v1.' + crypto.randomBytes(32).toString('hex');
        await db.transaction(async tx => {
            await tx.select({ id: user.id }).from(user).where(eq(user.id, req.user.id)).for('update');
            const [active] = await tx.select({ id: session.id }).from(session)
                .where(and(eq(session.userId, req.user.id), eq(session.token, req.authTokenHash)));
            if (!active) throw Object.assign(new Error('Session expired'), { status: 401 });
            // Verify current password
            const [acct] = await tx.select({ password: account.password }).from(account)
                .where(and(eq(account.userId, req.user.id), eq(account.providerId, 'credential')));
            if (!acct?.password) throw Object.assign(new Error('No credential account found'), { status: 400 });

            const valid = await verifyPassword(acct.password, currentPassword);
            if (!valid) throw Object.assign(new Error('Current password is incorrect'), { status: 401 });
            if (await verifyPassword(acct.password, newPassword)) {
                throw Object.assign(new Error('New password must differ from the current password'), { status: 400 });
            }

            // Check password history
            const history = await tx.select({ passwordHash: passwordHistory.passwordHash })
                .from(passwordHistory)
                .where(eq(passwordHistory.userId, req.user.id))
                .orderBy(desc(passwordHistory.createdAt))
                .limit(POLICY.historyCount);

            for (const h of history) {
                if (await verifyPassword(h.passwordHash, newPassword)) {
                    throw Object.assign(new Error('Cannot reuse a recent password'), { status: 400 });
                }
            }

            // Password history stores prior hashes. Older versions stored the
            // new/current hash, so avoid inserting a duplicate during rollout.
            if (!history.some(h => h.passwordHash === acct.password)) {
                await tx.insert(passwordHistory).values({
                    userId: req.user.id,
                    passwordHash: acct.password,
                });
            }

            // Hash and update password
            const newHash = await hashPassword(newPassword);
            await tx.update(account)
                .set({ password: newHash, updatedAt: new Date() })
                .where(and(eq(account.userId, req.user.id), eq(account.providerId, 'credential')));

            // Trim history to last N
            const allHistory = await tx.select({ id: passwordHistory.id })
                .from(passwordHistory)
                .where(eq(passwordHistory.userId, req.user.id))
                .orderBy(desc(passwordHistory.createdAt));
            if (allHistory.length > POLICY.historyCount) {
                const toDelete = allHistory.slice(POLICY.historyCount).map(h => h.id);
                for (const id of toDelete) {
                    await tx.delete(passwordHistory).where(eq(passwordHistory.id, id));
                }
            }

            // Update password meta
            await tx.insert(passwordMeta)
                .values({ userId: req.user.id, lastChangedAt: new Date(), mustChange: false })
                .onConflictDoUpdate({
                    target: passwordMeta.userId,
                    set: { lastChangedAt: new Date(), mustChange: false },
                });

            await writeAudit(tx, {
                tableName: 'account', recordId: req.user.id, action: 'UPDATE',
                fieldName: 'password', newValue: '*** changed ***',
                reason: 'Self-service password change (ICH E6(R3) C.4.3)',
                user: req.user, ipAddress: req.ip,
            });

            await tx.delete(session).where(eq(session.userId, req.user.id));
            await tx.insert(session).values({ id: crypto.randomUUID(), userId: req.user.id,
                token: tokenDigest(replacementToken), expiresAt: req.sessionExpiresAt });
            await tx.delete(verification).where(eq(verification.identifier, 'mfa:' + req.user.id));
        });
        setSessionCookie(res, replacementToken);
        res.json({ ok: true, message: 'Password changed successfully' });
    } catch (err) {
        // TODO: Return a generic server error with a support reference instead of exposing raw database errors.
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/security/locked-accounts — list locked accounts (admin only)
router.get('/locked-accounts', requireRole('admin'), async (req, res) => {
    try {
        const now = new Date();
        // Org-scoped: only locks for users in the caller's organization.
        // account_locks has no org column, so resolve tenancy through the user
        // (by id or email). NULL orgId = platform_owner global → all locks.
        const orgId = req.orgId ?? null;
        const locks = await client`
            SELECT al.id, al.user_id AS "userId", al.email, al.failed_count AS "failedCount",
                   al.locked_at AS "lockedAt", al.auto_unlock_at AS "autoUnlockAt",
                   al.unlocked_at AS "unlockedAt", al.unlock_reason AS "unlockReason"
            FROM account_locks al
            LEFT JOIN "user" u ON (u.id = al.user_id OR lower(u.email) = lower(al.email))
            WHERE al.unlocked_at IS NULL
              AND (${orgId}::int IS NULL OR u.organization_id = ${orgId})
            ORDER BY al.locked_at DESC`;

        // Separate still-locked from auto-unlocked
        const active = locks.filter(l => !l.autoUnlockAt || new Date(l.autoUnlockAt) > now);
        res.json(active);
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/security/unlock/:userId — admin manually unlocks a user account
router.post('/unlock/:userId', requireRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason }  = req.body;
        if (!reason) return res.status(400).json({ error: 'Unlock reason is required' });

        const [lock] = await db.select().from(accountLocks)
            .where(and(eq(accountLocks.userId, userId), isNull(accountLocks.unlockedAt)));
        if (!lock) return res.status(404).json({ error: 'No active lock found for this user' });

        await db.update(accountLocks)
            .set({ unlockedAt: new Date(), unlockedBy: req.user.id, unlockReason: reason, failedCount: 0, autoUnlockAt: null })
            .where(eq(accountLocks.id, lock.id));

        await writeAudit(db, {
            tableName: 'account_locks', recordId: lock.id, action: 'UPDATE',
            fieldName: 'unlocked_at', newValue: new Date().toISOString(),
            reason: `Admin manual unlock: ${reason}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true });
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/security/force-password-reset/:userId — admin forces password reset on next login
router.post('/force-password-reset/:userId', requireRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;

        await db.insert(passwordMeta)
            .values({ userId, lastChangedAt: new Date(0), mustChange: true })
            .onConflictDoUpdate({
                target: passwordMeta.userId,
                set: { mustChange: true },
            });

        await writeAudit(db, {
            tableName: 'password_meta', recordId: userId, action: 'UPDATE',
            fieldName: 'must_change', newValue: 'true',
            reason: 'Admin-initiated forced password reset',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true });
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/security/users — all users with lock/expiry status (admin only)
router.get('/users', requireRole('admin'), async (req, res) => {
    try {
        const now = new Date();
        const [users, locks, metas] = await Promise.all([
            // Org-scoped: only the caller's organization's users.
            db.select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
              .from(user).where(orgCondition(req, user.organizationId)),
            db.select().from(accountLocks).where(isNull(accountLocks.unlockedAt)),
            db.select().from(passwordMeta),
        ]);

        const lockMap = new Map(locks.map(l => [l.userId, l]));
        const metaMap = new Map(metas.map(m => [m.userId, m]));

        const enriched = users.map(u => {
            const lock = lockMap.get(u.id);
            const meta = metaMap.get(u.id);
            const expiry = checkPasswordExpiry(meta?.lastChangedAt ?? null);
            const isLocked = lock && (!lock.autoUnlockAt || new Date(lock.autoUnlockAt) > now);

            return {
                ...u,
                isLocked,
                failedAttempts:  lock?.failedCount  ?? 0,
                lockedAt:        lock?.lockedAt      ?? null,
                autoUnlockAt:    lock?.autoUnlockAt  ?? null,
                passwordExpired: expiry.expired,
                passwordDaysLeft: expiry.daysLeft,
                passwordWarn:    expiry.warningSoon,
                mustChangePassword: meta?.mustChange ?? false,
                lastPasswordChange: meta?.lastChangedAt ?? null,
            };
        });

        res.json(enriched);
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// DELETE /api/security/users/:userId — REMOVED. It deleted active users
// directly, bypassing the deactivate-first control and the related-row cleanup
// that DELETE /api/users/:id performs. Use that route instead.

// GET /api/security/login-activity?email= — recent login attempts (admin only)
router.get('/login-activity', requireRole('admin'), async (req, res) => {
    try {
        const { email } = req.query;
        // Login activity may only be queried for a user in the caller's org.
        // Require an explicit email and verify it belongs to the org, otherwise
        // this endpoint would expose every tenant's login history.
        if (!email) return res.status(400).json({ error: 'email query parameter is required' });
        const [target] = await db.select({ organizationId: user.organizationId }).from(user)
            .where(eq(user.email, email.toLowerCase()));
        if (!target || !sameOrg(req, target.organizationId)) {
            return res.json([]);
        }
        const rows = await db.select().from(loginAttempts)
            .where(eq(loginAttempts.email, email.toLowerCase()))
            .orderBy(desc(loginAttempts.attemptedAt))
            .limit(100);
        res.json(rows);
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

export default router;
````

## `src/backend/server.js`

````javascript
import { safeErrorResponses, apiErrorHandler } from './middleware/errors.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { trustedOrigins, checkOrigin } from './lib/http-security.js';
import { migrateSecurity } from './lib/security-migration.js';
import { requireAuth } from './middleware/auth.js';
import { client } from './db/connection.js';

import subjectsRouter      from './routes/subjects.js';
import visitsRouter        from './routes/visits.js';
import formsRouter         from './routes/forms.js';
import entriesRouter       from './routes/entries.js';
import importRouter        from './routes/import.js';
import auditRouter         from './routes/audit.js';
import queriesRouter       from './routes/queries.js';
import mfaRouter, { logout } from './routes/mfa.js';
import registerRouter      from './routes/register.js';
import signupRouter        from './routes/signup.js';
import organizationsRouter from './routes/organizations.js';
import billingRouter, { handleBillingWebhook } from './routes/billing.js';
import sitesRouter         from './routes/sites.js';
import dashboardRouter     from './routes/dashboard.js';
import signaturesRouter    from './routes/signatures.js';
import adverseEventsRouter from './routes/adverseevents.js';
import deviationsRouter    from './routes/deviations.js';
import consentsRouter      from './routes/consents.js';
import randomizationRouter from './routes/randomization.js';
import exportRouter        from './routes/export.js';
import securityRouter      from './routes/security.js';
import dblockRouter        from './routes/dblock.js';
import delegationRouter    from './routes/delegation.js';
import saeReportsRouter    from './routes/saereports.js';
import monitoringRouter    from './routes/monitoring.js';
import studiesRouter         from './routes/studies.js';
import visitTemplatesRouter  from './routes/visittemplates.js';
import userMgmtRouter        from './routes/usermgmt.js';
import notificationsRouter   from './routes/notifications.js';
// Phase 1 — Core Clinical Modules
import medHistoryRouter      from './routes/medhistory.js';
import conMedsRouter         from './routes/conmeds.js';
import vitalSignsRouter      from './routes/vitalsigns.js';
import labRouter             from './routes/lab.js';
// Phase 2 — Regulatory & Quality
import amendmentsRouter      from './routes/amendments.js';
import bdReviewRouter        from './routes/bdreview.js';
// Phase 3 — Quality Management & Validation
import qtlRouter             from './routes/qtl.js';
import sysValRouter          from './routes/sysval.js';
// ICH E6(R3) Gap Closure
import screeningRouter       from './routes/screening.js';
import ipDispensingRouter    from './routes/ipdispensing.js';
import essentialDocsRouter   from './routes/essentialdocs.js';
import agreementsRouter      from './routes/agreements.js';
import monitoringPlanRouter  from './routes/monitoringplan.js';
import reportRouter          from './routes/report.js';
import accessReviewRouter    from './routes/accessreview.js';
import licenseRouter        from './routes/license.js';
import { requireStudy }      from './middleware/study.js';
import { rateLimitAuth, rateLimitTenant } from './middleware/ratelimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir   = path.resolve(__dirname, '../../');

// ── Startup migration: add extended visit columns if missing ──
async function runMigrations() {
    const stmts = [
        // Visit extended columns
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_order integer`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_type text DEFAULT 'Scheduled'`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS planned_date text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS actual_date text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS window_days integer`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS study_day integer`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS window_compliance text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS missed_reason text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS created_by_name text`,
        // Feature: site-scoped user access
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS site_id integer`,
        // Feature: electronic signature — add 'Signed' enum value
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='Signed' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='entry_status')) THEN ALTER TYPE entry_status ADD VALUE 'Signed'; END IF; END $$`,
        // Feature: electronic signatures table
        `CREATE TABLE IF NOT EXISTS esignatures (
            id         SERIAL PRIMARY KEY,
            entry_id   INTEGER REFERENCES crf_data_entries(id) ON DELETE CASCADE,
            user_id    TEXT REFERENCES "user"(id),
            user_name  TEXT,
            user_role  TEXT,
            meaning    TEXT NOT NULL,
            ip_address TEXT,
            signed_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Feature: inclusion/exclusion assessments table
        `CREATE TABLE IF NOT EXISTS ie_assessments (
            id               SERIAL PRIMARY KEY,
            subject_id       INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
            criteria_json    JSONB NOT NULL DEFAULT '[]',
            passed           BOOLEAN NOT NULL,
            assessed_by      TEXT REFERENCES "user"(id),
            assessed_by_name TEXT,
            assessed_at      TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Performance: index for audit trail ORDER BY created_at DESC
        `CREATE INDEX IF NOT EXISTS idx_audit_trails_created_at ON audit_trails (created_at DESC)`,
        // Performance: index for queries by status (dashboard open count)
        `CREATE INDEX IF NOT EXISTS idx_queries_status ON queries (status)`,
        // Performance: index for subjects by status (dashboard active count)
        `CREATE INDEX IF NOT EXISTS idx_subjects_status ON subjects (status)`,
        // Gender identity column (FDA 2023 / ICH E3). Migration 0002 adds this,
        // but the drizzle journal only registers 0000/0001, so migrate() skips it
        // on a fresh install — add it idempotently here so every DB (fresh or
        // existing) has the column the subjects query selects.
        `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS gender_identity varchar(50)`,
        // Tier 1 — Adverse Events / SAE
        `CREATE TABLE IF NOT EXISTS adverse_events (
            id                        SERIAL PRIMARY KEY,
            subject_id                INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            ae_term                   TEXT NOT NULL,
            meddra_pt                 TEXT,
            meddra_soc                TEXT,
            onset_date                TEXT,
            resolution_date           TEXT,
            outcome                   TEXT,
            severity                  TEXT NOT NULL,
            is_serious                BOOLEAN NOT NULL DEFAULT FALSE,
            serious_criteria          JSONB NOT NULL DEFAULT '[]',
            causality                 TEXT,
            action_taken              TEXT,
            narrative                 TEXT,
            report_status             TEXT NOT NULL DEFAULT 'Draft',
            reported_to_sponsor_at    TIMESTAMP,
            reported_to_irb_at        TIMESTAMP,
            requires_expedited_report BOOLEAN NOT NULL DEFAULT FALSE,
            expedited_deadline        TIMESTAMP,
            created_by                TEXT REFERENCES "user"(id),
            created_by_name           TEXT,
            created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by                TEXT REFERENCES "user"(id),
            updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ae_subject ON adverse_events (subject_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ae_is_serious ON adverse_events (is_serious)`,
        // Tier 1 — Protocol Deviations
        `CREATE TABLE IF NOT EXISTS protocol_deviations (
            id                 SERIAL PRIMARY KEY,
            subject_id         INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
            deviation_type     TEXT NOT NULL,
            category           TEXT,
            description        TEXT NOT NULL,
            deviation_date     TEXT,
            discovery_date     TEXT,
            root_cause         TEXT,
            impact_on_subject  TEXT,
            capa               TEXT,
            reported_to_irb    BOOLEAN NOT NULL DEFAULT FALSE,
            reported_to_irb_at TIMESTAMP,
            status             TEXT NOT NULL DEFAULT 'Open',
            created_by         TEXT REFERENCES "user"(id),
            created_by_name    TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by         TEXT REFERENCES "user"(id),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_deviations_status ON protocol_deviations (status)`,
        // Tier 1 — Informed Consent (UU PDP)
        `CREATE TABLE IF NOT EXISTS informed_consents (
            id               SERIAL PRIMARY KEY,
            subject_id       INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            consent_version  TEXT NOT NULL,
            consent_date     TEXT NOT NULL,
            consent_type     TEXT NOT NULL DEFAULT 'Initial',
            language         TEXT NOT NULL DEFAULT 'Indonesian',
            witness_name     TEXT,
            notes            TEXT,
            is_withdrawn     BOOLEAN NOT NULL DEFAULT FALSE,
            withdrawn_at     TIMESTAMP,
            withdrawn_reason TEXT,
            created_by       TEXT REFERENCES "user"(id),
            created_by_name  TEXT,
            created_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_consents_subject ON informed_consents (subject_id)`,
        // Tier 1 — Randomization List
        `CREATE TABLE IF NOT EXISTS randomization_list (
            id            SERIAL PRIMARY KEY,
            rand_code     TEXT NOT NULL UNIQUE,
            treatment_arm TEXT NOT NULL,
            stratum       TEXT,
            is_used       BOOLEAN NOT NULL DEFAULT FALSE,
            uploaded_by   TEXT REFERENCES "user"(id),
            uploaded_at   TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Tier 1 — Subject Randomization Assignments
        `CREATE TABLE IF NOT EXISTS subject_randomization (
            id                SERIAL PRIMARY KEY,
            subject_id        INTEGER NOT NULL UNIQUE REFERENCES subjects(id),
            rand_code         TEXT NOT NULL UNIQUE,
            treatment_arm     TEXT NOT NULL,
            stratum           TEXT,
            is_blinded        BOOLEAN NOT NULL DEFAULT TRUE,
            unblinded_at      TIMESTAMP,
            unblinded_by      TEXT REFERENCES "user"(id),
            unblind_reason    TEXT,
            randomized_at     TIMESTAMP NOT NULL DEFAULT NOW(),
            randomized_by     TEXT REFERENCES "user"(id),
            randomized_by_name TEXT
        )`,
        // Tier 2 — Login attempts audit log
        `CREATE TABLE IF NOT EXISTS login_attempts (
            id           SERIAL PRIMARY KEY,
            email        TEXT NOT NULL,
            ip_address   TEXT,
            success      BOOLEAN NOT NULL DEFAULT FALSE,
            attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (email)`,
        `CREATE INDEX IF NOT EXISTS idx_login_attempts_at ON login_attempts (attempted_at DESC)`,
        // Tier 2 — Account lockout
        `CREATE TABLE IF NOT EXISTS account_locks (
            id             SERIAL PRIMARY KEY,
            user_id        TEXT REFERENCES "user"(id),
            email          TEXT NOT NULL UNIQUE,
            failed_count   INTEGER NOT NULL DEFAULT 0,
            locked_at      TIMESTAMP,
            auto_unlock_at TIMESTAMP,
            unlocked_at    TIMESTAMP,
            unlocked_by    TEXT REFERENCES "user"(id),
            unlock_reason  TEXT
        )`,
        // Tier 2 — Password history (prevent reuse)
        `CREATE TABLE IF NOT EXISTS password_history (
            id            SERIAL PRIMARY KEY,
            user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            password_hash TEXT NOT NULL,
            created_at    TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history (user_id)`,
        // Tier 2 — Password metadata (expiry, must-change)
        `CREATE TABLE IF NOT EXISTS password_meta (
            user_id         TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
            last_changed_at TIMESTAMP,
            must_change     BOOLEAN NOT NULL DEFAULT FALSE
        )`,
        // Tier 2 — Study Database Lock workflow
        `CREATE TABLE IF NOT EXISTS study_db_lock (
            id                   SERIAL PRIMARY KEY,
            status               TEXT NOT NULL DEFAULT 'Pending Signatures',
            pre_check_json       JSONB,
            initiated_by         TEXT REFERENCES "user"(id),
            initiated_by_name    TEXT,
            initiated_at         TIMESTAMP,
            cra_signed           BOOLEAN NOT NULL DEFAULT FALSE,
            cra_signed_at        TIMESTAMP,
            cra_signed_by        TEXT REFERENCES "user"(id),
            cra_signed_by_name   TEXT,
            admin_signed         BOOLEAN NOT NULL DEFAULT FALSE,
            admin_signed_at      TIMESTAMP,
            admin_signed_by      TEXT REFERENCES "user"(id),
            admin_signed_by_name TEXT,
            locked_at            TIMESTAMP,
            notes                TEXT,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Tier 2 — Delegation Log
        `CREATE TABLE IF NOT EXISTS delegation_log (
            id               SERIAL PRIMARY KEY,
            user_id          TEXT NOT NULL REFERENCES "user"(id),
            user_name        TEXT NOT NULL,
            user_role        TEXT,
            site_id          INTEGER,
            delegated_tasks  JSONB NOT NULL DEFAULT '[]',
            delegation_start TEXT NOT NULL,          -- "YYYY-MM-DD"; see note in server migrations
            delegation_end   TEXT,
            status           TEXT NOT NULL DEFAULT 'Active',
            signed_at        TIMESTAMP,
            signed_by_name   TEXT,
            notes            TEXT,
            created_by       TEXT REFERENCES "user"(id),
            created_by_name  TEXT,
            created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_delegation_user ON delegation_log (user_id)`,
        // Tier 2 — Training Records
        `CREATE TABLE IF NOT EXISTS training_records (
            id               SERIAL PRIMARY KEY,
            user_id          TEXT NOT NULL REFERENCES "user"(id),
            user_name        TEXT NOT NULL,
            training_type    TEXT NOT NULL,
            training_date    TEXT NOT NULL,          -- "YYYY-MM-DD"
            expiry_date      TEXT,
            certificate_ref  TEXT,
            notes            TEXT,
            recorded_by      TEXT REFERENCES "user"(id),
            recorded_by_name TEXT,
            recorded_at      TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_training_user ON training_records (user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_training_expiry ON training_records (expiry_date)`,
        // Tier 3 — SAE Expedited Reports (ICH E2A §4)
        `CREATE TABLE IF NOT EXISTS sae_reports (
            id                SERIAL PRIMARY KEY,
            ae_id             INTEGER NOT NULL REFERENCES adverse_events(id) ON DELETE CASCADE,
            report_type       TEXT NOT NULL,
            report_number     INTEGER NOT NULL DEFAULT 1,
            day0_date         TEXT NOT NULL,
            deadline_days     INTEGER NOT NULL,
            deadline_date     TIMESTAMP NOT NULL,
            submitted_at      TIMESTAMP,
            submission_ref    TEXT,
            submitted_to      TEXT,
            narrative         TEXT,
            status            TEXT NOT NULL DEFAULT 'Pending',
            submitted_by      TEXT REFERENCES "user"(id),
            submitted_by_name TEXT,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sae_reports_ae ON sae_reports (ae_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sae_reports_status ON sae_reports (status)`,
        // Tier 3 — Monitoring Visits (ICH GCP E6(R3) §5.18)
        `CREATE TABLE IF NOT EXISTS monitoring_visits (
            id                    SERIAL PRIMARY KEY,
            visit_date            TEXT NOT NULL,
            site_id               INTEGER REFERENCES sites(id),
            site_name             TEXT,
            visit_type            TEXT NOT NULL,
            cra_id                TEXT REFERENCES "user"(id),
            cra_name              TEXT NOT NULL,
            findings              TEXT,
            action_items          JSONB DEFAULT '[]',
            subjects_reviewed     JSONB DEFAULT '[]',
            status                TEXT NOT NULL DEFAULT 'Draft',
            submitted_at          TIMESTAMP,
            acknowledged_by       TEXT REFERENCES "user"(id),
            acknowledged_by_name  TEXT,
            acknowledged_at       TIMESTAMP,
            pi_comments           TEXT,
            next_visit_date       TEXT,
            notes                 TEXT,
            created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_monitoring_visits_status ON monitoring_visits (status)`,
        // Tier 3 — SDV Records (Source Data Verification)
        `CREATE TABLE IF NOT EXISTS sdv_records (
            id                   SERIAL PRIMARY KEY,
            monitoring_visit_id  INTEGER NOT NULL REFERENCES monitoring_visits(id) ON DELETE CASCADE,
            subject_id           INTEGER REFERENCES subjects(id),
            subject_code         TEXT NOT NULL,
            visit_id             INTEGER REFERENCES visits(id),
            visit_name           TEXT,
            form_id              INTEGER REFERENCES crf_forms(id),
            form_name            TEXT,
            sdv_status           TEXT NOT NULL DEFAULT 'Not Reviewed',
            discrepancy_note     TEXT,
            verified_by          TEXT REFERENCES "user"(id),
            verified_by_name     TEXT,
            verified_at          TIMESTAMP,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sdv_monitoring ON sdv_records (monitoring_visit_id)`,
        // Tier 4 — Multi-study architecture
        `CREATE TABLE IF NOT EXISTS studies (
            id             INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            title          TEXT NOT NULL,
            protocol_no    TEXT NOT NULL UNIQUE,
            phase          TEXT,
            sponsor        TEXT,
            indication     TEXT,
            status         TEXT NOT NULL DEFAULT 'Active',
            start_date     TEXT,
            end_date       TEXT,
            created_by     TEXT REFERENCES "user"(id),
            created_by_name TEXT,
            created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS study_users (
            id           INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id     INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            assigned_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            assigned_by  TEXT REFERENCES "user"(id),
            UNIQUE(study_id, user_id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_study_users_study ON study_users (study_id)`,
        `CREATE INDEX IF NOT EXISTS idx_study_users_user  ON study_users (user_id)`,
        // Add study_id FK to all clinical tables
        `ALTER TABLE subjects           ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE adverse_events     ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE informed_consents  ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE randomization_list ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        // Randomization codes are protocol/study-local. The legacy constraints
        // made a valid code in one study block the same code in every other study.
        `ALTER TABLE randomization_list DROP CONSTRAINT IF EXISTS randomization_list_rand_code_unique`,
        `CREATE UNIQUE INDEX IF NOT EXISTS randomization_list_study_code_unique
            ON randomization_list (study_id, rand_code)`,
        `ALTER TABLE subject_randomization DROP CONSTRAINT IF EXISTS subject_randomization_rand_code_unique`,
        `ALTER TABLE study_db_lock      ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE delegation_log     ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE training_records   ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE monitoring_visits  ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE queries            ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        // Proper user deactivation flag (replaces emailVerified misuse)
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
        // Feature: user-chosen display name (shown as greeting in header; admin can reset)
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS display_name TEXT`,
        // Tier 5 — Visit Schedule Templates (Form Builder prerequisite)
        `CREATE TABLE IF NOT EXISTS visit_schedule_templates (
            id               SERIAL PRIMARY KEY,
            study_id         INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            name             TEXT NOT NULL,
            description      TEXT,
            is_active        BOOLEAN NOT NULL DEFAULT TRUE,
            created_by       TEXT REFERENCES "user"(id),
            created_by_name  TEXT,
            created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_visit_tmpl_study ON visit_schedule_templates (study_id)`,
        `CREATE TABLE IF NOT EXISTS visit_schedule_items (
            id                  SERIAL PRIMARY KEY,
            template_id         INTEGER NOT NULL REFERENCES visit_schedule_templates(id) ON DELETE CASCADE,
            visit_name          TEXT NOT NULL,
            visit_order         INTEGER NOT NULL,
            visit_type          TEXT NOT NULL DEFAULT 'Scheduled',
            study_day           INTEGER,
            window_days_before  INTEGER NOT NULL DEFAULT 3,
            window_days_after   INTEGER NOT NULL DEFAULT 3,
            form_ids            INTEGER[] NOT NULL DEFAULT '{}',
            is_mandatory        BOOLEAN NOT NULL DEFAULT TRUE,
            notes               TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_visit_items_tmpl ON visit_schedule_items (template_id)`,

        // ── Phase 1: Core Clinical Modules ──────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS medical_history (
            id                       SERIAL PRIMARY KEY,
            study_id                 INTEGER REFERENCES studies(id),
            subject_id               INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            condition                TEXT NOT NULL,
            icd_code                 TEXT,
            icd_version              TEXT DEFAULT 'ICD-10',
            onset_date               TEXT,
            resolution_date          TEXT,
            status                   TEXT NOT NULL DEFAULT 'Active',
            severity                 TEXT,
            is_related_to_indication BOOLEAN NOT NULL DEFAULT FALSE,
            notes                    TEXT,
            created_by               TEXT REFERENCES "user"(id),
            created_by_name          TEXT,
            created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by               TEXT REFERENCES "user"(id),
            updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_mh_subject ON medical_history (subject_id)`,

        `CREATE TABLE IF NOT EXISTS concomitant_meds (
            id             SERIAL PRIMARY KEY,
            study_id       INTEGER REFERENCES studies(id),
            subject_id     INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            drug_name      TEXT NOT NULL,
            who_drug_name  TEXT,
            who_drug_code  TEXT,
            atc_code       TEXT,
            indication     TEXT,
            dose           TEXT,
            dose_unit      TEXT,
            frequency      TEXT,
            route          TEXT,
            start_date     TEXT,
            stop_date      TEXT,
            is_ongoing     BOOLEAN NOT NULL DEFAULT TRUE,
            notes          TEXT,
            created_by     TEXT REFERENCES "user"(id),
            created_by_name TEXT,
            created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by     TEXT REFERENCES "user"(id),
            updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_cm_subject ON concomitant_meds (subject_id)`,

        `CREATE TABLE IF NOT EXISTS vital_signs (
            id                SERIAL PRIMARY KEY,
            study_id          INTEGER REFERENCES studies(id),
            subject_id        INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            visit_id          INTEGER REFERENCES visits(id),
            assessment_date   TEXT NOT NULL,
            assessment_time   TEXT,
            position          TEXT DEFAULT 'Sitting',
            systolic_bp       INTEGER,
            diastolic_bp      INTEGER,
            heart_rate        INTEGER,
            respiratory_rate  INTEGER,
            temperature       TEXT,
            temperature_unit  TEXT DEFAULT 'C',
            weight            TEXT,
            weight_unit       TEXT DEFAULT 'kg',
            height            TEXT,
            height_unit       TEXT DEFAULT 'cm',
            bmi               TEXT,
            oxygen_saturation TEXT,
            notes             TEXT,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by        TEXT REFERENCES "user"(id),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_vs_subject ON vital_signs (subject_id)`,
        `CREATE INDEX IF NOT EXISTS idx_vs_visit   ON vital_signs (visit_id)`,

        `CREATE TABLE IF NOT EXISTS lab_results (
            id                    SERIAL PRIMARY KEY,
            study_id              INTEGER REFERENCES studies(id),
            subject_id            INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            visit_id              INTEGER REFERENCES visits(id),
            panel_name            TEXT,
            test_name             TEXT NOT NULL,
            test_code             TEXT,
            specimen_type         TEXT,
            specimen_collected_at TEXT,
            lab_name              TEXT,
            value_numeric         TEXT,
            value_text            TEXT,
            unit                  TEXT,
            ref_range_low         TEXT,
            ref_range_high        TEXT,
            ref_range_text        TEXT,
            abnormality_flag      TEXT,
            clinical_significance TEXT DEFAULT 'NCS',
            is_abnormal           BOOLEAN NOT NULL DEFAULT FALSE,
            assessed_by           TEXT REFERENCES "user"(id),
            assessed_by_name      TEXT,
            assessment_date       TEXT,
            status                TEXT NOT NULL DEFAULT 'Pending',
            notes                 TEXT,
            created_by            TEXT REFERENCES "user"(id),
            created_by_name       TEXT,
            created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by            TEXT REFERENCES "user"(id),
            updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_lab_subject ON lab_results (subject_id)`,
        `CREATE INDEX IF NOT EXISTS idx_lab_visit   ON lab_results (visit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_lab_status  ON lab_results (status)`,

        // ── Phase 2: Regulatory & Quality ───────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS protocol_amendments (
            id                  SERIAL PRIMARY KEY,
            study_id            INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            amendment_no        TEXT NOT NULL,
            effective_date      TEXT NOT NULL,
            summary             TEXT NOT NULL,
            changes             TEXT,
            requires_reconsent  BOOLEAN NOT NULL DEFAULT FALSE,
            reconsent_reason    TEXT,
            irb_approval_date   TEXT,
            irb_ref_no          TEXT,
            status              TEXT NOT NULL DEFAULT 'Draft',
            created_by          TEXT REFERENCES "user"(id),
            created_by_name     TEXT,
            created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_amendments_study ON protocol_amendments (study_id)`,

        `CREATE TABLE IF NOT EXISTS blind_data_reviews (
            id                SERIAL PRIMARY KEY,
            study_id          INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            review_date       TEXT NOT NULL,
            status            TEXT NOT NULL DEFAULT 'In Progress',
            checklist_json    JSONB NOT NULL DEFAULT '{}',
            open_queries      INTEGER DEFAULT 0,
            missing_critical  INTEGER DEFAULT 0,
            open_deviations   INTEGER DEFAULT 0,
            pending_saes      INTEGER DEFAULT 0,
            notes             TEXT,
            completed_by      TEXT REFERENCES "user"(id),
            completed_by_name TEXT,
            completed_at      TIMESTAMP,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_bdr_study ON blind_data_reviews (study_id)`,

        // ── Phase 3: Quality Management ─────────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS quality_tolerance_limits (
            id          SERIAL PRIMARY KEY,
            study_id    INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            indicator   TEXT NOT NULL,
            label       TEXT NOT NULL,
            threshold   TEXT NOT NULL,
            unit        TEXT DEFAULT '%',
            alert_level TEXT DEFAULT 'warning',
            description TEXT,
            created_by  TEXT REFERENCES "user"(id),
            created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_qtl_study_indicator ON quality_tolerance_limits (study_id, indicator)`,

        // Phase 1 — LOINC coding status on lab_results
        `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS loinc_coding_status TEXT NOT NULL DEFAULT 'Custom'`,

        // ICH GCP E6(R3) C.4.4 — e-signature fields on sae_reports
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signed_by       TEXT REFERENCES "user"(id)`,
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signed_by_name  TEXT`,
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signed_at       TIMESTAMPTZ`,
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signing_meaning TEXT`,

        // ICH GCP E6(R3) 4.8 — link re-consent records to their triggering amendment
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS amendment_id INTEGER REFERENCES protocol_amendments(id)`,

        // ICH GCP E6(R3) §4.8 — consent record fields the initial schema omitted.
        // consent_time (§4.8.8): the date alone cannot evidence that consent
        // preceded a same-day screening procedure.
        // obtained_by (§4.1.5): who ran the consent discussion, as opposed to
        // created_by, which is only whoever keyed the record into the EDC.
        // witness_type (§4.8.9/§4.8.12): impartial witness vs. LAR vs. guardian.
        // assent_* (§4.8.12) and copy_provided (§4.8.11).
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS consent_time     TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS obtained_by      TEXT REFERENCES "user"(id)`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS obtained_by_name TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS witness_type     TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS assent_obtained  BOOLEAN NOT NULL DEFAULT FALSE`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS assent_date      TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS copy_provided    BOOLEAN NOT NULL DEFAULT FALSE`,

        // Phase 2 — MedDRA structured coding fields on adverse_events
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS meddra_pt_code    TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS meddra_soc_code   TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS meddra_version     TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS coding_status      TEXT NOT NULL DEFAULT 'Uncoded'`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS coded_by           TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS coded_at           TIMESTAMP`,

        `CREATE TABLE IF NOT EXISTS system_validation_log (
            id               SERIAL PRIMARY KEY,
            version          TEXT NOT NULL,
            validation_date  TEXT NOT NULL,
            validation_type  TEXT NOT NULL,
            status           TEXT NOT NULL DEFAULT 'Pending',
            performed_by     TEXT,
            summary          TEXT,
            changes_since    TEXT,
            approved_by      TEXT,
            approved_at      TIMESTAMP,
            created_by       TEXT REFERENCES "user"(id),
            created_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,

        // Phase 3 — TOTP (authenticator app) per-user 2FA
        `CREATE TABLE IF NOT EXISTS user_totp (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            secret       TEXT NOT NULL,
            is_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
            enabled_at   TIMESTAMPTZ,
            backup_codes JSONB NOT NULL DEFAULT '[]',
            UNIQUE(user_id)
        )`,

        // ICH E6(R3) — audit_action enum: add EXPORT, SIGN, AGREE values
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='EXPORT' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='audit_action'))
            THEN ALTER TYPE audit_action ADD VALUE 'EXPORT'; END IF; END $$`,
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='SIGN' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='audit_action'))
            THEN ALTER TYPE audit_action ADD VALUE 'SIGN'; END IF; END $$`,
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='AGREE' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='audit_action'))
            THEN ALTER TYPE audit_action ADD VALUE 'AGREE'; END IF; END $$`,

        // ICH E6(R3) — audit trail hash for tamper detection
        `ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS audit_hash TEXT`,
        `ALTER TABLE audit_trails ALTER COLUMN created_at SET DEFAULT NOW()`,

        // ICH E6(R3) §8.3.20 — Screening Log
        `CREATE TABLE IF NOT EXISTS screening_log (
            id                   INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id             INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            site_id              INTEGER REFERENCES sites(id),
            screening_date       TEXT NOT NULL,
            screening_code       VARCHAR(30) NOT NULL,
            subject_initials     VARCHAR(10),
            disposition          TEXT NOT NULL DEFAULT 'Pending',
            fail_reason          TEXT,
            eligibility_criteria TEXT,
            notes                TEXT,
            enrolled_subject_id  INTEGER REFERENCES subjects(id),
            created_by           TEXT REFERENCES "user"(id),
            created_by_name      TEXT,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_screening_study ON screening_log (study_id)`,

        // ICH E6(R3) §8.3.19 — IP Accountability / Drug Dispensing
        `CREATE TABLE IF NOT EXISTS ip_accountability (
            id                 INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id           INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            site_id            INTEGER REFERENCES sites(id),
            subject_id         INTEGER REFERENCES subjects(id),
            record_type        TEXT NOT NULL,
            transaction_date   TEXT NOT NULL,
            drug_name          TEXT NOT NULL,
            batch_no           TEXT,
            quantity_in        TEXT,
            quantity_out       TEXT,
            unit               TEXT,
            expiry_date        TEXT,
            supplier_ref       TEXT,
            returned_quantity  TEXT,
            destroyed_quantity TEXT,
            destruction_ref    TEXT,
            balance            TEXT,
            notes              TEXT,
            created_by         TEXT REFERENCES "user"(id),
            created_by_name    TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ip_study ON ip_accountability (study_id)`,

        // ICH E6(R3) §8 — Essential Documents Checklist
        `CREATE TABLE IF NOT EXISTS essential_documents (
            id               INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id         INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            site_id          INTEGER REFERENCES sites(id),
            section          TEXT NOT NULL,
            document_type    TEXT NOT NULL,
            document_ref     TEXT,
            version          TEXT,
            document_date    TEXT,
            expiry_date      TEXT,
            status           TEXT NOT NULL DEFAULT 'Pending',
            notes            TEXT,
            uploaded_by      TEXT REFERENCES "user"(id),
            uploaded_by_name TEXT,
            uploaded_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_esdoc_study ON essential_documents (study_id)`,

        // ICH E6(R3) C.4.1, §5.5.2 — User SOP/Training Agreements
        `CREATE TABLE IF NOT EXISTS user_agreements (
            id                INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            agreement_type    TEXT NOT NULL DEFAULT 'SOP',
            agreement_version TEXT NOT NULL,
            agreed_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            ip_address        TEXT,
            user_agent        TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_agreements_user ON user_agreements (user_id)`,

        // ICH E6(R3) §5.18.3 — Risk-Based Monitoring Plan
        `CREATE TABLE IF NOT EXISTS monitoring_plans (
            id                   INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id             INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            version              TEXT NOT NULL DEFAULT '1.0',
            status               TEXT NOT NULL DEFAULT 'Draft',
            risk_level           TEXT,
            scope                TEXT,
            sdv_strategy         TEXT,
            sdv_percentage       INTEGER,
            on_site_frequency    TEXT,
            remote_frequency     TEXT,
            critical_data_fields JSONB DEFAULT '[]',
            risk_factors         JSONB DEFAULT '[]',
            action_thresholds    JSONB DEFAULT '{}',
            approved_by          TEXT REFERENCES "user"(id),
            approved_by_name     TEXT,
            approved_at          TIMESTAMP,
            notes                TEXT,
            created_by           TEXT REFERENCES "user"(id),
            created_by_name      TEXT,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_monplan_study ON monitoring_plans (study_id)`,

        // ICH GCP E6(R3) §5.0.7 — QTL breach CAPA workflow
        `CREATE TABLE IF NOT EXISTS qtl_breach_actions (
            id                INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id          INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            indicator         TEXT NOT NULL,
            indicator_label   TEXT,
            threshold         TEXT NOT NULL,
            actual_value      TEXT NOT NULL,
            breach_date       TIMESTAMP NOT NULL DEFAULT NOW(),
            capa_text         TEXT,
            capa_due_date     TEXT,
            status            TEXT NOT NULL DEFAULT 'Open',
            assigned_to       TEXT REFERENCES "user"(id),
            assigned_to_name  TEXT,
            resolved_at       TIMESTAMP,
            resolved_by       TEXT REFERENCES "user"(id),
            resolved_by_name  TEXT,
            notes             TEXT,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_qtl_breach_study ON qtl_breach_actions (study_id)`,

        // ICH GCP E6(R3) C.4.2 — Periodic user access review
        `CREATE TABLE IF NOT EXISTS access_reviews (
            id                 INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id           INTEGER REFERENCES studies(id),
            review_period      TEXT NOT NULL,
            status             TEXT NOT NULL DEFAULT 'In Progress',
            initiated_by       TEXT REFERENCES "user"(id),
            initiated_by_name  TEXT,
            initiated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
            completed_at       TIMESTAMP,
            completed_by       TEXT REFERENCES "user"(id),
            completed_by_name  TEXT,
            certifications     JSONB DEFAULT '[]',
            notes              TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_access_review_study ON access_reviews (study_id)`,
        `CREATE TABLE IF NOT EXISTS subject_data_locks (
            id              INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id        INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            visit_id        INTEGER REFERENCES visits(id) ON DELETE SET NULL,
            action          TEXT NOT NULL CHECK (action IN ('Lock', 'Unlock')),
            reason          TEXT NOT NULL,
            entries_affected INTEGER NOT NULL DEFAULT 0,
            performed_by    TEXT REFERENCES "user"(id),
            performed_by_name TEXT,
            performed_at    TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sdl_subject ON subject_data_locks (subject_id)`,
        // Add tmf_artifact_id column to essential_documents for DIA TMF Reference Model
        `ALTER TABLE essential_documents ADD COLUMN IF NOT EXISTS tmf_artifact_id TEXT`,
        `ALTER TABLE essential_documents ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false`,
        // Migrate legacy section names to ICH GCP E6(R3) §8 correct numbering
        `UPDATE essential_documents SET section = '8.1 — Pre-trial'    WHERE section IN ('§8.2 — Before Trial', '8.1 Pre-trial', '8.1 — Before Trial')`,
        `UPDATE essential_documents SET section = '8.2 — Trial Conduct' WHERE section IN ('§8.3 — During Trial', '8.2 Trial Conduct', '8.2 — During Trial')`,
        `UPDATE essential_documents SET section = '8.3 — Post-trial'   WHERE section IN ('§8.4 — After Trial Completion', '8.3 Post-trial', '8.3 — After Completion')`,
        // ICH GCP E6(R3) §4.5.3 — visit window compliance: link auto-generated deviations to their visit
        `ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL`,
        `ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false`,
        `CREATE INDEX IF NOT EXISTS idx_devs_visit ON protocol_deviations (visit_id)`,

        // ── SaaS Multi-Tenancy (Phase 1) — organizations + backfill ──────────
        // Top-level tenant boundary. Existing single-org data is folded into a
        // "default" organization so no data is lost; new columns stay nullable
        // (platform_owner rows are intentionally NULL — cross-tenant operator).
        `CREATE TABLE IF NOT EXISTS organizations (
            id         INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            name       TEXT NOT NULL,
            slug       TEXT NOT NULL UNIQUE,
            status     TEXT NOT NULL DEFAULT 'Active',
            plan       TEXT DEFAULT 'standard',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Seed the default tenant that absorbs all pre-existing data (idempotent).
        `INSERT INTO organizations (name, slug) VALUES ('Default Organization', 'default') ON CONFLICT (slug) DO NOTHING`,
        // Tenant column on the three tenant-root tables.
        `ALTER TABLE "user"  ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `ALTER TABLE studies ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `ALTER TABLE sites   ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        // Per-protocol I/E criteria (NULL = use the app default set).
        `ALTER TABLE studies ADD COLUMN IF NOT EXISTS ie_criteria JSONB`,
        // Per-protocol visit schedule template (NULL = no template, manual visits only).
        `ALTER TABLE studies ADD COLUMN IF NOT EXISTS visit_schedule JSONB`,
        // Backfill existing rows into the default org (only untenanted rows).
        `UPDATE "user"  SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL AND role <> 'platform_owner'`,
        `UPDATE studies SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL`,
        `UPDATE sites   SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL`,
        // Uniqueness becomes per-organization: drop the old global UNIQUE and
        // add a composite unique index so two tenants may reuse protocol/site codes.
        `DO $$
            DECLARE r record;
            BEGIN
                FOR r IN SELECT conname FROM pg_constraint
                    WHERE conrelid = 'studies'::regclass AND contype = 'u'
                      AND pg_get_constraintdef(oid) = 'UNIQUE (protocol_no)'
                LOOP EXECUTE format('ALTER TABLE studies DROP CONSTRAINT %I', r.conname); END LOOP;
            END $$`,
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_studies_org_protocol ON studies (organization_id, protocol_no)`,
        `DO $$
            DECLARE r record;
            BEGIN
                FOR r IN SELECT conname FROM pg_constraint
                    WHERE conrelid = 'sites'::regclass AND contype = 'u'
                      AND pg_get_constraintdef(oid) = 'UNIQUE (code)'
                LOOP EXECUTE format('ALTER TABLE sites DROP CONSTRAINT %I', r.conname); END LOOP;
            END $$`,
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_sites_org_code ON sites (organization_id, code)`,
        // Indexes for tenant-filtered lookups.
        `CREATE INDEX IF NOT EXISTS idx_user_org    ON "user" (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_studies_org ON studies (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sites_org   ON sites (organization_id)`,
        // Audit trail tenant column — so one tenant cannot read another's audit
        // rows. Backfill via the acting user, then fold any orphans into default.
        `ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `UPDATE audit_trails a SET organization_id = u.organization_id
            FROM "user" u WHERE a.user_id = u.id AND a.organization_id IS NULL`,
        `UPDATE audit_trails SET organization_id = (SELECT id FROM organizations WHERE slug='default')
            WHERE organization_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_trails (organization_id)`,
        // CRF form template library becomes per-tenant (custom forms must not
        // leak between tenants). Existing templates fold into the default org.
        `ALTER TABLE crf_forms ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `UPDATE crf_forms SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_crf_forms_org ON crf_forms (organization_id)`,
        // Subscription state (Phase 4) — plan already exists; add billing status.
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Active'`,
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP`,
        // Billing processor linkage (Stripe customer/subscription ids).
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_customer_id TEXT`,
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_subscription_id TEXT`,
        // Feature: Investigator Signed replaces the free-text visit notes field
        // with a lockable sign-off checkbox — once signed, the visit cannot be
        // edited until an admin unsigns it (mirrors crf_data_entries lock).
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed_at TIMESTAMP`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed_by TEXT REFERENCES "user"(id)`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed_by_name TEXT`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsigned_at TIMESTAMP`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsigned_by TEXT REFERENCES "user"(id)`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsigned_by_name TEXT`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsign_reason TEXT`,
        `ALTER TABLE visits DROP COLUMN IF EXISTS notes`,

        // ── Delegation & training dates: TEXT "YYYY-MM-DD" ──────────────────
        // These columns were defined twice with different types: as text by the
        // drizzle-kit migration (0001, which matches schemas/schema.js) and as
        // TIMESTAMP by the CREATE TABLE above. Both are CREATE TABLE IF NOT
        // EXISTS, so whichever ran first won and the column type depended on
        // install order.
        //
        // Text is the correct one. consentrules.day() compares these by slicing
        // the first ten characters, so a timestamp read back as a Date yields
        // "Sat Aug 01" — and "Sat Aug 01" <= "2026-08-15" is false. Every
        // delegation-window check would silently deny everyone, and that check
        // decides who may take informed consent (ICH E6(R3) §4.1.5).
        //
        // Converts in place, keeping the calendar day. Nothing is dropped.
        `DO $$
         DECLARE
             r RECORD;
         BEGIN
             FOR r IN
                 SELECT table_name, column_name
                 FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND data_type LIKE 'timestamp%'
                   AND (table_name, column_name) IN (
                       ('delegation_log',   'delegation_start'),
                       ('delegation_log',   'delegation_end'),
                       ('training_records', 'training_date'),
                       ('training_records', 'expiry_date')
                   )
             LOOP
                 EXECUTE format(
                     'ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING to_char(%I, ''YYYY-MM-DD'')',
                     r.table_name, r.column_name, r.column_name
                 );
                 RAISE WARNING 'converted %.% from timestamp to text (YYYY-MM-DD)', r.table_name, r.column_name;
             END LOOP;
         END $$`,

        // ── Training records are tenant data ────────────────────────────────
        // The table had neither an organization_id nor any filter on read, so
        // one tenant's admin could list another tenant's staff qualifications.
        // Backfilled from the person the record belongs to.
        `ALTER TABLE training_records ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `ALTER TABLE training_records ADD COLUMN IF NOT EXISTS study_id        INTEGER REFERENCES studies(id)`,
        `UPDATE training_records t
            SET organization_id = u.organization_id
            FROM "user" u
            WHERE u.id = t.user_id AND t.organization_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_training_org ON training_records (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_training_study ON training_records (study_id)`,

        // One CRF entry per (subject, visit, form). Both the import route and
        // the data-entry route do "select, then insert if absent" with no lock,
        // and a SELECT ... FOR UPDATE takes no lock when the row does not exist
        // yet — so two concurrent saves both found nothing and both inserted.
        // The duplicate is invisible in the UI (the reader takes the first
        // match) but both are emitted to the ODM export, which is worse than
        // either outcome alone. Only the database can settle this.
        //
        // Creating the index outright would fail on any deployment that already
        // has duplicates, and the migration runner would swallow that as a
        // one-line warning. Deduplicating automatically is not an option
        // either: esignatures cascade-delete with the entry, so a well-meant
        // cleanup would destroy Part 11 signature records. So: create it when
        // the data is clean, and say plainly what to do when it is not.
        `DO $$
         DECLARE dupes integer;
         BEGIN
             -- Nothing to do once the index exists, and this runs on every
             -- boot: without the guard it is a full scan of crf_data_entries
             -- at every restart, forever. Checked against current_schema()
             -- rather than to_regclass, which resolves through search_path and
             -- would answer "absent" for an index sitting in a schema that is
             -- simply not on the path — then try to create a second one.
             IF EXISTS (
                 SELECT 1 FROM pg_indexes
                 WHERE indexname = 'idx_crf_entry_unique'
                   AND schemaname = current_schema()
             ) THEN
                 RETURN;
             END IF;
             SELECT count(*) INTO dupes FROM (
                 SELECT 1 FROM crf_data_entries
                 GROUP BY subject_id, visit_id, form_id HAVING count(*) > 1
             ) d;
             IF dupes = 0 THEN
                 CREATE UNIQUE INDEX IF NOT EXISTS idx_crf_entry_unique
                     ON crf_data_entries (subject_id, visit_id, form_id);
             ELSE
                 RAISE WARNING 'crf_data_entries has % duplicate (subject, visit, form) group(s); idx_crf_entry_unique was NOT created. Reconcile them, then restart. To list them: SELECT subject_id, visit_id, form_id, count(*), array_agg(id) FROM crf_data_entries GROUP BY 1,2,3 HAVING count(*) > 1;', dupes;
             END IF;
         END $$`,
    ];
    const failures = [];
    for (const stmt of stmts) {
        try {
            await client.unsafe(stmt);
        } catch (err) {
            failures.push(err);
            console.error('Migration statement failed:', err.message?.slice(0, 120));
        }
    }
    if (failures.length) {
        throw new AggregateError(failures, `${failures.length} database migration statement(s) failed`);
    }
}
const app = express();
app.use(safeErrorResponses);

// Configure only the actual proxy CIDRs. Direct deployments do not trust forwarded IPs.
app.set('trust proxy', process.env.TRUST_PROXY_CIDRS?.split(',').map(s => s.trim()).filter(Boolean) || false);
app.disable('x-powered-by');

// Security headers (helmet-equivalent, no extra dependency).
// CSP notes: all JS/CSS is self-hosted (Tailwind/Lucide vendored under
// src/frontend/vendor); 'unsafe-inline' is required by the SPA's inline
// onclick handlers and Tailwind Play's injected styles.
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +   // unsafe-eval: Tailwind Play JIT
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self' data:; " +
        "connect-src 'self'; " +
        "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Exact deployment origins only; do not normalize/overwrite the caller's Origin.
app.use(cors({ origin: (origin, cb) => cb(null, !origin || trustedOrigins().has(origin)), credentials: true }));
app.use('/api', checkOrigin);
let securityReady = false;
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (!securityReady) return res.status(503).json({ error: 'Service initializing' });
    next();
});
// Compatibility endpoints use the same custom session protocol as /api/mfa.
app.post('/api/auth/sign-out', logout);
app.get('/api/auth/get-session', requireAuth, (req, res) => res.json({
    user: req.user, session: { expiresAt: req.sessionExpiresAt },
}));
app.all('/api/auth/*', (_req, res) => res.status(403).json({ error: 'Use /api/mfa for authentication.' }));

// Billing webhook needs the RAW body for Stripe signature verification — mount
// it before express.json() so the payload isn't parsed/re-serialized.
app.post('/api/billing/webhook', express.raw({ type: '*/*' }), handleBillingWebhook);

// Bulk data import posts a whole site's spreadsheet as JSON (hundreds of wide
// rows), so it needs a larger body limit. Mounted before the global parser; the
// global express.json() below is a no-op once the body is already parsed, so
// every other route keeps the default (small) limit.
app.use('/api/import', express.json({ limit: '25mb' }));

app.use(express.json());

// Auth-required API routes
app.use('/api/mfa',      mfaRouter);
app.use('/api/register', rateLimitAuth, registerRouter);
app.use('/api/signup',   rateLimitAuth, signupRouter);   // public self-service tenant signup (gated by ALLOW_TENANT_SIGNUP)
app.use('/api/sites',      requireAuth, sitesRouter);
app.use('/api/security',   requireAuth, securityRouter);
app.use('/api/studies',    requireAuth, studiesRouter);
app.use('/api/audit',      requireAuth, auditRouter);
app.use('/api/forms',      requireAuth, formsRouter);
app.use('/api/users',         requireAuth, userMgmtRouter);
app.use('/api/organizations', requireAuth, organizationsRouter);   // platform_owner only (enforced in-router)
app.use('/api/billing',       requireAuth, billingRouter);          // config + checkout (webhook mounted above, raw)
app.use('/api/notifications', requireAuth, requireStudy, notificationsRouter);
// Liveness — process is up (cheap, no dependencies).
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Readiness — includes a DB round-trip. Load balancers should route on this;
// returns 503 when the database is unreachable so unhealthy instances drain.
app.get('/api/ready', async (_req, res) => {
    try {
        await client`SELECT 1`;
        res.json({ status: 'ready', db: 'up' });
    } catch (err) {
        res.status(503).json({ status: 'not-ready', db: 'down', error: err.message });
    }
});

// Study-scoped routes — require both auth and X-Study-ID header
// requireAuth sets req.orgId, which rateLimitTenant keys on, before requireStudy.
const studyAuth = [requireAuth, rateLimitTenant, requireStudy];
app.use('/api/subjects',                  ...studyAuth, subjectsRouter);
app.use('/api/subjects/:subjectId/visits', ...studyAuth, visitsRouter);
app.use('/api/entries',                   ...studyAuth, entriesRouter);
app.use('/api/import',                     ...studyAuth, importRouter);
app.use('/api/queries',                   ...studyAuth, queriesRouter);
app.use('/api/dashboard',                 ...studyAuth, dashboardRouter);
app.use('/api/signatures',                ...studyAuth, signaturesRouter);
app.use('/api/ae',                        ...studyAuth, adverseEventsRouter);
app.use('/api/deviations',                ...studyAuth, deviationsRouter);
app.use('/api/consents',                  ...studyAuth, consentsRouter);
app.use('/api/randomization',             ...studyAuth, randomizationRouter);
app.use('/api/export',                    ...studyAuth, exportRouter);
app.use('/api/dblock',                    ...studyAuth, dblockRouter);
app.use('/api/delegation',                ...studyAuth, delegationRouter);
app.use('/api/saereports',                ...studyAuth, saeReportsRouter);
app.use('/api/monitoring',                ...studyAuth, monitoringRouter);
app.use('/api/visit-templates',           ...studyAuth, visitTemplatesRouter);
// Phase 1 — Core Clinical Modules
app.use('/api/medhistory',               ...studyAuth, medHistoryRouter);
app.use('/api/conmeds',                  ...studyAuth, conMedsRouter);
app.use('/api/vitalsigns',               ...studyAuth, vitalSignsRouter);
app.use('/api/lab',                      ...studyAuth, labRouter);
// Phase 2 — Regulatory & Quality
app.use('/api/amendments',               ...studyAuth, amendmentsRouter);
app.use('/api/bdreview',                 ...studyAuth, bdReviewRouter);
// Phase 3 — Quality Management & Validation
app.use('/api/qtl',                      ...studyAuth, qtlRouter);
app.use('/api/sysval',                   requireAuth,  sysValRouter);
app.use('/api/license',                  requireAuth,  licenseRouter);
// ICH E6(R3) Gap Closure
app.use('/api/screening',                ...studyAuth, screeningRouter);
app.use('/api/ip',                       ...studyAuth, ipDispensingRouter);
app.use('/api/essential-docs',           ...studyAuth, essentialDocsRouter);
app.use('/api/agreements',               requireAuth,  agreementsRouter);
app.use('/api/monitoring-plan',          ...studyAuth, monitoringPlanRouter);
app.use('/api/reports',                  ...studyAuth, reportRouter);
app.use('/api/access-review',            ...studyAuth, accessReviewRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'This service could not be found. Refresh the page and try again.' }));
app.use(apiErrorHandler);

// Serve ONLY the frontend assets — never the repo root, which would expose
// source code, docs with test credentials, and the .git directory.
app.use('/src/frontend', express.static(path.join(rootDir, 'src/frontend'), { dotfiles: 'deny' }));
for (const page of ['landing.html', 'login.html', 'index.html', 'register.html', 'select.html', 'platform.html', 'signup.html']) {
    app.get(`/${page}`, (_req, res) => res.sendFile(path.join(rootDir, page)));
}
app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'landing.html')));

const PORT = parseInt(process.env.PORT || '3000', 10);

// On a FRESH database (e.g. a new on-premise install) the core tables don't
// exist yet — apply the drizzle base migrations once to create them. On an
// existing install (core tables already present, possibly created via
// drizzle-kit push with no tracking table) we skip this so migrate() never
// tries to re-CREATE existing tables; runMigrations() then handles all
// incremental columns/tables on top.
async function ensureBaseSchema() {
    const [{ exists }] = await client`SELECT to_regclass('public."user"') AS exists`;
    if (exists) return;   // existing DB → leave the base schema alone
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const { db } = await import('./db/connection.js');
    await migrate(db, { migrationsFolder: path.join(__dirname, 'db/migrations') });
    console.log('Base schema created (fresh database).');
}

// Bind the port for liveness; API traffic remains blocked until mandatory security migration succeeds.
app.listen(PORT, () => {
    console.log(`E-CRF Server running on http://localhost:${PORT}`);
    console.log(`Better Auth endpoint: http://localhost:${PORT}/api/auth`);
    if (process.env.LICENSE_ENFORCEMENT === 'true') {
        import('./lib/license.js').then(({ getLicense }) => {
            const lic = getLicense();
            if (lic.active) {
                console.log(`License: active for "${lic.customer}" (expires ${lic.expiresAt}).`);
            } else {
                console.warn(`License: NOT ACTIVE (${lic.reason}). New-record creation (enrollment/studies/sites) is blocked; reads/exports continue.`);
            }
        }).catch(() => {});
    }
    ensureBaseSchema()
        .then(runMigrations)
        .then(() => migrateSecurity(client))
        .then(() => { securityReady = true; console.log('DB and security migrations applied.'); })
        .catch(err => console.error('Startup incomplete; requests remain blocked:', err.code || err.message));
});
````

## `src/frontend/js/modules/visit-actions.js`

````javascript
// Labels remain data, never executable inline JavaScript. Only named actions
// registered here can be dispatched; DOM attributes cannot name arbitrary functions.
export function escapeAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function actionAttributes(action, args) {
    return `data-safe-action="${escapeAttribute(action)}" data-safe-args="${escapeAttribute(JSON.stringify(args))}"`;
}

export function visitActionAttributes(action, id, name) {
    return actionAttributes(action, [id, name]);
}

export function dispatchSafeAction(element, host = globalThis.window) {
    const handlers = {
        select: (...args) => host.selectVisit(...args),
        unsign: (...args) => host.openUnsignVisitModal(...args),
        delete: (...args) => host.openDeleteVisitModal(...args),
        query: (...args) => host.openRowInlineQuery(...args),
        inlineQuery: (...args) => host.openInlineQueryModal(...args),
        unblind: (...args) => host.openUnblindModal(...args),
    };
    if (!Object.hasOwn(handlers, element.dataset.safeAction)) return false;
    let args;
    try { args = JSON.parse(element.dataset.safeArgs); } catch { return false; }
    if (!Array.isArray(args) || args.length > 4) return false;
    // TODO: Verify the resolved window handler is a function and handle handler failures without an uncaught TypeError.
    handlers[element.dataset.safeAction](...args);
    return true;
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', event => {
        const element = event.target.closest?.('[data-safe-action]');
        if (!element) return;
        if (element.tagName === 'TR' && event.target.closest('button, a, input, select, [onclick]')) return;
        event.preventDefault();
        event.stopPropagation();
        dispatchSafeAction(element);
    }, true);
}
````

## `tests/security-integration.test.js`

````javascript
// Opt-in integration test for an isolated, migrated, disposable localhost DB/app.
// SECURITY_TEST_DATABASE_URL and SECURITY_TEST_BASE_URL must point to that instance.
// SECURITY_TEST_MFA_KEY must equal its MFA_ENCRYPTION_KEY.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import postgres from 'postgres';
import { hashPassword } from '@better-auth/utils/password';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';

const enabled = !!process.env.SECURITY_TEST_DATABASE_URL && !!process.env.SECURITY_TEST_BASE_URL;
test('security HTTP/SQL integration on disposable PostgreSQL', { skip: !enabled }, async t => {
    const url = new URL(process.env.SECURITY_TEST_DATABASE_URL);
    const base = process.env.SECURITY_TEST_BASE_URL;
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(new URL(base).hostname, '127.0.0.1');
    const sql = postgres(url.toString(), { max: 4, onnotice: () => {} });
    t.after(() => sql.end());
    const suffix = crypto.randomBytes(5).toString('hex');
    const password = 'Isolated-Test!Password28';
    const hash = await hashPassword(password);
    const [orgA, orgB] = await sql`INSERT INTO organizations (name, slug)
        VALUES ('Test A', ${'a-' + suffix}), ('Test B', ${'b-' + suffix}) RETURNING *`;
    const [studyA] = await sql`INSERT INTO studies (title, protocol_no, organization_id, status)
        VALUES ('Study A', ${'PA-' + suffix}, ${orgA.id}, 'Active') RETURNING id`;
    const [studyB] = await sql`INSERT INTO studies (title, protocol_no, organization_id, status)
        VALUES ('Study B', ${'PB-' + suffix}, ${orgB.id}, 'Active') RETURNING id`;
    const [siteA, siteA2] = await sql`INSERT INTO sites (name, code, organization_id)
        VALUES ('A1', ${'A1-' + suffix}, ${orgA.id}), ('A2', ${'A2-' + suffix}, ${orgA.id}) RETURNING id`;
    const [siteB] = await sql`INSERT INTO sites (name, code, organization_id)
        VALUES ('B', ${'B-' + suffix}, ${orgB.id}) RETURNING id`;
    const users = {};
    for (const [name, role, org] of [['admin', 'admin', orgA], ['pi', 'pi', orgA], ['other', 'admin', orgB]]) {
        const id = crypto.randomUUID(), email = `${name}-${suffix}@example.test`;
        await sql`INSERT INTO "user" (id, name, email, email_verified, role, organization_id)
            VALUES (${id}, ${name}, ${email}, TRUE, ${role}, ${org.id})`;
        await sql`INSERT INTO account (id, account_id, provider_id, user_id, password)
            VALUES (${crypto.randomUUID()}, ${id}, 'credential', ${id}, ${hash})`;
        users[name] = { id, email };
    }
    await sql`INSERT INTO study_users (study_id, user_id) VALUES (${studyA.id}, ${users.pi.id})`;
    await sql`INSERT INTO user_sites (user_id, site_id, study_id) VALUES (${users.pi.id}, ${siteA.id}, ${studyA.id})`;
    const [subjectA, subjectA2] = await sql`INSERT INTO subjects (study_id, site_id, subject_code)
        VALUES (${studyA.id}, ${siteA.id}, ${'SA-' + suffix}), (${studyA.id}, ${siteA2.id}, ${'SA2-' + suffix}) RETURNING *`;
    const [subjectB] = await sql`INSERT INTO subjects (study_id, site_id, subject_code)
        VALUES (${studyB.id}, ${siteB.id}, ${'SB-' + suffix}) RETURNING *`;
    const [assignmentB] = await sql`INSERT INTO subject_randomization (subject_id, rand_code, treatment_arm)
        VALUES (${subjectB.id}, ${'RB-' + suffix}, 'Secret B') RETURNING *`;

    async function request(path, { method = 'GET', body, cookie, study = studyA.id, origin } = {}) {
        const result = await fetch(base + path, { method, headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(cookie ? { cookie } : {}), ...(study ? { 'X-Study-ID': String(study) } : {}),
            ...(origin ? { origin } : {}),
        }, body: body ? JSON.stringify(body) : undefined });
        const text = await result.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        return { status: result.status, data, cookie: result.headers.get('set-cookie')?.split(';')[0] };
    }
    async function login(name = 'admin') {
        const result = await request('/api/mfa/initiate', { method: 'POST', body: { email: users[name].email, password } });
        assert.equal(result.status, 200, JSON.stringify(result.data));
        return result;
    }
    // This is a disposable test database only; reset shared buckets between scenarios.
    const resetLimits = () => sql`DELETE FROM security_rate_limits`;
    await resetLimits();
    let admin = await login(), pi = await login('pi');

    await t.test('login stores a hash, and both logout endpoints revoke replay', async () => {
        const [session] = await sql`SELECT token FROM session WHERE user_id = ${users.admin.id}`;
        assert.ok(session.token.startsWith('sha256:'));
        assert.ok(!admin.cookie.includes(session.token));
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 200);
        assert.equal((await request('/api/mfa/logout', { method: 'POST', cookie: admin.cookie })).status, 200);
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 401);
        admin = await login();
        assert.equal((await request('/api/auth/sign-out', { method: 'POST', cookie: admin.cookie })).status, 200);
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 401);
        admin = await login();
    });

    await t.test('a non-platform session fails closed when its organization disappears', async () => {
        await sql`UPDATE "user" SET organization_id = NULL WHERE id = ${users.admin.id}`;
        try {
            const result = await request('/api/auth/get-session', { cookie: admin.cookie });
            assert.equal(result.status, 403);
        } finally {
            await sql`UPDATE "user" SET organization_id = ${orgA.id} WHERE id = ${users.admin.id}`;
        }
    });

    await t.test('randomization reads and unblind deny foreign tenant objects', async () => {
        assert.equal((await request('/api/randomization?subjectId=not-an-id', { cookie: admin.cookie })).status, 400);
        assert.equal((await request('/api/randomization/not-an-id/unblind', {
            method: 'PATCH', cookie: admin.cookie, body: { reason: 'Invalid id test' },
        })).status, 400);
        const all = await request('/api/randomization', { cookie: admin.cookie });
        assert.equal(all.status, 200);
        assert.ok(!all.data.some(row => row.id === assignmentB.id));
        const query = await request(`/api/randomization?subjectId=${subjectB.id}`, { cookie: admin.cookie });
        assert.deepEqual(query.data, []);
        const changed = await request(`/api/randomization/${assignmentB.id}/unblind`, { method: 'PATCH', cookie: admin.cookie, body: { reason: 'Integration test' } });
        assert.equal(changed.status, 404);
        const [row] = await sql`SELECT is_blinded FROM subject_randomization WHERE id = ${assignmentB.id}`;
        assert.equal(row.is_blinded, true);
    });

    await t.test('site scope covers overview, CSV and ODM; no sites means no subjects', async () => {
        const overview = await request('/api/subjects/status-overview', { cookie: pi.cookie });
        assert.equal(overview.status, 200);
        assert.deepEqual(overview.data.map(row => row.id), [subjectA.id]);
        for (const path of ['/api/export/csv?domain=DM', '/api/export/odm']) {
            const exported = await request(path, { cookie: pi.cookie });
            assert.equal(exported.status, 200, JSON.stringify(exported.data));
            assert.ok(exported.data.includes(subjectA.subject_code));
            assert.ok(!exported.data.includes(subjectA2.subject_code));
            assert.ok(!exported.data.includes(subjectB.subject_code));
        }
        await sql`DELETE FROM user_sites WHERE user_id = ${users.pi.id}`;
        assert.deepEqual((await request('/api/subjects', { cookie: pi.cookie })).data, []);
    });

    await t.test('concurrent randomization consumes exactly one slot per assignment', async () => {
        await sql`INSERT INTO randomization_list (study_id, rand_code, treatment_arm)
            VALUES (${studyA.id}, ${'R1-' + suffix}, 'A'), (${studyA.id}, ${'R2-' + suffix}, 'B')`;
        const results = await Promise.all([subjectA, subjectA2].map(subject => request('/api/randomization', {
            method: 'POST', cookie: admin.cookie, body: { subjectId: subject.id },
        })));
        assert.deepEqual(results.map(row => row.status), [201, 201], JSON.stringify(results));
        const rows = await sql`SELECT rand_code FROM subject_randomization WHERE subject_id IN (${subjectA.id}, ${subjectA2.id})`;
        assert.equal(new Set(rows.map(row => row.rand_code)).size, 2);
        const repeat = await request('/api/randomization', { method: 'POST', cookie: admin.cookie, body: { subjectId: subjectA.id } });
        assert.equal(repeat.status, 409);
    });

    await t.test('failed unblinding audit rolls back the irreversible state change', async () => {
        const [assignment] = await sql`SELECT id FROM subject_randomization WHERE subject_id = ${subjectA.id}`;
        await sql`ALTER TABLE audit_trails RENAME TO audit_trails_test_hidden`;
        try {
            const result = await request(`/api/randomization/${assignment.id}/unblind`, {
                method: 'PATCH', cookie: admin.cookie, body: { reason: 'Rollback test' },
            });
            assert.equal(result.status, 500);
        } finally {
            await sql`ALTER TABLE audit_trails_test_hidden RENAME TO audit_trails`;
        }
        const [after] = await sql`SELECT is_blinded FROM subject_randomization WHERE id = ${assignment.id}`;
        assert.equal(after.is_blinded, true);
    });

    await t.test('randomization codes are study-local and list uploads are atomic', async () => {
        const sharedCode = 'SHARED-' + suffix;
        const first = await request('/api/randomization/list', { method: 'POST', cookie: admin.cookie,
            body: { entries: [{ randCode: sharedCode, treatmentArm: 'A' }] } });
        assert.equal(first.status, 201, JSON.stringify(first.data));
        const duplicate = await request('/api/randomization/list', { method: 'POST', cookie: admin.cookie,
            body: { entries: [{ randCode: sharedCode, treatmentArm: 'B' }] } });
        assert.equal(duplicate.status, 409);
        const normalizedCode = sharedCode.toUpperCase();
        await sql`INSERT INTO randomization_list (study_id, rand_code, treatment_arm)
            VALUES (${studyB.id}, ${normalizedCode}, 'B')`;
        const rows = await sql`SELECT study_id FROM randomization_list WHERE rand_code = ${normalizedCode}`;
        assert.equal(rows.length, 2);
    });

    await t.test('failed randomization audit rolls back slot consumption and assignment', async () => {
        const [subject] = await sql`INSERT INTO subjects (study_id, site_id, subject_code)
            VALUES (${studyA.id}, ${siteA.id}, ${'FAIL-' + suffix}) RETURNING id`;
        const [slot] = await sql`INSERT INTO randomization_list (study_id, rand_code, treatment_arm, stratum)
            VALUES (${studyA.id}, ${'ROLLBACK-' + suffix}, 'Test', ${'fail-' + suffix}) RETURNING id`;
        await sql`ALTER TABLE audit_trails RENAME TO audit_trails_test_hidden`;
        try {
            const result = await request('/api/randomization', { method: 'POST', cookie: admin.cookie,
                body: { subjectId: subject.id, stratum: 'fail-' + suffix } });
            assert.equal(result.status, 500);
        } finally {
            await sql`ALTER TABLE audit_trails_test_hidden RENAME TO audit_trails`;
        }
        const [after] = await sql`SELECT is_used FROM randomization_list WHERE id = ${slot.id}`;
        assert.equal(after.is_used, false);
        const assignments = await sql`SELECT id FROM subject_randomization WHERE subject_id = ${subject.id}`;
        assert.equal(assignments.length, 0);
    });

    await t.test('MFA setup cannot overwrite an enabled factor; challenges and backup codes are single use', async () => {
        await resetLimits();
        const setup = await request('/api/mfa/totp/setup', { method: 'POST', cookie: admin.cookie });
        assert.equal(setup.status, 200, JSON.stringify(setup.data));
        const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
        const code = await totp.generate({ secret: setup.data.secret });
        const enable = await request('/api/mfa/totp/enable', { method: 'POST', cookie: admin.cookie, body: { totpCode: code } });
        assert.equal(enable.status, 200, JSON.stringify(enable.data));
        const [stored] = await sql`SELECT * FROM user_totp WHERE user_id = ${users.admin.id}`;
        assert.ok(stored.secret.startsWith('enc1:'));
        assert.ok(!JSON.stringify(stored).includes(enable.data.backupCodes[0]));
        assert.equal((await request('/api/mfa/totp/setup', { method: 'POST', cookie: admin.cookie })).status, 409);
        const challenge = await login();
        assert.equal(challenge.data.status, 'totp_required');
        assert.equal(challenge.cookie, undefined);
        const [verification] = await sql`SELECT * FROM verification WHERE identifier = ${'mfa:' + users.admin.id}`;
        assert.ok(!JSON.stringify(verification).includes(challenge.data.tempToken));
        const concurrent = await Promise.all([1, 2].map(() => request('/api/mfa/totp-verify', { method: 'POST', body: {
            tempToken: challenge.data.tempToken, totpCode: enable.data.backupCodes[0],
        } })));
        assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 401]);
        const secondChallenge = await login();
        const replay = await request('/api/mfa/totp-verify', { method: 'POST', body: { tempToken: secondChallenge.data.tempToken, totpCode: enable.data.backupCodes[0] } });
        assert.equal(replay.status, 401);
        const success = await request('/api/mfa/totp-verify', { method: 'POST', body: { tempToken: secondChallenge.data.tempToken, totpCode: code } });
        assert.equal(success.status, 200, JSON.stringify(success.data));
        admin = success;
    });

    await t.test('database MFA failures fail closed instead of issuing a password-only session', async () => {
        await resetLimits();
        await sql`ALTER TABLE user_totp RENAME TO user_totp_test_hidden`;
        try {
            const result = await request('/api/mfa/initiate', { method: 'POST', body: { email: users.admin.email, password } });
            assert.equal(result.status, 500);
            assert.equal(result.cookie, undefined);
        } finally { await sql`ALTER TABLE user_totp_test_hidden RENAME TO user_totp`; }
    });

    await t.test('lockout works again after prior unlock and concurrent failures are counted', async () => {
        await resetLimits();
        await sql`INSERT INTO account_locks (user_id, email, failed_count, unlocked_at)
            VALUES (${users.other.id}, ${users.other.email}, 0, NOW()) ON CONFLICT (email)
            DO UPDATE SET failed_count = 0, unlocked_at = NOW()`;
        await Promise.all(Array.from({ length: 5 }, () => request('/api/mfa/initiate', { method: 'POST', body: { email: users.other.email, password: 'wrong' } })));
        const [row] = await sql`SELECT * FROM account_locks WHERE email = ${users.other.email}`;
        assert.equal(row.failed_count, 5);
        assert.equal(row.unlocked_at, null);
        assert.ok(row.locked_at);
        const blocked = await request('/api/mfa/initiate', { method: 'POST', body: { email: users.other.email, password } });
        assert.equal(blocked.status, 423);
    });

    await t.test('password change rotates current session and revokes other sessions and pending challenges', async () => {
        await resetLimits();
        const result = await request('/api/security/change-password', { method: 'POST', cookie: admin.cookie,
            body: { currentPassword: password, newPassword: 'New-Independent!Password83' } });
        assert.equal(result.status, 200, JSON.stringify(result.data));
        assert.ok(result.cookie && result.cookie !== admin.cookie);
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 401);
        assert.equal((await request('/api/auth/get-session', { cookie: result.cookie })).status, 200);
        const rows = await sql`SELECT id FROM session WHERE user_id = ${users.admin.id}`;
        assert.equal(rows.length, 1);
        const pending = await sql`SELECT id FROM verification WHERE identifier = ${'mfa:' + users.admin.id}`;
        assert.equal(pending.length, 0);
        const reused = await request('/api/security/change-password', { method: 'POST', cookie: result.cookie,
            body: { currentPassword: 'New-Independent!Password83', newPassword: password } });
        assert.equal(reused.status, 400);
        admin = result;
    });
    await t.test('legacy MFA material is migrated once and the same key is required afterwards', async () => {
        const userId = users.other.id;
        await sql`INSERT INTO user_totp (user_id, secret, is_enabled, backup_codes)
            VALUES (${userId}, 'JBSWY3DPEHPK3PXP', TRUE, ${sql.json([{ code: 'ABCDEF123456', used: false }])})`;
        process.env.MFA_ENCRYPTION_KEY = process.env.SECURITY_TEST_MFA_KEY;
        assert.match(process.env.MFA_ENCRYPTION_KEY || '', /^[a-f0-9]{64}$/i, 'provide the isolated server MFA key');
        const { migrateSecurity } = await import('../src/backend/lib/security-migration.js');
        process.env.DATABASE_URL = url.toString();
        const { client: migrationClient } = await import('../src/backend/db/connection.js');
        t.after(() => migrationClient.end());
        await migrateSecurity(migrationClient);
        const [first] = await sql`SELECT * FROM user_totp WHERE user_id = ${userId}`;
        assert.ok(first.secret.startsWith('enc1:'));
        assert.ok(first.backup_codes[0].digest);
        assert.equal(first.backup_codes[0].code, undefined);
        await migrateSecurity(migrationClient);
        const [second] = await sql`SELECT secret FROM user_totp WHERE user_id = ${userId}`;
        assert.equal(second.secret, first.secret);
        process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        await assert.rejects(() => migrateSecurity(migrationClient));
        process.env.MFA_ENCRYPTION_KEY = process.env.SECURITY_TEST_MFA_KEY;
    });

    await t.test('local provisioning creates an admin and refuses to promote an existing account', async () => {
        const input = { email: 'provision-' + suffix + '@example.test', name: 'Provision test',
            password: 'Provision-Password!26', role: 'admin', acceptedLicense: true };
        const options = { env: { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'test' },
            input: JSON.stringify(input), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] };
        const output = execFileSync(process.execPath, ['scripts/provision-admin.js'], options);
        assert.ok(!output.includes(input.password));
        assert.throws(() => execFileSync(process.execPath, ['scripts/provision-admin.js'], options));
        const [created] = await sql`SELECT role FROM "user" WHERE email = ${input.email}`;
        assert.equal(created.role, 'admin');
    });

    await t.test('rate limiting uses database buckets and rejects requests after the shared IP ceiling', async () => {
        await resetLimits();
        const results = await Promise.all(Array.from({ length: 31 }, (_, index) => request('/api/mfa/initiate', {
            method: 'POST', body: { email: `rate-${index}-${suffix}@example.test`, password: 'Wrong-Password!27' },
        })));
        assert.equal(results.filter(result => result.status === 401).length, 30);
        assert.equal(results.filter(result => result.status === 429).length, 1);
        const rows = await sql`SELECT count FROM security_rate_limits`;
        assert.ok(rows.some(row => row.count === 31));
        assert.equal((await request('/api/mfa/logout', { method: 'POST', cookie: admin.cookie })).status, 200);
    });

});
````

## Changelog singkat

- Membuat unblinding, perubahan MFA, pembuatan sesi, dan audit trail atomik dalam transaksi yang sama.
- Menolak sesi akun non-platform tanpa organisasi aktif.
- Menyimpan hash password lama sehingga password awal tidak dapat digunakan kembali.
- Menjadikan upload randomization list atomik dan kode randomisasi unik per study.
- Membuat kegagalan migration mencegah readiness aplikasi.
- Membatasi rate limiter auth pada login dan verifikasi challenge sehingga logout tetap tersedia.
- Membuat seed credential manifest dapat digunakan ulang setelah proses seed parsial.
- Menambahkan komentar TODO pada seluruh temuan MINOR tanpa mengubah logikanya.
- Menambahkan integration test untuk rollback audit, tenant, password history, randomization lintas-study, dan rate limiting.
