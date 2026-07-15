module.exports = String.raw`
<script data-maintenanceai-office-turnovers>
(function(){
  try{
    if(window.__maintenanceAIOfficeTurnovers)return;
    window.__maintenanceAIOfficeTurnovers=true;

    var SB_URL=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://rhjssomlybvzjncekgbx.supabase.co';
    var SB_KEY=(typeof SUPABASE_KEY!=='undefined'&&SUPABASE_KEY)||'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJoanNzb21seWJ2empuY2VrZ2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDM0NzQsImV4cCI6MjA4OTg3OTQ3NH0.10brFbJm0WhCZUAabu8Td86V889BNKIs1FW2yH42m0w';
    var DB_KEY='146main_office_turnovers';
    var STORAGE_KEY='maintenanceai_146main_office_turnovers';
    var state={jobs:[],updatedAt:null};
    var draftPhotos=[];
    var offices=[
      ['100',925,3.35,3098.75,'Retail',1],['101/102',423,5,2115,'Office',1],['104',174,5,870,'Office',1],
      ['201',256,5,1280,'Office',2],['202',265,5,1325,'Office',2],['203',165,5,825,'Office',2],['204/205',312,5,1560,'Office',2],
      ['207',155,5,775,'Office',2],['208',341,5,1705,'Office',2],['209',162,5,810,'Office',2],['210',180,5,900,'Office',2],
      ['211',180,5,900,'Office',2],['212/213',252,5,1260,'Office',2],['214',144,5,720,'Office',2],['215',144,5,720,'Office',2],
      ['216',126,5,630,'Office',2],['217',285,5,1425,'Office',2]
    ].map(function(o){return {number:o[0],sqft:o[1],rate:o[2],monthlyRent:o[3],type:o[4],floor:o[5]};});
    var scopes=[
      {key:'carpet_clean',label:'Carpet cleaning',trade:'Carpet Cleaning',detail:'Clean carpets and address stains or odor left from move-out.'},
      {key:'carpet_replace',label:'Carpet replacement',trade:'Flooring',detail:'Inspect and replace carpet where cleaning will not be enough.'},
      {key:'paint',label:'Repaint office',trade:'Painting',detail:'Patch walls as needed and repaint the office.'},
      {key:'blinds',label:'New blinds',trade:'Window Coverings',detail:'Measure, supply, and install replacement blinds.'},
      {key:'bulbs',label:'New light bulbs',trade:'Electrical',detail:'Replace burned out bulbs and confirm fixtures are working.'},
      {key:'cleaning',label:'Final cleaning',trade:'Cleaning',detail:'Final clean after turnover work is complete.'},
      {key:'locks',label:'Rekey or lock check',trade:'Locksmith',detail:'Rekey locks or confirm keys and door hardware are working.'},
      {key:'hvac',label:'HVAC check',trade:'HVAC',detail:'Check thermostat, airflow, and visible HVAC issues.'},
      {key:'plumbing',label:'Plumbing check',trade:'Plumbing',detail:'Check sink, toilet, or other plumbing fixtures if applicable.'},
      {key:'other',label:'Other turnover work',trade:'General',detail:'Complete the additional turnover work described in the notes.'}
    ];

    function q(id){return document.getElementById(id);}
    function clean(v){return (v==null?'':String(v)).trim();}
    function lower(v){return clean(v).toLowerCase();}
    function html(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function fmtDate(v){var d=new Date(v);return v&&!isNaN(d.getTime())?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';}
    function floorLabel(f){return f===1?'1st floor':f===2?'2nd floor':f===3?'3rd floor':clean(f)+'th floor';}
    function uid(){return 'TURN-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*9000+1000);}
    function slug(v){return lower(v).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'vendor';}
    function vendors(){try{return Array.isArray(VENDORS)?VENDORS:[];}catch(e){return [];}}
    function findVendorByName(name){return vendors().find(function(v){return lower(v.name)===lower(name);})||null;}
    function selectedOffice(){var val=q('ot-office')?q('ot-office').value:'';return offices.find(function(o){return o.number===val;})||offices[0];}
    function selectedScopes(){return scopes.filter(function(scope){var el=q('ot-scope-'+scope.key);return el&&el.checked;});}
    function uniqueVendors(){var seen={},list=[];vendors().forEach(function(v){if(v&&v.name&&!seen[lower(v.name)]){seen[lower(v.name)]=true;list.push(v);}});return list;}
    function vendorForScope(scope){
      var list=vendors(),key=scope.key,trade=lower(scope.trade);
      function has(v,word){return lower(v.trade).indexOf(word)>-1||lower(v.name).indexOf(word)>-1;}
      var found=null;
      if(key==='carpet_clean')found=list.find(function(v){return has(v,'carpet')&&has(v,'clean');})||list.find(function(v){return has(v,'clean');});
      if(key==='carpet_replace')found=list.find(function(v){return has(v,'floor')||has(v,'carpet');});
      if(key==='paint')found=list.find(function(v){return has(v,'paint');});
      if(key==='blinds')found=list.find(function(v){return has(v,'blind')||has(v,'window covering')||has(v,'shade');});
      if(key==='bulbs')found=list.find(function(v){return lower(v.trade)==='electrical';});
      if(key==='cleaning')found=list.find(function(v){return has(v,'clean')||has(v,'janitorial');});
      if(key==='locks')found=list.find(function(v){return lower(v.trade)==='locksmith'||has(v,'lock');});
      if(key==='hvac')found=list.find(function(v){return lower(v.trade)==='hvac';});
      if(key==='plumbing')found=list.find(function(v){return lower(v.trade)==='plumbing';});
      if(!found)found=list.find(function(v){return lower(v.trade)===trade;})||list.find(function(v){return lower(v.trade).indexOf(trade)>-1;});
      return found||{name:'',trade:scope.trade,contact:'',email:'',phone:''};
    }
    function vendorOptions(selected){
      var opts='<option value="">TBD - select vendor</option>';
      opts+=uniqueVendors().map(function(v){return '<option value="'+html(v.name)+'"'+(lower(v.name)===lower(selected)?' selected':'')+'>'+html(v.name)+' ('+html(v.trade)+')</option>';}).join('');
      return opts;
    }
    function groupedAssignments(){
      var groups={};
      selectedScopes().forEach(function(scope){
        if(!groups[scope.trade])groups[scope.trade]={trade:scope.trade,scopes:[],vendor:vendorForScope(scope)};
        groups[scope.trade].scopes.push(scope);
      });
      Object.keys(groups).forEach(function(trade){
        var id='ot-vendor-'+slug(trade);
        var chosen=q(id)&&q(id).value;
        if(chosen)groups[trade].vendor=findVendorByName(chosen)||groups[trade].vendor;
      });
      return Object.keys(groups).map(function(key){return groups[key];});
    }
    function officeOptions(){return offices.map(function(o){return '<option value="'+html(o.number)+'">Office '+html(o.number)+' - '+o.sqft+' sf - '+floorLabel(o.floor)+'</option>';}).join('');}
    function scopeOptions(){
      return scopes.map(function(scope){return '<label class="ot-check" id="ot-check-'+scope.key+'"><input type="checkbox" id="ot-scope-'+scope.key+'" onchange="otSyncScopeStyle(this);otRenderReview()"/><span><strong>'+html(scope.label)+'</strong><small>'+html(scope.trade)+'</small></span></label>';}).join('');
    }
    function statusLabel(s){return s==='completed'?'Completed':s==='emailed'?'Vendor emailed':'Draft';}
    function statusClass(s){return s==='completed'?'ot-green':s==='emailed'?'ot-blue':'ot-muted';}

    function loadLocal(){try{var saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');if(Array.isArray(saved.jobs))state.jobs=saved.jobs;if(saved.updatedAt)state.updatedAt=saved.updatedAt;}catch(e){}}
    function saveLocal(){state.updatedAt=new Date().toISOString();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}}
    async function saveCloud(){
      saveLocal();
      try{
        var payload={jobs:state.jobs,updatedAt:state.updatedAt};
        var baseHeaders={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
        var rows=await (await fetch(SB_URL+'/rest/v1/maintenanceai_data?key=eq.'+encodeURIComponent(DB_KEY)+'&select=key',{headers:baseHeaders})).json();
        var headers={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};
        if(rows&&rows.length){await fetch(SB_URL+'/rest/v1/maintenanceai_data?key=eq.'+encodeURIComponent(DB_KEY),{method:'PATCH',headers:headers,body:JSON.stringify({data:payload})});}
        else{await fetch(SB_URL+'/rest/v1/maintenanceai_data',{method:'POST',headers:headers,body:JSON.stringify({key:DB_KEY,data:payload})});}
      }catch(e){console.warn('Office turnover cloud save failed:',e);}
    }
    async function loadCloud(){
      try{
        var rows=await (await fetch(SB_URL+'/rest/v1/maintenanceai_data?key=eq.'+encodeURIComponent(DB_KEY)+'&select=data',{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}})).json();
        if(rows&&rows[0]&&rows[0].data){var d=rows[0].data;if(Array.isArray(d.jobs))state.jobs=d.jobs;if(d.updatedAt)state.updatedAt=d.updatedAt;saveLocal();renderTurnovers();}
      }catch(e){console.warn('Office turnover cloud load failed:',e);}
    }

    function addStyles(){
      if(document.querySelector('style[data-office-turnovers-style]'))return;
      var s=document.createElement('style');
      s.setAttribute('data-office-turnovers-style','');
      s.textContent='.ot-grid{display:grid;grid-template-columns:1.03fr .97fr;gap:12px;margin-bottom:1rem}.ot-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}.ot-scope-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}.ot-check{display:flex;align-items:flex-start;gap:8px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;cursor:pointer;font-size:12px}.ot-check input{width:14px;height:14px;margin-top:2px;flex-shrink:0}.ot-check strong{display:block;color:#0f172a}.ot-check small{display:block;color:#64748b;margin-top:2px}.ot-check.selected{border-color:#0f172a;background:#eff6ff}.ot-assignment{display:grid;grid-template-columns:1fr minmax(210px,.85fr);gap:10px;align-items:start;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff}.ot-title{font-size:13px;font-weight:700;color:#0f172a}.ot-small{font-size:12px;color:#64748b;line-height:1.45}.ot-preview{font-size:12px;line-height:1.55;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;min-height:150px}.ot-photo-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.ot-photo{position:relative;width:78px;height:78px}.ot-photo img{width:78px;height:78px;object-fit:cover;border:1px solid #e2e8f0;border-radius:8px}.ot-photo button{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:none;background:#ef4444;color:white;font-size:11px;font-weight:700;cursor:pointer}.ot-job{border:1px solid #e2e8f0;border-radius:10px;padding:.85rem 1rem;margin-bottom:.6rem;background:#fff}.ot-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.ot-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.ot-badge{display:inline-block;font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;white-space:nowrap}.ot-green{background:#f0fdf4;color:#15803d;border:1px solid #86efac}.ot-blue{background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd}.ot-muted{background:#f8fafc;color:#64748b;border:1px solid #e2e8f0}@media(max-width:860px){.ot-grid,.ot-form-grid,.ot-assignment{grid-template-columns:1fr}.ot-scope-grid{grid-template-columns:1fr}}';
      document.head.appendChild(s);
    }
    function buildPanel(){
      if(q('tab-turnovers'))return;
      addStyles();
      var p=document.createElement('div');
      p.id='tab-turnovers';
      p.className='panel';
      p.innerHTML='<div class="metric-grid" id="ot-metrics"></div><div class="ot-grid"><div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:10px"><div><div style="font-size:15px;font-weight:700;color:#0f172a">Office turnover</div><div class="ot-small">Select the vacant office, choose the work, then review vendor emails.</div></div><button class="btn-sm btn-soft" onclick="otResetForm()">Clear</button></div><div style="margin-bottom:10px"><div class="section-label">Read turnover message screenshot</div><div class="upload-zone" style="padding:1.05rem .85rem"><input type="file" accept="image/*" onchange="otReadScreenshot(this.files[0]);this.value=\'\'"/><div class="upload-zone-icon" style="font-size:18px;font-weight:800;color:#0f172a">AI</div><div class="upload-zone-title">Tap to upload text, email, or voicemail screenshot</div><div class="upload-zone-sub">Fills the office, work needed, and notes when possible</div></div><div id="ot-screenshot-result"></div></div><div class="ot-form-grid"><div><div class="section-label">Vacant office</div><select id="ot-office" onchange="otRenderReview()">'+officeOptions()+'</select></div><div><div class="section-label">Move-out date</div><input id="ot-moveout" type="date" onchange="otRenderReview()"/></div><div><div class="section-label">Target ready date</div><input id="ot-ready" type="date" onchange="otRenderReview()"/></div></div><div class="section-label">Work needed</div><div class="ot-scope-grid">'+scopeOptions()+'</div><div style="margin-bottom:8px"><div class="section-label">Notes for vendors</div><textarea id="ot-notes" rows="3" oninput="otRenderReview()" placeholder="Access notes, paint color, carpet notes, lockbox info, timing, anything the vendors need to know..."></textarea></div><div style="margin-bottom:8px"><div class="section-label">Attach office photos</div><div style="border:2px dashed #e2e8f0;border-radius:10px;padding:1rem;text-align:center;background:#f8fafc;cursor:pointer;position:relative;overflow:hidden"><input type="file" accept="image/*" multiple onchange="otHandlePhotos(this)" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%"/><div style="font-size:13px;font-weight:700;color:#0f172a">Tap to add turnover photos</div><div class="ot-small">Photos are saved with the turnover and listed in the vendor email reminder.</div></div><div id="ot-photo-previews" class="ot-photo-grid"></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-primary" style="width:auto;flex:1;min-width:180px" onclick="otSaveDraft()">Save draft</button><button class="btn-primary" style="width:auto;flex:1;min-width:220px;background:#15803d" onclick="otCreateAndEmail()">Confirm & open vendor emails</button></div><div id="ot-form-result" class="ot-small" style="margin-top:8px"></div></div><div class="card"><div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px">Vendor assignment review</div><div class="ot-small" style="margin-bottom:10px">Vendors are selected from the Settings vendor directory based on the turnover scope. You can override any assignment before sending.</div><div id="ot-assignments"></div><div class="section-label">Email preview</div><div id="ot-email-preview" class="ot-preview">Choose at least one turnover task to preview vendor emails.</div></div></div><div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:10px"><div><div style="font-size:15px;font-weight:700;color:#0f172a">Turnover log</div><div class="ot-small" id="ot-updated"></div></div><select id="ot-filter" onchange="otRenderJobs()" style="max-width:170px"><option value="all">All statuses</option><option value="draft">Draft</option><option value="emailed">Vendor emailed</option><option value="completed">Completed</option></select></div><div id="ot-job-list"><div class="empty">No turnovers saved yet.</div></div></div>';
      var first=document.querySelector('.panel');
      if(first&&first.parentNode)first.parentNode.appendChild(p);
      else (document.querySelector('.app')||document.body).appendChild(p);
      var today=new Date().toISOString().split('T')[0];
      if(q('ot-moveout'))q('ot-moveout').value=today;
    }
    function installTab(){
      buildPanel();
      var tabs=document.querySelector('.tabs');
      if(tabs&&!q('tab-button-turnovers')){
        var b=document.createElement('button');
        b.id='tab-button-turnovers';
        b.className='tab';
        b.type='button';
        b.textContent='Turnovers';
        b.setAttribute('data-tab','turnovers');
        b.onclick=showTurnovers;
        var anchor=tabs.querySelector('button[onclick*="bids"]');
        if(anchor&&anchor.nextSibling)tabs.insertBefore(b,anchor.nextSibling);
        else tabs.appendChild(b);
      }
      renderTurnovers();
    }
    var originalSwitchTab=window.switchTab;
    window.switchTab=function(name){
      if(name==='turnovers')return showTurnovers();
      return originalSwitchTab?originalSwitchTab.apply(this,arguments):undefined;
    };
    function showTurnovers(){
      buildPanel();
      document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
      document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
      if(q('tab-button-turnovers'))q('tab-button-turnovers').classList.add('active');
      if(q('tab-turnovers')){q('tab-turnovers').classList.add('active');q('tab-turnovers').style.display='';q('tab-turnovers').scrollIntoView({behavior:'smooth',block:'start'});}
      renderTurnovers();
    }
    function renderMetrics(){
      var el=q('ot-metrics');if(!el)return;
      var draft=state.jobs.filter(function(j){return !j.status||j.status==='draft';}).length;
      var emailed=state.jobs.filter(function(j){return j.status==='emailed';}).length;
      var completed=state.jobs.filter(function(j){return j.status==='completed';}).length;
      var open=state.jobs.filter(function(j){return j.status!=='completed';}).length;
      el.innerHTML='<div class="metric"><div class="metric-label">Open turnovers</div><div class="metric-val">'+open+'</div></div><div class="metric"><div class="metric-label">Draft</div><div class="metric-val">'+draft+'</div></div><div class="metric"><div class="metric-label">Vendor emailed</div><div class="metric-val">'+emailed+'</div></div><div class="metric"><div class="metric-label">Completed</div><div class="metric-val">'+completed+'</div></div>';
      if(q('ot-updated'))q('ot-updated').textContent=state.updatedAt?'Updated '+fmtDate(state.updatedAt):'';
    }
    function renderReview(){
      var wrap=q('ot-assignments'),preview=q('ot-email-preview');
      if(!wrap||!preview)return;
      var groups=groupedAssignments();
      if(!groups.length){wrap.innerHTML='<div class="empty" style="padding:1rem 0">Select the turnover work needed.</div>';preview.textContent='Choose at least one turnover task to preview vendor emails.';return;}
      wrap.innerHTML=groups.map(function(g){
        var selected=g.vendor&&g.vendor.name?g.vendor.name:'';
        return '<div class="ot-assignment"><div><div class="ot-title">'+html(g.trade)+'</div><div class="ot-small">'+g.scopes.map(function(s){return html(s.label);}).join('<br>')+'</div></div><div><select id="ot-vendor-'+slug(g.trade)+'" onchange="otRenderReview()">'+vendorOptions(selected)+'</select><div class="ot-small" style="margin-top:4px">'+(g.vendor&&g.vendor.email?html(g.vendor.email):'No vendor email selected yet')+'</div></div></div>';
      }).join('');
      groups=groupedAssignments();
      var job=draftJob('draft');
      preview.textContent=buildEmail(job,groups[0]).body;
    }
    function renderPhotos(){
      var el=q('ot-photo-previews');if(!el)return;
      el.innerHTML=draftPhotos.map(function(p,i){return '<div class="ot-photo"><img src="'+html(p.dataUrl)+'" alt="'+html(p.name)+'"/><button type="button" onclick="otRemovePhoto('+i+')">x</button></div>';}).join('');
      renderReview();
    }
    function renderJobs(){
      var list=q('ot-job-list');if(!list)return;
      var filter=q('ot-filter')?q('ot-filter').value:'all';
      var rows=state.jobs.filter(function(j){return filter==='all'||(j.status||'draft')===filter;}).sort(function(a,b){return clean(b.createdAt).localeCompare(clean(a.createdAt));});
      if(!rows.length){list.innerHTML='<div class="empty">No matching turnovers.</div>';return;}
      list.innerHTML=rows.map(function(j){
        var office=j.office||{};
        var assignmentText=(j.assignments||[]).map(function(a){return html(a.trade)+' - '+html(a.vendor&&a.vendor.name||'TBD');}).join('<br>');
        var scopeText=(j.scopes||[]).map(function(s){return html(s.label||s);}).join(', ');
        return '<div class="ot-job"><div class="ot-top"><div><div class="ot-title">'+html(j.id)+' - Office '+html(office.number||j.officeNumber||'')+'</div><div class="ot-small">'+html(scopeText||'No scope saved')+'</div><div class="ot-small" style="margin-top:4px">'+assignmentText+'</div></div><span class="ot-badge '+statusClass(j.status||'draft')+'">'+statusLabel(j.status||'draft')+'</span></div>'+(j.notes?'<div class="ot-small" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-top:8px;white-space:pre-wrap">'+html(j.notes)+'</div>':'')+'<div class="ot-actions"><button class="btn-sm btn-email" onclick="otEmailSaved(\''+html(j.id)+'\')">Email vendors</button><button class="btn-sm btn-soft" onclick="otMarkComplete(\''+html(j.id)+'\')">Complete</button><button class="btn-sm btn-deny" onclick="otDeleteJob(\''+html(j.id)+'\')">Delete</button></div></div>';
      }).join('');
    }
    function renderTurnovers(){renderMetrics();renderReview();renderJobs();}
    function draftJob(status){
      var office=selectedOffice();
      var groups=groupedAssignments();
      return {id:uid(),createdAt:new Date().toISOString(),status:status||'draft',office:office,officeNumber:office.number,moveOutDate:q('ot-moveout')?q('ot-moveout').value:'',readyByDate:q('ot-ready')?q('ot-ready').value:'',notes:clean(q('ot-notes')&&q('ot-notes').value),scopes:selectedScopes().map(function(s){return {key:s.key,label:s.label,trade:s.trade,detail:s.detail};}),assignments:groups.map(function(g){return {trade:g.trade,scopes:g.scopes.map(function(s){return {key:s.key,label:s.label,detail:s.detail};}),vendor:g.vendor||{}};}),photos:draftPhotos.slice(),emailedAt:null,completedAt:null};
    }
    function validateJob(job,forEmail){
      if(!job.office||!job.office.number){alert('Please select the vacant office.');return false;}
      if(!job.scopes.length){alert('Please select at least one turnover task.');return false;}
      if(forEmail){
        var missing=job.assignments.filter(function(a){return !clean(a.vendor&&a.vendor.email);});
        if(missing.length){alert('Select a vendor with an email for: '+missing.map(function(a){return a.trade;}).join(', '));return false;}
      }
      return true;
    }
    function resetForm(){
      var today=new Date().toISOString().split('T')[0];
      if(q('ot-office'))q('ot-office').selectedIndex=0;
      if(q('ot-moveout'))q('ot-moveout').value=today;
      if(q('ot-ready'))q('ot-ready').value='';
      if(q('ot-notes'))q('ot-notes').value='';
      scopes.forEach(function(s){var el=q('ot-scope-'+s.key);if(el){el.checked=false;otSyncScopeStyle(el);}});
      draftPhotos=[];
      renderPhotos();
      if(q('ot-form-result'))q('ot-form-result').textContent='';
      renderTurnovers();
    }
    function saveDraft(){
      var job=draftJob('draft');
      if(!validateJob(job,false))return;
      state.jobs.unshift(job);
      saveCloud();
      if(q('ot-form-result'))q('ot-form-result').textContent='Turnover draft saved.';
      resetForm();
      renderTurnovers();
    }
    function createAndEmail(){
      var job=draftJob('emailed');
      if(!validateJob(job,true))return;
      if(!confirm('Open '+job.assignments.length+' vendor email'+(job.assignments.length===1?'':'s')+' for Office '+job.office.number+'?'))return;
      job.emailedAt=new Date().toISOString();
      state.jobs.unshift(job);
      saveCloud();
      openVendorEmails(job);
      if(q('ot-form-result'))q('ot-form-result').textContent='Vendor email windows opened.';
      resetForm();
      renderTurnovers();
    }
    function buildEmail(job,assignment){
      assignment=assignment||{trade:'Turnover',scopes:[],vendor:{}};
      var office=job.office||{},vendor=assignment.vendor||{},greeting=clean(vendor.contact)||clean(vendor.name)||'Vendor';
      var lines=['Dear '+greeting,'','We have a turnover at 146 Main St in Los Altos and need help with the following work.','','Office: '+clean(office.number),'Floor: '+floorLabel(office.floor),'Size: '+(office.sqft||'')+' square feet'];
      if(job.moveOutDate)lines.push('Tenant move-out date: '+job.moveOutDate);
      if(job.readyByDate)lines.push('Target ready date: '+job.readyByDate);
      lines.push('','Requested work:');
      (assignment.scopes||[]).forEach(function(scope){lines.push('- '+clean(scope.label)+': '+clean(scope.detail));});
      if(job.notes)lines.push('','Notes:',job.notes);
      if(job.photos&&job.photos.length)lines.push('','Photos:',job.photos.map(function(p){return '- '+p.name;}).join('\n'),'Please see the attached photos before sending. If the attachments do not come through, let me know and I can resend them.');
      lines=lines.concat(['','Please confirm receipt and let me know your availability.','','Thank you,','Matt Brading','Brading Associates, LLC','(408) 234-7016','matt@bradingassociates.com']);
      return {subject:'Office turnover - Office '+clean(office.number)+' - 146 Main St',body:lines.join('\n')};
    }
    function openVendorEmails(job){
      (job.assignments||[]).forEach(function(assignment,index){
        setTimeout(function(){
          var vendor=assignment.vendor||{},email=buildEmail(job,assignment);
          window.open('mailto:'+encodeURIComponent(clean(vendor.email))+'?subject='+encodeURIComponent(email.subject)+'&body='+encodeURIComponent(email.body));
        },index*650);
      });
    }
    function emailSaved(id){
      var job=state.jobs.find(function(j){return j.id===id;});
      if(!job)return;
      if(!validateJob(job,true))return;
      if(!confirm('Open vendor email'+(job.assignments.length===1?'':'s')+' for '+id+'?'))return;
      job.status='emailed';
      job.emailedAt=new Date().toISOString();
      saveCloud();
      openVendorEmails(job);
      renderTurnovers();
    }
    function markComplete(id){var job=state.jobs.find(function(j){return j.id===id;});if(!job)return;job.status='completed';job.completedAt=new Date().toISOString();saveCloud();renderTurnovers();}
    function deleteJob(id){var job=state.jobs.find(function(j){return j.id===id;});if(!job||!confirm('Delete '+id+'?'))return;state.jobs=state.jobs.filter(function(j){return j.id!==id;});saveCloud();renderTurnovers();}
    function syncScopeStyle(el){var label=el&&el.closest&&el.closest('.ot-check');if(label)label.classList.toggle('selected',!!el.checked);}
    function handlePhotos(input){
      var files=Array.prototype.slice.call(input&&input.files||[]);
      files.forEach(function(file){
        function add(dataUrl){draftPhotos.push({name:file.name,dataUrl:dataUrl});renderPhotos();}
        if(typeof compressImage==='function')compressImage(file,900,0.55).then(function(base64){add('data:image/jpeg;base64,'+base64);}).catch(function(){readRawPhoto(file,add);});
        else readRawPhoto(file,add);
      });
      if(input)input.value='';
    }
    function readRawPhoto(file,done){var reader=new FileReader();reader.onload=function(e){done(String(e.target.result||''));};reader.readAsDataURL(file);}
    function removePhoto(index){draftPhotos.splice(index,1);renderPhotos();}
    function stripCodeFences(rawText){var tick=String.fromCharCode(96),fence=tick+tick+tick;return String(rawText||'').replace(new RegExp(fence+'json|'+fence,'g'),'').trim();}
    function parseAiJson(rawText){var text=stripCodeFences(rawText);try{return JSON.parse(text);}catch(e){var start=text.indexOf('{'),end=text.lastIndexOf('}');if(start>-1&&end>start)return JSON.parse(text.slice(start,end+1));}throw new Error('AI response could not be read as turnover details');}
    function scopeMatches(scope,text){
      text=lower(text);
      if(!text)return false;
      var terms=[scope.key,scope.label,scope.trade];
      if(scope.key==='carpet_clean')terms=terms.concat(['carpet clean','clean carpet','shampoo']);
      if(scope.key==='carpet_replace')terms=terms.concat(['replace carpet','new carpet','flooring']);
      if(scope.key==='paint')terms=terms.concat(['paint','repaint']);
      if(scope.key==='blinds')terms=terms.concat(['blind','window covering','shade']);
      if(scope.key==='bulbs')terms=terms.concat(['light bulb','bulb','lighting']);
      if(scope.key==='cleaning')terms=terms.concat(['final clean','cleaning']);
      if(scope.key==='locks')terms=terms.concat(['key','lock','rekey']);
      return terms.some(function(term){return text.indexOf(lower(term))>-1;});
    }
    function applyAiTurnover(data){
      var office=clean(data.office_number||data.office||data.unit);
      if(office&&q('ot-office')){
        var match=offices.find(function(o){return lower(o.number)===lower(office)||lower('office '+o.number)===lower(office);});
        if(match)q('ot-office').value=match.number;
      }
      if(data.move_out_date&&q('ot-moveout'))q('ot-moveout').value=clean(data.move_out_date);
      if(data.target_ready_date&&q('ot-ready'))q('ot-ready').value=clean(data.target_ready_date);
      var items=Array.isArray(data.work_needed)?data.work_needed.join(' '):clean(data.work_needed||data.scope||'');
      scopes.forEach(function(scope){var el=q('ot-scope-'+scope.key);if(el&&scopeMatches(scope,items)){el.checked=true;syncScopeStyle(el);}});
      var notes=[data.source_summary,data.notes].map(clean).filter(Boolean).join('\n');
      if(notes&&q('ot-notes'))q('ot-notes').value=notes;
      renderReview();
    }
    async function readScreenshot(file){
      if(!file)return;
      if(typeof showTurnovers==='function')showTurnovers();
      var result=q('ot-screenshot-result');
      if(result)result.innerHTML='<div class="loading-row"><div class="spinner"></div>Reading turnover message...</div>';
      try{
        var base64=typeof compressImage==='function'?await compressImage(file,900,0.55):await new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(e){resolve(String(e.target.result||'').split(',')[1]||'');};r.onerror=function(){reject(new Error('Could not read screenshot'));};r.readAsDataURL(file);});
        var prompt='You are a property management assistant for 146 Main St, Los Altos. Read this screenshot of an email, text message, note, or voicemail transcript about an office turnover. Extract the vacant office number, dates, requested turnover work, and vendor notes. Work items should use these labels when applicable: carpet cleaning, carpet replacement, repaint office, new blinds, new light bulbs, final cleaning, rekey or lock check, HVAC check, plumbing check, other turnover work. Return ONLY valid JSON with this shape: {"office_number":"","move_out_date":"","target_ready_date":"","work_needed":[],"notes":"","source_summary":"","confidence":"high|medium|low"}';
        var res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:800,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:base64}},{type:'text',text:prompt}]}]})});
        var payload=await res.json();
        if(!res.ok||payload.error)throw new Error(payload.error&&payload.error.message||'No response from AI');
        if(!payload.content||!payload.content[0])throw new Error('No response from AI');
        var extracted=parseAiJson(payload.content[0].text);
        applyAiTurnover(extracted);
        if(result)result.innerHTML='<div style="border:1px solid #86efac;border-radius:10px;padding:10px 12px;margin-top:8px;background:#fff;font-size:12px;color:#15803d"><strong>Turnover details filled.</strong> Review the office, work needed, and vendor assignments before sending.</div>';
      }catch(err){
        if(result)result.innerHTML='<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:10px 12px;margin-top:8px;font-size:12px;color:#b91c1c"><strong>Error reading turnover screenshot: '+html(err.message||err)+'</strong></div>';
      }
    }

    window.showTurnovers=showTurnovers;window.otRenderReview=renderReview;window.otRenderJobs=renderJobs;window.otResetForm=resetForm;window.otSaveDraft=saveDraft;window.otCreateAndEmail=createAndEmail;window.otEmailSaved=emailSaved;window.otMarkComplete=markComplete;window.otDeleteJob=deleteJob;window.otSyncScopeStyle=syncScopeStyle;window.otHandlePhotos=handlePhotos;window.otRemovePhoto=removePhoto;window.otReadScreenshot=readScreenshot;window.loadOfficeTurnoversCloud=loadCloud;
    loadLocal();
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){installTab();loadCloud();});}else{installTab();loadCloud();}
    setTimeout(installTab,800);setTimeout(installTab,1800);setTimeout(installTab,3200);
  }catch(error){console.warn('Office turnover add-on did not initialize:',error);}
})();
</script>
`;
