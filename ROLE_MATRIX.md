# E-CRF Role Access Matrix

Reference: ICH GCP E6(R3) · 21 CFR Part 11 · Bioclinica EDC Standard

---

## Roles

| Role ID | Display Name | Description |
|---------|-------------|-------------|
| `admin` | Administrator | EDC Developer / Data Manager — full system access, manages studies/sites/users, initiates DB Lock |
| `pi` | Principal Investigator | Site PI — read/write/sign for their site, manages delegation, acknowledges monitoring visits |
| `investigator` | Investigator | Sub-investigator — read/write for clinical data at their site, no sign-off authority |
| `cra` | CRA / Monitor | Clinical Research Associate — read-only on patient data, raises queries, conducts SDV, creates monitoring visit reports, signs DB Lock |
| `crc` | Study Coordinator | CRC / Study Coordinator — data entry (subjects, AE, deviations, consents), answers queries |
| `data_manager` | Data Manager | DM — data oversight and cleaning: raises/closes queries, runs pre-lock checks and initiates DB Lock, blind data review, data exports, monitoring/SAE report visibility. No clinical data entry, no e-signature authority, no user/site/study management. |

---

## Navigation Access (Sidebar Tabs)

| Module | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Subjects | ✓ | ✓ | ✓ | ✓ | ✓ |
| Adverse Events | ✓ | ✓ | ✓ | ✓ | ✓ |
| Deviations | ✓ | ✓ | ✓ | ✓ | ✓ |
| Consent | ✓ | ✓ | ✓ | ✓ | ✓ |
| Randomization | ✓ | ✓ | ✓ | — | — |
| Queries | ✓ | ✓ | ✓ | ✓ | ✓ |
| Audit Trail | ✓ | ✓ | — | ✓ | — |
| DB Lock | ✓ | ✓ | — | ✓ | — |
| Delegation | ✓ | ✓ | — | ✓ | — |
| SAE Reports | ✓ | ✓ | — | ✓ | — |
| Monitoring | ✓ | ✓ | — | ✓ | — |
| Sites | ✓ | — | — | — | — |
| Studies | ✓ | — | — | — | — |

---

## Write Permissions by Action

### Subjects
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| Enroll new subject | ✓ | ✓ | ✓ | — | ✓ |
| Change subject status (withdraw etc.) | ✓ | ✓ | ✓ | — | — |
| I/E Assessment | ✓ | ✓ | ✓ | — | — |

### Adverse Events
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| View AE list | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create AE | ✓ | ✓ | ✓ | — | ✓ |
| Update AE | ✓ | ✓ | ✓ | — | ✓ |
| Report AE to Sponsor/IRB | ✓ | ✓ | ✓ | — | — |
| Close AE | ✓ | ✓ | — | — | — |

### Protocol Deviations
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| View deviations | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create deviation | ✓ | ✓ | ✓ | — | ✓ |
| Update deviation | ✓ | ✓ | ✓ | — | ✓ |
| Report to IRB | ✓ | ✓ | ✓ | — | — |
| Advance status (CAPA / Close) | ✓ | ✓ | — | — | — |

### Informed Consent
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| View consents | ✓ | ✓ | ✓ | ✓ | ✓ |
| Record consent | ✓ | ✓ | ✓ | — | ✓ |
| Withdraw consent | ✓ | ✓ | ✓ | — | — |

### Randomization
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| View randomization | ✓ | ✓ | ✓ | ✓ | — |
| Upload randomization list | ✓ | — | — | — | — |
| Randomize subject | ✓ | ✓ | ✓ | — | — |
| Unblind subject | ✓ | — | — | — | — |

### Data Queries
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| View queries | ✓ | ✓ | ✓ | ✓ | ✓ |
| Raise query | ✓ | — | — | ✓ | — |
| Resolve/answer query | ✓ | ✓ | ✓ | — | ✓ |
| Close query | ✓ | — | — | ✓ | — |

### SAE Expedited Reports (ICH E2A)
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| View SAE reports | ✓ | ✓ | — | ✓ | — |
| Create SAE report | ✓ | ✓ | — | ✓ | — |
| Submit SAE report | ✓ | ✓ | — | ✓ | — |

### Monitoring Visits & SDV (ICH GCP §5.18)
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| View monitoring visits | ✓ | ✓ | — | ✓ | — |
| Create monitoring visit | ✓ | ✓ | — | ✓ | — |
| Submit visit report | ✓ | ✓ | — | ✓ | — |
| Acknowledge visit (PI sign-off) | ✓ | ✓ | — | — | — |
| Add/update SDV records | ✓ | ✓ | — | ✓ | — |

### Delegation Log & Training (ICH GCP §4.1.5)
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| View delegation log | ✓ | ✓ | — | ✓ | — |
| Create delegation entry | ✓ | ✓ | — | — | — |
| Sign own delegation entry | ✓ | ✓ | ✓ | ✓ | ✓ |
| Record training | ✓ | ✓ | — | — | — |
| View training records | ✓ | ✓ | — | ✓ | — |

### Database Lock (21 CFR Part 11)
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| Initiate DB Lock | ✓ | ✓ | — | — | — |
| Run pre-lock checks | ✓ | ✓ | — | ✓ | — |
| Sign as CRA | ✓ | ✓ | — | ✓ | — |
| Sign as Admin/DM | ✓ | ✓ | — | — | — |

### Study & Site Management
| Action | admin | pi | investigator | cra | crc |
|--------|:-----:|:--:|:------------:|:---:|:---:|
| Create/edit studies | ✓ | — | — | — | — |
| Assign users to study | ✓ | — | — | — | — |
| Create/edit sites | ✓ | — | — | — | — |

---

## Data Manager (`data_manager`) Grants

The DM role mirrors the data-oversight subset of admin, per the backend route guards:

| Area | Allowed actions |
|------|-----------------|
| Queries | Raise query, close query |
| Audit Trail | View (read-only) |
| Database Lock | Run pre-lock checks, initiate DB Lock, sign as CRA-slot |
| Subjects | View status overview (Data Status) |
| Monitoring | View visits, create visits, SDV summary |
| SAE Reports | View, create, submit |
| Delegation & Training | View logs and training records |
| Blind Data Review | Create and update review records |
| QTL | Record and update threshold breaches |
| Monitoring Plan / Essential Docs / Amendments | View and maintain |
| Export | CSV and ODM-XML export |
| IP Dispensing | Record dispensing |

Not granted: clinical data entry (CRF/AE/deviations/consents), subject enrollment or status changes, e-signatures on CRFs, final DB Lock admin signature, randomization, user/site/study management.

---

## Rationale for Key Decisions

- **CRA is Read-Only on clinical data** — CRA's role is verification (SDV), not data creation. They raise queries when data is wrong but do not edit it directly.
- **CRC can create subjects, AE, deviations, consents** — Data entry is the CRC's primary job. Clinical decisions (withdrawals, closing AEs, CAPA closure) remain with PI.
- **CRC can answer queries** — Queries are raised by CRA about CRC's data entries; CRC is the correct person to resolve them.
- **CRA cannot initiate DB Lock** — DB Lock initiation is a Data Manager function. CRA participates by signing, confirming their monitoring review is complete.
- **CRA cannot close AEs or advance deviation status** — These are clinical governance decisions requiring medical judgment (PI/admin).
- **Randomization write is PI/investigator only** — Randomization is a clinical act requiring medical authority.
- **Unblind is admin only** — Emergency unblinding should go through the DM/admin to maintain data integrity.
