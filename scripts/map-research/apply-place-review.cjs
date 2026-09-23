const fs=require('fs'),path=require('path');
const {uuidFrom}=require('./sefaria-utils.cjs');
const root=path.join(__dirname,'../..'),file=path.join(root,'src/components/knowledge/pilot.json');
const p=JSON.parse(fs.readFileSync(file)),g=p.geography;
const cache=path.join(root,'docs/research/source-cache');
const plain=s=>String(s||'').replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/g,'').replace(/<i\b[^>]*class="footnote"[^>]*>[\s\S]*?<\/i>/g,'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim();
const unpoint=s=>plain(s).normalize('NFD').replace(/[\u0591-\u05C7]/g,'');
const find=slug=>g.places.find(x=>x.slug===slug);
function source(label,url,note=''){const id=uuidFrom('place-review:'+url);let c=p.citations.find(c=>c.id===id);if(!c){c={id,label,url,text:'',edition:'',license:'',kind:'secondary',editorialNote:note,textKind:'editorial'};p.citations.push(c);}return id;}
const selectedIds=new Set(g.personPlaces.flatMap(r=>r.sourceIds));
const report={reviewedPlaces:[],sourceResults:[],coordinateChanges:[],caveats:[]};
for(const c of p.citations.filter(c=>selectedIds.has(c.id))){
 if(c.textKind==='verbatim')continue;
 if(c.text&&!c.editorialNote)c.editorialNote=c.text;
 c.text='';c.textKind='editorial';
 if(!c.url.includes('sefaria.org/')){report.sourceResults.push({id:c.id,status:'external-link-editorial-only'});continue;}
 const ref=decodeURIComponent(new URL(c.url).pathname.slice(1)).replace(/_/g,' ');
 const f=path.join(cache,Buffer.from(ref).toString('base64url')+'.json');
 if(!fs.existsSync(f)){report.sourceResults.push({id:c.id,ref,status:'unverified'});continue;}
 const d=JSON.parse(fs.readFileSync(f)),segments=(Array.isArray(d.he)?d.he.flat(Infinity):[d.he]).map(plain).filter(Boolean);
 if(!segments.length)continue;
 c.text=segments.join('\n\n');c.textKind='verbatim';c.edition=d.heVersionTitle||d.versionTitle||c.edition;c.license=d.heLicense||d.license||'';
 c.sourceRef=d.ref;c.checkedAt='2026-09-16';
 // Old text was an editorial summary, not a verified quotation. Do not repeat it automatically.
 c.editorialNote='';
 report.sourceResults.push({id:c.id,ref:d.ref,status:'source-text-retrieved'});
}
for(const c of p.citations){if(c.url.includes('Pirkei_Avot.6.9'))c.editorialNote='המשנה אינה מציינת את שם העיר. הקישור לטבריה נשען על יבמות צו ע״ב, ולא על זיהוי העיר שבמשנה.';}
// The Palestinian Talmud passage names Shimon, not his son. Keep the son's attribution open.
const sheviit=p.citations.find(c=>c.id==='9a3b0783-f49e-5f50-8572-4b22cd76ec64');
if(sheviit){const d=JSON.parse(fs.readFileSync(path.join(cache,Buffer.from('Jerusalem Talmud Sheviit 9:1').toString('base64url')+'.json')));sheviit.text=plain(d.he[12]);sheviit.url='https://www.sefaria.org/Jerusalem_Talmud_Sheviit.9.1.13?lang=he';sheviit.label='ירושלמי שביעית ט, א, הלכה — מעשה רשב״י וטבריה';sheviit.editorialNote='בקטע זה רשב״י מוזכר בשמו; בנו אלעזר אינו נזכר בו במפורש. אין להציג את הקטע כציטוט המוכיח ששניהם רחצו בטבריה.';}
const midrash=JSON.parse(fs.readFileSync(path.join(cache,'extra-2.txt')));
const midrashId=source('בראשית רבה עט, ו — רשב״י ובנו במרחצאות טבריה','https://www.sefaria.org/Bereshit_Rabbah.79.6?lang=he');
Object.assign(p.citations.find(c=>c.id===midrashId),{text:plain(midrash.he),textKind:'verbatim',kind:'primary_rabbinic',edition:midrash.heVersionTitle||'',license:midrash.heLicense||'',editorialNote:'בניגוד להפניה לירושלמי בלבד, המדרש מזכיר את רבי אלעזר בשמו ובהמשך מתאר את רחיצתם בטבריה. זהו המקור לקישור של הבן למקום.'});
for(const r of g.personPlaces){if(r.placeId===find('tiberias').id&&r.personId===p.people.find(x=>x.slug==='elazar-shimon').id){r.state='known';r.activity='רחיצה במרחצאות טבריה אחרי היציאה מהמערה';r.note='בראשית רבה עט, ו מזכיר את רשב״י ובנו רבי אלעזר ואת רחיצתם בטבריה. המקור אינו קובע שהתגוררו בעיר.';r.sourceIds=[midrashId];}if(r.placeId===find('tiberias').id&&r.personId===p.people.find(x=>x.slug==='shimon-yohai').id){r.sourceIds=[...new Set([...r.sourceIds,sheviit.id,midrashId])];r.note='הירושלמי מתאר את ירידת רשב״י למרחצאות טבריה ואת טיהור העיר. בראשית רבה עט, ו מזכיר גם את בנו. בבבלי שבת לג–לד שם העיר אינו מפורש.';}if(/לאמת|דורש אימות|נזקק לאימות/.test(r.note)){r.state='uncertain';}}
const notes={
 lod:'בסנהדרין לב ע״ב מפנים את מבקשי ההוראה לרבי אליעזר בלוד. סוכה כז ע״ב מוסיפה מעשה בביקור תלמידו רבי אלעאי אצל רבו בעיר. אלו עדויות לפעילות תורנית ולמפגש, ולא זיהוי של מבנה בית המדרש.',
 yavne:'בקשת רבן יוחנן בן זכאי לשמר את יבנה וחכמיה מופיעה בגיטין נו ע״ב. מסורות נוספות בפיילוט עוסקות בדיונים ובהוראה ביבנה. קבר המיוחס לרבן גמליאל מוצג בנפרד כמסורת קבורה, ואינו מוכיח מקום מגורים של כל חכם הקשור לעיר.',
 'bnei-brak':'סנהדרין לב ע״ב מפנה אל רבי עקיבא בבני ברק. האתר העתיק מזוהה בחורבת בני ברק שבאזור מסובים, מדרום לעיר המודרנית. המיקום מייצג את האתר, ולא את ביתו של רבי עקיבא.',
 rome:'הברייתא בסנהדרין לב ע״ב מזכירה את רבי מתיא ברומי. במכות כד ע״א מתואר מסע שבו רבי עקיבא וחבריו שומעים את המונה של רומי מרחוק; אין להסיק מכך מגורי קבע בעיר.',
 zippori:'סנהדרין לב ע״ב מזכירה את רבי יוסי בציפורי. כתובות קג ע״ב מתארת את העברת רבי יהודה הנשיא לציפורי בימי מחלתו; אותו דיון מבחין בין מקום פטירתו לבין בית שערים.',
 'bet-shearim':'בית שערים נזכרת כמקום מושבו של רבי יהודה הנשיא. כתובות קג ע״ב מבחינה בינה לבין ציפורי שאליה עבר כשחלה. באתר נשתמר בית קברות נרחב; זיהוי מערה מסוימת כקבר רבי הוא שאלה נפרדת מאזכור המקום בתלמוד.',
 jerusalem:'בפיילוט ירושלים מופיעה בהקשרים שונים: עבודת המקדש, הנהגה תורנית וביקורי חכמים אחרי החורבן. מכות כד ע״ב מתארת את עליית רבי עקיבא וחבריו ואת תגובתם למראה החורבן.',
 tiberias:'טבריה נזכרת בסוף מסלול נדודי הסנהדרין בראש השנה לא ע״ב. בירושלמי שביעית ט, א מסופר על רשב״י, מרחצאות העיר וטיהורה. ביבמות צו ע״ב נזכר רבי יוסי בן קיסמא במעשה בבית הכנסת בטבריה.',
 sikhnin:'בסנהדרין לב ע״ב מופיעה ההפניה לרבי חנינא בן תרדיון בסיכני. הזיהוי הגאוגרפי המקובל הוא סכנין; המקור מציין מקום שאליו פונים לחכם, ולא כתובת של בית מדרש מסוים.',
 pekiin:'בפקיעין קיבל רבי יהושע את רבי יוחנן בן ברוקא ורבי אלעזר חסמא, לפי חגיגה ג ע״א. זיהוי פקיעין זו אינו מוכרע כאן. מסורת מערת רשב״י בפקיעין שבגליל מוצגת בערך נפרד, כדי שלא לאחד שני זיהויים ללא ראיה.',
 'brur-hayil':'סנהדרין לב ע״ב מפנה אל רבן יוחנן בן זכאי לברור חיל. שם המקום מתועד, אך לא נקבע בפיילוט זיהוי גאוגרפי מאומת; אין להעמיד סיכה על היישוב המודרני מכוח דמיון השמות בלבד.',
 antipatris:'ביומא סט ע״א נזכרת אנטיפטריס בסיפור המפגש של שמעון הצדיק ואלכסנדר. שרידי העיר הרומית מזוהים בתל אפק ליד ראש העין. שם המקום שבנוסח התלמודי אינו כשלעצמו ראיה לתאריך הקמת העיר או לשמה בימי אלכסנדר.',
 alexandria:'אלכסנדריה מופיעה במסורות בריחה למצרים: בבבלי סוטה מז ע״א וסנהדרין קז ע״ב בקשר ליהושע בן פרחיה, ובירושלמי חגיגה ב, ב במסורת הקשורה ליהודה בן טבאי. אין לאחד את הדמויות שבמסורות המקבילות.',
 arbel:'באבות א, ו מופיע נתאי הארבלי. הכינוי קושר את החכם לארבל, אך אינו מתאר כתובת או משך מגורים. הסיכה מייצגת את חורבת ארבל ובית הכנסת העתיק שמצפון למושב; בית הכנסת שנותר אינו מיוחס לנתאי.',
 ashkelon:'אשקלון נזכרת במסורות על שמעון בן שטח. המקורות בכרטיס מתעדים את המעשה ואת מקומו, ואינם מעידים ששמעון בן שטח התגורר בעיר.',
 arav:'ערב שבגליל נקשרת במסורות לרבי חנינא בן דוסא ולרבן יוחנן בן זכאי. יש להפריד בין עדויות הפעילות התלמודיות לבין מסורת קברו של רבי חנינא בעראבה, המוצגת בשכבת הקברים.',
 modiim:'הכינוי אלעזר המודעי קושר את החכם למודיעים. אין בו לבדו הוכחה למקום ביתו. זיהוי מודיעים הקדומה נידון במחקר; הנקודה מסמנת הצעה כללית ואינה אתר מגורים מאומת של החכם.',
 beitar:'במסורת הירושלמי על מצור ביתר נזכר רבי אלעזר המודעי. זו עדות סיפורית לפעילות בזמן המצור. זיהוי המקום אינו זיהוי של מבנה או של מקום קבורה.',
 gamzu:'גמזו נזכרת בדברי הימים ב כח, יח. הכינוי נחום איש גם זו דורש הבחנה בין מסורת השם לבין הסבר הכינוי בסיפור התלמודי; אין לקבוע מכוחו לבדו כתובת מגורים.',
 'kfar-hanania':'אבות ג, ו מכנה את רבי חלפתא בן דוסא ״איש כפר חנניה״. משנה שביעית ט, ב מזכירה את כפר חנניה בהגדרת תחומי הגליל. אין לזהות את החכם אוטומטית עם אבא חלפתא, אביו של רבי יוסי.',
 usha:'אושא היא אחת מתחנות הסנהדרין בראש השנה לא ע״ב. בסנהדרין יד ע״א מסופר על הסמכת תלמידים בין אושא לשפרעם; הנקודה העירונית אינה מיקום מדויק של מעשה ההסמכה.',
 'kfar-aziz':'משנה כלאים ו, ד מתארת את רבי יהושע ההולך אצל רבי ישמעאל לכפר עזיז ודן עמו בענייני כרם. עצם הקשר במקור ברור; זיהוי האתר המדויק דורש בירור נפרד.',
 sura:'סורא מזוהה עם מרכז ההוראה של רב בבבל. ברשומות הפיילוט יש הפניות תלמודיות ומחקריות, אך נקודת המפה הקודמת לא לוותה באסמכתה גאוגרפית מדויקת ולכן הוסרה עד לאימות.',
 nehardea:'נהרדעא קשורה לשמואל ולחכמים שבאו לבבל. כתובות קג ע״ב מתארת את הגעת לוי לנהרדעא. נקודת המפה הקודמת לא אומתה מול מקור גאוגרפי ולכן המקום נשמר ברשימה ללא סיכה.',
 caesarea:'קיסרין היא קיסריה שעל חוף הים התיכון. קשרי החכמים בכרטיס נבחנים לפי כל מעשה ומקור בנפרד; אין להסיק מגורי קבע מכל אזכור של ביקור או הלכה שנמסרה בעיר.',
 akhbara:'בבבא מציעא פד ע״ב נזכרים בני עכבריא במעשה הקשור לרבי אלעזר בן רבי שמעון לאחר פטירתו. זו אינה ראיה בפני עצמה למגורים בחייו. יש להפריד גם בין רבי ינאי האמורא לבין רבי ינאי הנזכר באבות.',
 sidon:'צידן מזוהה עם צידון שעל חוף לבנון. המפה מציגה עוגן עירוני כללי למסורות על חכמים בעיר; מיקומם של בית מדרש או בית פרטי אינו ידוע מן האזכור העירוני.',
 babylon:'בבל במקורות החכמים היא מרחב גאוגרפי, ולא תמיד העיר בבל העתיקה. לכן אזכור כללי של בבל נשמר בלי סיכה עירונית מטעה; מקומות מסוימים כגון סורא ונהרדעא מקבלים ערכים נפרדים.',
 'horbat-dabura':'חורבת דבורה נמצאת בגולן, ואין לערבבה עם דבורייה שבגליל. הכתובת הקשורה לבית מדרשו של רבי אליעזר הקפר היא עדות ארכאולוגית; הפניה לדף נושא כללי אינה תחליף לפרסום הכתובת.',
 socho:'אנטיגנוס איש סוכו נזכר באבות א, ג. הזיקה המקומית נשענת על כינויו. יש יותר מאתר אחד בשם סוכו, ולכן לא נבחרה נקודה ללא הכרעה מבוססת.',
 tzeredah:'יוסי בן יועזר איש צרדה נזכר באבות א, ד. שם המקום נשמר בערך, אך הזיהוי הגאוגרפי המדויק לא הוכרע בפיילוט.',
 bartota:'רבי אלעזר איש ברתותא נזכר באבות ג, ז. הכינוי מספק זיקה למקום; אין במאגר אסמכתה מספקת לזיהויו עם יישוב מודרני מסוים.',
 'kfar-ha-bavli':'אבות ד, כ מכנה את רבי יוסי בר יהודה ״איש כפר הבבלי״. אין להסיק מן השם שהכפר נמצא בבבל, ולא הונחה סיכה ללא מקור לזיהויו.',
 asia:'אסיא מופיעה במסורות הקשורות לסוף חייו של רבי מאיר. הזיהוי הגאוגרפי אינו מוכרע כאן. מסורת קברו בטבריה היא רשומה נפרדת, ואינה מכריעה לבדה את זיהוי אסיא.',
 tekoa:'תקוע מופיעה בהפניה לבית מדרשו של רבי שמעון. יש לדון בזיהוי תקוע שבמסורת זו בנפרד מתקוע המקראית; נשמרה רשומה ללא נקודה מועדפת.',
 emmaus:'בסיפורי רבי אלעזר בן ערך מופיעים השמות דיומסת, דמסית ואמאוס בנוסחים שונים. הדמיון בין המסורות אינו קובע שכל אתר המכונה אמאוס הוא מועמד לאותו סיפור. הוסרה ההצעה אל־קביבה, שלא לוותה כאן במקור מתאים.',
};
const familiar=new Set(['jerusalem','tiberias','lod','yavne','rome','alexandria','ashkelon','sidon','caesarea']);
for(const place of g.places){
 if(notes[place.slug])place.overview=notes[place.slug];
 place.identificationDetail=!familiar.has(place.slug)||place.identification!=='identified';
 place.overviewSourceIds=[...new Set(g.personPlaces.filter(r=>r.placeId===place.id).flatMap(r=>r.sourceIds))];
 place.coordinatePrecision=place.locations.length?'site-area':'unlocated';
 report.reviewedPlaces.push({slug:place.slug,status:'content-and-location-review',sources:place.overviewSourceIds.length});
}
const arbel=find('arbel');arbel.locations=[{id:'arbel',lng:35.48381,lat:32.81514,label:'חורבת ארבל',disputed:false}];arbel.sourceIds.push(source('רשות הטבע והגנים — ארבל ובית הכנסת העתיק','https://www.parks.org.il/reserve-park/arbel/'),source('OpenStreetMap דרך Mapcarta — מיקום בית הכנסת בארבל','https://mapcarta.com/N7475333785'));arbel.identificationNote='חורבת ארבל, ליד שרידי בית הכנסת שמצפון למושב. הסיכה אינה פסגת ההר או המערות שבמצוק.';
find('antipatris').sourceIds.push(source('רשות הטבע והגנים — תל אפק (אנטיפטריס)','https://www.parks.org.il/reserve-park/yarkon-3/'));
for(const slug of ['sura','nehardea','babylon']){const place=find(slug);report.coordinateChanges.push({slug,old:place.locations,reason:'No verified point; area is not a precise settlement coordinate'});place.locations=[];place.coordinatePrecision='unlocated';place.identification='unresolved';place.identificationNote=slug==='babylon'?'אזור גאוגרפי, לא נקודת יישוב.':'המקום ידוע במקורות; טרם אומתה נקודה מדויקת למפה.';}
find('emmaus').locations=find('emmaus').locations.filter(l=>l.id==='emmaus-nicopolis');find('emmaus').identification='unresolved';
find('horbat-dabura').today='חורבת דבורה ברמת הגולן';
// Separate the Galilean cave tradition from the unresolved place of R. Joshua.
const holy=JSON.parse(fs.readFileSync(path.join(cache,'holy-sites.json')));
const cave=holy.find(r=>r.post_id===13174);
let cp=find('pekiin-galilee');if(!cp){cp={id:uuidFrom('place:pekiin-galilee'),slug:'pekiin-galilee',name:'פקיעין בגליל — מערת רשב״י',today:'פקיעין בגליל',overview:'לפי מסורת מקומית, במערה שבפקיעין הסתתרו רשב״י ובנו רבי אלעזר. הבבלי בשבת לג ע״ב מתאר את ההסתתרות במערה אך אינו נוקב בשם פקיעין. הזיהוי הגלילי מתועד במקורות מאוחרים ובאתר המועצה המקומית.',identification:'traditional',identificationDetail:true,identificationNote:'מסורת זיהוי של המערה; אין זו הכרעה בזיהוי פקיעין של רבי יהושע.',locations:[{id:'pekiin-cave',lng:cave.lng,lat:cave.lat,label:'מערת רשב״י — מסורת',disputed:true}],sourceIds:[source('מועצת פקיעין — מסורת מערת רשב״י','https://peqiin.muni.il/page/109'),source('המרכז למקומות הקדושים — המעיין והמערה',cave.permalink)]};g.places.push(cp);}
const caveText=p.citations.find(c=>c.url.includes('Shabbat.33b'));
for(const slug of ['shimon-yohai','elazar-shimon']){const person=p.people.find(x=>x.slug===slug);const id=uuidFrom('cave-tradition:'+slug);if(!g.personPlaces.some(r=>r.id===id))g.personPlaces.push({id,personId:person.id,placeId:cp.id,activity:'הסתתרות במערה — מסורת זיהוי',importance:'meaningful',start:null,end:null,periodIds:['usha','rebbi'],sourceIds:[...cp.sourceIds,caveText.id],note:'סיפור המערה תלמודי; זיהוי המערה עם פקיעין שבגליל נשען על מסורת המקום. אין לערבב עם פקיעין של רבי יהושע.',state:'traditional',timeNote:'הקשר לתקופת החכם; ללא תאריך מדויק.',importanceNote:'מסורת מקומית על אירוע מרכזי בחיי החכם.',relationshipType:'event'});}
// Exact site coordinates are those published by the official site operator.
const matches={13215:['shimon-netanel'],13214:['shimon-menasya'],13204:['yochanan-sandlar'],13200:['yehuda-tema'],13196:['dosa-harkinas'],13195:['elazar-modai'],13194:['elazar-arakh'],13193:['eliezer-yaakov'],13180:['akavya'],13178:['nittai'],13172:['levi'],13169:['yose-kisma'],1498:['shemaya','avtalyon'],1481:['matya'],1444:['hanina-dosa'],1443:['chiyya'],1424:['abba-shaul'],1409:['hananya-akashya'],1408:['abba-halafta','yose-avot4'],1410:['tarfon'],1420:['shimon-elazar'],1416:['hillel'],1383:['elazar-shimon'],1390:['rebbi'],1391:['yonatan-uziel'],1393:['akiva'],1397:['shimon-yohai'],1032:['shimon-tzadik']};
const burials=Object.entries(matches).map(([id,slugs])=>{const r=holy.find(x=>x.post_id===Number(id));if(!r)throw Error(id);return {id:'burial-'+id,name:plain(r.title),personIds:slugs.map(s=>p.people.find(x=>x.slug===s).id),location:{lng:r.lng,lat:r.lat},area:plain(r.address),state:'tradition',sourceIds:[source('המרכז הארצי לפיתוח המקומות הקדושים — '+plain(r.title),r.permalink)],note:Number(id)===1390?'מסורת ציון בציפורי. יש להבחין בינה לבין מסורת הקבורה בבית שערים שבכתובות קג ע״ב.':'ציון קבר לפי מסורת הזיהוי המפורסמת באתר המרכז למקומות הקדושים. עצם קיום הציון אינו הוכחה ארכאולוגית לזהות הנקבר.'};});
g.burials=burials;
const roadSource=source('המכון הישראלי לארכיאולוגיה — רשת הדרכים הרומית, סעיף הדרכים הראשיות','https://www.israeliarchaeology.org/רשת-הדרכים-הרומית-האימפריאלית-בארץ-יש/');
g.roads=[
 {id:'lod-emmaus-jerusalem',name:'לוד–אמאוס–ירושלים',coordinates:[[34.893068,31.950908],[34.987,31.839],[35.105,31.81],[35.166,31.797],[35.234167,31.776667]]},
 {id:'antipatris-lod',name:'אנטיפטריס–לוד',coordinates:[[34.9305,32.1048],[34.893068,31.950908]]},
 {id:'zippori-tiberias',name:'ציפורי–טבריה',coordinates:[[35.279123,32.753079],[35.41,32.78],[35.541973,32.785741]]},
].map(r=>({...r,sourceIds:[roadSource],start:70,end:400,periodIds:['yavne','akiva','usha','rebbi','transition','amora2'],note:'ציר מקשר סכמטי בין תחנות הנזכרות במחקר; אינו תוואי מדוד או מסלול הליכה. טווח התקופה כללי, לא תאריך סלילה מוכח.'}));
g.coverage.peopleWithPlaces=new Set(g.personPlaces.map(r=>r.personId)).size;
fs.writeFileSync(file,JSON.stringify(p));
const geographicFile=path.join(root,'public/maps/levant-features.geojson'),geo=JSON.parse(fs.readFileSync(geographicFile));
const natural=JSON.parse(fs.readFileSync(path.join(cache,'galilee-natural-earth.json'))).features[0];
geo.features.find(f=>f.id==='sea-of-galilee').geometry=natural.geometry;
geo.attribution='Sea of Galilee: Natural Earth 1:10m lakes (public domain). Other regional context remains schematic.';
fs.writeFileSync(geographicFile,JSON.stringify(geo,null,2));
report.caveats=['Road lines are schematic links, not surveyed routes. Bnei Brak/Yavne connections await route verification.','Tomb identities are site traditions, not archaeological determinations.','Sura, Nehardea and Babylon no longer have unsupported exact pins.','Source retrieval proves wording, not every historical inference; uncertain links remain marked.'];
fs.writeFileSync(path.join(root,'docs/research/place-review.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({places:g.places.length,burials:burials.length,roads:g.roads.length,sources:report.sourceResults.length}));
