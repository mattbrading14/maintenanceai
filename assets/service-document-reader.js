(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./maintenance-followup-core.js'));else root.MAIServiceDocuments=factory(root.MAIFollowup);})(typeof globalThis!=='undefined'?globalThis:this,function(F){
  'use strict';
  function asDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('The file could not be opened.'));reader.readAsDataURL(file);});}
  async function read(file,dependencies={}){
    F.validateDocument(file);
    const dataUrl=await (dependencies.asDataURL||asDataURL)(file),base64=String(dataUrl).split(',')[1];
    if(!base64)throw Error('The file is empty or unreadable.');
    const block={type:file.type==='application/pdf'?'document':'image',source:{type:'base64',media_type:file.type,data:base64}};
    const response=await (dependencies.fetch||fetch)('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1800,messages:[{role:'user',content:[block,{type:'text',text:F.extractionPrompt}]}]})});
    if(!response.ok)throw Error('The document reader is unavailable. Your records have not changed.');
    const result=await response.json(),text=(result.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n').trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
    if(result.stop_reason==='max_tokens')throw Error('The response was incomplete. Review the document manually.');
    let parsed;try{parsed=JSON.parse(text);}catch(error){throw Error('The document could not be read clearly. Enter the details manually.');}
    return {fileName:String(file.name||'Service document').slice(0,250),mimeType:file.type,sizeBytes:file.size,draft:F.documentDraft(parsed)};
  }
  // This module is prepared for the private document-store integration. It is
  // not wired to the live app while that store and authentication are absent.
  // File bytes must never go in shared work-order JSON or public download URLs.
  function requirePrivateStore(store){if(!store||store.visibility!=='private'||typeof store.upload!=='function'||typeof store.download!=='function')throw Error('Private document storage must be configured before reports or invoices can be saved.');return store;}
  return {read,requirePrivateStore};
});
