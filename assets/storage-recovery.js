function maiStableJSON(value){return MAISync.stable(value);}
window.__maiCloudReady=false;
window.__maiCloudSnapshot=null;
window.__maiSaveQueue=Promise.resolve();
window.__maiBaseline=null;
window.__maiCloudExtras={};
window.__maiVaultSeen=new Set();
window.__maiLocalGeneration=0;
window.__maiAppliedGeneration=0;
window.__maiLastWrite=null;
function maiSetSync(message,error){window.__maiSync={message,error};if(window.maiSyncStatus)window.maiSyncStatus(message,error);}
function maiCurrent(){return MAISync.copy({...window.__maiCloudExtras,workOrders,maintenanceHistory,pmTasks,TENANTS,VENDORS,bidJobs,roomBookings,roomBookingSettings});}
function maiApply(d){window.__maiCloudExtras=d;workOrders=d.workOrders||[];maintenanceHistory=d.maintenanceHistory||[];pmTasks=d.pmTasks||[];TENANTS=d.TENANTS||TENANTS;VENDORS=d.VENDORS||VENDORS;bidJobs=d.bidJobs||[];roomBookings=d.roomBookings||[];roomBookingSettings={...roomBookingSettings,...d.roomBookingSettings};}
function maiRender(){updateQueueCount();renderPM();renderDirectory();renderBidJobs();updateBidCount();initRoomBookings();if(typeof renderHistory==='function')renderHistory();if(typeof activeWorkOrderView!=='undefined'&&typeof renderQueue==='function')renderQueue(activeWorkOrderView);}
function maiHeaders(){return {apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'};}
function maiURL(){return SUPABASE_URL+'/rest/v1/maintenanceai_data';}
async function maiRequest(url,options={}){const r=await fetch(url,{...options,headers:{...maiHeaders(),...options.headers},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Cloud request failed ('+r.status+').');return r;}
async function maiRead(){const r=await maiRequest(maiURL()+'?key=eq.'+encodeURIComponent(DB_KEY)+'&select=data');const rows=await r.json();if(!Array.isArray(rows)||rows.length>1)throw Error('Unexpected cloud response.');return rows[0]?.data||null;}
async function maiArchive(orders){
  const entries=[];
  for(const wo of orders||[]){if(!wo.id)throw Error('A work order needs an ID before it can sync.');const raw=maiStableJSON(wo),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)),hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),key=DB_KEY+'_wo_v1_'+hash;if(window.__maiVaultSeen.has(key))continue;entries.push({key,data:{schema:'mai-work-order-v1',workOrder:wo,archivedAt:new Date().toISOString()}});}
  for(let n=0;n<entries.length;n+=25){
    const batch=[...new Map(entries.slice(n,n+25).map(e=>[e.key,e])).values()];
    const check=await maiRequest(maiURL()+'?key=in.'+encodeURIComponent('('+batch.map(e=>e.key).join(',')+')')+'&select=key');
    const existing=await check.json();if(!Array.isArray(existing))throw Error('Unable to verify saved work order versions.');
    const found=new Set(existing.map(e=>e.key)),missing=batch.filter(e=>!found.has(e.key));
    // Existing databases need no schema migration. A simultaneous insert can
    // retain a duplicate identical version, but never replaces an older one.
    if(missing.length)await maiRequest(maiURL(),{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(missing)});
    batch.forEach(e=>window.__maiVaultSeen.add(e.key));
  }
}
async function maiVault(){let orders=[];for(let offset=0;;offset+=250){const r=await maiRequest(maiURL()+'?key=like.'+encodeURIComponent(DB_KEY+'_wo_v1_*')+'&select=key,data&order=created_at.desc,key.asc&limit=250&offset='+offset),rows=await r.json();if(!Array.isArray(rows))throw Error('Unable to read work order history.');for(const r of rows){if(r.data?.schema==='mai-work-order-v1'&&r.data.workOrder){window.__maiVaultSeen.add(r.key);orders.push(r.data.workOrder);}}if(rows.length<250)break;}return orders;}
function maiDeviceCopies(){const copies=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key===STORAGE_KEY||key.startsWith(STORAGE_KEY+'_recovery_')){try{const d=JSON.parse(localStorage.getItem(key));if(d&&Array.isArray(d.workOrders))copies.push(d);}catch(error){/* Preserve unreadable copies. */}}}return copies;}
function maiLocalSave(d){localStorage.setItem(STORAGE_KEY,JSON.stringify(d));localStorage.setItem(STORAGE_KEY+'_pending','1');}
async function maiCommit(local,baseline,generation,baselineGeneration){
  try{
    const previous=window.__maiLastWrite;
    if(previous&&previous.generation>baselineGeneration&&previous.generation<generation)baseline=previous.input;
    await maiArchive(local.workOrders);
    for(let attempt=0;attempt<4;attempt++){
      const cloud=await maiRead();await maiArchive(cloud?.workOrders);
      const merged=MAISync.merge(baseline,local,cloud);merged._revision=crypto.randomUUID();
      const filter=cloud?'?key=eq.'+encodeURIComponent(DB_KEY)+'&data->>_revision='+(cloud._revision?'eq.'+encodeURIComponent(cloud._revision):'is.null'):'';
      const response=await maiRequest(maiURL()+filter,{method:cloud?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(cloud?{data:merged}:{key:DB_KEY,data:merged})});
      const rows=await response.json();if(!Array.isArray(rows)||rows.length!==1)continue;
      const saved=rows[0].data;await maiArchive(saved.workOrders);
      window.__maiLastWrite={generation,input:MAISync.copy(local)};
      window.__maiCloudReady=true;window.__maiCloudSnapshot=maiStableJSON(saved);
      if(generation===window.__maiLocalGeneration){maiApply(saved);window.__maiAppliedGeneration=generation;window.__maiBaseline=MAISync.copy(saved);localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));localStorage.setItem(STORAGE_KEY+'_sync_baseline',JSON.stringify(saved));localStorage.removeItem(STORAGE_KEY+'_pending');maiRender();}
      const count=saved._syncConflicts?.length||0;maiSetSync(count?'Saved across devices. '+count+' conflicting records have both versions preserved; review Sync & backup.':'Saved across devices. Work order versions are retained in cloud history.',!!count);return count===0;
    }
    throw Error('Another device is saving. Your changes are queued for retry.');
  }catch(error){window.__maiCloudReady=false;maiSetSync('Saved on this device; not yet synced. '+error.message+' Keep this browser data. Automatic retry is enabled.',true);return false;}
}
async function saveData(){
  const local=maiCurrent(),baseline=MAISync.copy(window.__maiBaseline),baselineGeneration=window.__maiAppliedGeneration,generation=++window.__maiLocalGeneration;
  try{maiLocalSave(local);}catch(error){maiSetSync('Device storage is full. Keep this page open and export a backup.',true);return false;}
  window.__maiSaveQueue=window.__maiSaveQueue.catch(()=>false).then(()=>maiCommit(local,baseline,generation,baselineGeneration));return window.__maiSaveQueue;
}
async function loadFromSupabase(){
  const generation=window.__maiLocalGeneration;
  try{
    const copies=maiDeviceCopies(),current=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'),baselineRaw=localStorage.getItem(STORAGE_KEY+'_sync_baseline'),baseline=baselineRaw?JSON.parse(baselineRaw):null;
    const local=MAISync.recover(current,copies);window.__maiRecoveryLocal=local;
    for(const d of copies)await maiArchive(d.workOrders);
    const cloud=await maiRead(),vault=await maiVault();window.__maiRecoveryCloud=cloud;
    const combined=MAISync.merge(baseline,local,cloud),recovered=MAISync.recover(combined,[{workOrders:vault}]);
    if(generation!==window.__maiLocalGeneration)return false;
    window.__maiBaseline=MAISync.copy(cloud||{});maiApply(recovered);maiLocalSave(recovered);
    return await saveData();
  }catch(error){window.__maiCloudReady=false;maiSetSync('Cloud unavailable. Existing device records are preserved. '+error.message,true);return false;}
  finally{maiRender();}
}
window.maiSyncNow=async function(){await window.__maiSaveQueue;await saveData();let queued,result;do{queued=window.__maiSaveQueue;result=await queued;}while(queued!==window.__maiSaveQueue);return result&&!localStorage.getItem(STORAGE_KEY+'_pending');};
window.addEventListener('online',()=>window.maiSyncNow());
window.addEventListener('focus',()=>{if(!document.querySelector('dialog[open]')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))window.maiSyncNow();});
setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))window.maiSyncNow();},60000);
window.addEventListener('beforeunload',e=>{if(localStorage.getItem(STORAGE_KEY+'_pending')){e.preventDefault();e.returnValue='Changes are waiting to sync.';}});
