const fs = require('fs');
const path = require('path');

let cachedHtml = null;

const EDITABLE_FIELDS_PATCH = String.raw`
<script data-maintenanceai-editable-fields>
(function(){
  if(window.__maintenanceAIEditableFieldsPatch)return;
  window.__maintenanceAIEditableFieldsPatch=true;

  var CUSTOM='__custom__';
  var CUSTOM_TENANT='__custom_tenant__';
  var CUSTOM_VENDOR='__custom_vendor__';

  function q(id){return document.getElementById(id);}
  function clean(v){return (v==null?'':String(v)).trim();}
  function norm(v){return clean(v).toLowerCase().replace(/&amp;/g,'and').replace(/[^a-z0-9]+/g,' ').trim();}
  function esc(v){return clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function attr(v){return esc(v).replace(/'/g,'&#39;');}
  function tenantList(){try{return TENANTS||[];}catch(e){return [];}}
  function vendorList(){try{return VENDORS||[];}catch(e){return [];}}
  function orderList(){try{return workOrders||[];}catch(e){return [];}}
  function save(){try{saveData();}catch(e){}}
  function refreshCounts(){try{updateQueueCount();}catch(e){}try{updateBidCount();}catch(e){}}
  function selectedOption(sel){return sel&&sel.options?sel.options[sel.selectedIndex]:null;}
  function hasOption(sel,value,label){
    if(!sel)return false;
    var needle=norm(value||label);
    return Array.prototype.slice.call(sel.options).some(function(o){
      return norm(o.value||o.textContent)===needle||norm(o.textContent)===needle;
    });
  }
  function addOption(sel,value,label,beforeValue){
    if(!sel||hasOption(sel,value,label))return;
    var opt=document.createElement('option');
    opt.value=value;
    opt.textContent=label||value;
    var before=null;
    if(beforeValue){
      before=Array.prototype.slice.call(sel.options).find(function(o){return o.value===beforeValue||norm(o.textContent)===norm(beforeValue);});
    }
    if(!before)before=Array.prototype.slice.call(sel.options).find(function(o){return o.value===CUSTOM||o.value===CUSTOM_TENANT||o.value===CUSTOM_VENDOR;});
    sel.insertBefore(opt,before||null);
  }
  function addAfter(el,id,html){
    if(!el)return null;
    if(q(id))return q(id);
    el.insertAdjacentHTML('afterend',html);
    return q(id);
  }
  function show(el,yes){if(el)el.style.display=yes?'block':'none';}
  function blankVendor(){return {name:'TBD',contact:'',email:'',phone:''};}
  function findWO(id){return orderList().find(function(w){return w.id===id;});}
  function promptField(label,current){
    var value=prompt(label+':',current||'');
    return value===null?null:clean(value);
  }

  function getCustomValue(selectId,inputId,label){
    var sel=q(selectId);
    if(!sel)return '';
    if(sel.value===CUSTOM){
      var custom=clean(q(inputId)&&q(inputId).value);
      if(!custom){
        alert('Please enter '+label+'.');
        if(q(inputId))q(inputId).focus();
        return '';
      }
      addOption(sel,custom,custom);
      sel.value=custom;
      if(q(inputId)){q(inputId).value='';show(q(inputId),false);}
      return custom;
    }
    var opt=selectedOption(sel);
    return clean(sel.value||opt&&opt.textContent);
  }

  var originalInitCallLog=window.initCallLog;
  var originalAutoFillTenant=window.autoFillTenant;
  var originalAutoFillVendorDetails=window.autoFillVendorDetails;
  var originalSubmitCallLog=window.submitCallLog;
  var originalSendBidRequests=window.sendBidRequests;
  var originalToggleNewBidForm=window.toggleNewBidForm;
  var originalRenderQueue=window.renderQueue;
  var originalSaveWOEdit=window.saveWOEdit;
  var originalRenderHistory=window.renderHistory;
  var originalRenderBidJobs=window.renderBidJobs;
  var originalRenderPM=window.renderPM;
  var originalAddPM=window.addPM;

  window.matchVendor=function(cat){
    var c=norm(cat);
    if(!c)return null;
    var aliases=[
      ['window','Window Cleaning'],['glass','Window Cleaning'],
      ['plumb','Plumbing'],['hvac','HVAC'],['heat','HVAC'],['air conditioning','HVAC'],
      ['electric','Electrical'],['lock','Locksmith'],
      ['extinguisher','Fire Extinguishers'],['hood','Kitchen Hood Fire System'],
      ['sprinkler','Fire Sprinkler System'],['fire','Fire Sprinkler System'],
      ['paint','Painting'],['roof','Roofing'],['floor','Flooring'],
      ['landscape','Landscaping'],['pest','Pest Control'],['concrete','Concrete / Masonry'],
      ['masonry','Concrete / Masonry'],['general','General / Handyman'],['handyman','General / Handyman']
    ];
    var desired='';
    aliases.some(function(pair){if(c.indexOf(pair[0])>-1){desired=pair[1];return true;}return false;});
    var dn=norm(desired||cat);
    return vendorList().find(function(v){
      var trade=norm(v.trade);
      return trade===dn||dn.indexOf(trade)>-1||trade.indexOf(dn)>-1;
    })||null;
  };

  window.autoFillVendor=function(){
    var sel=q('lc-vendor');
    var v=window.matchVendor(window.getServiceValue?window.getServiceValue():q('lc-service')&&q('lc-service').value);
    if(v&&sel&&Array.prototype.slice.call(sel.options).some(function(o){return o.value===v.name;})){
      sel.value=v.name;
      if(originalAutoFillVendorDetails)originalAutoFillVendorDetails();
    }else{
      if(sel)sel.value='';
      ['lc-vendor-contact','lc-vendor-phone','lc-vendor-email'].forEach(function(id){if(q(id))q(id).value='';});
    }
  };

  window.handleServiceSelect=function(){
    var sel=q('lc-service');
    var input=q('lc-service-custom');
    var isCustom=sel&&sel.value===CUSTOM;
    show(input,isCustom);
    if(isCustom&&input)input.focus();
    window.autoFillVendor();
  };

  window.getServiceValue=function(){
    var sel=q('lc-service');
    if(!sel)return '';
    if(sel.value===CUSTOM)return clean(q('lc-service-custom')&&q('lc-service-custom').value);
    var opt=selectedOption(sel);
    return clean(sel.value||opt&&opt.textContent);
  };

  function setupServiceType(){
    var sel=q('lc-service');
    if(!sel)return;
    addOption(sel,'Window Cleaning','Window Cleaning','general');
    addOption(sel,CUSTOM,'+ Add new service/category...');
    addAfter(sel,'lc-service-custom','<input id="lc-service-custom" placeholder="Enter new service/category" style="display:none;margin-top:6px"/>');
    sel.onchange=window.handleServiceSelect;
    sel.setAttribute('onchange','handleServiceSelect()');
  }

  window.handleTenantSelect=function(){
    var sel=q('lc-tenant');
    var isCustom=sel&&sel.value===CUSTOM_TENANT;
    show(q('lc-tenant-quick'),isCustom);
    if(isCustom){
      if(q('lc-tenant-new-name'))q('lc-tenant-new-name').focus();
      updateTenantPreview();
    }else if(originalAutoFillTenant){
      originalAutoFillTenant();
    }
  };

  function updateTenantPreview(){
    var name=clean(q('lc-tenant-new-name')&&q('lc-tenant-new-name').value);
    var unit=clean(q('lc-tenant-new-unit')&&q('lc-tenant-new-unit').value);
    var business=clean(q('lc-tenant-new-business')&&q('lc-tenant-new-business').value);
    var phone=clean(q('lc-tenant-new-phone')&&q('lc-tenant-new-phone').value);
    var email=clean(q('lc-tenant-new-email')&&q('lc-tenant-new-email').value);
    if(q('lc-unit'))q('lc-unit').value=unit?(business?'Unit '+unit+' - '+business:'Unit '+unit):'';
    if(q('lc-tenant-phone'))q('lc-tenant-phone').value=phone;
    if(q('lc-tenant-email'))q('lc-tenant-email').value=email;
  }

  function setupTenantQuick(){
    var sel=q('lc-tenant');
    if(!sel)return;
    addOption(sel,CUSTOM_TENANT,'+ Add new tenant/contact...');
    addAfter(sel,'lc-tenant-quick','<div id="lc-tenant-quick" style="display:none;margin-top:8px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px"><div class="section-label">New tenant/contact</div><div class="row2"><input id="lc-tenant-new-name" placeholder="Contact name"/><input id="lc-tenant-new-unit" placeholder="Unit"/></div><div class="row2" style="margin-bottom:0"><input id="lc-tenant-new-business" placeholder="Business name"/><input id="lc-tenant-new-phone" placeholder="Phone"/></div><input id="lc-tenant-new-email" placeholder="Email" style="margin-top:8px"/></div>');
    sel.onchange=window.handleTenantSelect;
    sel.setAttribute('onchange','handleTenantSelect()');
    ['lc-tenant-new-name','lc-tenant-new-unit','lc-tenant-new-business','lc-tenant-new-phone','lc-tenant-new-email'].forEach(function(id){
      var el=q(id);
      if(el&&!el.dataset.previewBound){el.dataset.previewBound='1';el.addEventListener('input',updateTenantPreview);}
    });
  }

  window.autoFillVendorDetails=function(){
    var sel=q('lc-vendor');
    var isCustom=sel&&sel.value===CUSTOM_VENDOR;
    show(q('lc-vendor-quick'),isCustom);
    if(isCustom){
      if(q('lc-vendor-new-name'))q('lc-vendor-new-name').focus();
      updateVendorPreview();
    }else if(originalAutoFillVendorDetails){
      originalAutoFillVendorDetails();
    }
  };

  function updateVendorPreview(){
    var name=clean(q('lc-vendor-new-name')&&q('lc-vendor-new-name').value);
    var contact=clean(q('lc-vendor-new-contact')&&q('lc-vendor-new-contact').value)||name;
    var phone=clean(q('lc-vendor-new-phone')&&q('lc-vendor-new-phone').value);
    var email=clean(q('lc-vendor-new-email')&&q('lc-vendor-new-email').value);
    if(q('lc-vendor-contact'))q('lc-vendor-contact').value=contact;
    if(q('lc-vendor-phone'))q('lc-vendor-phone').value=phone;
    if(q('lc-vendor-email'))q('lc-vendor-email').value=email;
  }

  function setupVendorQuick(){
    var sel=q('lc-vendor');
    if(!sel)return;
    addOption(sel,CUSTOM_VENDOR,'+ Add new vendor...');
    addAfter(sel,'lc-vendor-quick','<div id="lc-vendor-quick" style="display:none;margin-top:8px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px"><div class="section-label">New vendor</div><div class="row2"><input id="lc-vendor-new-name" placeholder="Vendor name"/><input id="lc-vendor-new-trade" placeholder="Trade/specialty"/></div><div class="row3" style="margin-bottom:0"><input id="lc-vendor-new-contact" placeholder="Contact"/><input id="lc-vendor-new-phone" placeholder="Phone"/><input id="lc-vendor-new-email" placeholder="Email"/></div></div>');
    sel.onchange=window.autoFillVendorDetails;
    sel.setAttribute('onchange','autoFillVendorDetails()');
    ['lc-vendor-new-name','lc-vendor-new-contact','lc-vendor-new-phone','lc-vendor-new-email'].forEach(function(id){
      var el=q(id);
      if(el&&!el.dataset.previewBound){el.dataset.previewBound='1';el.addEventListener('input',updateVendorPreview);}
    });
  }

  function commitQuickTenant(){
    var sel=q('lc-tenant');
    if(!sel||sel.value!==CUSTOM_TENANT)return true;
    var name=clean(q('lc-tenant-new-name')&&q('lc-tenant-new-name').value);
    var unit=clean(q('lc-tenant-new-unit')&&q('lc-tenant-new-unit').value);
    if(!name||!unit){alert('Please enter the tenant/contact name and unit.');return false;}
    var tenant={unit:unit,business:clean(q('lc-tenant-new-business')&&q('lc-tenant-new-business').value),contact:name,office_phone:'',cell_phone:clean(q('lc-tenant-new-phone')&&q('lc-tenant-new-phone').value),email:clean(q('lc-tenant-new-email')&&q('lc-tenant-new-email').value)};
    var existing=tenantList().find(function(t){return t.unit===unit;});
    if(existing)Object.assign(existing,tenant);else TENANTS.push(tenant);
    addOption(sel,unit,name+' - Unit '+unit+(tenant.business?' ('+tenant.business+')':''));
    sel.value=unit;
    show(q('lc-tenant-quick'),false);
    if(originalAutoFillTenant)originalAutoFillTenant();
    return true;
  }

  function commitQuickVendor(){
    var sel=q('lc-vendor');
    if(!sel||sel.value!==CUSTOM_VENDOR)return true;
    var name=clean(q('lc-vendor-new-name')&&q('lc-vendor-new-name').value);
    if(!name){alert('Please enter the vendor name.');return false;}
    var vendor={name:name,trade:clean(q('lc-vendor-new-trade')&&q('lc-vendor-new-trade').value)||window.getServiceValue()||'General / Handyman',contact:clean(q('lc-vendor-new-contact')&&q('lc-vendor-new-contact').value)||name,phone:clean(q('lc-vendor-new-phone')&&q('lc-vendor-new-phone').value),email:clean(q('lc-vendor-new-email')&&q('lc-vendor-new-email').value)};
    VENDORS.push(vendor);
    addOption(sel,name,name+' ('+vendor.trade+')');
    sel.value=name;
    show(q('lc-vendor-quick'),false);
    if(originalAutoFillVendorDetails)originalAutoFillVendorDetails();
    return true;
  }

  function setupLogCallControls(){
    if(q('lc-tenant')&&q('lc-tenant').options.length<=1&&originalInitCallLog)originalInitCallLog();
    setupServiceType();
    setupTenantQuick();
    setupVendorQuick();
  }

  window.initCallLog=function(){
    if(originalInitCallLog)originalInitCallLog();
    setupLogCallControls();
  };

  window.submitCallLog=function(){
    if(!commitQuickTenant()||!commitQuickVendor())return;
    var service=getCustomValue('lc-service','lc-service-custom','a service/category');
    if(!service)return;
    return originalSubmitCallLog?originalSubmitCallLog.apply(this,arguments):undefined;
  };

  function setupBidTrade(){
    var sel=q('bid-trade');
    if(!sel)return;
    addOption(sel,'Window Cleaning','Window Cleaning','Windows / Doors');
    addOption(sel,CUSTOM,'+ Add new trade/category...');
    addAfter(sel,'bid-trade-custom','<input id="bid-trade-custom" placeholder="Enter new trade/category" style="display:none;margin-top:6px"/>');
    sel.onchange=function(){var isCustom=sel.value===CUSTOM;show(q('bid-trade-custom'),isCustom);if(isCustom&&q('bid-trade-custom'))q('bid-trade-custom').focus();};
  }

  window.toggleNewBidForm=function(){
    var out=originalToggleNewBidForm?originalToggleNewBidForm.apply(this,arguments):undefined;
    setupBidTrade();
    return out;
  };

  window.sendBidRequests=function(){
    var trade=getCustomValue('bid-trade','bid-trade-custom','a trade/category');
    if(!trade)return;
    return originalSendBidRequests?originalSendBidRequests.apply(this,arguments):undefined;
  };

  function setupVendorTradeOptions(){
    var sel=q('nv-trade');
    if(!sel)return;
    addOption(sel,'Painting','Painting',CUSTOM);
    addOption(sel,'Window Cleaning','Window Cleaning',CUSTOM);
  }

  function setupPMVendorQuick(){
    var sel=q('pm-vendor-select');
    if(!sel)return;
    addOption(sel,CUSTOM_VENDOR,'+ Add new vendor...');
  }

  window.renderPM=function(){
    if(originalRenderPM)originalRenderPM.apply(this,arguments);
    setupPMVendorQuick();
  };

  window.addPM=function(){
    var sel=q('pm-vendor-select');
    if(sel&&sel.value===CUSTOM_VENDOR){
      var name=promptField('New vendor name','');
      if(!name)return;
      var trade=promptField('Trade/specialty','General / Handyman')||'General / Handyman';
      var contact=promptField('Contact name',name)||name;
      var phone=promptField('Phone','')||'';
      var email=promptField('Email','')||'';
      VENDORS.push({name:name,trade:trade,contact:contact,phone:phone,email:email});
      addOption(sel,name,name);
      sel.value=name;
    }
    return originalAddPM?originalAddPM.apply(this,arguments):undefined;
  };

  window.editPM=function(i){
    var t=pmTasks&&pmTasks[i];
    if(!t)return;
    var task=promptField('Task name',t.task);if(task===null)return;
    var freq=promptField('Frequency',t.freq);if(freq===null)return;
    var next=promptField('Next due date (YYYY-MM-DD)',t.next);if(next===null)return;
    var vendor=promptField('Vendor',t.vendor);if(vendor===null)return;
    var units=promptField('Unit(s)',t.units);if(units===null)return;
    var cost=promptField('Estimated cost',t.cost||'');if(cost===null)return;
    Object.assign(t,{task:task,freq:freq,next:next,vendor:vendor,units:units,cost:cost});
    save();
    if(window.renderPM)window.renderPM();
  };

  function editTenantHTML(sid){
    return '<div id="eten-quick-'+sid+'" style="display:none;margin-top:6px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px"><div class="row2"><input id="eten-new-name-'+sid+'" placeholder="Contact name"/><input id="eten-new-unit-'+sid+'" placeholder="Unit"/></div><div class="row2" style="margin-bottom:0"><input id="eten-new-business-'+sid+'" placeholder="Business"/><input id="eten-new-email-'+sid+'" placeholder="Email"/></div></div>';
  }
  function editVendorHTML(sid){
    return '<div id="ev-quick-'+sid+'" style="display:none;margin-top:6px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px"><div class="row2"><input id="ev-new-name-'+sid+'" placeholder="Vendor name"/><input id="ev-new-trade-'+sid+'" placeholder="Trade/specialty"/></div><div class="row3" style="margin-bottom:0"><input id="ev-new-contact-'+sid+'" placeholder="Contact"/><input id="ev-new-phone-'+sid+'" placeholder="Phone"/><input id="ev-new-email-'+sid+'" placeholder="Email"/></div></div>';
  }
  function statusOptions(current){
    var labels={pending:'Pending approval',owner_pending:'Awaiting owner approval',emailed:'Emailed to vendor',approved:'Approved',completed:'Completed',denied:'Denied'};
    return ['pending','owner_pending','emailed','approved','completed','denied'].map(function(v){return '<option value="'+v+'"'+(current===v?' selected':'')+'>'+labels[v]+'</option>';}).join('');
  }

  function enhanceWOEditPanels(){
    orderList().forEach(function(wo){
      var sid=wo.id.replace('-','_');
      var panel=q('edit-'+sid);
      if(!panel||panel.dataset.enhancedFields)return;
      panel.dataset.enhancedFields='1';
      var tenantSel=q('eten-'+sid);
      var vendorSel=q('ev-'+sid);
      if(tenantSel){
        addOption(tenantSel,CUSTOM_TENANT,'+ Add new tenant/contact...');
        tenantSel.insertAdjacentHTML('afterend',editTenantHTML(sid));
        tenantSel.onchange=function(){show(q('eten-quick-'+sid),tenantSel.value===CUSTOM_TENANT);};
      }
      if(vendorSel){
        addOption(vendorSel,CUSTOM_VENDOR,'+ Add new vendor...');
        vendorSel.insertAdjacentHTML('afterend',editVendorHTML(sid));
        vendorSel.onchange=function(){show(q('ev-quick-'+sid),vendorSel.value===CUSTOM_VENDOR);};
      }
      var buttons=panel.lastElementChild;
      var extra=document.createElement('div');
      extra.innerHTML='<div class="row2" style="margin-bottom:8px"><div><div class="section-label">Category</div><input id="ecat-'+sid+'" value="'+attr(wo.category||'')+'"/></div><div><div class="section-label">Date</div><input id="edate-'+sid+'" value="'+attr(wo.date||'')+'"/></div></div>'+
        '<div style="margin-bottom:8px"><div class="section-label">Recommended action</div><textarea id="eaction-'+sid+'" rows="2">'+esc(wo.recommended_action||'')+'</textarea></div>'+
        '<div class="row2" style="margin-bottom:8px"><div><div class="section-label">Estimated time</div><input id="etime-'+sid+'" value="'+attr(wo.estimated_time||'')+'"/></div><div><div class="section-label">Status</div><select id="estatus-'+sid+'">'+statusOptions(wo.status)+'</select></div></div>'+
        '<div class="row2" style="margin-bottom:8px"><div><div class="section-label">Access needed?</div><select id="eaccess-'+sid+'"><option value="yes"'+(wo.access_needed?' selected':'')+'>Yes</option><option value="no"'+(!wo.access_needed?' selected':'')+'>No</option></select></div><div><div class="section-label">Source</div><input id="esource-'+sid+'" value="'+attr(wo.source||'')+'"/></div></div>'+
        '<div style="margin-bottom:8px"><div class="section-label">Notes for vendor</div><textarea id="enotesvendor-'+sid+'" rows="2">'+esc(wo.notes_for_vendor||'')+'</textarea></div>';
      panel.insertBefore(extra,buttons);
    });
  }

  function commitEditTenant(sid){
    var sel=q('eten-'+sid);
    if(!sel||sel.value!==CUSTOM_TENANT)return true;
    var name=clean(q('eten-new-name-'+sid)&&q('eten-new-name-'+sid).value);
    var unit=clean(q('eten-new-unit-'+sid)&&q('eten-new-unit-'+sid).value);
    if(!name||!unit){alert('Please enter the new tenant/contact name and unit.');return false;}
    var tenant={unit:unit,business:clean(q('eten-new-business-'+sid)&&q('eten-new-business-'+sid).value),contact:name,office_phone:'',cell_phone:'',email:clean(q('eten-new-email-'+sid)&&q('eten-new-email-'+sid).value)};
    var existing=tenantList().find(function(t){return t.unit===unit;});
    if(existing)Object.assign(existing,tenant);else TENANTS.push(tenant);
    addOption(sel,unit,name+' - Unit '+unit+(tenant.business?' ('+tenant.business+')':''));
    sel.value=unit;
    return true;
  }

  function commitEditVendor(sid){
    var sel=q('ev-'+sid);
    if(!sel||sel.value!==CUSTOM_VENDOR)return true;
    var name=clean(q('ev-new-name-'+sid)&&q('ev-new-name-'+sid).value);
    if(!name){alert('Please enter the new vendor name.');return false;}
    var vendor={name:name,trade:clean(q('ev-new-trade-'+sid)&&q('ev-new-trade-'+sid).value)||clean(q('ecat-'+sid)&&q('ecat-'+sid).value)||'General / Handyman',contact:clean(q('ev-new-contact-'+sid)&&q('ev-new-contact-'+sid).value)||name,phone:clean(q('ev-new-phone-'+sid)&&q('ev-new-phone-'+sid).value),email:clean(q('ev-new-email-'+sid)&&q('ev-new-email-'+sid).value)};
    VENDORS.push(vendor);
    addOption(sel,name,name);
    sel.value=name;
    return true;
  }

  window.renderQueue=function(){
    if(originalRenderQueue)originalRenderQueue.apply(this,arguments);
    enhanceWOEditPanels();
  };

  window.saveWOEdit=function(id){
    var sid=id.replace('-','_');
    if(q('et-'+sid)&&!clean(q('et-'+sid).value)){alert('Please enter a title.');return;}
    if(!commitEditTenant(sid)||!commitEditVendor(sid))return;
    var extras={
      category:clean(q('ecat-'+sid)&&q('ecat-'+sid).value),
      date:clean(q('edate-'+sid)&&q('edate-'+sid).value),
      recommended_action:clean(q('eaction-'+sid)&&q('eaction-'+sid).value),
      estimated_time:clean(q('etime-'+sid)&&q('etime-'+sid).value),
      status:clean(q('estatus-'+sid)&&q('estatus-'+sid).value),
      access_needed:(q('eaccess-'+sid)&&q('eaccess-'+sid).value)==='yes',
      source:clean(q('esource-'+sid)&&q('esource-'+sid).value),
      notes_for_vendor:clean(q('enotesvendor-'+sid)&&q('enotesvendor-'+sid).value)
    };
    if(originalSaveWOEdit)originalSaveWOEdit.apply(this,arguments);
    var wo=findWO(id);
    if(wo){
      Object.keys(extras).forEach(function(key){if(extras[key]!==''||key==='access_needed')wo[key]=extras[key];});
      if(!wo.vendor)wo.vendor=blankVendor();
      save();
      refreshCounts();
      if(window.renderQueue)window.renderQueue();
    }
  };

  window.renderHistory=function(){
    if(originalRenderHistory)originalRenderHistory.apply(this,arguments);
    var list=q('history-list');
    if(!list||!maintenanceHistory||!maintenanceHistory.length)return;
    Array.prototype.slice.call(list.children).forEach(function(row,i){
      if(row.dataset.historyEnhanced)return;
      row.dataset.historyEnhanced='1';
      row.insertAdjacentHTML('beforeend','<div style="display:flex;gap:6px;margin-top:8px"><button onclick="editHistoryRecord('+i+')" style="padding:4px 10px;font-size:11px;font-weight:600;background:#f5f3ff;color:#6d28d9;border:1px solid #c4b5fd;border-radius:6px;cursor:pointer;font-family:inherit">Edit</button><button onclick="deleteHistoryRecord('+i+')" style="padding:4px 10px;font-size:11px;font-weight:600;background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;font-family:inherit">Delete</button></div>');
    });
  };

  window.editHistoryRecord=function(i){
    var r=maintenanceHistory&&maintenanceHistory[i];
    if(!r)return;
    var task=promptField('Task/work done',r.task);if(task===null)return;
    var unit=promptField('Unit',r.unit);if(unit===null)return;
    var vendor=promptField('Vendor',r.vendor);if(vendor===null)return;
    var date=promptField('Date completed',r.date_completed);if(date===null)return;
    var freq=promptField('Frequency',r.frequency);if(freq===null)return;
    var next=promptField('Next due',r.next_due);if(next===null)return;
    var notes=promptField('Notes',r.notes||'');if(notes===null)return;
    Object.assign(r,{task:task,unit:unit,vendor:vendor,date_completed:date,frequency:freq,next_due:next,notes:notes});
    save();
    window.renderHistory();
  };

  window.deleteHistoryRecord=function(i){
    if(!maintenanceHistory||!maintenanceHistory[i])return;
    if(!confirm('Delete this history record? Cannot be undone.'))return;
    maintenanceHistory.splice(i,1);
    save();
    window.renderHistory();
  };

  window.renderBidJobs=function(){
    if(originalRenderBidJobs)originalRenderBidJobs.apply(this,arguments);
    if(!bidJobs)return;
    bidJobs.forEach(function(job){
      var card=q('bidjob-'+job.id);
      if(!card||card.dataset.bidEditEnhanced)return;
      card.dataset.bidEditEnhanced='1';
      card.insertAdjacentHTML('beforeend','<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button onclick="editBidJobDetails(\''+job.id+'\')" style="padding:7px 14px;font-size:12px;font-weight:600;background:#f5f3ff;color:#6d28d9;border:1px solid #c4b5fd;border-radius:8px;cursor:pointer;font-family:inherit">Edit bid details</button></div>');
    });
  };

  window.editBidJobDetails=function(id){
    var job=bidJobs&&bidJobs.find(function(b){return b.id===id;});
    if(!job)return;
    var title=promptField('Job title',job.title);if(title===null)return;
    var scope=promptField('Scope of work',job.scope);if(scope===null)return;
    var trade=promptField('Trade/category',job.trade);if(trade===null)return;
    var due=promptField('Bid due date (YYYY-MM-DD)',job.dueDate||'');if(due===null)return;
    var budget=promptField('Budget estimate',job.budget||'');if(budget===null)return;
    var status=promptField('Status',job.status||'open');if(status===null)return;
    Object.assign(job,{title:title,scope:scope,trade:trade,dueDate:due,budget:budget,status:status});
    job.dueFmt=due?new Date(due+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';
    save();
    refreshCounts();
    window.renderBidJobs();
  };

  function applyAll(){
    setupLogCallControls();
    setupBidTrade();
    setupVendorTradeOptions();
    setupPMVendorQuick();
    enhanceWOEditPanels();
    if(q('queue-list')&&window.renderQueue)window.renderQueue();
    if(q('history-list')&&window.renderHistory)window.renderHistory();
    if(q('bid-jobs-list')&&window.renderBidJobs)window.renderBidJobs();
  }

  applyAll();
  setTimeout(applyAll,500);
  setTimeout(applyAll,1500);
})();
</script>
`;

async function readIndexHtml() {
  if (cachedHtml) return cachedHtml;

  const candidates = [
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, '..', 'index.html')
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        cachedHtml = fs.readFileSync(filePath, 'utf8');
        return cachedHtml;
      }
    } catch (_) {}
  }

  const response = await fetch('https://raw.githubusercontent.com/mattbrading14/maintenanceai/main/index.html');
  if (!response.ok) throw new Error('Could not load private app HTML');
  cachedHtml = await response.text();
  return cachedHtml;
}

function injectPatch(html) {
  if (html.includes('data-maintenanceai-editable-fields')) return html;
  if (html.includes('</body>')) return html.replace('</body>', EDITABLE_FIELDS_PATCH + '</body>');
  return html + EDITABLE_FIELDS_PATCH;
}

module.exports = async function handler(req, res) {
  try {
    const html = injectPatch(await readIndexHtml());
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('MaintenanceAI could not load: ' + error.message);
  }
};
