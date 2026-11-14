(() => {
const $ = id => document.getElementById(id);
const STORE = "koyomi_events_v2", PREFS = "koyomi_prefs_v2", PHOTO_DB = "koyomi_photo_db";
const presets = [{name:"ラベンダー",color:"#9b8bd7"},{name:"ローズ",color:"#d98fae"},{name:"ミント",color:"#72b9a5"},{name:"スカイ",color:"#78a9d5"},{name:"ピーチ",color:"#e6a27f"},{name:"レモン",color:"#c5b45e"},{name:"ネイビー",color:"#64769f"},{name:"モノトーン",color:"#777783"}];
let events = loadEvents(), now = new Date(), shown = new Date(now.getFullYear(),now.getMonth(),1), prefs = loadPrefs(), photoUrl = null, toastTimer;
function loadEvents(){try{return JSON.parse(localStorage.getItem(STORE)||"[]")}catch{return []}}
function saveEvents(){localStorage.setItem(STORE,JSON.stringify(events));$("saveIndicator").textContent="✓ 保存しました"}
function loadPrefs(){try{return {...{accent:"#9b8bd7",opacity:18,blur:0,fontScale:"normal",showWeekends:true,showOutside:true,compactMode:false,weekStart:0},...JSON.parse(localStorage.getItem(PREFS)||"{}")}}catch{return {accent:"#9b8bd7",opacity:18,blur:0,fontScale:"normal",showWeekends:true,showOutside:true,compactMode:false,weekStart:0}}}
function savePrefs(){localStorage.setItem(PREFS,JSON.stringify(prefs));applyPrefs()}
function hexRgb(hex){let n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255]}
function mix(hex,amt){let [r,g,b]=hexRgb(hex);let t=amt;return "#"+[r,g,b].map(v=>Math.round(v+(255-v)*t).toString(16).padStart(2,"0")).join("")}
function darken(hex,amt=.22){let [r,g,b]=hexRgb(hex);return "#"+[r,g,b].map(v=>Math.round(v*(1-amt)).toString(16).padStart(2,"0")).join("")}
function applyPrefs(){
 const root=document.documentElement;root.style.setProperty("--accent",prefs.accent);root.style.setProperty("--accent-dark",darken(prefs.accent));root.style.setProperty("--accent-soft",mix(prefs.accent,.88));root.style.setProperty("--font-scale",prefs.fontScale==="small"?.92:prefs.fontScale==="large"?1.1:1);
 document.body.classList.toggle("compact",!!prefs.compactMode);
 root.style.setProperty("--photo-opacity",photoUrl?(Number(prefs.opacity)/100):0);root.style.setProperty("--photo-blur",(prefs.blur||0)+"px");root.style.setProperty("--photo-url",photoUrl?`url("${photoUrl}")`:"none");
}
function showToast(msg){let el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2200)}
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function parseDate(s){let [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function render(){
 $("monthHeading").textContent=`${shown.getFullYear()}年${shown.getMonth()+1}月`;
 const grid=$("calendarGrid");grid.innerHTML="";
 const weekdays=["日","月","火","水","木","金","土"];const start=prefs.weekStart||0;
 for(let i=0;i<7;i++){let w=(i+start)%7;let el=document.createElement("div");el.className="weekday"+(prefs.showWeekends&&[0,6].includes(w)?" weekend":"");el.textContent=weekdays[w];grid.append(el)}
 let first=new Date(shown.getFullYear(),shown.getMonth(),1);let offset=(first.getDay()-start+7)%7;let days=new Date(shown.getFullYear(),shown.getMonth()+1,0).getDate();let count=Math.ceil((offset+days)/7)*7;
 if(prefs.showOutside)count=Math.max(35,count);
 const query=$("searchInput").value.trim().toLowerCase();
 for(let i=0;i<count;i++){
  let dt=new Date(shown.getFullYear(),shown.getMonth(),i-offset+1), key=dateKey(dt), outside=dt.getMonth()!==shown.getMonth();
  let cell=document.createElement("div");cell.className="day-cell"+(outside?" outside":"")+(key===dateKey(now)?" today":"");
  if(outside&&!prefs.showOutside){cell.style.visibility="hidden";grid.append(cell);continue}
  let day=document.createElement("div");day.className="day-number";day.textContent=dt.getDate();cell.append(day);
  let dayEvents=events.filter(e=>e.date===key&&(!query||(e.title+" "+e.memo+" "+e.location).toLowerCase().includes(query))).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  let list=document.createElement("div");list.className="day-events";
  dayEvents.slice(0,3).forEach(e=>{let b=document.createElement("button");b.className="event-chip";b.style.setProperty("--chip",mix(e.color||prefs.accent,.86));b.style.setProperty("--chip-text",darken(e.color||prefs.accent));b.textContent=(e.time&&!e.allDay?e.time+" ":"")+e.title;b.title=e.title;b.addEventListener("click",ev=>{ev.stopPropagation();openEvent(e.id)});list.append(b)});
  if(dayEvents.length>3){let more=document.createElement("small");more.textContent=`+${dayEvents.length-3}件`;more.style.color="var(--muted)";list.append(more)}
  cell.append(list);cell.addEventListener("click",()=>openEvent(null,key));grid.append(cell);
 }
 renderUpcoming();
}
function renderUpcoming(){
 let q=$("searchInput").value.trim().toLowerCase(), today=dateKey(now);
 let upcoming=events.filter(e=>e.date>=today&&(!q||(e.title+" "+e.memo+" "+e.location).toLowerCase().includes(q))).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,8);
 $("eventCount").textContent=`${events.length}件`;
 $("upcomingList").innerHTML=upcoming.length?upcoming.map(e=>`<div class="upcoming-item"><span class="event-dot" style="--event-color:${esc(e.color||prefs.accent)}"></span><div><strong>${esc(e.title)}</strong><small>${esc(e.date)} ${e.allDay?"終日":esc(e.time||"時刻未設定")} · ${esc(e.category||"その他")}${e.location?" · "+esc(e.location):""}</small></div></div>`).join(""):'<div class="empty-state">これからの予定はありません。<br>「予定を追加」から登録できます。</div>';
}
function openEvent(id,date){
 let e=events.find(x=>x.id===id);$("eventForm").reset();$("eventId").value=e?.id||"";$("eventModalTitle").textContent=e?"予定を編集":"予定を追加";$("eventTitle").value=e?.title||"";$("eventDate").value=e?.date||date||dateKey(now);$("eventTime").value=e?.time||"";$("eventCategory").value=e?.category||"プライベート";$("eventColor").value=e?.color||prefs.accent;$("eventLocation").value=e?.location||"";$("eventMemo").value=e?.memo||"";$("eventAllDay").checked=!!e?.allDay;$("deleteEventBtn").hidden=!e;$("eventModal").hidden=false;
}
function closeModal(id){$(id).hidden=true}
$("eventForm").addEventListener("submit",ev=>{ev.preventDefault();let id=$("eventId").value;let item={id:id||crypto.randomUUID(),title:$("eventTitle").value.trim(),date:$("eventDate").value,time:$("eventTime").value,category:$("eventCategory").value,color:$("eventColor").value,location:$("eventLocation").value.trim(),memo:$("eventMemo").value.trim(),allDay:$("eventAllDay").checked};if(!item.title||!item.date)return;if(id)events=events.map(e=>e.id===id?item:e);else events.push(item);saveEvents();closeModal("eventModal");render();showToast(id?"予定を更新しました":"予定を追加しました")});
$("deleteEventBtn").addEventListener("click",()=>{let id=$("eventId").value;if(confirm("この予定を削除しますか？")){events=events.filter(e=>e.id!==id);saveEvents();closeModal("eventModal");render();showToast("予定を削除しました")}});
$("addEventBtn").onclick=()=>openEvent(null,dateKey(now));$("prevMonth").onclick=()=>{shown.setMonth(shown.getMonth()-1);render()};$("nextMonth").onclick=()=>{shown.setMonth(shown.getMonth()+1);render()};$("todayBtn").onclick=()=>{shown=new Date(now.getFullYear(),now.getMonth(),1);render()};$("searchInput").oninput=render;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
["eventModal","settingsModal"].forEach(id=>$(id).addEventListener("click",e=>{if(e.target===$(id))closeModal(id)}));
function exportJson(){let blob=new Blob([JSON.stringify({app:"Koyomi",version:2,exportedAt:new Date().toISOString(),events},null,2)],{type:"application/json"});download(blob,"koyomi-backup.json")}
function download(blob,name){let a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$("exportBtn").onclick=exportJson;$("settingsExport").onclick=exportJson;
function importFile(file){if(!file)return;let r=new FileReader();r.onload=()=>{try{let data=JSON.parse(r.result),incoming=Array.isArray(data)?data:data.events;if(!Array.isArray(incoming))throw Error();let clean=incoming.filter(e=>e&&e.title&&e.date).map(e=>({...e,id:e.id||crypto.randomUUID()}));if(confirm(`${clean.length}件の予定を読み込みます。既存の予定に追加しますか？`)){let map=new Map(events.map(e=>[e.id,e]));clean.forEach(e=>map.set(e.id,e));events=[...map.values()];saveEvents();render();showToast("読み込みました")}}catch{alert("ファイルを読み込めませんでした。KoyomiのJSONバックアップを選んでください。")}};r.readAsText(file)}
$("importInput").onchange=e=>importFile(e.target.files[0]);$("settingsImport").onchange=e=>importFile(e.target.files[0]);
$("icsBtn").onclick=()=>{let lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Koyomi//JP"];events.forEach(e=>{let d=e.date.replaceAll("-","");lines.push("BEGIN:VEVENT","UID:"+e.id+"@koyomi","DTSTART"+(e.allDay?";VALUE=DATE:"+d:":"+d+"T"+(e.time||"0900").replace(":","")+"00"),"SUMMARY:"+e.title.replace(/[\\;,]/g," "),"DESCRIPTION:"+((e.memo||"").replace(/[\\;,]/g," ")),"END:VEVENT")});lines.push("END:VCALENDAR");download(new Blob([lines.join("\r\n")],{type:"text/calendar"}),"koyomi-events.ics")};
$("openSettings").onclick=()=>{syncSettingsUI();$("settingsModal").hidden=false};
function syncSettingsUI(){ $("customColor").value=prefs.accent;$("colorValue").textContent=prefs.accent;$("photoOpacity").value=prefs.opacity;$("photoBlur").value=prefs.blur;$("fontScale").value=prefs.fontScale;$("showWeekends").checked=prefs.showWeekends;$("showOutside").checked=prefs.showOutside;$("compactMode").checked=prefs.compactMode;$("weekStart").value=prefs.weekStart;
 $("swatches").innerHTML=presets.map(p=>`<button class="swatch ${prefs.accent.toLowerCase()===p.color?"active":""}" title="${p.name}" aria-label="${p.name}" style="background:${p.color}" data-color="${p.color}"></button>`).join("");document.querySelectorAll(".swatch").forEach(b=>b.onclick=()=>setColor(b.dataset.color));renderPhotoPreview()}
function setColor(c){prefs.accent=c;savePrefs();$("customColor").value=c;$("colorValue").textContent=c;document.querySelectorAll(".swatch").forEach(b=>b.classList.toggle("active",b.dataset.color===c));render();showToast("テーマカラーを変更しました")}
$("swatches").addEventListener("click",e=>{let b=e.target.closest("[data-color]");if(b)setColor(b.dataset.color)});
$("customColor").oninput=e=>{prefs.accent=e.target.value;savePrefs();$("colorValue").textContent=prefs.accent;render()};
["photoOpacity","photoBlur"].forEach(id=>$(id).oninput=()=>{prefs.opacity=+$("photoOpacity").value;prefs.blur=+$("photoBlur").value;savePrefs()});
$("fontScale").onchange=e=>{prefs.fontScale=e.target.value;savePrefs()};
["showWeekends","showOutside","compactMode","weekStart"].forEach(id=>$(id).onchange=()=>{prefs[id]=id==="weekStart"?+$ (id).value:$(id).checked;savePrefs();render()});
function openDb(){return new Promise((resolve,reject)=>{let req=indexedDB.open(PHOTO_DB,1);req.onupgradeneeded=()=>req.result.createObjectStore("photos");req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function storePhoto(blob){let db=await openDb();return new Promise((res,rej)=>{let tx=db.transaction("photos","readwrite");tx.objectStore("photos").put(blob,"background");tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function getPhoto(){try{let db=await openDb();return await new Promise((res,rej)=>{let r=db.transaction("photos").objectStore("photos").get("background");r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}catch{return null}}
async function removePhoto(){let db=await openDb();return new Promise(res=>{let tx=db.transaction("photos","readwrite");tx.objectStore("photos").delete("background");tx.oncomplete=res;tx.onerror=res})}
function renderPhotoPreview(){let p=$("photoPreview");p.style.backgroundImage=photoUrl?`url("${photoUrl}")`:"";p.innerHTML=photoUrl?"":'<span>写真はまだ設定されていません</span>'}
$("backgroundInput").onchange=async e=>{let f=e.target.files[0];if(!f)return;if(!f.type.startsWith("image/")){alert("画像ファイルを選んでください");return}try{await storePhoto(f);if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=URL.createObjectURL(f);applyPrefs();renderPhotoPreview();showToast("背景写真を設定しました")}catch{alert("写真を保存できませんでした")}};
$("clearPhoto").onclick=async()=>{await removePhoto();if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;applyPrefs();renderPhotoPreview();showToast("背景写真を解除しました")};
$("clearAllEvents").onclick=()=>{if(confirm("すべての予定を削除します。この操作は取り消せません。")){events=[];saveEvents();render();showToast("すべての予定を削除しました")}};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".tab-content").forEach(x=>x.hidden=x.id!=="tab-"+b.dataset.tab)});
(async()=>{photoUrl=(()=>null)();let p=await getPhoto();if(p)photoUrl=URL.createObjectURL(p);applyPrefs();syncSettingsUI();render()})();
})();