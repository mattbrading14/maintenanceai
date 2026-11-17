(function(){
  'use strict';
  if(window.__maiFollowupReady)return;window.__maiFollowupReady=true;
  const F=window.MAIFollowup,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const style=document.createElement('style');style.textContent='.mai-followups{background:#fff;border:1px solid #cbd5e1;border-left:5px solid #a16207;border-radius:12px;padding:18px;margin:12px 0;color:#0f172a}.mai-followups h2{font-size:20px;margin:0 0 8px}.mai-followups p{font-size:16px;line-height:1.5;margin:6px 0}.mai-followup-item{padding:14px 0;border-top:1px solid #e2e8f0}.mai-followup-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.mai-followup-actions button,.mai-remind-dialog button{min-height:48px;padding:10px 16px;font-size:16px;border:1px solid #94a3b8;border-radius:9px;background:#fff;color:#0f172a;cursor:pointer}.mai-followup-actions .mai-yes{background:#166534;color:white;border-color:#166534}.mai-followups button:focus-visible,.mai-remind-dialog button:focus-visible{outline:3px solid #2563eb;outline-offset:3px}.mai-remind-dialog{border:1px solid #cbd5e1;border-radius:14px;max-width:460px;width:90vw;padding:22px}.mai-remind-dialog::backdrop{background:#0f172a88}.mai-remind-dialog h2{font-size:21px}.mai-remind-dialog p{font-size:16px;line-height:1.5}.mai-remind-options{display:flex;flex-wrap:wrap;gap:8px}@media(max-width:600px){.mai-followup-actions{display:grid;grid-template-columns:1fr}.mai-followups{padding:16px}}';document.head.append(style);
  const box=document.createElement('section');box.className='mai-followups';box.setAttribute('aria-label','Maintenance follow-up');box.hidden=true;document.querySelector('.mai-tools').after(box);
  const later=document.createElement('dialog');later.className='mai-remind-dialog';later.setAttribute('aria-label','Remind me later');document.body.append(later);
  let previousSignature='',activeDay=F.today();
  function notice(text){const el=document.getElementById('mai-notice');if(el)el.textContent=text;}
  function render(){
    const rows=F.due(pmTasks),signature=JSON.stringify(rows.map(r=>[r.index,r.task.task,r.task.next,r.task.followup]));
    if(signature===previousSignature)return;previousSignature=signature;box.hidden=!rows.length;if(!rows.length){box.replaceChildren();return;}
    box.innerHTML='<h2>Was this maintenance completed?</h2><p>These scheduled dates have passed. Confirm what happened so your records and owner reports stay accurate.</p>'+rows.map(({task,index})=>'<div class="mai-followup-item"><p><strong>'+esc(task.task)+'</strong></p><p>Scheduled for '+esc(F.display(task.next))+'</p>'+(task.followup?.due===task.next&&task.followup.answer==='not_completed'?'<p>You last marked this as not completed.</p>':'')+'<div class="mai-followup-actions"><button class="mai-yes" data-followup="yes" data-index="'+index+'">Yes, completed</button><button data-followup="not_completed" data-index="'+index+'">Not yet</button><button data-followup="later" data-index="'+index+'">Remind me later</button></div></div>').join('');
  }
  async function defer(index,answer,days){const task=pmTasks[index];if(!task)return;const followup=F.respond(task,answer,days);render();const saved=await saveData();notice((saved?'Follow-up saved. ':'Follow-up kept on this device; cloud sync is pending. ')+'We will ask again '+F.display(followup.remindOn)+'. The maintenance due date has not changed.');}
  box.addEventListener('click',e=>{const button=e.target.closest('button[data-followup]');if(!button)return;const index=Number(button.dataset.index),task=pmTasks[index];if(!task)return;
    if(button.dataset.followup==='yes'){window.maiRecordCompletion(index);const date=document.getElementById('mai-date');if(date){date.value='';date.focus();}return;}
    if(button.dataset.followup==='not_completed'){defer(index,'not_completed',1);return;}
    const cycle=task.next;later.innerHTML='<h2>When should we ask again?</h2><p>'+esc(task.task)+'</p><div class="mai-remind-options"><button data-days="1">Tomorrow</button><button data-days="3">In 3 days</button><button data-days="7">In a week</button><button data-cancel>Cancel</button></div><p>This reminder will appear in the app. The original maintenance due date stays the same.</p>';
    later.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.hasAttribute('data-cancel')){later.close();if(button.isConnected)button.focus();return;}if(b.dataset.days){later.close();if(pmTasks[index]===task&&task.next===cycle)defer(index,'later',Number(b.dataset.days));}};later.showModal();
  });
  const original=window.renderPM;window.renderPM=function(){const result=original.apply(this,arguments);render();return result;};
  setInterval(()=>{const day=F.today();if(day!==activeDay){activeDay=day;previousSignature='';render();}},60000);
  window.addEventListener('focus',()=>{previousSignature='';render();});render();
})();
