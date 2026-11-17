(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MAISync=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const stable=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,n)=>(o[n]=x[n],o),{}):x);
  const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
  const same=(a,b)=>stable(a)===stable(b);
  const keys={workOrders:r=>r.id,pmTasks:r=>r.task,maintenanceHistory:r=>r.id||r.workOrderId||[r.task,r.date_completed,r.vendor].join('|'),TENANTS:r=>r.unit,VENDORS:r=>[r.name,r.trade].join('|'),bidJobs:r=>r.id,roomBookings:r=>r.id};
  function merge(base,local,cloud){
    base=base||{};local=local||{};cloud=cloud||{};
    const out={...copy(cloud)},conflicts=[...(cloud._syncConflicts||[]),...(local._syncConflicts||[])];
    function conflict(field,id,b,l,c){conflicts.push({field,id:String(id),base:copy(b),local:copy(l),cloud:copy(c)});return copy(c);}
    function record(field,id,b,l,c){
      if(l===undefined)return copy(c);
      if(c===undefined)return copy(l);
      if(same(l,c)||same(l,b))return copy(c);
      if(same(c,b))return copy(l);
      if(!b){
        const lt=Date.parse(l.updatedAt||l.recordedAt||''),ct=Date.parse(c.updatedAt||c.recordedAt||'');
        if(Number.isFinite(lt)&&(!Number.isFinite(ct)||lt>ct))return copy(l);
        if(Number.isFinite(ct)&&(!Number.isFinite(lt)||ct>lt))return copy(c);
        return conflict(field,id,b,l,c);
      }
      const r={...copy(c)};let overlap=false;
      for(const k of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(c)])){
        if(same(l[k],b[k]))continue;
        if(same(c[k],b[k])||same(c[k],l[k])){if(l[k]===undefined)delete r[k];else r[k]=copy(l[k]);}
        else if(k==='audit')r[k]=[...new Map([...(c[k]||[]),...(l[k]||[])].map(v=>[stable(v),v])).values()];
        else if(k!=='updatedAt'&&k!=='recordedAt')overlap=true;
      }
      return overlap?conflict(field,id,b,l,c):r;
    }
    for(const [field,key] of Object.entries(keys)){
      const b=new Map((base[field]||[]).map(r=>[key(r),r])),l=new Map((local[field]||[]).map(r=>[key(r),r])),c=new Map((cloud[field]||[]).map(r=>[key(r),r]));
      out[field]=[...new Set([...c.keys(),...l.keys()])].map(id=>record(field,id,b.get(id),l.get(id),c.get(id)));
    }
    out.roomBookingSettings=record('roomBookingSettings','settings',base.roomBookingSettings,local.roomBookingSettings,cloud.roomBookingSettings)||{};
    out._resolvedConflicts=[...new Set([...(cloud._resolvedConflicts||[]),...(local._resolvedConflicts||[])])];
    const resolved=new Set(out._resolvedConflicts);
    out._syncConflicts=[...new Map(conflicts.map(c=>[stable(c),c])).entries()].filter(([id])=>!resolved.has(id)).map(([,c])=>c);
    return out;
  }
  function recover(state,copies){const out=copy(state||{}),orders=new Map((out.workOrders||[]).map(w=>[w.id,w]));for(const s of copies)for(const w of s.workOrders||[])if(w.id&&!orders.has(w.id))orders.set(w.id,copy(w));out.workOrders=[...orders.values()];return out;}
  return {stable,copy,same,keys,merge,recover};
});
