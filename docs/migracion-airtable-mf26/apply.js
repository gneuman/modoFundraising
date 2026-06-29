// Apply: lee dry-run-report.json y ejecuta los patches contra Airtable.
require('dotenv').config({ path: '.env.local' });
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT })
  .base(process.env.AIRTABLE_BASE_ID);

const report = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dry-run-report.json'), 'utf8')
);

(async () => {
  const log = [];
  for (const r of report) {
    const entry = { name: r.name, startup: null, founder: null };
    if (Object.keys(r.startupPatch).length > 0) {
      try {
        await base('Startups MF26').update(r.startupId, r.startupPatch);
        entry.startup = { ok: true, fields: Object.keys(r.startupPatch) };
        console.log(`✓ ${r.name} | Startup ${r.startupId} actualizado (${Object.keys(r.startupPatch).length} campos)`);
      } catch (e) {
        entry.startup = { ok: false, error: e.message };
        console.log(`✗ ${r.name} | Startup ERROR: ${e.message}`);
      }
    } else {
      entry.startup = { ok: true, skipped: true };
    }

    if (r.founderId && Object.keys(r.founderPatch).length > 0) {
      try {
        await base('Founders MF26').update(r.founderId, r.founderPatch);
        entry.founder = { ok: true, fields: Object.keys(r.founderPatch) };
        console.log(`✓ ${r.name} | Founder ${r.founderId} actualizado`);
      } catch (e) {
        entry.founder = { ok: false, error: e.message };
        console.log(`✗ ${r.name} | Founder ERROR: ${e.message}`);
      }
    } else {
      entry.founder = { ok: true, skipped: true };
    }
    log.push(entry);
  }

  fs.writeFileSync(
    path.join(__dirname, 'apply-log.json'),
    JSON.stringify(log, null, 2)
  );
  console.log('\nLog saved to docs/migracion-airtable-mf26/apply-log.json');
})().catch(e => { console.error(e); process.exit(1); });
