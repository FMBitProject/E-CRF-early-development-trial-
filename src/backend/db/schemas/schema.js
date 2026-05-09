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
    subjectId:               integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    aeTerm:                  text('ae_term').notNull(),
    meddraPt:                text('meddra_pt'),
    meddraSoc:               text('meddra_soc'),
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

export const queryStatusEnum = pgEnum('query_status', ['Open', 'Resolved', 'Closed']);

export const queries = pgTable('queries', {
    id:             integer('id').primaryKey().generatedAlwaysAsIdentity(),
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
