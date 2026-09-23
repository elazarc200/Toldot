import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {read,norm,hash} from '../lib.mjs';

// Reproducible sidecar: inputs and the application are never changed.
const out=path.dirname(fileURLToPath(import.meta.url));
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const baseline=read('master-sages.json');
const initialReview=read('manual-review-identities.json').records;
const records=new Map([...baseline.sages,...initialReview].map(r=>[r.identity_key,structuredClone(r)]));
const entries=read('hyman-entries.json');
const audit=[],redirects=new Map(),inventory=[],quarantine=[];
const normalized=s=>norm(s).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').trim();
const unique=a=>[...new Map(a.map(x=>[JSON.stringify(x),x])).values()];
const decision=(action,keys,basis,evidence)=>audit.push({decision_id:hash(JSON.stringify({action,keys,basis})).slice(0,20),action,identity_keys:keys,basis,evidence});
const sources=r=>(r.secondary_identity_evidence||[]).map(x=>x.url).filter(Boolean);
const resolve=k=>redirects.has(k)?resolve(redirects.get(k)):k;
// Explicit collective headings belong in a reference inventory, never one person
// per collective. Preserve named members separately wherever identified.
for(const r of [...records.values()])if(/^(בית |בני |רבנן|חכמי|זקני|זקנים הראשונים|אנשי ירושלים)/.test(r.canonical_name_he||'')){
  inventory.push({...r,record_kind:'collective_or_family_heading',counted_as_person:false});records.delete(r.identity_key);
  decision('exclude_collective_from_person_count',[r.identity_key],'Collective, school, family or institutional heading does not identify a single individual.',{heading:r.canonical_name_he,sources:sources(r),entry_text:r.hyman_entry_text||null});
}
function merge(into,from,basis,evidence,{quarantinePrimary=false,quarantineReason='Topic profile identifies a Tanna but its tagged passages mix homonymous sages; passage attribution requires separate assessment.'}={}){
  const a=records.get(into),b=records.get(from);if(!a||!b)throw Error('Missing merge input '+from);
  if(quarantinePrimary){quarantine.push(...b.primary_chazal_evidence.map(e=>({original_identity_key:from,reason:quarantineReason,evidence:e})));b.primary_chazal_evidence=[];}
  for(const f of ['aliases','secondary_identity_evidence','classification_assertions','generation','region_assertions','notes'])a[f]=unique([...(a[f]||[]),...(b[f]||[])]);
  a.primary_chazal_evidence=unique([...a.primary_chazal_evidence,...b.primary_chazal_evidence]);
  a.adjudicated_source_records=[...(a.adjudicated_source_records||[]),{identity_key:from,person_id:b.person_id,external_ids:b.external_ids}];
  // Do not silently transfer relationships, dates or disputed passage attribution.
  a.untransferred_source_fields=[...(a.untransferred_source_fields||[]),{identity_key:from,teachers:b.teachers,students:b.students,birth_year:b.birth_year,death_year:b.death_year,reason:'Retained for separate assertion-level assessment.'}];
  if(b.hyman_entry_text)a.hyman_entry_text=[a.hyman_entry_text,b.hyman_entry_text].filter(Boolean).join('\n\n');
  if(!a.classification)a.classification=b.classification;
  if(a.region==='unknown'&&b.region!=='unknown')a.region=b.region;
  for(const [key,value] of Object.entries(b.external_ids||{}))if(!a.external_ids[key])a.external_ids[key]=value;
  a.notes.push(basis);records.delete(from);redirects.set(from,into);decision('merge_source_records', [into,from],basis,evidence);
}

