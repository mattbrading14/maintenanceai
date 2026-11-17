function maiStableJSON(value){return JSON.stringify(value,function(k,v){if(v&&typeof v==='object'&&!Array.isArray(v))return Object.keys(v).sort().reduce((o,key)=>{o[key]=v[key];return o;},{});return v;});}
window.__maiCloudReady=false;
window.__maiCloudSnapshot=null;
window.__maiSaveQueue=Promise.resolve();
function maiSetSync(message,error){window.__maiSync={message,error};if(window.maiSyncStatus)window.maiSyncStatus(message,error);}
async function saveData(){
  const payload={...(window.__maiCloudExtras||{}),workOrders,maintenanceHistory,pmTasks,TENANTS,VENDORS,bidJobs,roomBookings,roomBookingSettings};
  payload._revision=crypto.randomUUID();
  const serialized=JSON.stringify(payload);
  try{localStorage.setItem(STORAGE_KEY,serialized);localStorage.setItem(STORAGE_KEY+'_pending','1');}
  catch(e){maiSetSync('Unable to save on this device. Export a backup before leaving this page.',true);return false;}
  if(!window.__maiCloudReady){maiSetSync('Saved on this device only. Cloud sync is unavailable; keep this browser data and export a backup.',true);return false;}
  window.__maiSaveQueue=window.__maiSaveQueue.then(async()=>{
    try{
      const headers={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY};
      const url=SUPABASE_URL+'/rest/v1/maintenanceai_data?key=eq.'+DB_KEY;
      const check=await fetch(url+'&select=data',{headers});if(!check.ok)throw Error('Cloud read failed ('+check.status+')');
      const rows=await check.json();if(!Array.isArray(rows))throw Error('Invalid cloud response');
      const cloud=rows[0]?.data||null;
      if(maiStableJSON(cloud)!==window.__maiCloudSnapshot)throw Error('Cloud records changed on another device. Export this device’s backup before reconciling the records.');
      const result=await fetch(rows.length?url+'&data->>_revision='+(cloud?._revision?'eq.'+encodeURIComponent(cloud._revision):'is.null'):SUPABASE_URL+'/rest/v1/maintenanceai_data',{method:rows.length?'PATCH':'POST',headers:{...headers,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(rows.length?{data:JSON.parse(serialized)}:{key:DB_KEY,data:JSON.parse(serialized)})});
      if(!result.ok)throw Error('Cloud save failed ('+result.status+')');
      const saved=await result.json();if(!Array.isArray(saved)||saved.length!==1)throw Error('Cloud changed while saving. Your device copy is preserved; review Sync & backup.');
      window.__maiCloudSnapshot=maiStableJSON(JSON.parse(serialized));
      if(localStorage.getItem(STORAGE_KEY)===serialized){localStorage.removeItem(STORAGE_KEY+'_pending');maiSetSync('Saved on this device and synced to cloud.',false);}
      return true;
    }catch(e){window.__maiCloudReady=false;maiSetSync('Saved on this device only. '+e.message,true);return false;}
  });
  return window.__maiSaveQueue;
}

async function loadFromSupabase(){
  try{
    const res=await fetch(SUPABASE_URL+'/rest/v1/maintenanceai_data?key=eq.'+DB_KEY+'&select=data',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
    if(!res.ok)throw Error('Cloud load failed ('+res.status+')');const rows=await res.json();if(!Array.isArray(rows))throw Error('Invalid cloud response');
    const cloud=rows[0]?.data||{},raw=localStorage.getItem(STORAGE_KEY),local=raw?JSON.parse(raw):{};
    const combined=MAIOps.reconcile(local,cloud);
    window.__maiCloudSnapshot=maiStableJSON(rows[0]?.data||null);window.__maiCloudExtras=combined.state;
    window.__maiRecoveryLocal=local;window.__maiRecoveryCloud=cloud;
    if(raw&&(combined.localOnly||combined.conflicts.length)){try{localStorage.setItem(STORAGE_KEY+'_recovery_'+Date.now(),raw);}catch(error){maiSetSync('Device storage is full. Export a backup before making changes.',true);return;}}
    const d=combined.state;
    workOrders=d.workOrders||[];maintenanceHistory=d.maintenanceHistory||[];pmTasks=d.pmTasks||[];
    if(Array.isArray(d.TENANTS))TENANTS=d.TENANTS;if(Array.isArray(d.VENDORS))VENDORS=d.VENDORS;
    bidJobs=d.bidJobs||[];roomBookings=d.roomBookings||[];
    if(d.roomBookingSettings)roomBookingSettings={...roomBookingSettings,...d.roomBookingSettings};
    roomBookingSettings.calendarId=roomBookingSettings.calendarId||DEFAULT_ROOM_CALENDAR_ID;
    window.__maiCloudReady=combined.conflicts.length===0;
    if(combined.conflicts.length){maiSetSync('Both copies are preserved. '+combined.conflicts.length+' conflicting records need review in Sync & backup before cloud saving.',true);}
    else{localStorage.setItem(STORAGE_KEY,JSON.stringify(d));if(!combined.localOnly)localStorage.removeItem(STORAGE_KEY+'_pending');maiSetSync(combined.localOnly?'Cloud loaded; '+combined.localOnly+' device-only records kept. Use Sync & backup to save the combined records.':'Cloud records loaded.',false);}
  }catch(error){window.__maiCloudReady=false;maiSetSync('Cloud connection unavailable. Device records are preserved. '+error.message,true);}
  updateQueueCount();renderPM();renderDirectory();renderBidJobs();updateBidCount();initRoomBookings();
}
