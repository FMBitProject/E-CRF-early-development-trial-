import {
    pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, varchar
} from 'drizzle-orm/pg-core';

// ─── Better Auth required tables ────────────────────────────────────────────

export const user = pgTable('user', {
    id:            text('id').primaryKey(),
    name:          text('name').notNull(),
    email:         text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image:         text('image'),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
    updatedAt:     timestamp('updated_at').notNull().defaultNow(),
    role:          varchar('role', { length: 20 }).notNull().default('investigator'),
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

// ─── Studies / Trials (Tier 4 multi-study isolation) ────────────────────────

export const studies = pgTable('studies', {
    id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
    title:       text('title').notNull(),
    protocolNo:  text('protocol_no').notNull().unique(),
    phase:       text('phase'),          // Phase I | II | III | IV | N/A
    sponsor:     text('sponsor'),
    indication:  text('indication'),
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
    name:      text('name').notNull(),
    code:      varchar('code', { length: 20 }).notNull().unique(),
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
    sex:            varchar('sex', { length: 10 }),
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
    notes:            text('notes'),
    createdByName:    text('created_by_name'),
    status:           visitStatusEnum('status').notNull().default('Scheduled'),
    createdAt:        timestamp('created_at').notNull().defaultNow(),
    updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

export const crfForms = pgTable('crf_forms', {
    id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
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

export const auditActionEnum = pgEnum('audit_action', ['INSERT', 'UPDATE', 'DELETE', 'LOCK', 'UNLOCK', 'LOGIN', 'LOGOUT']);

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
    consentType:     text('consent_type').notNull().default('Initial'),
    language:        text('language').notNull().default('Indonesian'),
    witnessName:     text('witness_name'),
    notes:           text('notes'),
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
    randCode:          text('rand_code').notNull().unique(),
    treatmentArm:      text('treatment_arm').notNull(),
    stratum:           text('stratum'),
    isUsed:            boolean('is_used').notNull().default(false),
    uploadedBy:        text('uploaded_by').references(() => user.id),
    uploadedAt:        timestamp('uploaded_at').notNull().defaultNow(),
});

export const subjectRandomization = pgTable('subject_randomization', {
    id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId:        integer('subject_id').notNull().unique().references(() => subjects.id),
    randCode:         text('rand_code').notNull().unique(),
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