// Bibliographic cross-references are not additional people. In particular,
// “Avtalyon: see Shemaiah” does NOT assert that Avtalyon is Shemaiah.
for(const r of [...records.values()]){
  if(!/^(heiman:|hyman-section:)/.test(r.identity_key)||r.classification)continue;
  const body=(r.hyman_entry_text||'').replace(/<br\s*\/?\s*>/gi,'').replace(/^\s*==[^\n]*==\s*/,'').trim();
  if(/^ערך\s+[^\n]{1,160}[.。]?\s*$/.test(body)){
    inventory.push({...r,record_kind:'bibliographic_cross_reference',counted_as_person:false,reference_target_text:body,linkage_status:'not_an_identity_equivalence'});
    records.delete(r.identity_key);decision('reclassify_reference', [r.identity_key],'Entry contains only a bibliographic see-reference; it does not establish a separate person or identity equivalence.',{text:body,sources:sources(r)});
  }
}
for(const key of ['heiman:333268','heiman:1709734']){
  const r=records.get(key);if(!r)throw Error('Missing inspected index '+key);
  inventory.push({...r,record_kind:'name_index_multiple_patronymics',counted_as_person:false});records.delete(key);
  decision('reclassify_name_index',[key],'Inspected entry lists bearers of patronymics, not a biography of one additional Abaye/Rava.',{text:r.hyman_entry_text,sources:sources(r),transclusion:r.reference_transclusion});
}

const h1=entries.find(e=>e.key==='hyman-section:6a7a011a93c2cdc831d9');
const h2=entries.find(e=>e.key==='hyman-section:4decc833698eed172c3a');
if(h1.parts.at(-1).page+1!==h2.parts[0].page||!h1.text.endsWith('היה')||!h2.text.startsWith('רבו מובהק'))throw Error('Continuity evidence changed');
const continuity={volume:'II',pages:[67,75],boundary:h1.text.slice(-180)+' '+h2.text.slice(0,100),sources:[...h1.parts,...h2.parts].map(p=>p.url),profile:'https://www.sefaria.org/topics/rabbi-chanina-b-chama',identity_context:'Babylonia to Eretz Israel; pupil of Rabbi; Sepphoris; teacher of Rabbi Johanan.'};
merge('sefaria:rabbi-chanina-b-chama',h1.key,'Hyman biography of Hanina bar Hama matches the named person and the independently recorded migration, teacher and location.',continuity);
merge('sefaria:rabbi-chanina-b-chama',h2.key,'Continuation of the same Hyman biography: consecutive printed pages and a sentence split at pages 72–73, not another person.',continuity);

for(const [target,from,ref,context] of [
  ['bonayich:1122','heiman:1716914','Berakhot 48b:10','Full name, explicit pupil of Rabbi Ishmael and the same statement transmitted in his name.'],
  ['bonayich:2945','heiman:334423','Kiddushin 16b:16','Totai is explicitly the speaker of the baraita interpreting lo as excluding a creditor.']
]){
  const a=records.get(target),b=records.get(from),e=a.primary_chazal_evidence.find(e=>e.ref===ref);
  if(!e||!b.hyman_entry_text)throw Error('Missing manually compared passage '+target);
  merge(target,from,'Same named speaker, same cited primary passage and matching reported teaching; Hyman explicitly identifies a Tanna.',{context,primary:e,reference_text:b.hyman_entry_text,sources:sources(b)});
}

// Recover explicit classifications missed by the old parser because they occur
// in a heading or parenthetical subtitle. "Tanna" as an academy reciter is not
// a historical-period classification. Preserve textual variants as review cases.
for(const r of records.values()){
  const e=entries.find(e=>e.key===r.hyman_section_key||e.key===r.identity_key);if(!e)continue;
  const text=e.text.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').replace(/\{\{קטן\|([^{}]*)\}\}/g,'$1').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g,'$1').replace(/<[^>]*>/g,'');
  const heading=text.match(/^\s*==([^\n]+)==/)?.[1]||'';
  const body=text.replace(/^\s*==[^\n]+==\s*/,'').trim();
  const match=heading.match(/\((תנא|אמורא)(?:\s|\))/)||body.match(/^\((תנא|אמורא)(?:\s|\))/)||body.match(/^(האמורא) הגדול הזה/);
  if(!match||/לא היה אמורא|לא היה תנא|שונה ברייתות|התנא בישיבת/.test(body.slice(0,250)))continue;
  const classification=match[1].includes('אמורא')?'Amora':'Tanna';
  const evidence={kind:'hyman_1910_explicit_classification',url:e.parts[0].url,volume:e.volume,section:e.title,quotation:heading+'\n'+body.slice(0,250)};
  if(!r.classification){
    r.classification=classification;r.classification_assertions.push({value:classification,source:evidence});r.secondary_identity_evidence.push(evidence);
    r.review_reasons=r.review_reasons.filter(x=>!x.startsWith('Tanna/Amora classification not established')&&!x.startsWith('Reference identifies a person/contemporary'));
    if(e.identity_caution)r.review_reasons.push('Hyman entry contains textual-variant or identity cautions; explicit classification does not resolve those cautions.');
    decision('recover_explicit_classification',[r.identity_key],'Historical classification stated in the entry heading or parenthetical subtitle; not inferred from corpus or honorific.',evidence);
  }else if(r.classification!==classification){r.classification_assertions.push({value:classification,source:evidence});r.review_reasons.push('Hyman explicit classification conflicts with another identity source.');decision('retain_classification_conflict',[r.identity_key],'Conflicting source assertions retained for adjudication.',evidence);}
}

