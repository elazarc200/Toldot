import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),prev=path.join(dir,'../adjudication-v2');
const read=f=>JSON.parse(fs.readFileSync(path.join(prev,f),'utf8'));
const write=(f,d)=>fs.writeFileSync(path.join(dir,f),JSON.stringify(d,null,2)+'\n');
const old=read('master-sages.json'),oldReview=read('manual-review-identities.json').records;
const records=new Map([...old.sages,...oldReview].map(r=>[r.identity_key,structuredClone(r)]));
const redirects=new Map(),audit=[],archive=[];
const unique=a=>[...new Map(a.map(x=>[JSON.stringify(x),x])).values()];
const chase=k=>redirects.has(k)?chase(redirects.get(k)):k;
const source=r=>r.secondary_identity_evidence.map(s=>s.url).filter(Boolean);
function merge(target,from,reason,manualAnchor=null){
 const a=records.get(target),b=records.get(from);if(!a||!b)throw Error('Missing '+from);
 const shared=a.primary_chazal_evidence.filter(e=>b.primary_chazal_evidence.some(f=>f.ref===e.ref));if(!shared.length&&!manualAnchor)throw Error('Missing independent common passage '+from);
 if(manualAnchor&&!a.primary_chazal_evidence.concat(b.primary_chazal_evidence).some(e=>e.ref===manualAnchor.ref))throw Error('Missing manual anchor text');
 archive.push(structuredClone(b));
 for(const f of ['aliases','secondary_identity_evidence','classification_assertions','generation','region_assertions','notes','primary_chazal_evidence'])a[f]=unique([...(a[f]||[]),...(b[f]||[])]);
 if(!a.classification)a.classification=b.classification;
 if(a.region==='unknown'&&b.region!=='unknown')a.region=b.region;
 for(const [k,v]of Object.entries(b.external_ids||{}))if(!a.external_ids[k])a.external_ids[k]=v;
 a.adjudicated_source_records=[...(a.adjudicated_source_records||[]),{identity_key:from,person_id:b.person_id,external_ids:b.external_ids}];
 a.untransferred_source_fields=[...(a.untransferred_source_fields||[]),{identity_key:from,teachers:b.teachers,students:b.students,birth_year:b.birth_year,death_year:b.death_year,reason:'Assertion-level assessment remains separate; full source record retained in merged-source-records.json.'}];
 if(b.hyman_entry_text)a.hyman_entry_text=[a.hyman_entry_text,b.hyman_entry_text].filter(Boolean).join('\n\n');
 a.review_reasons=unique([...a.review_reasons,...b.review_reasons]);
 records.delete(from);redirects.set(from,target);
 audit.push({action:'same_person',target,from,reason,primary_comparison:shared.map(e=>({ref:e.ref,excerpt:e.excerpt,url:e.url})),manual_source_comparison:manualAnchor,secondary_sources:unique([...source(a),...source(b)]),status:'decided'});
}
// Each case below was compared with the cached biography and the named speaker
// in the cited primary context. The list is deliberately not a name-only rule.
for(const [a,b,reason]of [
 ['sefaria:sumkhos','hewiki:705260','Both identify Rabbi Meir’s pupil, with the same rulings on tzerorot and disputed money.'],
 ['sefaria:rabbi-zerika','hewiki:868307','Amora, pupil of Rabbi Abbahu and colleague of Rabbi Jeremiah; identical transmission through Rabbi Ammi in Berakhot. Distinct from the Tanna mentioned in the Wikipedia article.'],
 ['sefaria:amemar','hewiki:564731','NeHardea judge/academy leader and contemporary of Rav Ashi, with matching legal discussions; not Amemar bar Mar Yenuka.'],
 ['sefaria:karna','hewiki:726906','Judge in Nehardea associated with Samuel; the same Samuel–Karna narrative and legal statements.'],
 ['sefaria:zeiri','hewiki:873785','The Babylonian-born pupil of Rabbi Johanan in Eretz Israel; shared transmitted rulings. Numbered earlier Zeiri identities are not merged.'],
 ['hewiki:909608','sefaria:ilfa','The same named speaker of the damages and slaughter rulings, identified in the biography as Rabbi Johanan’s colleague.'],
 ['hewiki:1249954','sefaria:eifa','Same Eifa in the Shevuot 28b discussion; biography identifies the fourth-generation pupil of Rabbah and brother of Avimi.'],
 ['hewiki:21945','sefaria:beruriah','The same named woman in Eruvin 53b and Pesachim 62b; traditional identification as Rabbi Meir’s wife retained.'],
 ['hewiki:21945','hyman-section:725d7e52d3342919f1d7','Same traditional Beruriah biography and independently cited Eruvin/Pesachim passages.'],
 ['hewiki:454827','sefaria:admon','Admon/Admon ben Gaddai, the Jerusalem judge explicitly named in Ketubot 105a; not a name-only equivalence.'],
 ['hewiki:2068021','sefaria:peleimu','Same named Tanna and the same passages in Kiddushin, Menachot and Sotah; source spelling variants preserved.'],
 ['hewiki:872421','bonayich:2198','Same Meremar, with matching Bava Batra, Beitzah and Berakhot passages and Mar Zutra context.'],
 ['bonayich:1062','heiman:1710734','Hyman explicitly cites Hiyya bar Ammi transmitting Hulphana in Arakhin 28b; the independently tagged segment matches.'],
 ['bonayich:584','heiman:334679','Bali, pupil of Hiyya bar Abba, with the same teacher chain and matching Taanit, Berakhot, Shabbat and Avodah Zarah passages.'],
 ['bonayich:296','heiman:333526','Full patronymic Aha bar Rav, Ravina interlocutor, with multiple matching primary passages; family/late-generation interpretations remain source assertions.'],
 ['hewiki:1351434','bonayich:22764','Same Shabbethai transmitting Hezekiah’s ruling in Bava Batra, plus matching Ketubot and Sanhedrin passages.'],
 ['hewiki:1903107','hyman-section:8d131248dc56d400f4f4','Same Haga, Ulla interlocutor in Avodah Zarah 68a, and matching Moed Katan passages.']
])merge(a,b,reason);

