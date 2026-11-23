const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
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
    if(!elements.has(id))elements.set(id,{innerHTML:'',value:'',click:null,addEventListener(name,cb){assert.equal(name,'click');this.click=cb;}});
    return elements.get(id);
  }};
  const context=vm.createContext({document,TENANTS:directory,workOrders,
    URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},
    compressImage:async (file,size)=>{assert(size>=1440);return 'synthetic';},
    escapeHtml:v=>String(v??'').replaceAll('<','&lt;'),
    fetch:async (url,req)=>{assert.equal(url,'/api/claude');requests.push(JSON.parse(req.body));const response=responses.shift();return {ok:true,json:async()=>({content:[{text:JSON.stringify(await response)}]})};},
    updateQueueCount(){},saveData(){saveCount++;},matchVendor:()=>({name:'Synthetic vendor'}),tenantPhone:t=>t.cell_phone||''
  });
  vm.runInContext(script,context);
  const el=id=>document.getElementById(id);
  const selected=()=>el('screenshot-result').innerHTML.match(/<option value="(\d+)" selected>/)?.[1]??'';
  return {run:()=>context.handleScreenshot({}),submit(choice=selected()){el('screenshot-tenant-choice').value=choice;el('screenshot-add-queue').click();},selected,el,workOrders,requests,saves:()=>saveCount};
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