for(const [target,from,ref] of [
  ['bonayich:2248','heiman:375057','Berakhot 48b:13'],
  ['bonayich:1013','heiman:1710626','Berakhot 53b:31']
]){
  const a=records.get(target),b=records.get(from);if(!a.primary_chazal_evidence.some(e=>e.ref===ref)||!b.primary_chazal_evidence.some(e=>e.ref===ref))throw Error('Missing common primary anchor');
  merge(target,from,'Inspected Hyman biography and independently tagged record identify the same named speaker and the same teaching in the same baraita.',{ref,reference_text:b.hyman_entry_text,sources:sources(b)});
}
merge('sefaria:rabbi-shimon-b-nannas','hewiki:1660265','Wikipedia explicitly identifies Shimon ben Nanas with the appellation Ben Nanas; matching halakhic positions and source-attested aliases.',{source:'https://he.wikipedia.org/w/index.php?oldid=34665669',quotation:'שמעון בן ננס המכונה גם סתם בן ננס',primary_refs:['Mishnah Shevuot 7:5','Mishnah Menachot 4:3']});
merge('sefaria:rabbi-shimon-b-nannas','hyman-section:124d2997a10ed63e2545','Hyman heading explicitly equates Shimon ben Nanas with the unqualified Ben Nanas; matching Mishnah teaching.',{source:'https://he.wikisource.org/w/index.php?oldid=2847863',quotation:'ר׳ שמעון בן ננס (תנא דמשנה) או סתם בן ננס.',primary_ref:'Mishnah Menachot 4:3'});
const avtolmos=records.get('hyman-section:564fa80f4e95b13da093');
if(avtolmos){const rejected=avtolmos.primary_chazal_evidence.filter(e=>['Bava Batra 68a:7','Sanhedrin 87b:17'].includes(e.ref));avtolmos.primary_chazal_evidence=avtolmos.primary_chazal_evidence.filter(e=>!rejected.includes(e));quarantine.push(...rejected.map(e=>({original_identity_key:avtolmos.identity_key,reason:'Patronymic occurrence in the names Shimon/Yonatan ben Avtolmos does not independently establish identity with this Avtolmos.',evidence:e})));decision('quarantine_patronymic_assignments',[avtolmos.identity_key],'Retain Eruvin 36a:4, which names Avtolmos himself; do not infer identity of fathers from patronymic matches.',{retained_ref:'Eruvin 36a:4',rejected_refs:rejected.map(e=>e.ref)});}

// Person profile identity is supported independently; its topic's NER is not.
merge('hewiki:960270','sefaria:rabbi-yitzhak','The Tanna profile describes the Babylonian contemporary of Rabbi associated with Rabbi Natan. Preserve the Wikipedia Tanna identity and quarantine the mixed Sefaria passage assignments.',{
  sources:['https://he.wikipedia.org/w/index.php?oldid=41598077','https://www.sefaria.org/topics/rabbi-yitzhak'],
  retained_primary_refs:records.get('hewiki:960270').primary_chazal_evidence.map(e=>e.ref),
  counterexamples:['Avodah Zarah 7b:1 explicitly says Yitzhak of Kefar Akko, reporting Rabbi Johanan.','Avodah Zarah 8b:12 explicitly says Yitzhak bar Avdimi.','Zevachim 96b:2 explicitly says Rav Yitzhak bar Yehudah.'],
  generation_note:'T4 in Wikipedia versus T5 in Sefaria retained as source-dependent periodization; no numeric harmonization.'
},{quarantinePrimary:true});

