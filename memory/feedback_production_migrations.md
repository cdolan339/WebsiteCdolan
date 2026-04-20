---
name: Production migrations via pgAdmin, not Node scripts
description: User cannot run Node migration scripts in production — always provide raw SQL for pgAdmin alongside any schema change
type: feedback
---

The user cannot run `node src/db/migrate-*.js` scripts against production. The only way to apply schema changes in prod is by pasting SQL into pgAdmin's Query Tool.

**Why:** Production database is only reachable via pgAdmin, not via the backend's local dev tooling.

**How to apply:** Whenever a schema change is introduced (new column, new table, new index), always provide the raw SQL alongside any migration file. When summarizing "what migrations need to run," list them as SQL blocks ready to paste into pgAdmin, not as `node ...` commands. Do not assume seeding logic from migration scripts (e.g., the WTH team seed in migrate-teams.js) applies to production — production has different users.
