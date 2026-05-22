-- Migrate sex column: normalize stored values to CDISC SDTM codes (M/F/U)
-- and add separate gender_identity column per FDA 2023 guidance & ICH E3
UPDATE "subjects" SET "sex" = 'M' WHERE "sex" = 'Male';
UPDATE "subjects" SET "sex" = 'F' WHERE "sex" = 'Female';
UPDATE "subjects" SET "sex" = 'U' WHERE "sex" = 'Other' OR "sex" NOT IN ('M', 'F', 'U');
--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "sex" TYPE varchar(1);
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "gender_identity" varchar(50);
