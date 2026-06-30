const { readPersonalState } = require('./personal-state.js');

const OFFICE_LEADS_PATCH = String.raw`
<script data-maintenanceai-office-leads>
(function(){
  try{
    if(window.__maintenanceAIOfficeLeads)return;
    window.__maintenanceAIOfficeLeads=true;

    var SB_URL='https://rhjssomlybvzjncekgbx.supabase.co';
    var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoanNzb21seWJ2empuY2VrZ2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDM0NzQsImV4cCI6MjA4OTg3OTQ3NH0.10brFbJm0WhCZUAabu8Td86V889BNKIs1FW2yH42m0w';
    var DB_KEY='146main_office_leads';
    var STORAGE_KEY='maintenanceai_146main_office_leads';
    var state={prospects:[],log:[],updatedAt:null};
    var editingId=null;
    var offices=[
      ['100',925,3.35,3098.75,'Retail',1],['101/102',423,5,2115,'Office',1],['104',174,5,870,'Office',1],
      ['201',256,5,1280,'Office',2],['202',265,5,1325,'Office',2],['203',165,5,825,'Office',2],['204/205',312,5,1560,'Office',2],
      ['207',155,5,775,'Office',2],['208',341,5,1705,'Office',2],['209',162,5,810,'Office',2],['210',180,5,900,'Office',2],
      ['211',180,5,900,'Office',2],['212/213',252,5,1260,'Office',2],['214',144,5,720,'Office',2],['215',144,5,720,'Office',2],
      ['216',126,5,630,'Office',2],['217',285,5,1425,'Office',2]
    ].map(function(o){return {number:o[0],sqft:o[1],rate:o[2],monthlyRent:o[3],type:o[4],floor:o[5]};});

    function q(id){return document.getElementById(id);}
    function clean(v){return (v==null?'':String(v)).trim();}
    function html(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function money(v){var n=Number(v)||0;var cents=Math.abs(n%1)>0.001;return '$'+n.toLocaleString('en-US',{minimumFractionDigits:cents?2:0,maximumFractionDigits:cents?2:0});}
    function rent(o){var m=Number(o&&o.monthlyRent);return isFinite(m)&&m>0?m:Math.round((Number(o&&o.sqft)||0)*(Number(o&&o.rate)||0));}
    function floorLabel(f){return f===1?'1st floor':f===2?'2nd floor':f===3?'3rd floor':clean(f)+'th floor';}
    function statusLabel(s){return {active:'Active',contacted:'Contacted',no_interest:'No longer interested',leased:'Leased',archived:'Archived'}[s]||'Active';}
    function fmtDate(v){var d=new Date(v);return v&&!isNaN(d.getTime())?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';}
    function uid(){return 'LEAD-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*9000+1000);}
    function selectedOffice(){var v=q('ol-office')?q('ol-office').value:'';return offices.find(function(o){return o.number===v;})||offices[0];}
    function eligible(){return state.prospects.filter(function(p){return clean(p.email)&&(!p.status||p.status==='active'||p.status==='contacted');});}

    function loadLocal(){try{var saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');if(Array.isArray(saved.prospects))state.prospects=saved.prospects;if(Array.isArray(saved.log))state.log=saved.log;if(saved.updatedAt)state.updatedAt=saved.updatedAt;}catch(e){}}
    function saveLocal(){state.updatedAt=new Date().toISOString();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}}
    async function saveCloud(){
      saveLocal();
      try{
        var payload={prospects:state.prospects,log:state.log,updatedAt:state.updatedAt};
        var baseHeaders={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
        var rows=await (await fetch(SB_URL+'/rest/v1/maintenanceai_data?key=eq.'+encodeURIComponent(DB_KEY)+'&select=key',{headers:baseHeaders})).json();
        var headers={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};
        if(rows&&rows.length){await fetch(SB_URL+'/rest/v1/maintenanceai_data?key=eq.'+encodeURIComponent(DB_KEY),{method:'PATCH',headers:headers,body:JSON.stringify({data:payload})});}
        else{await fetch(SB_URL+'/rest/v1/maintenanceai_data',{method:'POST',headers:headers,body:JSON.stringify({key:DB_KEY,data:payload})});}
      }catch(e){console.warn('Office leads cloud save failed:',e);}
    }
    async function loadCloud(){
      try{
        var rows=await (await fetch(SB_URL+'/rest/v1/maintenanceai_data?key=eq.'+encodeURIComponent(DB_KEY)+'&select=data',{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}})).json();
        if(rows&&rows[0]&&rows[0].data){var d=rows[0].data;if(Array.isArray(d.prospects))state.prospects=d.prospects;if(Array.isArray(d.log))state.log=d.log;if(d.updatedAt)state.updatedAt=d.updatedAt;saveLocal();renderOfficeLeads();}
      }catch(e){console.warn('Office leads cloud load failed:',e);}
    }

    function addStyles(){
      if(document.querySelector('style[data-office-leads-style]'))return;
      var s=document.createElement('style');s.setAttribute('data-office-leads-style','');
      s.textContent='.ol-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:12px;margin-bottom:1rem}.ol-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}.ol-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}.ol-toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:.75rem}.ol-lead{border:1px solid #e2e8f0;border-radius:10px;padding:.85rem 1rem;margin-bottom:.6rem;background:#fff}.ol-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ol-name{font-size:13px;font-weight:700;color:#0f172a}.ol-meta{font-size:11px;color:#64748b;line-height:1.5;margin-top:2px}.ol-notes{font-size:12px;color:#334155;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin:8px 0}.ol-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.ol-badge{display:inline-block;font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;white-space:nowrap}.ol-green{background:#f0fdf4;color:#15803d;border:1px solid #86efac}.ol-blue{background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd}.ol-dark{background:#0f172a;color:#fff;border:1px solid #0f172a}.ol-muted-badge{background:#f8fafc;color:#64748b;border:1px solid #e2e8f0}.ol-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.ol-stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px 10px}.ol-label{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.04em}.ol-value{font-size:13px;color:#0f172a;font-weight:700;margin-top:2px}.ol-preview{font-size:13px;line-height:1.55;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;min-height:180px}.ol-table-wrap{overflow-x:auto}.ol-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}.ol-table th{padding:8px 10px;background:#0f172a;color:#fff;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em}.ol-table td{padding:8px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap}.ol-table tr:nth-child(even) td{background:#f8fafc}.ol-small{font-size:12px;color:#64748b}@media(max-width:820px){.ol-grid,.ol-form-grid,.ol-row2{grid-template-columns:1fr}.ol-summary{grid-template-columns:1fr 1fr}}@media(max-width:580px){.ol-summary{grid-template-columns:1fr}}';
      document.head.appendChild(s);
    }
    function officeOptions(){return offices.map(function(o){return '<option value="'+html(o.number)+'">Office '+html(o.number)+' - '+o.sqft+' sf - '+money(rent(o))+'/mo</option>';}).join('');}
    function inventoryRows(){return offices.map(function(o){return '<tr><td>'+html(o.number)+'</td><td>'+o.sqft+'</td><td>$'+Number(o.rate).toFixed(2)+'</td><td>'+money(rent(o))+'</td><td>'+html(o.type)+'</td><td>'+floorLabel(o.floor)+'</td></tr>';}).join('');}
    function buildEmail(o){
      var note=clean(q('ol-email-note')&&q('ol-email-note').value);
      var subject='Office '+o.number+' now available at 146 Main St';
      var lines=['Hello,','','An office is now available at 146 Main St in Los Altos.','','Office: '+o.number,'Size: '+o.sqft+' square feet','Monthly rent: '+money(rent(o))+' ($'+Number(o.rate).toFixed(2)+' per square foot)','Office type: '+o.type,'Floor: '+floorLabel(o.floor)];
      if(note)lines.push('',note);
      lines=lines.concat(['','If you are still looking for office space, please reply to this email or call/text me at (408) 234-7016.','','Thank you,','Matt Brading','Brading Associates, LLC','(408) 234-7016']);
      return {subject:subject,body:lines.join('\n')};
    }

    function buildPanel(){
      if(q('tab-office-leads'))return;
      addStyles();
      var p=document.createElement('div');p.id='tab-office-leads';p.className='panel';
      p.innerHTML='<div class="metric-grid" id="ol-metrics"></div><div class="ol-grid"><div class="card"><div class="ol-toolbar"><div><div style="font-size:15px;font-weight:700;color:#0f172a">Prospective tenants</div><div class="ol-small">Office space waitlist</div></div><button class="btn-sm btn-soft" onclick="olClearForm()">Clear</button></div><div class="ol-form-grid"><div><div class="section-label">Name *</div><input id="ol-name" placeholder="Name"/></div><div><div class="section-label">Email</div><input id="ol-email" type="email" placeholder="email@example.com"/></div><div><div class="section-label">Phone</div><input id="ol-phone" placeholder="(000) 000-0000"/></div></div><div class="ol-row2"><div><div class="section-label">Status</div><select id="ol-status"><option value="active">Active</option><option value="contacted">Contacted</option><option value="no_interest">No longer interested</option><option value="leased">Leased</option><option value="archived">Archived</option></select></div><div><div class="section-label">Date added</div><input id="ol-date" type="date"/></div></div><div style="margin-bottom:8px"><div class="section-label">Notes</div><textarea id="ol-notes" rows="4" placeholder="Size preference, floor preference, budget, timing, business type..."></textarea></div><button class="btn-primary" id="ol-save-btn" onclick="olSaveProspect()">Save prospect</button></div><div class="card"><div class="ol-toolbar"><div><div style="font-size:15px;font-weight:700;color:#0f172a">Availability email</div><div class="ol-small" id="ol-recipient-count">0 eligible recipients</div></div><button class="btn-sm btn-soft" onclick="olCopyBcc()">Copy BCC</button></div><div style="margin-bottom:8px"><div class="section-label">Available office</div><select id="ol-office" onchange="olRenderEmail()">'+officeOptions()+'</select></div><div class="ol-summary" id="ol-summary"></div><div style="margin-bottom:8px"><div class="section-label">Extra email note</div><textarea id="ol-email-note" rows="2" oninput="olRenderEmail()" placeholder="Move-in timing, showing availability, lease terms..."></textarea></div><div class="section-label">Email preview</div><div class="ol-preview" id="ol-preview"></div><div class="ol-actions"><button class="btn-sm btn-dark" onclick="olEmailAll()">Open email to prospects</button><button class="btn-sm btn-soft" onclick="olCopyEmail()">Copy email text</button><span id="ol-copy-status" class="ol-small"></span></div></div></div><div class="card"><div class="ol-toolbar"><div><div style="font-size:15px;font-weight:700;color:#0f172a">Prospect list</div><div class="ol-small" id="ol-updated"></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="ol-search" placeholder="Search prospects" oninput="olRenderProspects()" style="max-width:210px"/><select id="ol-filter" onchange="olRenderProspects()" style="max-width:170px"><option value="all">All statuses</option><option value="active">Active</option><option value="contacted">Contacted</option><option value="no_interest">No longer interested</option><option value="leased">Leased</option><option value="archived">Archived</option></select></div></div><div id="ol-list"><div class="empty">No prospects saved yet.</div></div></div><div class="card"><div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px">Office inventory</div><div class="ol-small">From the current office list</div><div class="ol-table-wrap"><table class="ol-table"><thead><tr><th>Office</th><th>Sq ft</th><th>$/sf</th><th>Monthly rent</th><th>Type</th><th>Floor</th></tr></thead><tbody>'+inventoryRows()+'</tbody></table></div></div>';
      var first=document.querySelector('.panel');
      if(first&&first.parentNode){first.parentNode.appendChild(p);}else{(document.querySelector('.app')||document.body).appendChild(p);p.classList.add('active');p.style.display='block';}
      if(q('ol-date'))q('ol-date').value=new Date().toISOString().split('T')[0];
    }
    function install(){
      buildPanel();
      var tabs=document.querySelector('.tabs');
      if(tabs&&!q('tab-button-office-leads')){var b=document.createElement('button');b.id='tab-button-office-leads';b.className='tab';b.type='button';b.textContent='Office leads';b.onclick=showOfficeLeads;tabs.appendChild(b);} 
      if(!tabs&&!q('office-leads-open-button')){var a=document.querySelector('.app')||document.body;var open=document.createElement('button');open.id='office-leads-open-button';open.className='btn-sm btn-dark';open.type='button';open.textContent='Office leads';open.onclick=showOfficeLeads;a.insertBefore(open,a.firstChild);}
      renderOfficeLeads();
    }
    function showOfficeLeads(){
      buildPanel();
      document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
      document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
      if(q('tab-button-office-leads'))q('tab-button-office-leads').classList.add('active');
      if(q('tab-office-leads')){q('tab-office-leads').classList.add('active');q('tab-office-leads').style.display='';q('tab-office-leads').scrollIntoView({behavior:'smooth',block:'start'});} 
      renderOfficeLeads();
    }
    function badgeClass(s){return s==='active'?'ol-green':s==='contacted'?'ol-blue':s==='leased'?'ol-dark':'ol-muted-badge';}
    function renderMetrics(){
      var el=q('ol-metrics');if(!el)return;
      var active=state.prospects.filter(function(p){return !p.status||p.status==='active';}).length;
      var emailed=eligible().length;
      var contacted=state.prospects.filter(function(p){return p.status==='contacted';}).length;
      var last=state.log&&state.log[0];
      el.innerHTML='<div class="metric"><div class="metric-label">Active prospects</div><div class="metric-val">'+active+'</div></div><div class="metric"><div class="metric-label">Email ready</div><div class="metric-val">'+emailed+'</div></div><div class="metric"><div class="metric-label">Contacted</div><div class="metric-val">'+contacted+'</div></div><div class="metric"><div class="metric-label">Last email</div><div class="metric-val" style="font-size:16px">'+(last?html(fmtDate(last.sentAt)):'None')+'</div></div>';
      if(q('ol-recipient-count'))q('ol-recipient-count').textContent=emailed+' eligible recipient'+(emailed===1?'':'s');
      if(q('ol-updated'))q('ol-updated').textContent=state.updatedAt?'Updated '+fmtDate(state.updatedAt):'';
    }
    function renderEmail(){
      var o=selectedOffice(), email=buildEmail(o);
      if(q('ol-summary'))q('ol-summary').innerHTML='<div class="ol-stat"><div class="ol-label">Size</div><div class="ol-value">'+o.sqft+' sf</div></div><div class="ol-stat"><div class="ol-label">Rent</div><div class="ol-value">'+money(rent(o))+'/mo</div></div><div class="ol-stat"><div class="ol-label">Type</div><div class="ol-value">'+html(o.type)+'</div></div><div class="ol-stat"><div class="ol-label">Floor</div><div class="ol-value">'+floorLabel(o.floor)+'</div></div>';
      if(q('ol-preview'))q('ol-preview').textContent='Subject: '+email.subject+'\n\n'+email.body;
    }
    function renderProspects(){
      var list=q('ol-list');if(!list)return;
      var filter=q('ol-filter')?q('ol-filter').value:'all', search=clean(q('ol-search')&&q('ol-search').value).toLowerCase();
      var rows=state.prospects.filter(function(p){var text=[p.name,p.email,p.phone,p.notes,statusLabel(p.status)].join(' ').toLowerCase();return (filter==='all'||(p.status||'active')===filter)&&(!search||text.indexOf(search)>-1);}).sort(function(a,b){return clean(b.createdAt).localeCompare(clean(a.createdAt));});
      if(!rows.length){list.innerHTML='<div class="empty">No matching prospects.</div>';return;}
      list.innerHTML=rows.map(function(p){var contact=[clean(p.email),clean(p.phone)].filter(Boolean).join(' / ');return '<div class="ol-lead"><div class="ol-top"><div><div class="ol-name">'+html(p.name||'Unnamed prospect')+'</div><div class="ol-meta">'+html(contact||'No contact saved')+(p.createdAt?' - Added '+html(fmtDate(p.createdAt)):'')+(p.lastContactedAt?' - Last emailed '+html(fmtDate(p.lastContactedAt)):'')+'</div></div><span class="ol-badge '+badgeClass(p.status||'active')+'">'+html(statusLabel(p.status||'active'))+'</span></div>'+(p.notes?'<div class="ol-notes">'+html(p.notes)+'</div>':'')+'<div class="ol-actions"><button class="btn-sm btn-soft" onclick="olEdit(\''+html(p.id)+'\')">Edit</button><button class="btn-sm btn-blue" onclick="olEmailOne(\''+html(p.id)+'\')">Email</button><button class="btn-sm btn-red" onclick="olDelete(\''+html(p.id)+'\')">Delete</button></div></div>';}).join('');
    }
    function renderOfficeLeads(){renderMetrics();renderEmail();renderProspects();}
    function clearForm(){editingId=null;['ol-name','ol-email','ol-phone','ol-notes'].forEach(function(id){if(q(id))q(id).value='';});if(q('ol-status'))q('ol-status').value='active';if(q('ol-date'))q('ol-date').value=new Date().toISOString().split('T')[0];if(q('ol-save-btn'))q('ol-save-btn').textContent='Save prospect';}
    function saveProspect(){
      var name=clean(q('ol-name')&&q('ol-name').value), email=clean(q('ol-email')&&q('ol-email').value), phone=clean(q('ol-phone')&&q('ol-phone').value);
      if(!name){alert('Please enter a name.');return;} if(!email&&!phone){alert('Please enter an email or phone number.');return;}
      var existing=editingId?state.prospects.find(function(p){return p.id===editingId;}):null;
      var p=existing||{id:uid(),createdAt:new Date().toISOString(),lastContactedAt:null};
      p.name=name;p.email=email;p.phone=phone;p.status=(q('ol-status')&&q('ol-status').value)||'active';p.createdAt=(q('ol-date')&&q('ol-date').value)||p.createdAt;p.notes=clean(q('ol-notes')&&q('ol-notes').value);
      if(!existing)state.prospects.unshift(p);
      clearForm();saveCloud();renderOfficeLeads();
    }
    function editLead(id){var p=state.prospects.find(function(x){return x.id===id;});if(!p)return;editingId=id;if(q('ol-name'))q('ol-name').value=p.name||'';if(q('ol-email'))q('ol-email').value=p.email||'';if(q('ol-phone'))q('ol-phone').value=p.phone||'';if(q('ol-status'))q('ol-status').value=p.status||'active';if(q('ol-date'))q('ol-date').value=clean(p.createdAt).slice(0,10)||new Date().toISOString().split('T')[0];if(q('ol-notes'))q('ol-notes').value=p.notes||'';if(q('ol-save-btn'))q('ol-save-btn').textContent='Update prospect';window.scrollTo({top:q('tab-office-leads').offsetTop,behavior:'smooth'});}
    function deleteLead(id){var p=state.prospects.find(function(x){return x.id===id;});if(!p||!confirm('Delete '+(p.name||id)+'? This cannot be undone.'))return;state.prospects=state.prospects.filter(function(x){return x.id!==id;});saveCloud();renderOfficeLeads();}
    function markContacted(ids,o,subject){var now=new Date().toISOString();state.prospects.forEach(function(p){if(ids.indexOf(p.id)>-1){p.lastContactedAt=now;if(!p.status||p.status==='active')p.status='contacted';}});state.log.unshift({id:'OUT-'+Date.now().toString(36),sentAt:now,officeNumber:o.number,recipientCount:ids.length,subject:subject});state.log=state.log.slice(0,50);saveCloud();renderOfficeLeads();}
    function emailAll(){var rec=eligible();if(!rec.length){alert('No active or contacted prospects have email addresses yet.');return;}var o=selectedOffice(), email=buildEmail(o), bcc=rec.map(function(p){return p.email;}).join(',');window.location.href='mailto:?bcc='+encodeURIComponent(bcc)+'&subject='+encodeURIComponent(email.subject)+'&body='+encodeURIComponent(email.body);markContacted(rec.map(function(p){return p.id;}),o,email.subject);}
    function emailOne(id){var p=state.prospects.find(function(x){return x.id===id;});if(!p||!clean(p.email)){alert('This prospect does not have an email address saved.');return;}var o=selectedOffice(), email=buildEmail(o);window.location.href='mailto:'+encodeURIComponent(p.email)+'?subject='+encodeURIComponent(email.subject)+'&body='+encodeURIComponent(email.body);markContacted([id],o,email.subject);}
    async function copyText(text,label){try{await navigator.clipboard.writeText(text);if(q('ol-copy-status'))q('ol-copy-status').textContent=label;}catch(e){prompt(label,text);}setTimeout(function(){if(q('ol-copy-status'))q('ol-copy-status').textContent='';},2200);}
    function copyBcc(){var text=eligible().map(function(p){return p.email;}).join(', ');if(!text){alert('No eligible email addresses to copy.');return;}copyText(text,'BCC copied');}
    function copyEmail(){var email=buildEmail(selectedOffice());copyText('Subject: '+email.subject+'\n\n'+email.body,'Email copied');}

    window.showOfficeLeads=showOfficeLeads;window.olSaveProspect=saveProspect;window.olClearForm=clearForm;window.olEdit=editLead;window.olDelete=deleteLead;window.olEmailAll=emailAll;window.olEmailOne=emailOne;window.olCopyBcc=copyBcc;window.olCopyEmail=copyEmail;window.olRenderEmail=renderEmail;window.olRenderProspects=renderProspects;window.loadOfficeLeadsCloud=loadCloud;
    loadLocal();
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){install();loadCloud();});}else{install();loadCloud();}
    setTimeout(install,800);setTimeout(install,1800);
  }catch(error){console.warn('Office leads patch did not initialize:',error);}
})();
</script>
`;

