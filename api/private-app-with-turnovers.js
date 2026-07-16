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
    function install(){
      if(typeof window.renderReport!=='function'||window.renderReport.__dateRangeAware)return false;
      var originalRenderReport=window.renderReport;
      window.renderReport=function(property,month,text,reportWorkOrders){
        if(typeof workOrders==='undefined')return originalRenderReport.apply(this,arguments);
        var previousWorkOrders=workOrders;
        var reportSource=Array.isArray(reportWorkOrders)?reportWorkOrders:previousWorkOrders;
        workOrders=selectedReportWorkOrders(reportSource);
        try{return originalRenderReport.call(this,property,month,text);}
        finally{workOrders=previousWorkOrders;}
      };
      window.renderReport.__dateRangeAware=true;
      return true;
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
