const privateApp = require('./private-app-with-lead-screenshot.js');
const officeTurnoverAddon = require('./office-turnover-addon.js');

const OWNER_REPORT_DATE_RANGE_ADDON = String.raw`
<script data-maintenanceai-owner-report-date-range>
(function(){
  try{
    if(window.__maintenanceAIOwnerReportDateRangePatch)return;
    window.__maintenanceAIOwnerReportDateRangePatch=true;

    function q(id){return document.getElementById(id);}
    function parseStart(value){return value?new Date(value+'T00:00:00'):null;}
    function parseEnd(value){return value?new Date(value+'T23:59:59'):null;}
    function selectedReportWorkOrders(source){
      var startDate=parseStart(q('rpt-start')&&q('rpt-start').value);
      var endDate=parseEnd(q('rpt-end')&&q('rpt-end').value);
      return (Array.isArray(source)?source:[]).filter(function(wo){
        if(!wo||wo.excludeFromReport||wo.status==='deleted')return false;
        if(!startDate&&!endDate)return true;
        var woDate=new Date(wo.date);
        if(startDate&&woDate<startDate)return false;
        if(endDate&&woDate>endDate)return false;
        return true;
      });
    }
    function parseCost(value){
      var text=(value==null?'':String(value)).replace(/,/g,'').trim();
      if(!text)return null;
      var matches=text.match(/\d+(?:\.\d+)?/g);
      if(!matches||!matches.length)return null;
      var first=parseFloat(matches[0]);
      var last=parseFloat(matches.length>1?matches[matches.length-1]:matches[0]);
      if(!isFinite(first)||!isFinite(last))return null;
      var low=Math.min(first,last),high=Math.max(first,last);
      return {low:low,high:high,range:Math.abs(high-low)>0.005};
    }
    function money(value){
      var cents=Math.abs(value%1)>0.005;
      return '$'+value.toLocaleString('en-US',{minimumFractionDigits:cents?2:0,maximumFractionDigits:cents?2:0});
    }
    function summarizeCosts(rows){
      var summary={low:0,high:0,count:0,unpriced:0,range:false};
      (Array.isArray(rows)?rows:[]).forEach(function(wo){
        var cost=parseCost(wo&&wo.estimatedCost);
        if(cost){summary.low+=cost.low;summary.high+=cost.high;summary.count+=1;if(cost.range)summary.range=true;}
        else{summary.unpriced+=1;}
      });
      return summary;
    }
    function totalText(label,summary){
      if(!summary||!summary.count)return '';
      var total=(summary.range||Math.abs(summary.high-summary.low)>0.005)?money(summary.low)+' - '+money(summary.high):money(summary.low);
      return label+': '+total+(summary.unpriced?' ('+summary.unpriced+' without cost)':'');
    }
    function cleanText(value){return (value==null?'':String(value)).trim();}
    function sameNote(a,b){return cleanText(a).toLowerCase()===cleanText(b).toLowerCase();}
    function escapeHtml(value){
      return cleanText(value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});
    }
    function ownerReportNotes(wo){
      var notes=[];
      var status=cleanText(wo&&wo.statusNotes);
      var vendor=cleanText(wo&&wo.notes_for_vendor);
      if(status)notes.push({label:'Status note',text:status});
      if(vendor&&!sameNote(vendor,status))notes.push({label:'Job notes',text:vendor});
      return notes;
    }
    function ownerReportNoteText(wo){
      return ownerReportNotes(wo).map(function(note){return note.label+': '+note.text;}).join('\n');
    }
    function statusLabel(wo){
      if(!wo)return 'Pending';
      if(wo.status==='completed')return 'Completed'+(wo.completedDate?' - '+cleanText(wo.completedDate):'');
      if(wo.status==='emailed')return wo.vendorDispatchMethod==='text'?'Texted':'Emailed';
      if(wo.status==='approved')return 'Approved';
      if(wo.status==='denied')return 'Denied';
      if(wo.status==='owner_pending')return 'Needs owner approval';
      return 'Pending';
    }
    function statusColors(wo){
      if(wo&&wo.status==='denied')return {background:'#fef2f2',color:'#b91c1c',border:'#fecaca'};
      if(wo&&(wo.status==='completed'||wo.status==='emailed'||wo.status==='approved'))return {background:'#f0fdf4',color:'#15803d',border:'#86efac'};
      return {background:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'};
    }
    function findWorkOrderLogLabel(report){
      var labels=Array.prototype.slice.call(report.querySelectorAll('div'));
      return labels.find(function(el){return cleanText(el.textContent)==='Work order log';})||null;
    }
    function hideOriginalWorkOrderRows(label){
      var node=label?label.nextElementSibling:null;
      while(node){
        if(node.getAttribute&&node.getAttribute('data-maintenanceai-work-order-log'))break;
        var text=cleanText(node.textContent);
        if(text.indexOf('Completed total:')===0||text.indexOf('Pending estimated:')===0||text.indexOf('Estimated total:')===0)break;
        if(node.style&&(node.style.borderBottom||node.querySelector&&node.querySelector('.badge'))){
          node.style.display='none';
          node=node.nextElementSibling;
          continue;
        }
        break;
      }
    }
    function noteHtml(wo){
      var notes=ownerReportNotes(wo);
      if(!notes.length)return '';
      return '<div style="margin-top:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#475569;font-size:12px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere">'+notes.map(function(note){return '<div><b style="color:#334155">'+escapeHtml(note.label)+':</b> '+escapeHtml(note.text)+'</div>';}).join('')+'</div>';
    }
    function workOrderLogRowHtml(wo){
      var colors=statusColors(wo);
      var vendor=cleanText(wo&&wo.vendor&&wo.vendor.name)||'No vendor';
      var cost=cleanText(wo&&wo.estimatedCost);
      return '<div data-maintenanceai-work-order-row="'+escapeHtml(wo&&wo.id)+'" style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;max-width:100%;overflow-wrap:anywhere;box-sizing:border-box">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;max-width:100%">'
        +'<div style="flex:1 1 190px;min-width:0;max-width:100%;overflow-wrap:anywhere"><div style="font-weight:600;color:#0f172a;line-height:1.35;overflow-wrap:anywhere">'+escapeHtml(wo&&wo.id)+' - '+escapeHtml(wo&&wo.issue_summary)+'</div><div style="font-size:11px;color:#64748b;margin-top:2px;overflow-wrap:anywhere">Unit '+escapeHtml(wo&&wo.unit)+'</div></div>'
        +'<div style="display:flex;align-items:center;gap:6px;flex:0 1 auto;flex-wrap:wrap;justify-content:flex-start;min-width:0;max-width:100%;overflow-wrap:anywhere"><span style="font-size:11px;color:#64748b;overflow-wrap:anywhere">'+escapeHtml(vendor)+'</span>'+(cost?'<span style="font-size:11px;font-weight:700;color:#15803d;overflow-wrap:anywhere">'+escapeHtml(cost)+'</span>':'')+'<span style="display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px;background:'+colors.background+';color:'+colors.color+';border:1px solid '+colors.border+'">'+escapeHtml(statusLabel(wo))+'</span></div>'
        +'</div>'+noteHtml(wo)+'</div>';
    }
    function renderReportWorkOrderLog(){
      var report=q('report-output');
      var rows=window._lastReport&&Array.isArray(window._lastReport.workOrders)?window._lastReport.workOrders:[];
      if(!report||!rows.length)return;
      report.style.maxWidth='100%';
      report.style.overflowX='hidden';
      var card=report.querySelector('.card')||report.firstElementChild||report;
      if(card&&card.style){card.style.maxWidth='100%';card.style.overflowX='hidden';card.style.boxSizing='border-box';}
      var label=findWorkOrderLogLabel(report);
      if(!label)return;
      hideOriginalWorkOrderRows(label);
      var existing=report.querySelector('[data-maintenanceai-work-order-log]');
      if(existing&&existing.parentNode)existing.parentNode.removeChild(existing);
      var wrap=document.createElement('div');
      wrap.setAttribute('data-maintenanceai-work-order-log','');
      wrap.style.cssText='max-width:100%;overflow:hidden;box-sizing:border-box';
      wrap.innerHTML=rows.map(workOrderLogRowHtml).join('');
      label.insertAdjacentElement('afterend',wrap);
    }
    function workOrderWithExportNotes(wo){
      var copy={};
      for(var key in wo){copy[key]=wo[key];}
      var noteText=ownerReportNoteText(wo);
      if(noteText)copy.statusNotes=escapeHtml(noteText).replace(/\n/g,'<br>');
      return copy;
    }
    function isConfirmedCompletedCost(wo){
      var cost=parseCost(wo&&wo.estimatedCost);
      return !!(wo&&wo.status==='completed'&&cost&&!cost.range);
    }
    function isEstimatedCostRow(wo){
      if(!wo)return false;
      if(wo.status==='completed')return !isConfirmedCompletedCost(wo);
      return wo.status==='emailed'||wo.status==='approved'||wo.status==='pending'||wo.status==='owner_pending';
    }
    function reportTotals(rows){
      rows=Array.isArray(rows)?rows:[];
      var completed=summarizeCosts(rows.filter(isConfirmedCompletedCost));
      var estimated=summarizeCosts(rows.filter(isEstimatedCostRow));
      return {
        completed:totalText('Completed total',completed),
        estimated:totalText('Estimated total',estimated)
      };
    }
    function totalLineStyle(kind){
      if(kind==='completed')return 'text-align:right;padding:8px 0;font-size:13px;font-weight:600;color:#15803d;border-top:2px solid #e2e8f0;margin-top:4px';
      return 'text-align:right;padding:4px 0;font-size:12px;color:#64748b';
    }
    function totalLineMarkup(text,kind){
      return text?'<div style="'+totalLineStyle(kind)+'">'+text+'</div>':'';
    }
    function addTotalLine(parent,text,kind){
      if(!parent||!text)return;
      var el=document.createElement('div');
      el.setAttribute('data-maintenanceai-report-total',kind);
      el.style.cssText=totalLineStyle(kind);
      el.textContent=text;
      parent.appendChild(el);
    }
    function updateReportFooterTotals(){
      var report=q('report-output');
      var rows=window._lastReport&&Array.isArray(window._lastReport.workOrders)?window._lastReport.workOrders:[];
      var totals=reportTotals(rows);
      if(!report)return;
      Array.prototype.slice.call(report.querySelectorAll('[data-maintenanceai-report-total]')).forEach(function(el){
        if(el.parentNode)el.parentNode.removeChild(el);
      });
      Array.prototype.slice.call(report.querySelectorAll('div')).forEach(function(el){
        var text=(el.textContent||'').trim();
        if(text.indexOf('Completed total:')===0||text.indexOf('Pending estimated:')===0||text.indexOf('Estimated total:')===0){
          el.style.display='none';
        }
      });
      var card=report.querySelector('.card')||report.firstElementChild||report;
      addTotalLine(card,totals.completed,'completed');
      addTotalLine(card,totals.estimated,'estimated');
    }
    function replaceReportTotalMarkup(markup){
      if(typeof markup!=='string')return markup;
      var rows=window._lastReport&&Array.isArray(window._lastReport.workOrders)?window._lastReport.workOrders:[];
      var totals=reportTotals(rows);
      var totalsHtml=totalLineMarkup(totals.completed,'completed')+totalLineMarkup(totals.estimated,'estimated');
      markup=markup.replace(/<div[^>]*>(?:Completed total|Pending estimated|Pending estimated total|Estimated total): [^<]*<\/div>/g,'');
      if(totalsHtml){
        if(markup.indexOf('<div class="section-title">Preventive maintenance</div>')>-1){
          markup=markup.replace('<div class="section-title">Preventive maintenance</div>',totalsHtml+'<div class="section-title">Preventive maintenance</div>');
        }else{
          markup+=totalsHtml;
        }
      }
      return markup;
    }
    function installRenderPatch(){
      if(typeof window.renderReport!=='function')return false;
      if(window.renderReport.__dateRangeAware)return true;
      var originalRenderReport=window.renderReport;
      window.renderReport=function(property,month,text,reportWorkOrders){
        if(typeof workOrders==='undefined')return originalRenderReport.apply(this,arguments);
        var previousWorkOrders=workOrders;
        var reportSource=Array.isArray(reportWorkOrders)?reportWorkOrders:previousWorkOrders;
        var result;
        workOrders=selectedReportWorkOrders(reportSource);
        try{result=originalRenderReport.call(this,property,month,text);}
        finally{workOrders=previousWorkOrders;}
        renderReportWorkOrderLog();
        updateReportFooterTotals();
        return result;
      };
      window.renderReport.__dateRangeAware=true;
      return true;
    }
    function installExportPatch(){
      if(typeof window.exportReportPDF!=='function')return false;
      if(window.exportReportPDF.__summedTotals)return true;
      var originalExportReportPDF=window.exportReportPDF;
      window.exportReportPDF=function(){
        var originalOpen=window.open;
        var report=window._lastReport;
        var originalWorkOrders=report&&Array.isArray(report.workOrders)?report.workOrders:null;
        if(originalWorkOrders)report.workOrders=originalWorkOrders.map(workOrderWithExportNotes);
        window.open=function(){
          var popup=originalOpen.apply(window,arguments);
          if(popup&&popup.document&&typeof popup.document.write==='function'){
            var originalWrite=popup.document.write.bind(popup.document);
            popup.document.write=function(markup){return originalWrite(replaceReportTotalMarkup(markup));};
          }
          return popup;
        };
        try{return originalExportReportPDF.apply(this,arguments);}
        finally{if(originalWorkOrders)report.workOrders=originalWorkOrders;window.open=originalOpen;}
      };
      window.exportReportPDF.__summedTotals=true;
      return true;
    }
    function install(){
      var renderReady=installRenderPatch();
      var exportReady=installExportPatch();
      return renderReady&&exportReady;
    }
    if(!install()){setTimeout(install,300);setTimeout(install,1000);}
  }catch(error){console.warn('Owner report date-range patch did not initialize:',error);}
})();
</script>
`;

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
      if (typeof html === 'string' && !html.includes('data-maintenanceai-office-turnovers')) {
        html = appendBeforeBody(html, officeTurnoverAddon);
      }
      if (typeof html === 'string' && !html.includes('data-maintenanceai-owner-report-date-range')) {
        html = appendBeforeBody(html, OWNER_REPORT_DATE_RANGE_ADDON);
      }
      if (typeof html === 'string' && !html.includes('data-maintenanceai-vendor-text-dispatch')) {
        html = appendBeforeBody(html, VENDOR_TEXT_DISPATCH_ADDON);
      }
      res.status(statusCode).send(html);
    }
  };

  return privateApp(req, capture);
};
