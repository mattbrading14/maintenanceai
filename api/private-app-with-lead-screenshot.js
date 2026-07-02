const privateApp = require('./private-app.js');

const OFFICE_LEAD_SCREENSHOT_ADDON = String.raw`
<script data-maintenanceai-office-lead-screenshot-addon>
(function(){
  try{
    if(window.__maintenanceAIOfficeLeadScreenshotAddon)return;
    window.__maintenanceAIOfficeLeadScreenshotAddon=true;

    function q(id){return document.getElementById(id);}
    function clean(v){return (v==null?'':String(v)).trim();}
    function html(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function stripCodeFences(rawText){
      var tick=String.fromCharCode(96), fence=tick+tick+tick;
      return String(rawText||'').replace(new RegExp(fence+'json|'+fence,'g'),'').trim();
    }
    function parseAiJson(rawText){
      var text=stripCodeFences(rawText);
      try{return JSON.parse(text);}
      catch(e){
        var start=text.indexOf('{'), end=text.lastIndexOf('}');
        if(start>-1&&end>start)return JSON.parse(text.slice(start,end+1));
      }
      throw new Error('AI response could not be read as prospect details');
    }
    function leadNotes(data){
      var parts=[];
      function add(label,value){value=clean(value);if(value)parts.push(label+': '+value);}
      add('Source summary',data.source_summary);
      add('Size preference',data.size_preference);
      add('Floor preference',data.floor_preference);
      add('Budget',data.budget);
      add('Office type',data.office_type_preference);
      add('Timing',data.timing);
      add('Notes',data.notes);
      add('AI confidence',data.confidence);
      return parts.join('\n');
    }
    function fileToBase64(file){
      return new Promise(function(resolve,reject){
        var reader=new FileReader();
        reader.onload=function(e){resolve(String(e.target.result||'').split(',')[1]||'');};
        reader.onerror=function(){reject(new Error('Could not read screenshot'));};
        reader.readAsDataURL(file);
      });
    }
    function ensureUI(){
      var panel=q('tab-office-leads');
      if(!panel&&typeof showOfficeLeads==='function'){showOfficeLeads();panel=q('tab-office-leads');}
      if(!panel||q('ol-screenshot-upload-wrap'))return;
      var card=panel.querySelector('.ol-grid .card')||panel.querySelector('.card');
      if(!card)return;
      var wrap=document.createElement('div');
      wrap.id='ol-screenshot-upload-wrap';
      wrap.style.marginBottom='10px';
      wrap.innerHTML='<div class="section-label">Read prospect screenshot</div><div class="upload-zone" style="padding:1.15rem .85rem"><input type="file" accept="image/*" onchange="olReadScreenshot(this.files[0]);this.value=\'\'"/><div class="upload-zone-icon" style="font-size:18px;font-weight:800;color:#0f172a">AI</div><div class="upload-zone-title">Tap to upload email, text, or voicemail screenshot</div><div class="upload-zone-sub">Adds name, email, phone, and office-search notes to the waitlist</div></div><div id="ol-screenshot-preview"></div><div id="ol-screenshot-result"></div>';
      var toolbar=card.querySelector('.ol-toolbar');
      if(toolbar&&toolbar.nextSibling)card.insertBefore(wrap,toolbar.nextSibling);
      else card.insertBefore(wrap,card.firstChild);
    }
    async function readProspectScreenshot(file){
      if(!file)return;
      if(typeof showOfficeLeads==='function')showOfficeLeads();
      ensureUI();
      var preview=q('ol-screenshot-preview'), result=q('ol-screenshot-result');
      if(preview)preview.innerHTML='<img src="'+URL.createObjectURL(file)+'" style="max-width:100%;border-radius:8px;margin:8px 0 10px;border:1px solid #e2e8f0"/>';
      if(result)result.innerHTML='<div class="loading-row"><div class="spinner"></div>Reading prospective tenant message...</div>';
      try{
        var base64=typeof compressImage==='function'?await compressImage(file,900,0.55):await fileToBase64(file);
        if(result)result.innerHTML='<div class="loading-row"><div class="spinner"></div>Extracting contact details...</div>';
        var prompt='You are a leasing assistant for 146 Main St, Los Altos. Read this screenshot of an email, text message, or voicemail transcript from a prospective office tenant. Extract the prospect contact details and any office-search preferences. If a field is missing, use an empty string. Return ONLY valid JSON with this exact shape: {"name":"","email":"","phone":"","size_preference":"","floor_preference":"","budget":"","office_type_preference":"","timing":"","notes":"","source_summary":"","confidence":"high|medium|low"}';
        var res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:900,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:base64}},{type:'text',text:prompt}]}]})});
        var data=await res.json();
        if(!res.ok||data.error)throw new Error(data.error&&data.error.message||'No response from AI');
        if(!data.content||!data.content[0])throw new Error('No response from AI');
        var extracted=parseAiJson(data.content[0].text);
        var name=clean(extracted.name)||clean(extracted.prospect_name)||clean(extracted.sender_name);
        var email=clean(extracted.email);
        var phone=clean(extracted.phone);
        var notes=leadNotes(extracted);
        if(!name)name=email?email.split('@')[0]:(phone?'Prospect from '+phone:'Prospect from screenshot');
        if(q('ol-name'))q('ol-name').value=name;
        if(q('ol-email'))q('ol-email').value=email;
        if(q('ol-phone'))q('ol-phone').value=phone;
        if(q('ol-notes'))q('ol-notes').value=notes;
        if(q('ol-status'))q('ol-status').value='active';
        if(q('ol-date'))q('ol-date').value=new Date().toISOString().split('T')[0];
        if(!name||(!email&&!phone))throw new Error('I filled what I could, but this prospect still needs a name and an email or phone number before saving.');
        if(typeof olSaveProspect==='function')olSaveProspect();
        if(result)result.innerHTML='<div style="border:1px solid #86efac;border-radius:12px;padding:12px;margin-top:10px;background:#fff"><div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:4px">Prospect added to waitlist</div><div style="font-size:12px;color:#64748b">'+html(name)+(email?' - '+html(email):'')+(phone?' - '+html(phone):'')+'</div></div>';
      }catch(err){
        if(result)result.innerHTML='<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:12px;margin-top:10px;font-size:13px;color:#b91c1c"><strong>Error reading prospect screenshot: '+html(err.message||err)+'</strong><br><br>Use the fields below to review or enter the prospect manually.</div>';
      }
    }
    window.olReadScreenshot=readProspectScreenshot;
    function install(){ensureUI();}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
    setTimeout(install,500);setTimeout(install,1500);setTimeout(install,3000);
  }catch(error){console.warn('Office lead screenshot add-on did not initialize:',error);}
})();
</script>
`;


