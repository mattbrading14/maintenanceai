module.exports = String.raw`
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
