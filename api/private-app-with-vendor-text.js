const privateApp = require('./private-app-with-turnovers.js');

const VENDOR_TEXT_DISPATCH_ADDON = String.raw`
<script data-maintenanceai-vendor-text-dispatch>
(function(){
  try{
    if(window.__maintenanceAIVendorTextDispatch)return;
    window.__maintenanceAIVendorTextDispatch=true;

    function clean(value){return (value==null?'':String(value)).trim();}
    function q(id){return document.getElementById(id);}
    function allWorkOrders(){
      try{return typeof workOrders!=='undefined'&&Array.isArray(workOrders)?workOrders:[];}
      catch(error){return [];}
    }
    function findWorkOrder(id){
      return allWorkOrders().find(function(wo){return wo&&wo.id===id;})||null;
    }
    function smsNumber(phone){
      var raw=clean(phone);
      var hadPlus=raw.charAt(0)==='+';
      var digits=raw.replace(/\D/g,'');
      if(!digits)return '';
      if(hadPlus)return '+'+digits;
      if(digits.length===10)return '+1'+digits;
      if(digits.length===11&&digits.charAt(0)==='1')return '+'+digits;
      return digits;
    }
    function smsSeparator(){
      return /iPhone|iPad|iPod/i.test(navigator.userAgent||'')?'&':'?';
    }
    function openSms(phone,body){
      var number=smsNumber(phone);
      if(!number)return false;
      window.location.href='sms:'+number+smsSeparator()+'body='+encodeURIComponent(body);
      return true;
    }
    function tenantAccessText(wo){
      if(!wo||!wo.access_needed)return 'Access: No tenant access needed - common area/exterior';
      var contact=[clean(wo.tenant),clean(wo.tenant_phone),clean(wo.tenant_email)].filter(Boolean).join(' / ');
      return 'Access: Coordinate with tenant'+(contact?'\nTenant contact: '+contact:'');
    }
    function workOrderTextBody(wo){
      var vendorName=clean(wo&&wo.vendor&&wo.vendor.contact)||clean(wo&&wo.vendor&&wo.vendor.name)||'there';
      var tenantLine=[clean(wo&&wo.tenant),clean(wo&&wo.unit)?'Unit '+clean(wo&&wo.unit):'',clean(wo&&wo.business)].filter(Boolean).join(' - ');
      var lines=[
        'Hi '+vendorName+',',
        '',
        'New work order at 146 Main St, Los Altos.',
        '',
        'Work Order: '+clean(wo&&wo.id),
        'Date: '+clean(wo&&wo.date),
        tenantLine?'Tenant/Unit: '+tenantLine:'',
        'Issue: '+clean(wo&&wo.issue_summary),
        'Priority: '+clean(wo&&wo.priority),
        '',
        'Action: '+clean(wo&&wo.recommended_action),
        tenantAccessText(wo)
      ].filter(function(line){return line!=='';});
      if(clean(wo&&wo.notes_for_vendor))lines.push('Notes: '+clean(wo.notes_for_vendor));
      if(wo&&Array.isArray(wo.photos)&&wo.photos.length)lines.push('Photos are saved with the work order.');
      lines.push('','Please confirm receipt.','Thank you,','Matt Brading','Brading Associates, LLC','(408) 234-7016');
      return lines.join('\n');
    }
    function actionId(ctx,id){
      return ((ctx==='queue'||ctx==='approved')?'qaction-':'action-')+id;
    }
    function dispatchLabel(wo){
      return wo&&wo.vendorDispatchMethod==='text'?'Texted to vendor':'Emailed to vendor';
    }
    function shortDispatchLabel(wo){
      return wo&&wo.vendorDispatchMethod==='text'?'Texted':'Emailed';
    }
    function saveAndRefresh(){
      if(typeof updateQueueCount==='function')updateQueueCount();
      if(typeof saveData==='function')saveData();
    }
    function textWO(id,ctx){
      var wo=findWorkOrder(id);
      if(!wo)return;
      var phone=clean(wo.vendor&&wo.vendor.phone);
      if(!smsNumber(phone)){
        alert('This vendor does not have a phone number saved yet.');
        return;
      }
      if(typeof syncTenantAccessContact==='function')syncTenantAccessContact(wo);
      wo.status='emailed';
      wo.vendorDispatchMethod='text';
      saveAndRefresh();
      if(ctx==='queue'||ctx==='approved'){
        if(typeof renderQueue==='function')renderQueue(ctx);
      }
      var el=q(actionId(ctx,id));
      if(el)el.innerHTML='<span style="color:#1d4ed8">Text opened to '+clean(wo.vendor&&wo.vendor.contact||wo.vendor&&wo.vendor.name)+'</span>';
      openSms(phone,workOrderTextBody(wo));
    }
    function installStyle(){
      if(document.querySelector('style[data-vendor-text-dispatch-style]'))return;
      var style=document.createElement('style');
      style.setAttribute('data-vendor-text-dispatch-style','');
      style.textContent='.btn-text{background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd}.btn-text:hover{background:#dbeafe}.vendor-text-hint{font-size:11px;color:#64748b}';
      document.head.appendChild(style);
    }
    function addWorkOrderTextButtons(root){
      root=root||document;
      Array.prototype.slice.call(root.querySelectorAll('button')).forEach(function(btn){
        var text=clean(btn.textContent).toLowerCase();
        if(text.indexOf('email vendor')===-1)return;
        var onclick=btn.getAttribute('onclick')||'';
        var match=onclick.match(/emailWO\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);
        if(!match)return;
        var id=match[1],ctx=match[2];
        if(btn.parentNode&&btn.parentNode.querySelector('[data-maintenanceai-text-wo="'+id+'"][data-maintenanceai-text-ctx="'+ctx+'"]'))return;
        var textButton=document.createElement('button');
        textButton.type='button';
        textButton.className='btn-sm btn-text';
        textButton.setAttribute('data-maintenanceai-text-wo',id);
        textButton.setAttribute('data-maintenanceai-text-ctx',ctx);
        textButton.textContent=text.indexOf('approve')>-1?'Approve & text vendor':'Text vendor';
        textButton.addEventListener('click',function(){textWO(id,ctx);});
        btn.insertAdjacentElement('afterend',textButton);
      });
    }
    function addPmTextButtons(root){
      root=root||document;
      Array.prototype.slice.call(root.querySelectorAll('button')).forEach(function(btn){
        if(clean(btn.textContent)!=='Email')return;
        var onclick=btn.getAttribute('onclick')||'';
        var match=onclick.match(/dispatchPM\((\d+)\)/);
        if(!match)return;
        var index=match[1];
        if(btn.parentNode&&btn.parentNode.querySelector('[data-maintenanceai-pm-text="'+index+'"]'))return;
        var textButton=document.createElement('button');
        textButton.type='button';
        textButton.className='btn-sm btn-text';
        textButton.setAttribute('data-maintenanceai-pm-text',index);
        textButton.textContent='Text';
        textButton.addEventListener('click',function(){window.dispatchPM(Number(index),'text');});
        btn.insertAdjacentElement('afterend',textButton);
      });
    }
    function addDispatchButtons(root){
      addWorkOrderTextButtons(root);
      addPmTextButtons(root);
    }
    function patchEmailWorkOrders(){
      if(typeof window.emailWO!=='function')return false;
      if(window.emailWO.__vendorTextAware)return true;
      var originalEmailWO=window.emailWO;
      window.emailWO=function(id,ctx){
        var wo=findWorkOrder(id);
        if(wo)wo.vendorDispatchMethod='email';
        return originalEmailWO.apply(this,arguments);
      };
      window.emailWO.__vendorTextAware=true;
      return true;
    }
    function patchStatusLabels(){
      if(typeof window.workOrderStatusLabel==='function'&&!window.workOrderStatusLabel.__vendorTextAware){
        var originalStatusLabel=window.workOrderStatusLabel;
        window.workOrderStatusLabel=function(wo){
          if(wo&&wo.status==='emailed')return dispatchLabel(wo);
          return originalStatusLabel.apply(this,arguments);
        };
        window.workOrderStatusLabel.__vendorTextAware=true;
      }
      if(typeof window.renderQueue==='function'&&!window.renderQueue.__vendorTextAware){
        var originalRenderQueue=window.renderQueue;
        window.renderQueue=function(view){
          var result=originalRenderQueue.apply(this,arguments);
          setTimeout(function(){addDispatchButtons(document);},0);
          return result;
        };
        window.renderQueue.__vendorTextAware=true;
      }
      return true;
    }
    function patchCreatedWorkOrderViews(){
      ['submitCallLog','analyzeScreenshot'].forEach(function(name){
        if(typeof window[name]!=='function'||window[name].__vendorTextAware)return;
        var original=window[name];
        window[name]=function(){
          var result=original.apply(this,arguments);
          if(result&&typeof result.then==='function'){
            return result.then(function(value){setTimeout(function(){addDispatchButtons(document);},0);return value;});
          }
          setTimeout(function(){addDispatchButtons(document);},0);
          return result;
        };
        window[name].__vendorTextAware=true;
      });
      return true;
    }
    function patchPreventiveMaintenance(){
      if(typeof window.dispatchPM==='function'&&!window.dispatchPM.__vendorTextAware){
        var originalDispatchPM=window.dispatchPM;
        window.dispatchPM=function(i,method){
          method=method||'email';
          if(method!=='text')return originalDispatchPM.apply(this,arguments);
          if(typeof pmTasks==='undefined'||typeof VENDORS==='undefined'||typeof workOrders==='undefined')return originalDispatchPM.call(this,i);
          var t=pmTasks[i];
          if(!t)return;
          var vendor=VENDORS.find(function(v){return v.name===t.vendor;})||VENDORS[0];
          if(!vendor||!smsNumber(vendor.phone)){
            alert('This vendor does not have a phone number saved yet.');
            return;
          }
          var woId='WO-'+Math.floor(1000+Math.random()*9000);
          var today=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
          var wo={id:woId,issue_summary:t.task+' (scheduled)',category:'general',priority:'normal',priority_reason:'Scheduled preventive maintenance',recommended_action:t.task,estimated_time:'1-2 hours',access_needed:true,notes_for_vendor:'Scheduled PM',tenant:'All tenants',unit:t.units,business:'',tenant_email:'',tenant_phone:'',date:today,vendor:vendor,status:'emailed',vendorDispatchMethod:'text',source:'Preventive maintenance'};
          workOrders.unshift(wo);
          if(typeof updateQueueCount==='function')updateQueueCount();
          var months={Monthly:1,Quarterly:3,'Bi-annually':6,Annually:12};
          var nextDate=new Date(t.next);
          nextDate.setMonth(nextDate.getMonth()+(months[t.freq]||12));
          pmTasks[i].next=nextDate.toISOString().split('T')[0];
          if(typeof saveData==='function')saveData();
          if(typeof renderPM==='function')renderPM();
          openSms(vendor.phone,workOrderTextBody(wo));
        };
        window.dispatchPM.__vendorTextAware=true;
      }
      if(typeof window.renderPM==='function'&&!window.renderPM.__vendorTextAware){
        var originalRenderPM=window.renderPM;
        window.renderPM=function(){
          var result=originalRenderPM.apply(this,arguments);
          setTimeout(function(){addPmTextButtons(document);},0);
          return result;
        };
        window.renderPM.__vendorTextAware=true;
      }
      return true;
    }
    function patchPdfStatus(){
      if(typeof window.downloadWOPDF!=='function'||window.downloadWOPDF.__vendorTextAware)return true;
      var originalDownloadWOPDF=window.downloadWOPDF;
      window.downloadWOPDF=function(id){
        var wo=findWorkOrder(id);
        if(!wo||wo.vendorDispatchMethod!=='text')return originalDownloadWOPDF.apply(this,arguments);
        var originalOpen=window.open;
        window.open=function(){
          var popup=originalOpen.apply(window,arguments);
          if(popup&&popup.document&&typeof popup.document.write==='function'){
            var originalWrite=popup.document.write.bind(popup.document);
            popup.document.write=function(markup){
              if(typeof markup==='string')markup=markup.replace(/Emailed to vendor/g,'Texted to vendor').replace(/>Emailed</g,'>Texted<');
              return originalWrite(markup);
            };
          }
          return popup;
        };
        try{return originalDownloadWOPDF.apply(this,arguments);}
        finally{window.open=originalOpen;}
      };
      window.downloadWOPDF.__vendorTextAware=true;
      return true;
    }
    function installObserver(){
      if(window.__maintenanceAIVendorTextObserver||!document.body)return;
      window.__maintenanceAIVendorTextObserver=true;
      var timer=null;
      new MutationObserver(function(){
        clearTimeout(timer);
        timer=setTimeout(function(){addDispatchButtons(document);},120);
      }).observe(document.body,{childList:true,subtree:true});
    }
    function install(){
      installStyle();
      var ready=patchEmailWorkOrders();
      patchStatusLabels();
      patchCreatedWorkOrderViews();
      patchPreventiveMaintenance();
      patchPdfStatus();
      addDispatchButtons(document);
      installObserver();
      return ready;
    }
    window.textWO=textWO;
    window.workOrderTextBody=workOrderTextBody;
    window.workOrderDispatchLabel=dispatchLabel;
    window.workOrderDispatchShortLabel=shortDispatchLabel;
    if(!install()){setTimeout(install,300);setTimeout(install,1000);setTimeout(install,2200);}
  }catch(error){console.warn('Vendor text dispatch did not initialize:',error);}
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
      if (typeof html === 'string' && !html.includes('data-maintenanceai-vendor-text-dispatch')) {
        html = appendBeforeBody(html, VENDOR_TEXT_DISPATCH_ADDON);
      }
      res.status(statusCode).send(html);
    }
  };

  return privateApp(req, capture);
};
