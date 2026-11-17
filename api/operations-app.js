const base=require('./private-app-with-turnovers.js');
const fs=require('node:fs'),path=require('node:path');
function transform(html){
  const saveStart=html.indexOf('async function saveData(){'),loadStart=html.indexOf('\nfunction loadData(){',saveStart),cloudStart=html.indexOf('async function loadFromSupabase(){'),boot=html.indexOf('\nloadData();',cloudStart);
  if([saveStart,loadStart,cloudStart,boot].some(i=>i<0))throw Error('The application version needs a matching operations update.');
  // Generic code only: tenant records and connection settings remain in their existing sources.
  let storage=fs.readFileSync(path.join(__dirname,'../assets/storage-recovery.js'),'utf8');
  html=html.slice(0,cloudStart)+html.slice(boot);
  html=html.slice(0,saveStart)+storage+html.slice(loadStart);
  // Local development may already contain the previous storage declarations; only harmless function declarations repeat.
  html=html.replace(/const correctDates=[\s\S]*?if\(_upd\)saveData\(\);/,'// Saved maintenance dates are authoritative.');
  html=html.replace(/if\(d\.(pmTasks|TENANTS|VENDORS)&&d\.\1\.length\)/g,'if(Array.isArray(d.$1))');
  html=html.replace(/setTimeout\(saveContactUpdates,\s*(500|1500)\);/g,'');
  html=html.replace(/const d=new Date\(t.next\);d.setMonth[^\n]+pmTasks\[i\]\.next=[^\n]+;/g,'');
  html=html.replace(/\s*wo\.status='approved';(?=\s*(?:var|const) sl=)/g,'\n');
  html=html.replace('    window.showOfficeLeads=showOfficeLeads;','    window.maiExtraSearch=function(){return {prospects:state.prospects,offices:offices};};\n    window.showOfficeLeads=showOfficeLeads;');
  html=html.replace('    window.showTurnovers=','    window.maiTurnoverSearch=function(){return {turnovers:state.jobs};};\n    window.showTurnovers=');
  html=html.replace(/<script src="\/assets\/operations-(core|ui)\.js"><\/script>/g,'');
  html=html.replace('</head>','<meta name="robots" content="noindex,nofollow"><script src="/assets/operations-core.js?v=20261117"></script><script src="/assets/sync-core.js?v=20261117b"></script></head>');
  const closing=html.toLowerCase().lastIndexOf('</body>');if(closing<0)throw Error('Missing application body');
  html=html.slice(0,closing)+'<script src="/assets/operations-ui.js?v=20261117b"></script>'+html.slice(closing);
  return html;
}
module.exports=async function(req,res){let status=200;const capture={setHeader:(k,v)=>res.setHeader(k,v),status(n){status=n;return this;},send(body){try{if(status===200)body=transform(body);res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.status(status).send(body);}catch(error){res.status(500).send('The operations update could not load. Your saved data has not been changed.');}}};return base(req,capture);};
module.exports.transform=transform;