function publicStorageIsolationBrowser() {
  const prefix = 'maintenanceai_public::';
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalKey = Storage.prototype.key;
  const shouldNamespace = (key) => typeof key === 'string' && key.toLowerCase().includes('maintenanceai');
  const mapKey = (key) => shouldNamespace(key) ? prefix + key : key;

  Storage.prototype.getItem = function(key) {
    return originalGetItem.call(this, mapKey(key));
  };

  Storage.prototype.setItem = function(key, value) {
    return originalSetItem.call(this, mapKey(key), value);
  };

  Storage.prototype.removeItem = function(key) {
    return originalRemoveItem.call(this, mapKey(key));
  };

  Storage.prototype.key = function(index) {
    const value = originalKey.call(this, index);
    return typeof value === 'string' && value.startsWith(prefix) ? value.slice(prefix.length) : value;
  };
}

function personalSaveOverrideBrowser() {
  document.title = '146 Main St | MaintenanceAI';

  function showPersonalConnectionError(message) {
    document.addEventListener('DOMContentLoaded', function() {
      const overlay = document.getElementById('onboarding-overlay');
      if (!overlay) return;
      overlay.style.display = 'flex';
      overlay.innerHTML = '<div style="background:white;border-radius:16px;max-width:560px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:system-ui,sans-serif;color:#0f172a">' +
        '<div style="font-size:20px;font-weight:800;margin-bottom:6px">146 Main St data connection needed</div>' +
        '<div style="font-size:14px;line-height:1.55;color:#475569;margin-bottom:12px">This personal app is separate from the public app, but Vercel still needs the Supabase publishable key for your personal <strong>maintenanceai_data</strong> project before it can auto-load row <strong>146main</strong>.</div>' +
        '<div style="font-size:12px;line-height:1.5;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;padding:10px">' + String(message || 'Missing MAINTENANCEAI_DATA_SUPABASE_KEY in Vercel.').replace(/[&<>]/g, '') + '</div>' +
        '</div>';
    });
  }

  if (window.__maintenanceAiPersonalLoadError) {
    showPersonalConnectionError(window.__maintenanceAiPersonalLoadError);
    return;
  }

  window.addEventListener('load', function() {
    try {
      if (typeof getSyncKey === 'function') {
        window.getSyncKey = function() { return '146main'; };
      }
      if (typeof setSyncKey === 'function') {
        window.setSyncKey = function() { localStorage.setItem('maintenanceai_sync_key', '146main'); };
      }
      localStorage.setItem('maintenanceai_sync_key', '146main');

      window.syncToSupabase = async function() {
        if (typeof state === 'undefined') return;
        try {
          const response = await fetch('/api/personal-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state })
          });
          if (!response.ok) throw new Error(await response.text());
          if (typeof setSyncStatus === 'function') {
            setSyncStatus('saved', 'Saved to personal Supabase');
            setTimeout(function() { setSyncStatus('idle', ''); }, 2500);
          }
        } catch (error) {
          if (typeof setSyncStatus === 'function') setSyncStatus('error', 'Personal sync failed');
          console.error('Personal Supabase sync error:', error);
        }
      };
    } catch (error) {
      console.error('Personal app setup error:', error);
    }
  });
}