const MOBILE_SECTION_MENU_ADDON = String.raw`
<script data-maintenanceai-mobile-section-menu>
(function(){
  try{
    if(window.__maintenanceAIMobileSectionMenu)return;
    window.__maintenanceAIMobileSectionMenu=true;

    function clean(v){return (v==null?'':String(v)).trim();}
    function q(id){return document.getElementById(id);}
    function tabs(){return Array.prototype.slice.call(document.querySelectorAll('.tabs .tab'));}
    function activeTab(){return tabs().find(function(tab){return tab.classList.contains('active');})||tabs()[0]||null;}
    function labelFor(tab){return clean(tab&&tab.textContent)||'Sections';}
    function tabName(tab,index){
      var known=['screenshot','logcall','queue','approved','completed','denied','deleted','bids','bookings','pm','history','report','directory','office-leads'];
      var attr=tab&&(tab.getAttribute('data-tab')||tab.getAttribute('data-section')||tab.getAttribute('aria-controls'));
      if(attr)return attr.replace(/^tab-/,'');
      var onclick=tab&&tab.getAttribute('onclick')||'';
      var match=onclick.match(/switchTab\(['"]([^'"]+)['"]\)/);
      if(match)return match[1];
      return known[index]||'';
    }
    function activateTab(index){
      var allTabs=tabs();
      var tab=allTabs[index];
      var name=tabName(tab,index);
      if(name==='office-leads'&&typeof window.showOfficeLeads==='function')window.showOfficeLeads();
      else if(name&&typeof window.switchTab==='function')window.switchTab(name);
      else if(tab){
        try{tab.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));}
        catch(error){if(typeof tab.click==='function')tab.click();}
      }
      setTimeout(updateMenu,60);
      var panel=name?q('tab-'+name):null;
      if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
    }
    var lastMenuSignature='';
    function updateMenu(){
      var originalTabs=document.querySelector('.tabs');
      if(!originalTabs)return;
      var nav=q('mobile-section-nav');
      if(!nav){
        nav=document.createElement('div');
        nav.id='mobile-section-nav';
        nav.innerHTML='<label class="mobile-section-label" for="mobile-section-select">Section</label><select id="mobile-section-select" class="mobile-section-select" aria-label="Choose section"></select>';
        originalTabs.parentNode.insertBefore(nav,originalTabs);
        nav.querySelector('.mobile-section-select').addEventListener('change',function(){activateTab(Number(this.value));});
      }
      var allTabs=tabs();
      var current=activeTab();
      var currentIndex=allTabs.indexOf(current);
      if(currentIndex<0)currentIndex=0;
      var select=q('mobile-section-select');
      if(!select)return;
      var signature=currentIndex+'|'+allTabs.map(labelFor).join('|');
      if(signature!==lastMenuSignature){
        lastMenuSignature=signature;
        select.innerHTML='';
        allTabs.forEach(function(tab,index){
          var option=document.createElement('option');
          option.value=String(index);
          option.textContent=labelFor(tab);
          option.setAttribute('data-tab-name',tabName(tab,index));
          select.appendChild(option);
        });
      }
      select.value=String(currentIndex);
    }
    function install(){
      if(document.querySelector('style[data-mobile-section-menu-style]'))return;
      var style=document.createElement('style');
      style.setAttribute('data-mobile-section-menu-style','');
      style.textContent='#mobile-section-nav{display:none}.mobile-section-label,.mobile-section-select{font-family:inherit}@media(max-width:680px){.tabs{display:none!important}#mobile-section-nav{display:block;position:relative;z-index:1;margin-bottom:1rem}.mobile-section-label{display:block;margin:0 0 6px;color:#475569;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.mobile-section-select{display:block;width:100%;min-height:48px;padding:12px 40px 12px 14px;border:1px solid #dbe4ee;border-radius:12px;background:#fff;color:#0f172a;font-size:15px;font-weight:800;box-shadow:0 1px 2px rgba(15,23,42,.04);cursor:pointer;touch-action:manipulation;pointer-events:auto}}';
      document.head.appendChild(style);
      updateMenu();
    }
    var observer=new MutationObserver(function(){updateMenu();});
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',function(){install();observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});});
    }else{
      install();observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
    window.addEventListener('resize',updateMenu);
    setTimeout(updateMenu,600);setTimeout(updateMenu,1600);setTimeout(updateMenu,3200);
  }catch(error){console.warn('Mobile section menu did not initialize:',error);}
})();
</script>
`;
function appendBeforeBody(html, patch) {
  const closingBodyIndex = html.toLowerCase().lastIndexOf('</body>');
  if (closingBodyIndex === -1) return html + patch;
  return html.slice(0, closingBodyIndex) + patch + html.slice(closingBodyIndex);
}

module.exports = async function handler(req, res) {
  let statusCode = 200;
  const capture = {
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(code) {
      statusCode = code;
      return capture;
    },
    send(body) {
      let html = body;
      if (typeof html === 'string' && !html.includes('data-maintenanceai-office-lead-screenshot-addon')) {
        html = appendBeforeBody(html, OFFICE_LEAD_SCREENSHOT_ADDON);
      }
      if (typeof html === 'string' && !html.includes('data-maintenanceai-mobile-section-menu')) {
        html = appendBeforeBody(html, MOBILE_SECTION_MENU_ADDON);
      }
      res.status(statusCode).send(html);
    }
  };

  return privateApp(req, capture);
};