for(const [target,from,ref,context] of [
  ['hewiki:623688','bonayich:515','Chullin 18b:12','Amemar bar Mar Yenuka reports Rav Hiyya bar Rav Avya; the full patronymic and sole cited teaching coincide.'],
  ['sefaria:rabbi-aphes','hewiki:686115','Ketubot 103b:9','Successor to Rabbi as academy head, preceding Hanina bar Hama; shared succession narrative and first generation.'],
  ['sefaria:rabbi-pappeyas','hewiki:2136877','Mishnah Eduyot 7:6','Same witness describing a peace-offering cow and its offspring. Source-dependent generation numbering is retained.'],
  ['hewiki:1892381','bonayich:2441','Bava Kamma 19b:6','Same Rav Eina passage; also shared independently attributed Chullin, Moed Katan, Rosh Hashanah, Sanhedrin and Sukkah passages.']
]){const a=records.get(target),b=records.get(from);if(!a.primary_chazal_evidence.some(e=>e.ref===ref)||!b.primary_chazal_evidence.some(e=>e.ref===ref))throw Error('Missing inspected identity anchor '+ref);merge(target,from,'Inspected name variant plus matching primary teaching and biographical context.',{ref,context,sources:[...sources(a),...sources(b)]});}
merge('hewiki:2159073','bonayich:1032','Zechariah ben Kevutal in Mishnah Yoma 1:6 and the explicitly discussed variant of that same name in Yoma 19b:6 identify the same Temple reader.',{sources:['https://he.wikipedia.org/w/index.php?oldid=37402019'],primary_refs:['Mishnah Yoma 1:6','Yoma 19b:6'],note:'No conclusion about disputed priestly descent is added.'});
merge('sefaria:rabbi-yose-b-dormasqit','hewiki:935832','Full name and Damascus origin, migration and study under Rabbi Eliezer agree; the bare Hebrew ר in Sefaria is an abbreviation, not a distinct person.',{sources:['https://www.sefaria.org/topics/rabbi-yose-b-dormasqit','https://he.wikipedia.org/w/index.php?oldid=41196819'],primary_refs:['Tosefta Orlah 1:8','Kiddushin 39a:4'],note:'T4 and Wikipedia third-generation classification retained with their separate schemes.'});
merge('hewiki:995178','sefaria:rav-aha','The Sefaria biography describes the Lod-based fourth-generation Palestinian colleague of Yehudah ben Pazzi. This matches Rabbi Aha (Amora), but the tagged Bavli passages also overlap the Tanna Aha and are quarantined.',{sources:['https://www.sefaria.org/topics/rav-aha','https://he.wikipedia.org/w/index.php?oldid=43171482'],retained_primary_refs:records.get('hewiki:995178').primary_chazal_evidence.map(e=>e.ref),negative_identity:'Distinct from the Tanna at hewiki:1351820.'},{quarantinePrimary:true,quarantineReason:'Aha topic biography and tagged passages are inconsistent; preserve the Lod Amora profile but review the mixed passage assignments separately.'});

// Remove only mechanically disproved duplicate flags. A missing transcription
// or unknown classification on another candidate is NOT sufficient to merge it.
const retired=new Set(inventory.map(r=>r.identity_key));
for(const r of records.values()){
  r.review_reasons=(r.review_reasons||[]).filter(reason=>{
    if(!reason.startsWith('Possible duplicate identity: '))return true;
    const keys=reason.slice('Possible duplicate identity: '.length).split(', ');
    const unresolved=keys.filter(k=>!retired.has(k)&&resolve(k)!==r.identity_key);
    if(unresolved.length)return true;
    decision('remove_false_duplicate_flag',[r.identity_key,...keys],'Competing record is a bibliographic pointer/index or has been merged on documented evidence.',{old_reason:reason});return false;
  });
  if(!r.canonical_name_he&&r.external_ids?.sefaria_slug){
    const filename='raw/topic-details/'+encodeURIComponent(r.external_ids.sefaria_slug)+'.json';
    try{const t=read(filename);const title=t.titles?.find(x=>x.lang==='he'&&x.primary)||t.titles?.find(x=>x.lang==='he');if(title){r.canonical_name_he=title.text;decision('recover_source_name',[r.identity_key],'Recover Hebrew display name from source title; no identity merge.',{source:'https://www.sefaria.org/topics/'+r.external_ids.sefaria_slug,title});}}catch{}
  }
  for(const field of ['teachers','students'])for(const rel of r[field]||[])if(rel.target_identity_key){rel.target_identity_key=resolve(rel.target_identity_key);rel.target_person_id=records.get(rel.target_identity_key)?.person_id||null;}
}