merge('hewiki:222053','sefaria:chutspit-the-translator','Hyman explicitly identifies the unqualified Hutzpit of Sheviit 10:6 with Hutzpit the interpreter.',{ref:'Mishnah Sheviit 10:6',reference_text:records.get('hewiki:222053').hyman_entry_text});
merge('hewiki:1325860','bonayich:1750','The Wikipedia biography quotes the same Mishnah statement in full and explicitly documents split/combined spelling of Hali-kofri.',{ref:'Mishnah Makhshirin 1:3',source:'https://he.wikipedia.org/w/index.php?oldid=41195566',matching_context:'Rabbi Joshua transmits Abba Yose Hali Kofri of Tivon on intended wetting of produce.'});
merge('hewiki:222043','sefaria:rabbi-yeshevav','The biographical source identifies Yeshevav the scribe as Rabbi Joshua’s pupil and Rabbi Akiva’s colleague; this matches the named teacher chain and interaction in Mishnah Chullin 2:4.',{ref:'Mishnah Chullin 2:4',source:'https://he.wikipedia.org/w/index.php?oldid=41433931',matching_context:'Yeshevav transmits Rabbi Joshua’s rule distinguishing neveilah/tereifah and Rabbi Akiva concedes.'});
merge('bonayich:430','heiman:333722','Full name and the exact Mikvaot chapter-end disagreement match the Hyman entry.',{ref:'Mishnah Mikvaot 2:10',reference_text:records.get('heiman:333722').hyman_entry_text});
for(const [key,ref]of [
 ['bonayich:430','Mishnah Mikvaot 2:10'],
 ['sefaria:nechamiah-of-beit-deli','Mishnah Eduyot 8:5'],
 ['sefaria:rabbi-yehoshua-ben-beteira','Mishnah Parah 2:5'],
 ['bonayich:21661','Mishnah Oholot 3:5']
]){const r=records.get(key),e=r.primary_chazal_evidence.find(e=>e.ref===ref);if(!e)throw Error('Missing explicit Mishnah teaching');r.classification='Tanna';r.classification_assertions.push({value:'Tanna',source:{kind:'primary_named_mishnaic_teaching',url:e.url},quotation:e.excerpt,assessment:'Named legal authority speaking in the Mishnah, or an explicit Mishnah transmission of his ruling; not mere narrative mention.'});audit.push({action:'classify_named_mishnaic_authority',identity_key:key,status:'decided',ref,quotation:e.excerpt,source:e.url,reason:'Explicit named legal teaching in the Mishnah establishes a Tannaitic authority; generation remains unknown.'});}

// Identity and historical classification are different questions.
const ash=records.get('heiman:333890');
const incorrect=ash.classification_assertions.filter(a=>a.value==='Tanna');
archive.push({record_kind:'rejected_classification_assertions',identity_key:ash.identity_key,assertions:incorrect});
ash.classification_assertions=ash.classification_assertions.filter(a=>a.value!=='Tanna');ash.classification=null;
audit.push({action:'correct_role_vs_period',identity_key:ash.identity_key,status:'decided',reason:'תנא דרבי אמי denotes the reciter attached to Rabbi Ammi, not membership in the historical Tannaitic period.',source_text:ash.hyman_entry_text,primary_ref:'Berakhot 14a:7',rejected_assertions:incorrect});
merge('bonayich:574','heiman:333890','Same Ashyan asking Rabbi Ammi the fasting question in Berakhot 14a:7. Amora classification retained from the independent identity dataset; Hyman’s tanna is his teaching role.');