function scriptTag(fn) {
  return `<script>(${fn.toString()})();</script>`;
}

function personalStateScript(state) {
  const stateJson = JSON.stringify(state).replace(/</g, '\\u003c');
  return `<script>
(() => {
  try {
    const state = ${stateJson};
    localStorage.setItem('maintenanceai_v2', JSON.stringify(state));
    localStorage.setItem('maintenanceai_sync_key', '146main');
    document.title = '146 Main St | MaintenanceAI';
  } catch (error) {
    window.__maintenanceAiPersonalLoadError = 'Could not install 146 Main St data in this browser.';
  }
})();
</script>`;
}

function personalErrorScript(message) {
  const safeMessage = JSON.stringify(String(message || 'Missing MAINTENANCEAI_DATA_SUPABASE_KEY in Vercel.'));
  return `<script>window.__maintenanceAiPersonalLoadError = ${safeMessage}; document.title = '146 Main St | MaintenanceAI';</script>`;
}

function injectBeforeHeadClose(html, script) {
  return html.includes('</head>')
    ? html.replace('</head>', `${script}\n</head>`)
    : `${script}\n${html}`;
}

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'maintenanceai-nblc.vercel.app'}`);
    const mode = url.searchParams.get('mode') || 'personal';
    const response = await fetch('https://mattbrading14.github.io/maintenanceai_public/');
    let html = await response.text();

    if (mode === 'public') {
      html = injectBeforeHeadClose(html, scriptTag(publicStorageIsolationBrowser));
    } else {
      let stateScript;
      try {
        const personalState = await readPersonalState();
        stateScript = personalStateScript(personalState);
      } catch (error) {
        stateScript = personalErrorScript(error.message);
      }
      html = injectBeforeHeadClose(html, stateScript + '\n' + scriptTag(personalSaveOverrideBrowser) + '\n' + OFFICE_LEADS_PATCH);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(response.ok ? 200 : 502).send(html);
  } catch (error) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(502).send(`<!doctype html><html><head><title>MaintenanceAI</title></head><body><h1>MaintenanceAI is loading</h1><p>Please refresh in a moment.</p></body></html>`);
  }
};