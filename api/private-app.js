const fs = require('fs');
const path = require('path');

let cachedHtml = null;

const SERVICE_TYPE_PATCH = String.raw`
<script data-maintenanceai-service-type-quickadd>
(function(){
  try{
    if(window.__maintenanceAIServiceTypeQuickAdd)return;
    window.__maintenanceAIServiceTypeQuickAdd=true;

    var CUSTOM_VALUE='__custom_service_type__';
    function q(id){return document.getElementById(id);}
    function clean(value){return (value==null?'':String(value)).trim();}
    function lower(value){return clean(value).toLowerCase();}
    function blankVendor(trade){return {name:'TBD',trade:trade||'Unassigned',contact:'',email:'',phone:''};}
    function hasOption(select,value,label){
      if(!select)return false;
      var needle=lower(value||label);
      return Array.prototype.slice.call(select.options).some(function(option){
        return lower(option.value||option.textContent)===needle||lower(option.textContent)===needle;
      });
    }
    function addOption(select,value,label,beforeValue){
      if(!select||hasOption(select,value,label))return;
      var option=document.createElement('option');
      option.value=value;
      option.textContent=label||value;
      var before=beforeValue?Array.prototype.slice.call(select.options).find(function(item){return item.value===beforeValue;}):null;
      select.insertBefore(option,before||null);
    }

    window.getServiceTypeValue=function(){
      var select=q('lc-service');
      if(!select)return '';
      if(select.value===CUSTOM_VALUE)return clean(q('lc-service-custom')&&q('lc-service-custom').value);
      return clean(select.value);
    };

    var originalMatchVendor=window.matchVendor;
    window.matchVendor=function(category){
      var raw=clean(category);
      var text=lower(raw);
      if(!text)return null;
      var map={plumbing:'Plumbing',hvac:'HVAC',electrical:'Electrical',locksmith:'Locksmith',lock:'Locksmith',fire:'Fire Sprinkler System',sprinkler:'Fire Sprinkler System',extinguisher:'Fire Extinguishers',hood:'Kitchen Hood Fire System',window:'Window Cleaning',cleaning:'Window Cleaning'};
      for(var key in map){
        if(text.indexOf(key)>-1){
          var trade=map[key];
          var matched=(window.VENDORS||[]).find(function(v){return lower(v.trade)===lower(trade);});
          return matched||blankVendor(trade);
        }
      }
      var direct=(window.VENDORS||[]).find(function(v){return lower(v.trade)===text;});
      if(direct)return direct;
      return originalMatchVendor?originalMatchVendor(category):blankVendor(raw||'Unassigned');
    };

    window.autoFillVendor=function(){
      var vendor=window.matchVendor(window.getServiceTypeValue());
      var select=q('lc-vendor');
      if(vendor&&select){
        select.value=vendor.name==='TBD'?'':vendor.name;
        if(q('lc-vendor-contact'))q('lc-vendor-contact').value=vendor.contact||'';
        if(q('lc-vendor-phone'))q('lc-vendor-phone').value=window.formatPhone?window.formatPhone(vendor.phone||''):(vendor.phone||'');
        if(q('lc-vendor-email'))q('lc-vendor-email').value=vendor.email||'';
      }
    };

    window.handleServiceTypeQuickAdd=function(){
      var select=q('lc-service');
      var custom=q('lc-service-custom');
      var isCustom=select&&select.value===CUSTOM_VALUE;
      if(custom){
        custom.style.display=isCustom?'block':'none';
        if(isCustom)custom.focus();
      }
      window.autoFillVendor();
    };

    var originalSubmitCallLog=window.submitCallLog;
    window.submitCallLog=function(){
      var select=q('lc-service');
      var custom=q('lc-service-custom');
      if(select&&custom&&select.value===CUSTOM_VALUE){
        var typed=clean(custom.value);
        if(!typed){
          alert('Please enter the new service type.');
          custom.focus();
          return;
        }
        addOption(select,typed,typed,CUSTOM_VALUE);
        select.value=typed;
        custom.value='';
        custom.style.display='none';
      }
      return originalSubmitCallLog?originalSubmitCallLog.apply(this,arguments):undefined;
    };

    function setup(){
      var service=q('lc-service');
      if(service){
        addOption(service,'window cleaning','Window Cleaning','other');
        addOption(service,CUSTOM_VALUE,'+ Add new service type...');
        if(!q('lc-service-custom')){
          service.insertAdjacentHTML('afterend','<input id="lc-service-custom" placeholder="Type new service type" style="display:none;margin-top:6px"/>');
        }
        service.onchange=window.handleServiceTypeQuickAdd;
        service.setAttribute('onchange','handleServiceTypeQuickAdd()');
      }
      var vendorTrade=q('nv-trade');
      if(vendorTrade)addOption(vendorTrade,'Window Cleaning','Window Cleaning','__custom__');
    }

    setup();
    setTimeout(setup,500);
    setTimeout(setup,1500);
  }catch(error){
    console.warn('Service type quick-add did not initialize:',error);
  }
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
    if (fs.existsSync(filePath)) {
      cachedHtml = fs.readFileSync(filePath, 'utf8');
      return cachedHtml;
    }
  }

  const response = await fetch('https://raw.githubusercontent.com/mattbrading14/maintenanceai/main/index.html');
  if (!response.ok) throw new Error('Could not load private app HTML');
  cachedHtml = await response.text();
  return cachedHtml;
}

function injectPatch(html) {
  if (html.includes('data-maintenanceai-service-type-quickadd')) return html;
  const closingBodyIndex = html.toLowerCase().lastIndexOf('</body>');
  if (closingBodyIndex === -1) return html + SERVICE_TYPE_PATCH;
  return html.slice(0, closingBodyIndex) + SERVICE_TYPE_PATCH + html.slice(closingBodyIndex);
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
