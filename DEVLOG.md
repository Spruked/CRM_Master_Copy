# CRM Dev Log

## 2026-05-31

### Startup + Runtime Reliability
- Added/verified launcher flow via `start_cali_crm.bat`:
  - first-run desktop shortcut (`CALI CRM.lnk`)
  - first-run icon generation from `CLAI CRMLOGO.png`
  - Windows logon auto-start registration (`CALI_CRM_Autostart`)
- Verified runtime after restart:
  - CRM API `http://127.0.0.1:21000/health`
  - CRM frontend `http://127.0.0.1:21010`

### Shared Substrate Contact Authority
- Confirmed Prime Mail and CRM contact alignment through shared substrate DB:
  - `R:/R_Drive_Substrate/crm/memory/cali_personal.db`
- Fixed Windows fallback path normalization so CRM does not resolve to stale WSL-style paths when launched on Windows Python.

### CSV Import Hardening
- Updated Phase 1C importer for resilient parsing:
  - case-insensitive headers
  - encoding fallback (`utf-8-sig`, `utf-16*`, `cp1252`, `latin-1`)
  - delimiter sniffing (`,`, `;`, tab, `|`)
- Verified merge-first dedupe behavior on re-import (`created: 0`, `merged/updated > 0`).

### CRM Operations Hub Improvements
- Added **Personal** workspace tab while keeping **Leads** pipeline separate.
- Added **Today Plan** panel in overview:
  - personal top reminders
  - top lead follow-ups
  - external inbox signal
- Added quick actions:
  - personal task: `Complete`, `Snooze 1d`
  - lead: `Advance`, `Revert`
  - inbox item: `Create Follow-up` task
- Verified frontend build after each change (`vite build` passes).

### ORB Interop Confirmation
- Confirmed ORB readiness + CRM operations access:
  - mesh/manifest valid
  - CRM tools available and working (`orb.crm.contacts.search`, `orb.crm.pipeline.status`)
  - authority contract preserved (CRM contact authority, Prime Mail mail authority, ORB operator layer)

### Repo Hardening (Fresh GitHub Instance)
- Confirmed standalone repo remote:
  - `origin` -> `https://github.com/Spruked/CRM_Master_Copy.git`
- Added root `.gitignore` to prevent tracking runtime/editor/dependency artifacts.
- Removed tracked generated content from index:
  - `node_modules/`
  - `.vscode/`
  - `.startup_initialized`
  - `_tmp_contacts_import.csv`
- Preserved source and template files (`.env.example`, `frontend/.env.example`) while keeping secret/runtime `.env*` ignored.
