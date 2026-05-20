ALTER TYPE "public"."entry_status" ADD VALUE 'Signed' BEFORE 'Locked';--> statement-breakpoint
CREATE TABLE "account_locks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_locks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text,
	"email" text NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp DEFAULT now() NOT NULL,
	"auto_unlock_at" timestamp,
	"unlocked_at" timestamp,
	"unlocked_by" text,
	"unlock_reason" text,
	CONSTRAINT "account_locks_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "adverse_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "adverse_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"subject_id" integer NOT NULL,
	"ae_term" text NOT NULL,
	"meddra_pt" text,
	"meddra_pt_code" text,
	"meddra_soc" text,
	"meddra_soc_code" text,
	"meddra_version" text,
	"coding_status" text DEFAULT 'Uncoded' NOT NULL,
	"onset_date" text,
	"resolution_date" text,
	"outcome" text,
	"severity" text NOT NULL,
	"is_serious" boolean DEFAULT false NOT NULL,
	"serious_criteria" jsonb DEFAULT '[]',
	"causality" text,
	"action_taken" text,
	"narrative" text,
	"report_status" text DEFAULT 'Draft' NOT NULL,
	"reported_to_sponsor_at" timestamp,
	"reported_to_irb_at" timestamp,
	"requires_expedited_report" boolean DEFAULT false NOT NULL,
	"expedited_deadline" timestamp,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blind_data_reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "blind_data_reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer NOT NULL,
	"review_date" text NOT NULL,
	"status" text DEFAULT 'In Progress' NOT NULL,
	"checklist_json" jsonb DEFAULT '{}' NOT NULL,
	"open_queries" integer DEFAULT 0,
	"missing_critical" integer DEFAULT 0,
	"open_deviations" integer DEFAULT 0,
	"pending_saes" integer DEFAULT 0,
	"notes" text,
	"completed_by" text,
	"completed_by_name" text,
	"completed_at" timestamp,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concomitant_meds" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "concomitant_meds_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"subject_id" integer NOT NULL,
	"drug_name" text NOT NULL,
	"who_drug_name" text,
	"who_drug_code" text,
	"atc_code" text,
	"indication" text,
	"dose" text,
	"dose_unit" text,
	"frequency" text,
	"route" text,
	"start_date" text,
	"stop_date" text,
	"is_ongoing" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delegation_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "delegation_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"site_id" integer,
	"delegated_tasks" jsonb DEFAULT '[]' NOT NULL,
	"delegation_start" text NOT NULL,
	"delegation_end" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"signed_at" timestamp,
	"signed_by_name" text,
	"notes" text,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "esignatures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "esignatures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entry_id" integer,
	"user_id" text,
	"user_name" text,
	"user_role" text,
	"meaning" text NOT NULL,
	"ip_address" text,
	"signed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ie_assessments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ie_assessments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" integer,
	"criteria_json" jsonb DEFAULT '[]' NOT NULL,
	"passed" boolean NOT NULL,
	"assessed_by" text,
	"assessed_by_name" text,
	"assessed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "informed_consents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "informed_consents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"subject_id" integer NOT NULL,
	"consent_version" text NOT NULL,
	"consent_date" text NOT NULL,
	"consent_type" text DEFAULT 'Initial' NOT NULL,
	"language" text DEFAULT 'Indonesian' NOT NULL,
	"witness_name" text,
	"notes" text,
	"amendment_id" integer,
	"is_withdrawn" boolean DEFAULT false NOT NULL,
	"withdrawn_at" timestamp,
	"withdrawn_reason" text,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lab_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"subject_id" integer NOT NULL,
	"visit_id" integer,
	"panel_name" text,
	"test_name" text NOT NULL,
	"test_code" text,
	"specimen_type" text,
	"specimen_collected_at" text,
	"lab_name" text,
	"value_numeric" text,
	"value_text" text,
	"unit" text,
	"ref_range_low" text,
	"ref_range_high" text,
	"ref_range_text" text,
	"abnormality_flag" text,
	"clinical_significance" text DEFAULT 'NCS',
	"is_abnormal" boolean DEFAULT false NOT NULL,
	"assessed_by" text,
	"assessed_by_name" text,
	"assessment_date" text,
	"loinc_coding_status" text DEFAULT 'Custom' NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "login_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"ip_address" text,
	"success" boolean DEFAULT false NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "medical_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"subject_id" integer NOT NULL,
	"condition" text NOT NULL,
	"icd_code" text,
	"icd_version" text DEFAULT 'ICD-10',
	"onset_date" text,
	"resolution_date" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"severity" text,
	"is_related_to_indication" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_visits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monitoring_visits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"visit_date" text NOT NULL,
	"site_id" integer,
	"site_name" text,
	"visit_type" text NOT NULL,
	"cra_id" text,
	"cra_name" text NOT NULL,
	"findings" text,
	"action_items" jsonb DEFAULT '[]',
	"subjects_reviewed" jsonb DEFAULT '[]',
	"status" text DEFAULT 'Draft' NOT NULL,
	"submitted_at" timestamp,
	"acknowledged_by" text,
	"acknowledged_by_name" text,
	"acknowledged_at" timestamp,
	"pi_comments" text,
	"next_visit_date" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "password_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_meta" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_changed_at" timestamp DEFAULT now() NOT NULL,
	"must_change" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_amendments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "protocol_amendments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer NOT NULL,
	"amendment_no" text NOT NULL,
	"effective_date" text NOT NULL,
	"summary" text NOT NULL,
	"changes" text,
	"requires_reconsent" boolean DEFAULT false NOT NULL,
	"reconsent_reason" text,
	"irb_approval_date" text,
	"irb_ref_no" text,
	"status" text DEFAULT 'Draft' NOT NULL,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_deviations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "protocol_deviations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"subject_id" integer,
	"deviation_type" text NOT NULL,
	"category" text,
	"description" text NOT NULL,
	"deviation_date" text,
	"discovery_date" text,
	"root_cause" text,
	"impact_on_subject" text,
	"capa" text,
	"reported_to_irb" boolean DEFAULT false NOT NULL,
	"reported_to_irb_at" timestamp,
	"status" text DEFAULT 'Open' NOT NULL,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_tolerance_limits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quality_tolerance_limits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer NOT NULL,
	"indicator" text NOT NULL,
	"label" text NOT NULL,
	"threshold" text NOT NULL,
	"unit" text DEFAULT '%',
	"alert_level" text DEFAULT 'warning',
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "randomization_list" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "randomization_list_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"rand_code" text NOT NULL,
	"treatment_arm" text NOT NULL,
	"stratum" text,
	"is_used" boolean DEFAULT false NOT NULL,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "randomization_list_rand_code_unique" UNIQUE("rand_code")
);
--> statement-breakpoint
CREATE TABLE "sae_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sae_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ae_id" integer NOT NULL,
	"report_type" text NOT NULL,
	"report_number" integer DEFAULT 1 NOT NULL,
	"day0_date" text NOT NULL,
	"deadline_days" integer NOT NULL,
	"deadline_date" timestamp NOT NULL,
	"submitted_at" timestamp,
	"submission_ref" text,
	"submitted_to" text,
	"narrative" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"submitted_by" text,
	"submitted_by_name" text,
	"signed_by" text,
	"signed_by_name" text,
	"signed_at" timestamp,
	"signing_meaning" text,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdv_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sdv_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"monitoring_visit_id" integer NOT NULL,
	"subject_id" integer,
	"subject_code" text NOT NULL,
	"visit_id" integer,
	"visit_name" text,
	"form_id" integer,
	"form_name" text,
	"sdv_status" text DEFAULT 'Not Reviewed' NOT NULL,
	"discrepancy_note" text,
	"verified_by" text,
	"verified_by_name" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "studies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"protocol_no" text NOT NULL,
	"phase" text,
	"sponsor" text,
	"indication" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "studies_protocol_no_unique" UNIQUE("protocol_no")
);
--> statement-breakpoint
CREATE TABLE "study_db_lock" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "study_db_lock_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"status" text DEFAULT 'Unlocked' NOT NULL,
	"pre_check_json" jsonb DEFAULT '{}',
	"initiated_by" text,
	"initiated_by_name" text,
	"initiated_at" timestamp,
	"cra_signed" boolean DEFAULT false NOT NULL,
	"cra_signed_at" timestamp,
	"cra_signed_by" text,
	"cra_signed_by_name" text,
	"admin_signed" boolean DEFAULT false NOT NULL,
	"admin_signed_at" timestamp,
	"admin_signed_by" text,
	"admin_signed_by_name" text,
	"locked_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "study_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text
);
--> statement-breakpoint
CREATE TABLE "subject_randomization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subject_randomization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" integer NOT NULL,
	"rand_code" text NOT NULL,
	"treatment_arm" text NOT NULL,
	"stratum" text,
	"is_blinded" boolean DEFAULT true NOT NULL,
	"unblinded_at" timestamp,
	"unblinded_by" text,
	"unblind_reason" text,
	"randomized_at" timestamp DEFAULT now() NOT NULL,
	"randomized_by" text,
	"randomized_by_name" text,
	CONSTRAINT "subject_randomization_subject_id_unique" UNIQUE("subject_id"),
	CONSTRAINT "subject_randomization_rand_code_unique" UNIQUE("rand_code")
);
--> statement-breakpoint
CREATE TABLE "system_validation_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "system_validation_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"version" text NOT NULL,
	"validation_date" text NOT NULL,
	"validation_type" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"performed_by" text,
	"summary" text,
	"changes_since" text,
	"approved_by" text,
	"approved_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"training_type" text NOT NULL,
	"training_date" text NOT NULL,
	"expiry_date" text,
	"certificate_ref" text,
	"notes" text,
	"recorded_by" text,
	"recorded_by_name" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sites" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_sites_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"site_id" integer NOT NULL,
	"study_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text
);
--> statement-breakpoint
CREATE TABLE "vital_signs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vital_signs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"study_id" integer,
	"subject_id" integer NOT NULL,
	"visit_id" integer,
	"assessment_date" text NOT NULL,
	"assessment_time" text,
	"position" text DEFAULT 'Sitting',
	"systolic_bp" integer,
	"diastolic_bp" integer,
	"heart_rate" integer,
	"respiratory_rate" integer,
	"temperature" text,
	"temperature_unit" text DEFAULT 'C',
	"weight" text,
	"weight_unit" text DEFAULT 'kg',
	"height" text,
	"height_unit" text DEFAULT 'cm',
	"bmi" text,
	"oxygen_saturation" text,
	"notes" text,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "queries" ADD COLUMN "study_id" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "study_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "site_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "visit_order" integer;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "visit_type" text DEFAULT 'Scheduled';--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "planned_date" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "actual_date" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "window_days" integer;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "study_day" integer;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "window_compliance" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "missed_reason" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "created_by_name" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "form_ids" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "account_locks" ADD CONSTRAINT "account_locks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_locks" ADD CONSTRAINT "account_locks_unlocked_by_user_id_fk" FOREIGN KEY ("unlocked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adverse_events" ADD CONSTRAINT "adverse_events_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adverse_events" ADD CONSTRAINT "adverse_events_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adverse_events" ADD CONSTRAINT "adverse_events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adverse_events" ADD CONSTRAINT "adverse_events_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blind_data_reviews" ADD CONSTRAINT "blind_data_reviews_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blind_data_reviews" ADD CONSTRAINT "blind_data_reviews_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blind_data_reviews" ADD CONSTRAINT "blind_data_reviews_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concomitant_meds" ADD CONSTRAINT "concomitant_meds_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concomitant_meds" ADD CONSTRAINT "concomitant_meds_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concomitant_meds" ADD CONSTRAINT "concomitant_meds_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concomitant_meds" ADD CONSTRAINT "concomitant_meds_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_log" ADD CONSTRAINT "delegation_log_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_log" ADD CONSTRAINT "delegation_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_log" ADD CONSTRAINT "delegation_log_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_log" ADD CONSTRAINT "delegation_log_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esignatures" ADD CONSTRAINT "esignatures_entry_id_crf_data_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."crf_data_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esignatures" ADD CONSTRAINT "esignatures_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ie_assessments" ADD CONSTRAINT "ie_assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ie_assessments" ADD CONSTRAINT "ie_assessments_assessed_by_user_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informed_consents" ADD CONSTRAINT "informed_consents_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informed_consents" ADD CONSTRAINT "informed_consents_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informed_consents" ADD CONSTRAINT "informed_consents_amendment_id_protocol_amendments_id_fk" FOREIGN KEY ("amendment_id") REFERENCES "public"."protocol_amendments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informed_consents" ADD CONSTRAINT "informed_consents_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_assessed_by_user_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_visits" ADD CONSTRAINT "monitoring_visits_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_visits" ADD CONSTRAINT "monitoring_visits_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_visits" ADD CONSTRAINT "monitoring_visits_cra_id_user_id_fk" FOREIGN KEY ("cra_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_visits" ADD CONSTRAINT "monitoring_visits_acknowledged_by_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_meta" ADD CONSTRAINT "password_meta_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_amendments" ADD CONSTRAINT "protocol_amendments_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_amendments" ADD CONSTRAINT "protocol_amendments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_deviations" ADD CONSTRAINT "protocol_deviations_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_deviations" ADD CONSTRAINT "protocol_deviations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_deviations" ADD CONSTRAINT "protocol_deviations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_deviations" ADD CONSTRAINT "protocol_deviations_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_tolerance_limits" ADD CONSTRAINT "quality_tolerance_limits_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_tolerance_limits" ADD CONSTRAINT "quality_tolerance_limits_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "randomization_list" ADD CONSTRAINT "randomization_list_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "randomization_list" ADD CONSTRAINT "randomization_list_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sae_reports" ADD CONSTRAINT "sae_reports_ae_id_adverse_events_id_fk" FOREIGN KEY ("ae_id") REFERENCES "public"."adverse_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sae_reports" ADD CONSTRAINT "sae_reports_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sae_reports" ADD CONSTRAINT "sae_reports_signed_by_user_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sae_reports" ADD CONSTRAINT "sae_reports_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdv_records" ADD CONSTRAINT "sdv_records_monitoring_visit_id_monitoring_visits_id_fk" FOREIGN KEY ("monitoring_visit_id") REFERENCES "public"."monitoring_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdv_records" ADD CONSTRAINT "sdv_records_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdv_records" ADD CONSTRAINT "sdv_records_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdv_records" ADD CONSTRAINT "sdv_records_form_id_crf_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."crf_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdv_records" ADD CONSTRAINT "sdv_records_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studies" ADD CONSTRAINT "studies_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_db_lock" ADD CONSTRAINT "study_db_lock_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_db_lock" ADD CONSTRAINT "study_db_lock_initiated_by_user_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_db_lock" ADD CONSTRAINT "study_db_lock_cra_signed_by_user_id_fk" FOREIGN KEY ("cra_signed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_db_lock" ADD CONSTRAINT "study_db_lock_admin_signed_by_user_id_fk" FOREIGN KEY ("admin_signed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_users" ADD CONSTRAINT "study_users_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_users" ADD CONSTRAINT "study_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_users" ADD CONSTRAINT "study_users_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_randomization" ADD CONSTRAINT "subject_randomization_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_randomization" ADD CONSTRAINT "subject_randomization_unblinded_by_user_id_fk" FOREIGN KEY ("unblinded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_randomization" ADD CONSTRAINT "subject_randomization_randomized_by_user_id_fk" FOREIGN KEY ("randomized_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_validation_log" ADD CONSTRAINT "system_validation_log_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sites" ADD CONSTRAINT "user_sites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sites" ADD CONSTRAINT "user_sites_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queries" ADD CONSTRAINT "queries_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;