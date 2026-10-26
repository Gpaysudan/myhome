(() => {
"use strict";
const WHATSAPP_NUMBER="249923915072";
const forms=[...document.querySelectorAll(".request-form")];
const hub=document.getElementById("formsHub"), workspace=document.getElementById("requestWorkspace");
let activeForm=null, stageByForm={};
const toast=document.getElementById("toast"); let toastTimer;
document.getElementById("year").textContent=new Date().getFullYear();
function showToast(msg){toast.textContent=msg;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),3200)}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function openForm(key){
 activeForm=forms.find(f=>f.dataset.form===key); if(!activeForm)return;
 forms.forEach(f=>f.classList.toggle("active",f===activeForm));
 stageByForm[key]=0; updateStage();
 document.getElementById("workspaceTitle").textContent=activeForm.dataset.title;
 document.getElementById("workspaceDescription").textContent="أكمل مراحل هذا النموذج فقط، ثم أرسله مباشرة إلى واتساب.";
 workspace.classList.add("open");workspace.scrollIntoView({behavior:"smooth",block:"start"});
}
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openForm(b.dataset.open)));
document.getElementById("backHub").addEventListener("click",()=>{workspace.classList.remove("open");hub.scrollIntoView({behavior:"smooth",block:"start"});activeForm=null});
function stages(){return [...activeForm.querySelectorAll(".form-step")]}
function updateStage(){
 const all=stages(), idx=stageByForm[activeForm.dataset.form]||0;
 all.forEach((s,i)=>s.classList.toggle("active",i===idx));
 const pct=Math.round((idx+1)/all.length*100);
 activeForm.querySelector(".progress-label").textContent=`المرحلة ${idx+1} من ${all.length}`;
 activeForm.querySelector(".progress-percent").textContent=pct+"%";
 activeForm.querySelector(".progress-bar").style.width=pct+"%";
 activeForm.querySelectorAll(".stage-dot").forEach((d,i)=>{d.classList.toggle("active",i===idx);d.classList.toggle("done",i<idx)});
 activeForm.querySelector(".prev-stage").disabled=idx===0;
 activeForm.querySelector(".next-stage").classList.toggle("hidden",idx===all.length-1);
 activeForm.querySelector(".send-whatsapp").classList.toggle("hidden",idx!==all.length-1);
 activeForm.querySelector(".form-error").textContent="";
}
function validateCurrent(){
 const idx=stageByForm[activeForm.dataset.form]||0, section=stages()[idx];
 for(const field of section.querySelectorAll("[required]")){
  const bad=field.type==="checkbox"?!field.checked:!field.value.trim();
  if(bad){field.focus();activeForm.querySelector(".form-error").textContent=field.type==="checkbox"?"يرجى الموافقة على إرسال بيانات الطلب.":"يرجى تعبئة الحقول المطلوبة المشار إليها بعلامة *.";field.scrollIntoView({behavior:"smooth",block:"center"});return false}
  if(field.name==="phone"&&!/^[+\d\s()-]{7,20}$/.test(field.value.trim())){field.focus();activeForm.querySelector(".form-error").textContent="يرجى إدخال رقم هاتف صحيح.";return false}
 }
 return true;
}
forms.forEach(f=>{
 f.querySelector(".next-stage").addEventListener("click",()=>{
  activeForm=f;if(!validateCurrent())return;
  const key=f.dataset.form,idx=stageByForm[key]||0;
  if(idx<stages().length-1){stageByForm[key]=idx+1;updateStage();f.scrollIntoView({behavior:"smooth",block:"start"})}
 });
 f.querySelector(".prev-stage").addEventListener("click",()=>{
  activeForm=f;const key=f.dataset.form;stageByForm[key]=Math.max(0,(stageByForm[key]||0)-1);updateStage();
 });
 f.querySelector(".send-whatsapp").addEventListener("click",()=>{
  activeForm=f;if(!validateCurrent())return;
  const msg=buildMessage(f);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,"_blank","noopener,noreferrer");
  showToast("تم فتح واتساب برسالة هذا النموذج فقط. راجعها واضغط إرسال داخل واتساب.");
 });
});
function collect(form){
 const data={};
 for(const [key,val] of new FormData(form).entries()){
  if(key==="consent"){data[key]="موافق";continue}
  if(key in data){if(!Array.isArray(data[key]))data[key]=[data[key]];data[key].push(val)}else data[key]=val;
 }
 [...form.elements].forEach(el=>{if(!el.name||el.type==="button")return;if(el.type==="checkbox"&&!el.checked&&!(el.name in data))data[el.name]=[];else if(!(el.name in data)&&el.type!=="checkbox")data[el.name]=""});
 data["نوع النموذج"]=form.dataset.title;data["تاريخ الإنشاء"]=new Date().toLocaleString("ar");
 return data;
}
function buildMessage(form){
 const data=collect(form);
 const clean=v=>Array.isArray(v)?v.filter(Boolean).join("، "):String(v??"").trim();
 const labelFor=el=>{
  const label=el.closest("label.field");
  if(label){const span=label.querySelector("span");if(span)return span.textContent.replace(/\*/g,"").trim()}
  const choice=el.closest("label.choice");
  if(choice){const b=choice.querySelector("b");if(b)return b.textContent.trim()}
  return ({fullName:"الاسم الكامل",phone:"رقم الهاتف",familyId:"معرّف الأسرة",area:"المنطقة",address:"العنوان",consent:"الموافقة"})[el.name]||el.name;
 };
 const sections=[...form.querySelectorAll(".form-step")];
 let lines=["🏠 *بوابة رعاية الأسرة*",`📌 *${form.dataset.title}*`,`🗓️ ${new Date().toLocaleDateString("ar")}`,"━━━━━━━━━━━━━━"];
 sections.forEach((section,idx)=>{
  const heading=section.querySelector(".step-intro h3")?.textContent.trim()||`القسم ${idx+1}`;
  const rows=[];const seen=new Set();
  [...section.querySelectorAll("input[name], select[name], textarea[name]")].forEach(el=>{
   if(["button","submit","reset","hidden"].includes(el.type)||el.name==="consent")return;
   const key=el.name;
   if(el.type==="checkbox"){
    if(!el.checked)return;
    if(!seen.has(key)){const group=[...section.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(key)}"]:checked`)].map(x=>x.value);rows.push(`• *${labelFor(el)}:* ${group.join("، ")}`);seen.add(key)}
    return;
   }
   if(el.type==="radio"&&!el.checked)return;
   const value=clean(el.value);if(!value)return;
   const label=labelFor(el);const row=`• *${label}:* ${value}`;
   // Keep repeated names from radio groups, but avoid duplicate keys from repeated controls.
   const unique=`${key}:${el.type==="radio"?"radio":el.tagName}`;
   if(seen.has(unique))return;seen.add(unique);rows.push(row);
  });
  if(rows.length){lines.push(`\n*${heading}*`,...rows)}
 });
 lines.push("\n━━━━━━━━━━━━━━",`🆔 *رقم الطلب:* ${Date.now().toString().slice(-8)}`,"تم إرسال البيانات بواسطة نموذج بوابة رعاية الأسرة.","يرجى تأكيد استلام الطلب.");
 return lines.join("\n");
}
function getActive(){if(!activeForm){showToast("يرجى فتح نموذج أولاً من قائمة الخدمات.");return null}return activeForm}
function fileName(ext){const form=getActive();if(!form)return null;const name=(form.elements.fullName?.value||form.dataset.form||"طلب").replace(/[^\p{L}\p{N}-]+/gu,"-").slice(0,35);return `${name}-${form.dataset.form}.${ext}`}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
document.getElementById("jsonBtn").addEventListener("click",()=>{const f=getActive();if(!f)return;download(new Blob([JSON.stringify(collect(f),null,2)],{type:"application/json;charset=utf-8"}),fileName("json"));showToast("تم تنزيل JSON للنموذج المفتوح.")});
document.getElementById("excelBtn").addEventListener("click",()=>{const f=getActive();if(!f)return;if(!window.XLSX){showToast("تعذر تحميل مكتبة Excel؛ تحقق من الإنترنت.");return}const rows=Object.entries(collect(f)).map(([الحقل,القيمة])=>({الحقل,القيمة:Array.isArray(القيمة)?القيمة.join("، "):القيمة}));const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows);ws["!cols"]=[{wch:30},{wch:65}];XLSX.utils.book_append_sheet(wb,ws,"الطلب");XLSX.writeFile(wb,fileName("xlsx"));showToast("تم تنزيل ملف Excel للنموذج المفتوح.")});
async function snapshot(){
 const f=getActive();if(!f)return null;
 const old=stageByForm[f.dataset.form]||0,all=stages();
 all.forEach(s=>s.classList.add("active"));
 try{return await html2canvas(workspace,{scale:2,backgroundColor:getComputedStyle(document.body).getPropertyValue("--paper").trim()||"#fff",useCORS:true,logging:false})}
 finally{all.forEach((s,i)=>s.classList.toggle("active",i===old))}
}
document.getElementById("imageBtn").addEventListener("click",async()=>{if(!getActive())return;try{const c=await snapshot();if(c)c.toBlob(b=>{if(b)download(b,fileName("png"));showToast("تم إنشاء صورة PNG للنموذج المفتوح.")})}catch{showToast("تعذر إنشاء الصورة؛ تحقق من اتصال الإنترنت.")}});
document.getElementById("pdfBtn").addEventListener("click",async()=>{if(!getActive())return;try{if(!window.jspdf?.jsPDF)throw Error("no pdf lib");const c=await snapshot();if(!c)return;const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:"p",unit:"mm",format:"a4"}),img=c.toDataURL("image/jpeg",.94),pw=210,ph=297,m=7,w=pw-2*m,h=c.height*w/c.width;let y=m;doc.addImage(img,"JPEG",m,y,w,Math.min(h,ph-2*m));let remaining=h-(ph-2*m);while(remaining>0){doc.addPage();doc.addImage(img,"JPEG",m,m-(h-remaining),w,h);remaining-=ph-2*m}doc.save(fileName("pdf"));showToast("تم تنزيل PDF للنموذج المفتوح.")}catch(e){console.error(e);showToast("تعذر إنشاء PDF؛ تحقق من الاتصال بالإنترنت.")}});
document.getElementById("themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");document.querySelector("#themeToggle i").className=document.body.classList.contains("dark")?"fa-solid fa-sun":"fa-solid fa-moon"});
})();