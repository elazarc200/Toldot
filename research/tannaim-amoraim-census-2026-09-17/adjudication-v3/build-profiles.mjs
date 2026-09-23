import {readLocal, writeLocal, extractProfileFields} from './research-lib.mjs';

const review = readLocal('manual-review-identities.json').records;
const triage = readLocal('research-triage.json');
const profiles = {};
for (const r of review) {
  profiles[r.identity_key] = {
    ...extractProfileFields(r),
    triage: triage.records?.[r.identity_key] || triage[r.identity_key] || null
  };
}
writeLocal('research-profiles.json', {
  generated_at: new Date().toISOString(),
  count: Object.keys(profiles).length,
  profiles
});
console.log('Built', Object.keys(profiles).length, 'identity profiles');
