(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MAIOps=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const frequencies={Monthly:1,Quarterly:3,'Bi-annually':6,'Every 6 months':6,Annually:12};
  function day(value){
    const s=String(value||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';
    const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s?s:'';
  }
  function localDay(date=new Date()){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
  function recordDay(value){if(day(value))return day(value);const d=new Date(value);return value&&!isNaN(d)?localDay(d):'';}
  function nextDue(value,frequency){
    if(!day(value))throw Error('Choose a valid completion date.');const months=frequencies[frequency];if(!months)throw Error('Choose a supported maintenance frequency.');
    const [y,m,d]=value.split('-').map(Number), target=new Date(Date.UTC(y,m-1+months,1,12));
    const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(d,last));return target.toISOString().slice(0,10);
  }
  function matchingOrders(state,task){return state.workOrders.filter(w=>w.status!=='deleted'&&w.status!=='denied'&&(w.pmTaskId&&w.pmTaskId===task.id||!w.pmTaskId&&/maintenance|scheduled/i.test(w.source||'')&&(w.issue_summary||'').toLowerCase().includes(task.task.toLowerCase())));}
  function complete(state,input){
    const task=state.pmTasks[input.index];if(!task)throw Error('This maintenance task no longer exists.');
    const date=day(input.date),time=input.time||'';if(!date)throw Error('Choose a valid completion date.');
    if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Choose a valid completion time.');
    if(date>localDay()||(date===localDay()&&time&&time>new Date().toTimeString().slice(0,5)))throw Error('Completion cannot be in the future.');
    const next=day(input.next);if(!next||next<=date)throw Error('Next due date must be after the completion date.');
    const previous=task.lastCompletedDate||'';
    if(previous&&date<previous&&!input.workOrderId)throw Error('For an older service visit, edit its existing work order so the latest schedule is preserved.');
    let wo=input.workOrderId?state.workOrders.find(w=>w.id===input.workOrderId):null;
    if(input.workOrderId&&!wo)throw Error('The linked work order was not found.');
    if(wo&&['deleted','denied'].includes(wo.status))throw Error('Restore the work order before marking it complete.');
    const duplicate=matchingOrders(state,task).find(w=>w.status==='completed'&&recordDay(w.completedOn||w.completedDate)===date&&w.id!==input.workOrderId);
    if(duplicate)throw Error('This service date is already logged as '+duplicate.id+'. Edit that record instead.');
    const now=new Date().toISOString();task.id=task.id||'PM-'+cryptoId();
    if(!wo){wo={id:'WO-'+cryptoId(),date,issue_summary:task.task,source:'Completed maintenance log',category:'general',priority:'normal',unit:task.units||'All units',tenant:'Building maintenance',business:'',recommended_action:task.task};state.workOrders.unshift(wo);}
    wo.audit=wo.audit||[];wo.audit.push({at:now,action:'Completion recorded',previousStatus:wo.status||'new',previousCompletedOn:wo.completedOn||wo.completedDate||'',previousNext:task.next});
    Object.assign(wo,{pmTaskId:task.id,status:'completed',completedOn:date,completedDate:date,completedTime:time,completionTimezone:input.timezone||'America/Los_Angeles',vendor:input.vendor||wo.vendor||{name:task.vendor},statusNotes:input.notes||'',excludeFromReport:false,updatedAt:now});
    if(!previous||date>=previous||task.lastCompletedWorkOrderId===wo.id){Object.assign(task,{lastCompletedDate:date,lastCompletedTime:time,lastCompletedWorkOrderId:wo.id,next});}
    let h=state.maintenanceHistory.find(h=>h.workOrderId===wo.id);if(!h){h={id:'HIST-'+cryptoId(),workOrderId:wo.id};state.maintenanceHistory.unshift(h);}
    Object.assign(h,{pmTaskId:task.id,task:task.task,unit:task.units||'All units',vendor:wo.vendor.name,date_completed:date,time_completed:time,next_due:next,notes:input.notes||'',recordedAt:now});
    return wo;
  }
  function cryptoId(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}
  function reportRows(rows,start,end){if(start&&!day(start)||end&&!day(end)||start&&end&&start>end)throw Error('Choose a valid report date range.');return rows.filter(w=>{if(w.excludeFromReport||w.status==='deleted')return false;const d=recordDay(w.status==='completed'?(w.completedOn||w.completedDate||w.date):w.date);return (!start||d>=start)&&(!end||d<=end);});}
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
  return {day,localDay,recordDay,nextDue,complete,matchingOrders,reportRows,search,mergeRecords};
});
