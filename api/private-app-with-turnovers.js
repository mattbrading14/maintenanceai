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
    function reportTotals(rows){
      rows=Array.isArray(rows)?rows:[];
      var completed=summarizeCosts(rows.filter(function(wo){return wo&&wo.status==='completed';}));
      var estimated=summarizeCosts(rows.filter(function(wo){return wo&&(wo.status==='emailed'||wo.status==='approved'||wo.status==='pending'||wo.status==='owner_pending');}));
      return {
        completed:totalText('Completed total',completed),
        estimated:totalText('Pending estimated total',estimated)
      };
    }
    function updateReportFooterTotals(){
      var report=q('report-output');
      var rows=window._lastReport&&Array.isArray(window._lastReport.workOrders)?window._lastReport.workOrders:[];
      var totals=reportTotals(rows);
      if(!report)return;
      Array.prototype.slice.call(report.querySelectorAll('div')).forEach(function(el){
        var text=(el.textContent||'').trim();
        if(totals.completed&&text.indexOf('Completed total:')===0)el.textContent=totals.completed;
        if(totals.estimated&&text.indexOf('Pending estimated:')===0)el.textContent=totals.estimated;
      });
    }
    function replaceReportTotalMarkup(markup){
      if(typeof markup!=='string')return markup;
      var rows=window._lastReport&&Array.isArray(window._lastReport.workOrders)?window._lastReport.workOrders:[];
      var totals=reportTotals(rows);
      if(totals.completed)markup=markup.replace(/Completed total: [^<]*/g,totals.completed);
      if(totals.estimated)markup=markup.replace(/Pending estimated: [^<]*/g,totals.estimated);
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
        window.open=function(){
          var popup=originalOpen.apply(window,arguments);
          if(popup&&popup.document&&typeof popup.document.write==='function'){
            var originalWrite=popup.document.write.bind(popup.document);
            popup.document.write=function(markup){return originalWrite(replaceReportTotalMarkup(markup));};
          }
          return popup;
        };
        try{return originalExportReportPDF.apply(this,arguments);}
        finally{window.open=originalOpen;}
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
