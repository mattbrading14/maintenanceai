(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MAIOps=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const frequencies={Monthly:1,Quarterly:3,'Bi-annually':6,'Every 6 months':6,Annually:12};
  function day(value){
    const s=String(value||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';
    const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s?s:'';
  }
  function localDay(date=new Date()){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
  function recordDay(value){if(day(value))return day(value);const d=new Date(value);return value&&!isNaN(d)?localDay(d):'';}
  function month(value){return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value||''))?String(value):'';}
  function period(value){const m=month(value);if(m){const [y,n]=m.split('-').map(Number);return {start:m+'-01',end:m+'-'+new Date(Date.UTC(y,n,0)).getUTCDate(),precision:'month'};}const d=recordDay(value);return {start:d,end:d,precision:'day'};}
  function displayDate(value){if(month(value))return new Date(value+'-15T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});return value||'Not recorded';}
  function nextPeriod(value,frequency){return month(value)?nextDue(value+'-01',frequency).slice(0,7):nextDue(value,frequency);}
  function nextDue(value,frequency){
    if(!day(value))throw Error('Choose a valid completion date.');const months=frequencies[frequency];if(!months)throw Error('Choose a supported maintenance frequency.');
    const [y,m,d]=value.split('-').map(Number), target=new Date(Date.UTC(y,m-1+months,1,12));
    const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(d,last));return target.toISOString().slice(0,10);
  }
  function matchingOrders(state,task){return state.workOrders.filter(w=>w.status!=='deleted'&&w.status!=='denied'&&(w.pmTaskId&&w.pmTaskId===task.id||!w.pmTaskId&&/maintenance|scheduled/i.test(w.source||'')&&(w.issue_summary||'').toLowerCase().includes(task.task.toLowerCase())));}
  function complete(state,input){
    const task=state.pmTasks[input.index];if(!task)throw Error('This maintenance task no longer exists.');
    const date=input.precision==='month'?month(input.date):day(input.date),time=input.precision==='month'?'':input.time||'';if(!date)throw Error('Choose a valid completion date or month.');
    if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Choose a valid completion time.');
    if(date>localDay()||(date===localDay()&&time&&time>new Date().toTimeString().slice(0,5)))throw Error('Completion cannot be in the future.');
    const next=input.nextPrecision==='month'?month(input.next):day(input.next);if(!next||period(next).start<=period(date).end)throw Error('Next due date must be after the completion date or month.');
    const previous=task.lastCompletedDate||'';
    if(previous&&date<previous&&!input.workOrderId)throw Error('For an older service visit, edit its existing work order so the latest schedule is preserved.');
    let wo=input.workOrderId?state.workOrders.find(w=>w.id===input.workOrderId):null;
    if(input.workOrderId&&!wo)throw Error('The linked work order was not found.');
    if(wo&&['deleted','denied'].includes(wo.status))throw Error('Restore the work order before marking it complete.');
    const duplicate=matchingOrders(state,task).find(w=>w.status==='completed'&&period(w.completedOn||w.completedDate).start<=period(date).end&&period(w.completedOn||w.completedDate).end>=period(date).start&&w.id!==input.workOrderId);
    if(duplicate)throw Error('This service date is already logged as '+duplicate.id+'. Edit that record instead.');
    const now=new Date().toISOString();task.id=task.id||'PM-'+cryptoId();
    if(!wo){wo={id:'WO-'+cryptoId(),date,issue_summary:task.task,source:'Completed maintenance log',category:'general',priority:'normal',unit:task.units||'All units',tenant:'Building maintenance',business:'',recommended_action:task.task};state.workOrders.unshift(wo);}
    wo.audit=wo.audit||[];wo.audit.push({at:now,action:'Completion recorded',previousStatus:wo.status||'new',previousCompletedOn:wo.completedOn||wo.completedDate||'',previousNext:task.next});
    Object.assign(wo,{pmTaskId:task.id,status:'completed',completedOn:date,completedDate:displayDate(date),completedDatePrecision:input.precision||'day',completedTime:time,completionTimezone:input.timezone||'America/Los_Angeles',vendor:input.vendor||wo.vendor||{name:task.vendor},statusNotes:input.notes||'',excludeFromReport:false,updatedAt:now});
    if(!previous||date>=previous||task.lastCompletedWorkOrderId===wo.id){Object.assign(task,{lastCompletedDate:date,lastCompletedPrecision:input.precision||'day',lastCompletedTime:time,lastCompletedWorkOrderId:wo.id,next,nextPrecision:input.nextPrecision||'day',updatedAt:now});}
    let h=state.maintenanceHistory.find(h=>h.workOrderId===wo.id);if(!h){h={id:'HIST-'+cryptoId(),workOrderId:wo.id};state.maintenanceHistory.unshift(h);}
    Object.assign(h,{pmTaskId:task.id,task:task.task,unit:task.units||'All units',vendor:wo.vendor.name,date_completed:date,date_precision:input.precision||'day',time_completed:time,next_due:next,next_due_precision:input.nextPrecision||'day',notes:input.notes||'',recordedAt:now});
    return wo;
  }
  function cryptoId(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}
  function reportRows(rows,start,end){if(start&&!day(start)||end&&!day(end)||start&&end&&start>end)throw Error('Choose a valid report date range.');return rows.filter(w=>{if(w.excludeFromReport||w.status==='deleted')return false;const d=period(w.status==='completed'?(w.completedOn||w.completedDate||w.date):w.date);return (!start||d.end>=start)&&(!end||d.start<=end);});}
  function text(value,depth=0){if(depth>5||value==null)return '';if(typeof value==='string')return value.startsWith('data:')?'':value;if(typeof value!=='object')return String(value);return Object.entries(value).filter(([k])=>!(/photo|image|attachment|base64|audit/i.test(k))).map(([,v])=>text(v,depth+1)).join(' ');}
  function search(state,query){
    const tokens=query.toLowerCase().trim().split(/\s+/).filter(Boolean);if(!tokens.length)return [];
    const list=[];const add=(type,rows,title,tab)=>{(rows||[]).forEach((r,index)=>list.push({type,index,id:r.id,title:title(r),tab,status:r.status||'',record:r,haystack:text(r).toLowerCase()}));};
    add('Work order',state.workOrders,r=>r.id+' · '+(r.issue_summary||'Work order'),'queue');
    add('Maintenance',state.pmTasks,r=>r.task,'pm');add('History',state.maintenanceHistory,r=>r.task,'history');
    add('Tenant',state.TENANTS,r=>(r.business||r.contact)+' · Office '+r.unit,'directory');add('Vendor',state.VENDORS,r=>r.name,'directory');
    add('Bid',state.bidJobs,r=>r.id+' · '+r.title,'bids');add('Room booking',state.roomBookings,r=>r.eventName||r.event_name||r.name||r.contactName||r.id,'bookings');
    add('Turnover',state.turnovers,r=>'Office '+(r.officeNumber||r.office?.number||'')+' · '+(r.title||r.id),'turnovers');
    add('Prospect',state.prospects,r=>r.name,'office-leads');add('Office',state.offices,r=>'Office '+r.number+' · '+r.sqft+' sq ft','office-leads');
    return list.filter(r=>tokens.every(t=>(r.haystack+' '+r.type.toLowerCase()+' '+String(r.title).toLowerCase()).includes(t))).sort((a,b)=>Number(b.id&&query.toLowerCase()===b.id.toLowerCase())-Number(a.id&&query.toLowerCase()===a.id.toLowerCase()));
  }
  function mergeRecords(local,cloud,preferLocal){
    const result={...cloud,...local};
    const keys={workOrders:r=>r.id,pmTasks:r=>r.id||r.task,maintenanceHistory:r=>r.id||[r.task,r.date_completed,r.vendor].join('|'),TENANTS:r=>r.unit,VENDORS:r=>[r.name,r.trade].join('|'),bidJobs:r=>r.id,roomBookings:r=>r.id};
    Object.entries(keys).forEach(([field,key])=>{const first=preferLocal?cloud[field]:local[field],second=preferLocal?local[field]:cloud[field],map=new Map();[...(first||[]),...(second||[])].forEach((r,i)=>map.set(key(r)||'missing-'+i,r));result[field]=[...map.values()];});
    return result;
  }
  function reconcile(local,cloud){
    const result={...cloud},conflicts=[];let localOnly=0;
    const fields={workOrders:r=>r.id,pmTasks:r=>r.task,maintenanceHistory:r=>r.id||[r.task,r.date_completed,r.vendor].join('|'),TENANTS:r=>r.unit,VENDORS:r=>[r.name,r.trade].join('|'),bidJobs:r=>r.id,roomBookings:r=>r.id};
    const stable=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,n)=>(o[n]=x[n],o),{}):x);
    Object.entries(fields).forEach(([field,key])=>{const map=new Map((cloud[field]||[]).map(r=>[key(r),r]));(local[field]||[]).forEach(r=>{const id=key(r),other=map.get(id);if(!other){map.set(id,r);localOnly++;}else if(stable(r)!==stable(other)){const a=Date.parse(r.updatedAt||r.recordedAt||''),b=Date.parse(other.updatedAt||other.recordedAt||'');if(Number.isFinite(a)&&(!Number.isFinite(b)||a>b))map.set(id,r);else if(!(Number.isFinite(b)&&(!Number.isFinite(a)||b>a))){map.set(id,r);conflicts.push({field,id});}}});result[field]=[...map.values()];});
    if(local.roomBookingSettings&&cloud.roomBookingSettings&&stable(local.roomBookingSettings)!==stable(cloud.roomBookingSettings))conflicts.push({field:'roomBookingSettings',id:'settings'});
    return {state:result,conflicts,localOnly};
  }
  return {day,month,period,displayDate,nextPeriod,localDay,recordDay,nextDue,complete,matchingOrders,reportRows,search,mergeRecords,reconcile};
});
