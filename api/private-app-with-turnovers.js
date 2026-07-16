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
      if(status)notes.push({label:'Status',text:status});
      if(vendor&&!sameNote(vendor,status)&&!sameNote(vendor,wo&&wo.issue_summary)&&!sameNote(vendor,wo&&wo.recommended_action)){
        notes.push({label:'Notes',text:vendor});
      }
      return notes;
    }
    function ownerReportNoteText(wo){
      return ownerReportNotes(wo).map(function(note){return note.label+': '+note.text;}).join('\n');
    }
    function findWorkOrderReportRow(report,wo){
      if(!report||!wo||!wo.id)return null;
      var spans=Array.prototype.slice.call(report.querySelectorAll('span'));
      for(var i=0;i<spans.length;i++){
        if(cleanText(spans[i].textContent).indexOf(wo.id+' ')===0){
          var row=spans[i].parentElement;
          while(row&&row!==report){
            if(row.style&&row.style.borderBottom)return row;
            row=row.parentElement;
          }
        }
      }
      return null;
    }
    function annotateReportNotes(){
      var report=q('report-output');
      var rows=window._lastReport&&Array.isArray(window._lastReport.workOrders)?window._lastReport.workOrders:[];
      if(!report||!rows.length)return;
      rows.forEach(function(wo){
        var noteText=ownerReportNoteText(wo);
        if(!noteText)return;
        var row=findWorkOrderReportRow(report,wo);
        if(!row||row.querySelector('[data-maintenanceai-report-note="'+wo.id+'"]'))return;
        var target=row.firstElementChild||row;
        var note=document.createElement('div');
        note.setAttribute('data-maintenanceai-report-note',wo.id);
        note.style.cssText='margin-top:6px;padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#475569;font-size:12px;line-height:1.45;white-space:pre-wrap';
        note.textContent=noteText;
        target.appendChild(note);
      });
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
        updateReportFooterTotals();
        annotateReportNotes();
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
      res.status(statusCode).send(html);
    }
  };

  return privateApp(req, capture);
};
