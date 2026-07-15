const privateApp = require('./private-app.js');
const officeTurnoverAddon = require('./office-turnover-addon.js');

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
    function rawLabel(tab){return clean(tab&&tab.textContent)||'Sections';}
    function tabName(tab,index){
      if(!tab)return '';
      if(tab.id==='tab-button-office-leads')return 'office-leads';
      if(tab.id==='tab-button-turnovers')return 'turnovers';
      var attr=tab.getAttribute('data-tab')||tab.getAttribute('data-section')||tab.getAttribute('aria-controls');
      if(attr)return attr.replace(/^tab-/,'');
      var onclick=tab.getAttribute('onclick')||'';
      var match=onclick.match(/switchTab\(['"]([^'"]+)['"]\)/);
      if(match)return match[1];
      var text=rawLabel(tab).toLowerCase();
      if(text.indexOf('screenshot')>-1)return 'screenshot';
      if(text.indexOf('log a call')>-1)return 'logcall';
      if(text.indexOf('pending')>-1||text.indexOf('approval')>-1)return 'queue';
      if(text.indexOf('approved')>-1)return 'approved';
      if(text.indexOf('completed')>-1)return 'completed';
      if(text.indexOf('denied')>-1)return 'denied';
      if(text.indexOf('deleted')>-1)return 'deleted';
      if(text.indexOf('bid')>-1)return 'bids';
      if(text.indexOf('turnover')>-1)return 'turnovers';
      if(text.indexOf('room')>-1||text.indexOf('booking')>-1)return 'bookings';
      if(text.indexOf('preventive')>-1)return 'pm';
      if(text.indexOf('history')>-1)return 'history';
      if(text.indexOf('owner')>-1||text.indexOf('report')>-1)return 'report';
      if(text.indexOf('settings')>-1||text.indexOf('directory')>-1)return 'directory';
      if(text.indexOf('office lead')>-1||text.indexOf('prospective')>-1)return 'office-leads';
      return '';
    }
    var LABELS={
      screenshot:'Screenshot request',logcall:'Log a call',queue:'Pending approval',approved:'Approved',completed:'Completed',denied:'Denied',deleted:'Deleted',bids:'Bid requests',
      pm:'Preventive maintenance',history:'Maintenance history',
      'office-leads':'Prospective tenants',turnovers:'Turnovers',
      bookings:'Room bookings',report:'Owner report',directory:'Settings'
    };
    var GROUPS=[
      {id:'work-orders',label:'Work orders',names:['screenshot','logcall','queue','approved','completed','denied','deleted','bids']},
      {id:'maintenance',label:'Preventive maintenance',names:['pm','history']},
      {id:'leasing',label:'Leads & turnovers',names:['office-leads','turnovers']},
      {id:'bookings',label:'Room bookings',names:['bookings']},
      {id:'reports',label:'Owner reports',names:['report']},
      {id:'settings',label:'Settings',names:['directory']}
    ];
    var selectedGroupId='';
    var lastSignature='';

    function allItems(){return tabs().map(function(tab,index){return {tab:tab,index:index,name:tabName(tab,index),label:rawLabel(tab)};});}
    function groupFor(name){return GROUPS.find(function(group){return group.names.indexOf(name)>-1;})||GROUPS[0];}
    function countFor(item){
      if(!item||!item.name)return null;
      var ids={queue:'queue-count',approved:'approved-count',completed:'completed-count',denied:'denied-count',deleted:'deleted-count',bids:'bid-count',bookings:'booking-count'};
      var id=ids[item.name];
      if(!id)return null;
      var el=q(id);
      if(!el)return null;
      var text=clean(el.textContent).replace(/[^0-9-]/g,'');
      if(text==='')return null;
      var count=parseInt(text,10);
      return isNaN(count)?null:count;
    }
    function itemLabel(item){
      var label=LABELS[item.name]||item.label||'Section';
      var count=countFor(item);
      return count===null?label:label+' - '+count;
    }
    function needsAttention(item){
      if(!item)return false;
      return (item.name==='queue'||item.name==='bids')&&Number(countFor(item)||0)>0;
    }
    function groupNeedsAttention(groupId,items){
      return itemsForGroup(groupId,items).some(needsAttention);
    }
    function itemsForGroup(groupId,items){
      items=items||allItems();
      var group=GROUPS.find(function(g){return g.id===groupId;})||GROUPS[0];
      return group.names.map(function(name){return items.find(function(item){return item.name===name;});}).filter(Boolean);
    }
    function availableGroups(items){
      items=items||allItems();
      return GROUPS.filter(function(group){return group.names.some(function(name){return items.some(function(item){return item.name===name;});});});
    }
    function button(text,className){
      var b=document.createElement('button');
      b.type='button';
      b.className=className;
      b.textContent=text;
      return b;
    }
    function activateItem(item){
      if(!item)return;
      var name=item.name;
      selectedGroupId=groupFor(name).id;
      if(name==='office-leads'&&typeof window.showOfficeLeads==='function')window.showOfficeLeads();
      else if(name==='turnovers'&&typeof window.showTurnovers==='function')window.showTurnovers();
      else if(name&&typeof window.switchTab==='function')window.switchTab(name);
      else if(item.tab){
        try{item.tab.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));}
        catch(error){if(typeof item.tab.click==='function')item.tab.click();}
      }
      lastSignature='';
      setTimeout(render,80);
      var panel=name?q('tab-'+name):null;
      if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
    }
    function ensureShell(originalTabs){
      var nav=q('mobile-section-nav');
      if(nav)return nav;
      nav=document.createElement('div');
      nav.id='mobile-section-nav';
      nav.innerHTML='<div class="mobile-section-heading">Category</div><div id="mobile-category-buttons" class="mobile-category-buttons" aria-label="Choose category"></div><div class="mobile-section-heading">Section</div><div id="mobile-section-buttons" class="mobile-section-buttons" aria-label="Choose section"></div>';
      originalTabs.parentNode.insertBefore(nav,originalTabs);
      return nav;
    }
    function render(){
      var originalTabs=document.querySelector('.tabs');
      if(!originalTabs)return false;
      var items=allItems();
      var groups=availableGroups(items);
      if(!groups.length){document.body.classList.remove('mai-mobile-nav-ready');return false;}
      var nav=ensureShell(originalTabs);
      document.body.classList.add('mai-mobile-nav-ready');
      var current=activeTab();
      var currentItem=items.find(function(item){return item.tab===current;})||items[0];
      var currentIndex=currentItem?currentItem.index:-1;
      if(!selectedGroupId||!groups.some(function(group){return group.id===selectedGroupId;}))selectedGroupId=groupFor(currentItem&&currentItem.name).id;
      var sectionItems=itemsForGroup(selectedGroupId,items);
      var signature=currentIndex+'|'+selectedGroupId+'|'+groups.map(function(group){return group.id;}).join('|')+'|'+items.map(function(item){return item.index+':'+item.name+':'+item.label;}).join('|');
      if(signature===lastSignature)return true;
      lastSignature=signature;
      var categoryWrap=q('mobile-category-buttons');
      var sectionWrap=q('mobile-section-buttons');
      if(!categoryWrap||!sectionWrap)return false;
      categoryWrap.innerHTML='';
      groups.forEach(function(group){
        var b=button(group.label,'mobile-category-button'+(group.id===selectedGroupId?' active':'')+(groupNeedsAttention(group.id,items)?' needs-attention':''));
        b.setAttribute('aria-pressed',group.id===selectedGroupId?'true':'false');
        b.addEventListener('click',function(){selectedGroupId=group.id;lastSignature='';var first=itemsForGroup(group.id,items)[0];if(first)activateItem(first);else render();});
        categoryWrap.appendChild(b);
      });
      sectionWrap.innerHTML='';
      sectionItems.forEach(function(item){
        var b=button(itemLabel(item),'mobile-section-button'+(item.index===currentIndex?' active':'')+(needsAttention(item)?' needs-attention':''));
        b.setAttribute('aria-pressed',item.index===currentIndex?'true':'false');
        b.addEventListener('click',function(){activateItem(item);});
        sectionWrap.appendChild(b);
      });
      return true;
    }
    function install(){
      if(!document.querySelector('style[data-mobile-section-menu-style]')){
        var style=document.createElement('style');
        style.setAttribute('data-mobile-section-menu-style','');
        style.textContent='#mobile-section-nav{display:none}.mobile-category-button,.mobile-section-button,.mobile-section-heading{font-family:inherit}@media(max-width:900px){body.mai-mobile-nav-ready .tabs{display:none!important}body.mai-mobile-nav-ready #mobile-section-nav{display:block;position:relative;z-index:1;margin-bottom:1rem}.mobile-section-heading{margin:0 0 6px;color:#475569;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.mobile-category-buttons{display:flex;gap:8px;overflow-x:auto;padding:0 0 8px;margin:0 0 10px;-webkit-overflow-scrolling:touch}.mobile-category-button,.mobile-section-button{min-height:44px;border:1px solid #dbe4ee;border-radius:12px;background:#fff;color:#0f172a;font-size:14px;font-weight:800;box-shadow:0 1px 2px rgba(15,23,42,.04);cursor:pointer;touch-action:manipulation}.mobile-category-button{flex:0 0 auto;padding:10px 12px;white-space:nowrap}.mobile-section-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mobile-section-button{width:100%;padding:10px 8px;line-height:1.15}.mobile-category-button.needs-attention,.mobile-section-button.needs-attention{border-color:#f59e0b;background:#fffbeb;color:#92400e}.mobile-category-button.active,.mobile-section-button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.mobile-category-button.active.needs-attention,.mobile-section-button.active.needs-attention{border-color:#f97316;background:#fff7ed;color:#9a3412;box-shadow:0 0 0 2px rgba(249,115,22,.14)}.mobile-category-button:active,.mobile-section-button:active{background:#f1f5f9}}';
        document.head.appendChild(style);
      }
      render();
    }
    function schedule(){[0,350,900,1800,3200,5200].forEach(function(ms){setTimeout(install,ms);});}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
    window.addEventListener('resize',function(){lastSignature='';render();});
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
      if (typeof html === 'string' && !html.includes('data-maintenanceai-office-turnovers')) {
        html = appendBeforeBody(html, officeTurnoverAddon);
      }
      res.status(statusCode).send(html);
    }
  };

  return privateApp(req, capture);
};