let pairs=read('suspected-duplicates.json').pairs.flatMap(d=>{
  const keys=[...new Set(d.identity_keys.map(resolve))].filter(k=>records.has(k));
  // A shared empty display name has no evidentiary significance.
  if(keys.length<2||('name'in d&&!normalized(d.name)))return [];
  if(keys.every(k=>records.get(k).canonical_name_he)&&'name'in d&&keys.every(k=>normalized(records.get(k).canonical_name_he)!==normalized(d.name)))return [];
  return [{...d,identity_keys:keys}];
});
pairs=unique(pairs);
// Newly discovered candidates differing only in honorifics: neither identical
// spelling nor different titles settle identity. Do not count both as resolved.
for(const keys of [
  ['bonayich:336','hewiki:1247827'],['sefaria:rav-bivi','bonayich:599'],
  ['bonayich:1101','hewiki:1233120'],['hewiki:921215','bonayich:1315'],
  ['hewiki:991992','bonayich:1486'],['bonayich:1660','bonayich:1659'],
  ['sefaria:rav-mesharshiya','bonayich:2207'],['bonayich:2759','hewiki:63201']
]){pairs.push({identity_keys:keys,basis:'Honorific variant or shared short name; distinct upstream IDs and different attributed passages do not by themselves prove distinct people.',shared_primary_ref:null});decision('reopen_identity_comparison',keys,'New duplicate audit found an unresolved person-versus-name distinction; remove both candidates from definitive person counts pending contextual resolution.',{sources:keys.flatMap(k=>sources(records.get(k))),primary_refs:keys.map(k=>({key:k,refs:records.get(k).primary_chazal_evidence.map(e=>e.ref)}))});}
// Keep the Tanna/Amora distinction as an explicit negative identity assertion.
const yitzhak=records.get('hewiki:960270');
yitzhak.notes.push('Distinct from the Amora discussion at Hebrew Wikipedia page 699587. Tagged passages from the former Sefaria Tanna profile are quarantined, not reassigned to the Amora en masse.');
decision('keep_distinct',['hewiki:960270','hewiki:699587'],'Tanna and Amora sources explicitly distinguish the identities; the Amora page still requires finer homonym attribution.',{sources:['https://he.wikipedia.org/w/index.php?oldid=41598077','https://he.wikipedia.org/?curid=699587']});
pairs=pairs.filter(d=>!(d.identity_keys.includes('hewiki:960270')&&d.identity_keys.includes('hewiki:699587')));
const amoraYitzhak=records.get('hewiki:699587');
if(amoraYitzhak){amoraYitzhak.review_reasons=amoraYitzhak.review_reasons.filter(x=>!x.includes('sefaria:rabbi-yitzhak'));amoraYitzhak.review_reasons.push('The Amora reference discusses Yitzhak ben Pinhas and Yitzhak ben Aha; passage-level attribution and the scope of the biography require review.');}

