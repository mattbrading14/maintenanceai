const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const vendorOne={name:'Example Plumber',trade:'Plumbing',contact:'Rep One',email:'plumber@example.invalid',phone:'555-010-2222'};
const vendorTwo={name:'Example HVAC',trade:'HVAC',contact:'Rep Two',email:'hvac@example.invalid',phone:'555-010-3333'};
const start=source.indexOf('function normalizeScreenshotUnit');
const end=source.indexOf('\nfunction compressImage(',start);
assert(start>=0&&end>start,'expected the real screenshot intake entry point');
const script=source.slice(start,end);
const suite={unit:'100',business:'Example Studio',contact:'Directory Contact',email:'directory@example.invalid',cell_phone:'555-010-0100'};
const other={unit:'100A',business:'Another Studio',contact:'Other Contact',email:'other@example.invalid'};
const far={unit:'1000',business:'Far Studio',contact:'Far Contact',email:'far@example.invalid'};
function harness(responses,directory=[suite,other,far]){
  let saveCount=0;
  const workOrders=[], elements=new Map(),requests=[];
  const document={getElementById(id){
    if(!elements.has(id))elements.set(id,{innerHTML:'',value:'',events:{},querySelectorAll(){return [...this.innerHTML.matchAll(/<select id="([^"]+)" data-wo-vendor-id="([^"]+)" data-wo-vendor-context="([^"]+)">/g)].map(m=>{const e=document.getElementById(m[1]);e.dataset={woVendorId:m[2],woVendorContext:m[3]};return e;});},addEventListener(name,cb){this.events[name]=cb;}});
    return elements.get(id);
  }};
  let queueView='';
  const context=vm.createContext({document,TENANTS:directory,VENDORS:[vendorOne,vendorTwo,{name:'TBD'}],workOrders,
    workOrderStatusLabel:wo=>wo.status,renderQueue:view=>{queueView=view;},
    URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},
    compressImage:async (file,size)=>{assert(size>=1440);return 'synthetic';},
    escapeHtml:v=>String(v??'').replaceAll('<','&lt;'),
    fetch:async (url,req)=>{assert.equal(url,'/api/claude');requests.push(JSON.parse(req.body));const response=responses.shift();return {ok:true,json:async()=>({content:[{text:JSON.stringify(await response)}]})};},
    updateQueueCount(){},saveData(){saveCount++;},matchVendor:()=>({name:'Synthetic vendor'}),tenantPhone:t=>t.cell_phone||''
  });
  vm.runInContext(script,context);
  const el=id=>document.getElementById(id);
  const selected=()=>el('screenshot-result').innerHTML.match(/<select id="screenshot-tenant-choice">([\s\S]*?)<\/select>/)?.[1].match(/<option value="(\d+)" selected>/)?.[1]??'';
  const vendorChoice=i=>el('screenshot-result').innerHTML.match(new RegExp('<select id="screenshot-vendor-choice-'+i+'">([\\s\\S]*?)</select>'))?.[1].match(/<option value="([^"]*)" selected>/)?.[1]??'';
  return {run:()=>context.handleScreenshot({}),submit(choice=selected(),choices=[]){el('screenshot-tenant-choice').value=choice;for(let i=0;i<3;i++)el('screenshot-vendor-choice-'+i).value=choices[i]??vendorChoice(i);el('screenshot-add-queue').events.click();},selected,el,context,workOrders,requests,saves:()=>saveCount,queueView:()=>queueView};
}
const issue={title:'Leaking pipe',description:'Inspect the sink',category:'plumbing'};
test('suite from screenshot wins over a sender matching a different tenant; stores canonical contact only after confirmation',async()=>{
  const h=harness([{reported_units:['Suite #100','STE. 100',100],sender_name:other.contact,sender_email:other.email,issues:[issue]}]);
  await h.run();
  assert.equal(h.selected(),'0');
  assert.match(h.el('match-result').innerHTML,/Tenant matched by Suite 100/);
  assert.match(h.el('match-result').innerHTML,/Screenshot sender: Other Contact/);
  assert.match(h.el('screenshot-result').innerHTML,/Example Studio/);
  assert.equal(h.saves(),0);
  assert.equal(h.workOrders.length,0);
  const prompt=h.requests[0].messages[0].content[1].text;
  assert.match(prompt,/Never use numbers from recipients, unrelated quoted/);
  assert(!prompt.includes(suite.email)&&!prompt.includes(suite.cell_phone));
  h.submit();
  assert.equal(h.saves(),1);
  assert.equal(h.workOrders[0].unit,suite.unit);
  assert.equal(h.workOrders[0].tenant,suite.contact);
  assert.equal(h.workOrders[0].tenant_email,suite.email);
  assert.equal(h.workOrders[0].status,'pending');
});
test('100A and 1000 never select 100',async()=>{
  for(const [report,index] of [['Suite 100a','1'],['Unit 1000','2']]){
    const h=harness([{reported_units:[report],sender_email:suite.email,issues:[issue]}]);
    await h.run();assert.equal(h.selected(),index);
  }
});
test('multiple suite labels and directory duplicates require manual review',async()=>{
  for(const [units,dir] of [[['100','100A'],[suite,other]],[['Suite 100'],[suite,{...other,unit:'Unit 100'}]]]){
    const h=harness([{reported_units:units,sender_email:suite.email,issues:[issue]}],dir);
    await h.run();assert.equal(h.selected(),'');assert.match(h.el('match-result').innerHTML,/More than one/);
    h.submit('1');assert.equal(h.workOrders[0].tenant,other.contact);
  }
});
test('known sender is only the fallback when no explicit suite was extracted',async()=>{
  const h=harness([{reported_units:[],sender_email:other.email,issues:[issue]},{reported_units:['Suite 102'],sender_email:other.email,issues:[issue]}]);
  await h.run();assert.equal(h.selected(),'1');
  await h.run();assert.equal(h.selected(),'');h.submit();
  assert.equal(h.workOrders[0].unit,'102');assert.equal(h.workOrders[0].tenant,'Unknown');
});
test('late results for an earlier upload do not change selection or save work',async()=>{
  let resolveFirst;
  const first=new Promise(r=>resolveFirst=r);
  const h=harness([first,{reported_units:['Suite 100A'],issues:[issue]}]);
  const slow=h.run();while(!h.requests.length)await new Promise(r=>setImmediate(r));
  await h.run();assert.equal(h.selected(),'1');
  resolveFirst({reported_units:['Suite 100'],issues:[issue]});
  await slow;assert.equal(h.selected(),'1');assert.equal(h.saves(),0);
});

test('explicit occupant business can match without a suite; conflicting explicit occupancy goes to review',async()=>{
  const h=harness([{reported_units:[],reported_tenant_names:[' EXAMPLE   STUDIO '],sender_name:other.contact,issues:[issue]},{reported_units:['Suite 100'],reported_tenant_names:[other.business],sender_name:other.contact,issues:[issue]}]);
  await h.run();assert.equal(h.selected(),'0');
  await h.run();assert.equal(h.selected(),'');assert.match(h.el('match-result').innerHTML,/More than one/);
});

test('pre-save choices show vendor suggestions per issue and persist overrides and explicit unassigned',async()=>{
  const h=harness([{reported_units:['Suite 100'],issues:[issue,{...issue,title:'Heater still not working',category:'hvac'}]}]);
  await h.run();
  const markup=h.el('screenshot-result').innerHTML;
  assert.match(markup,/Suggested: Example Plumber/);assert.match(markup,/Suggested: Example HVAC/);
  assert.doesNotMatch(markup,/>TBD/);
  assert.equal(h.workOrders.length,0);assert.equal(h.saves(),0);
  h.submit('0',['1','']);
  assert.equal(h.workOrders.find(w=>w.issue_summary===issue.title).vendor.email,vendorTwo.email);
  assert.equal(h.workOrders.find(w=>w.issue_summary==='Heater still not working').vendor.name,'Unassigned');
  assert(h.workOrders.every(w=>w.status==='pending'));
  assert.equal(h.saves(),1);
});
test('post-save screenshot card can change vendor without making another order or dispatching',async()=>{
  const h=harness([{reported_units:['100'],issues:[issue]}]);
  await h.run();h.submit();
  const wo=h.workOrders[0];
  assert.equal(wo.vendor.name,vendorOne.name);
  const vendor=h.el('active-wo-vendor-screenshot-'+wo.id);
  h.context.VENDORS.reverse();
  vendor.value='1';vendor.events.change();
  assert.equal(h.workOrders.length,1);assert.equal(wo.vendor.email,vendorTwo.email);
  assert.equal(wo.status,'pending');assert.equal(h.requests.length,1);
  h.context.approveWorkOrderWithoutDispatch(wo.id,'screenshot');
  assert.equal(wo.status,'approved');assert.equal(h.requests.length,1);
});
test('an existing improperly emailed placeholder order can be assigned from Approved without duplicate or dispatch',()=>{
  const h=harness([]);
  const wo={id:'WO-legacy',source:'Screenshot',status:'emailed',vendorDispatchMethod:'email',vendor:{name:'TBD',email:''}};
  h.workOrders.push(wo);
  const markup=h.context.renderInlineWorkOrderVendor(wo,'approved');
  assert.match(markup,/No vendor was contacted/);assert.match(markup,/Example HVAC/);
  h.el('approved-list').innerHTML=markup;h.context.bindInlineWorkOrderVendors(h.el('approved-list'));
  const choice=h.el('active-wo-vendor-approved-'+wo.id);
  choice.value='1';choice.events.change();
  assert.equal(wo.vendor.name,vendorTwo.name);assert.equal(wo.status,'pending');assert.equal(wo.vendorDispatchMethod,undefined);
  assert.equal(h.workOrders.length,1);assert.equal(h.requests.length,0);assert.equal(h.queueView(),'queue');
});
test('dispatch requires a real vendor and the chosen channel destination',()=>{
  const {context}=harness([]);
  assert.equal(context.workOrderVendorCanDispatch({name:'TBD',email:vendorOne.email,phone:vendorOne.phone},'email'),false);
  assert.equal(context.workOrderVendorCanDispatch({name:'Example HVAC',email:'example.invalid'},'email'),false);
  assert.equal(context.workOrderVendorCanDispatch({name:'Example HVAC',phone:'123'},'text'),false);
  assert.equal(context.workOrderVendorCanDispatch(vendorTwo,'email'),true);
  assert.equal(context.workOrderVendorCanDispatch(vendorTwo,'text'),true);
});
test('live wrapper dispatch guards run before status and opener side effects',()=>{
  const a=fs.readFileSync(path.join(__dirname,'../api/private-app.js'),'utf8');
  const b=fs.readFileSync(path.join(__dirname,'../api/private-app-with-turnovers.js'),'utf8');
  const exact=(s,start,end)=>{const i=s.indexOf(start);assert(i>=0);return s.slice(i,s.indexOf(end,i));};
  const h=harness([]);const wo={id:'WO-guard',status:'pending',vendor:{name:'TBD',email:'',phone:'1234567890'}};
  let opened=0,saved=0,attention=0;
  Object.assign(h.context,{window:{open(){opened++;},location:{set href(v){opened++;}}},getWorkOrders:()=>[wo],alert(){attention++;},
    syncTenantAccessContact(){},updateQueueCount(){},saveData(){saved++;},saveAndRefresh(){saved++;},clean:v=>String(v??'').trim(),
    findWorkOrder:()=>wo,smsNumber:phone=>phone,actionId:()=>'',openSms(){opened++;},workOrderTextBody:()=>'',q:()=>null,html:v=>v,emailAccessLines:()=>[]});
  vm.runInContext(exact(a,'    window.emailWO=function(id,ctx){','    window.downloadWOPDF='),h.context);
  vm.runInContext(exact(b,'    function textWO(id,ctx){','    function installStyle(){'),h.context);
  h.context.window.emailWO(wo.id,'screenshot');h.context.textWO(wo.id,'screenshot');
  assert.equal(wo.status,'pending');assert.equal(opened,0);assert.equal(saved,0);assert.equal(attention,2);
  wo.vendor={...vendorTwo,email:''};
  h.context.window.emailWO(wo.id,'screenshot');
  assert.equal(wo.status,'pending');assert.equal(opened,0);assert.equal(saved,0);
  h.context.textWO(wo.id,'screenshot');
  assert.equal(wo.status,'emailed');assert.equal(wo.vendorDispatchMethod,'text');assert.equal(opened,1);assert.equal(saved,1);
});

test('assigning a vendor does not reset genuine Approved records or legacy composer with a stored address',()=>{
  const h=harness([]);
  for(const [j,prior] of [{source:'Screenshot',status:'approved',vendor:{name:'Unassigned'}},{source:'Screenshot',status:'emailed',vendorDispatchMethod:'email',vendor:{name:'TBD',email:vendorOne.email}},{source:'Phone call',status:'emailed',vendorDispatchMethod:'email',vendor:{name:'TBD',email:''}}].entries()){
    const wo={id:'WO-safe-'+j,...prior};
    h.workOrders.push(wo);h.context.setActiveWorkOrderVendor(wo.id,'1','approved');
    assert.equal(wo.status,prior.status);assert.equal(wo.vendor.name,vendorTwo.name);
  }
});