merge('sefaria:rav-hinak','hewiki:835438','Same otherwise rarely attested school of Rav/Bar Hinak in Pesachim 101b:3. The identity is one; the reference explicitly says whether he was Tanna or Amora is unknown.');
const hinak=records.get('sefaria:rav-hinak');hinak.classification=null;hinak.identity_resolution='resolved';hinak.classification_resolution='unresolved';
hinak.notes.push('Do not classify from contradictory Wikipedia category membership. The article explicitly says that the historical period is unknown.');
hinak.review_reasons=['Historical classification unresolved: source explicitly states uncertainty between Tanna and Amora.'];
audit.push({action:'one_person_period_unknown',identity_key:hinak.identity_key,status:'identity_decided',reason:hinak.review_reasons[0],sources:source(hinak),primary_ref:'Pesachim 101b:3'});

let pairs=read('suspected-duplicates.json').pairs.map(p=>({...p,identity_keys:[...new Set(p.identity_keys.map(chase))]})).filter(p=>p.identity_keys.length>1);pairs=unique(pairs);
const master=[],review=[];
for(const r of records.values()){
 r.review_reasons=r.review_reasons.filter(x=>!x.startsWith('Possible duplicate identity:'));
 if(r.classification)r.review_reasons=r.review_reasons.filter(x=>!x.startsWith('Tanna/Amora classification not established')&&!x.startsWith('Reference identifies a person/contemporary'));
 if(r.primary_chazal_evidence.length)r.review_reasons=r.review_reasons.filter(x=>!x.startsWith('No primary Chazal passage independently attributed'));
 for(const p of pairs.filter(p=>p.identity_keys.includes(r.identity_key)))r.review_reasons.push('Possible duplicate identity: '+p.identity_keys.filter(k=>k!==r.identity_key).join(', '));
 if(r.classification&&new Set(r.classification_assertions.map(x=>x.value).filter(Boolean)).size>1)r.review_reasons.push('Conflicting Tanna/Amora source classifications.');
 r.review_reasons=unique(r.review_reasons);
 for(const f of ['teachers','students'])for(const rel of r[f]||[])if(rel.target_identity_key){rel.target_identity_key=chase(rel.target_identity_key);rel.target_person_id=records.get(rel.target_identity_key)?.person_id||null;}
 const okay=r.classification&&r.primary_chazal_evidence.length&&!r.review_reasons.length;
 const kinds=new Set(r.secondary_identity_evidence.map(x=>x.kind));
 r.confidence=okay?(kinds.has('hebrew_wikipedia')&&(kinds.has('sefaria_identity')||kinds.has('hyman_1910_transcription'))?'high':'medium'):'manual_review';r.identity_status=okay?'resolved':'needs_review';r.lifecycle_status='research_only';r.knowledge_state=okay?'known':'disputed';
 (okay?master:review).push(r);
}
const count=(type,region)=>master.filter(r=>r.classification===type&&(!region||region.includes(r.region))).length;
const counts={tannaim:count('Tanna'),amoraim:count('Amora'),amoraim_eretz_israel:count('Amora',['Eretz Israel']),amoraim_babylonia:count('Amora',['Babylonia']),amoraim_mixed_unknown:count('Amora',['mixed','unknown']),total_unique_sages:master.length,high_confidence_identities:master.filter(r=>r.confidence==='high').length,medium_confidence_identities:master.filter(r=>r.confidence==='medium').length,manual_review_candidate_records:review.length,suspected_duplicate_pairs:pairs.length,suspected_duplicate_candidate_records:new Set(pairs.flatMap(p=>p.identity_keys)).size,records_with_direct_primary_chazal_evidence:master.filter(r=>r.primary_chazal_evidence.length).length};
write('master-sages.json',{...old,schema_version:'toladot-research-census-3',counts,sages:master});write('counts.json',counts);write('manual-review-identities.json',{count_unit:'candidate records, not people',records:review});write('suspected-duplicates.json',{pairs});write('adjudication-audit.json',audit);write('identity-redirects.json',Object.fromEntries(redirects));write('merged-source-records.json',archive);
write('change-report.json',{baseline:old.counts,current:counts,merged_this_pass:redirects.size,promoted_from_review:master.filter(r=>oldReview.some(x=>x.identity_key===r.identity_key)).map(r=>({identity_key:r.identity_key,name:r.canonical_name_he})),identity_decided_period_unknown:[hinak.identity_key],input_conservation:{input:old.sages.length+oldReview.length,output:master.length+review.length+redirects.size}});
console.log(JSON.stringify(counts,null,2));