// Reconcile dangling duplicate reasons against the actual surviving pair list.
for(const r of records.values())r.review_reasons=r.review_reasons.filter(x=>!x.startsWith('Possible duplicate identity: '));
for(const d of pairs)for(const k of d.identity_keys)records.get(k).review_reasons.push('Possible duplicate identity: '+d.identity_keys.filter(x=>x!==k).join(', '));
const master=[],review=[];
for(const r of records.values()){
  r.review_reasons=[...new Set(r.review_reasons)];
  const classes=new Set(r.classification_assertions.map(x=>x.value).filter(Boolean));
  if(classes.size>1&&!r.review_reasons.some(x=>/Tanna\/Amora/.test(x)))r.review_reasons.push('Conflicting Tanna/Amora assertions require adjudication.');
  const okay=['Tanna','Amora'].includes(r.classification)&&r.primary_chazal_evidence.length&&r.review_reasons.length===0;
  const kinds=new Set(r.secondary_identity_evidence.map(x=>x.kind));
  r.confidence=okay?(kinds.has('hebrew_wikipedia')&&(kinds.has('sefaria_identity')||kinds.has('hyman_1910_transcription'))?'high':'medium'):'manual_review';
  r.identity_status=okay?'resolved':'needs_review';r.knowledge_state=okay?'known':'disputed';
  r.lifecycle_status='research_only';
  (okay?master:review).push(r);
}
const triage=review.map(r=>({identity_key:r.identity_key,person_id:r.person_id,name:r.canonical_name_he,classification:r.classification,priority:r.classification&&r.primary_chazal_evidence.length?1:r.primary_chazal_evidence.length?2:3,issues:[...(!r.classification?['classification_not_established']:[]),...(!r.primary_chazal_evidence.length?['primary_identity_anchor_missing']:[]),...(pairs.some(p=>p.identity_keys.includes(r.identity_key))?['possible_duplicate']:[]),...(r.review_reasons.some(x=>/Shared|Several|Multiple/.test(x))?['shared_reference_or_homonym']:[])],review_reasons:r.review_reasons,primary_refs:r.primary_chazal_evidence.map(e=>e.ref),secondary_sources:sources(r),next_step:!r.primary_chazal_evidence.length?'Read cited primary passage and establish which individual it identifies.':!r.classification?'Find explicit period/status and contextual identity evidence; occurrence in a Talmud is not enough.':'Compare competing biographies and passage-level identities; do not merge on name alone.'}));
triage.sort((a,b)=>a.priority-b.priority||a.identity_key.localeCompare(b.identity_key));
const counts={tannaim:master.filter(r=>r.classification==='Tanna').length,amoraim:master.filter(r=>r.classification==='Amora').length,amoraim_eretz_israel:master.filter(r=>r.classification==='Amora'&&r.region==='Eretz Israel').length,amoraim_babylonia:master.filter(r=>r.classification==='Amora'&&r.region==='Babylonia').length,amoraim_mixed_unknown:master.filter(r=>r.classification==='Amora'&&['mixed','unknown'].includes(r.region)).length,total_unique_sages:master.length,high_confidence_identities:master.filter(r=>r.confidence==='high').length,medium_confidence_identities:master.filter(r=>r.confidence==='medium').length,manual_review_candidate_records:review.length,suspected_duplicate_pairs:pairs.length,suspected_duplicate_candidate_records:new Set(pairs.flatMap(x=>x.identity_keys)).size,records_with_direct_primary_chazal_evidence:master.filter(r=>r.primary_chazal_evidence.length).length,bibliographic_inventory_records:inventory.length,merged_source_records:redirects.size,quarantined_primary_assignments:quarantine.length};
save('master-sages.json',{...baseline,schema_version:'toladot-research-census-2',scope:'Source-backed resolved subset after documented adjudication; not a claim that all historical identities have been resolved.',counts,sages:master});
save('manual-review-identities.json',{count_unit:'candidate records, NOT people',records:review});
save('bibliographic-inventory.json',{count_unit:'reference records, NOT people',records:inventory});
save('adjudication-audit.json',audit);save('identity-redirects.json',Object.fromEntries(redirects));save('quarantined-primary-assignments.json',quarantine);save('review-queue.json',triage);save('suspected-duplicates.json',{pairs});save('counts.json',counts);
save('change-report.json',{baseline:baseline.counts,current:counts,promoted_from_review:master.filter(r=>initialReview.some(x=>x.identity_key===r.identity_key)).map(r=>({identity_key:r.identity_key,name:r.canonical_name_he})),demoted_from_master:review.filter(r=>baseline.sages.some(x=>x.identity_key===r.identity_key)).map(r=>r.identity_key),input_conservation:{input:baseline.sages.length+initialReview.length,output:master.length+review.length+inventory.length+redirects.size}});
console.log(JSON.stringify(counts,null,2));
