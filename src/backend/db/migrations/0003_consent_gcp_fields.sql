-- Informed consent: fields required by ICH GCP E6(R3) §4.8 that the initial
-- schema omitted. Idempotent so it is safe to re-run on existing on-prem DBs.
--
--  consent_time     §4.8.8  — consent must precede any study procedure; on
--                             same-day screening the date alone cannot evidence it
--  obtained_by      §4.1.5  — investigator/delegate who conducted the consent
--                             discussion, distinct from whoever keyed the record
--  witness_type     §4.8.9  — impartial witness (illiterate subject) vs. LAR vs.
--                             parent/guardian carry different regulatory meaning
--  assent_*         §4.8.12 — assent of minors / subjects unable to fully consent
--  copy_provided    §4.8.11 — subject must receive a signed copy of the ICF

ALTER TABLE "informed_consents" ADD COLUMN IF NOT EXISTS "consent_time" text;
--> statement-breakpoint
ALTER TABLE "informed_consents" ADD COLUMN IF NOT EXISTS "obtained_by" text;
--> statement-breakpoint
ALTER TABLE "informed_consents" ADD COLUMN IF NOT EXISTS "obtained_by_name" text;
--> statement-breakpoint
ALTER TABLE "informed_consents" ADD COLUMN IF NOT EXISTS "witness_type" text;
--> statement-breakpoint
ALTER TABLE "informed_consents" ADD COLUMN IF NOT EXISTS "assent_obtained" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "informed_consents" ADD COLUMN IF NOT EXISTS "assent_date" text;
--> statement-breakpoint
ALTER TABLE "informed_consents" ADD COLUMN IF NOT EXISTS "copy_provided" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "informed_consents"
        ADD CONSTRAINT "informed_consents_obtained_by_user_id_fk"
        FOREIGN KEY ("obtained_by") REFERENCES "user"("id");
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
