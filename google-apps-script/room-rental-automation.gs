/*
 * 146 Main St room rental automation
 *
 * Setup:
 * 1. Paste this file into a Google Apps Script project owned by the Google
 *    account that controls the room-rental calendar.
 * 2. Fill in CALENDAR_ID and, if desired, SHARED_SECRET.
 * 3. Run setupRoomRentalAutomation() once and authorize the script.
 * 4. Deploy as a Web App and set the deployment URL in Vercel as
 *    ROOM_BOOKING_WEBHOOK_URL.
 *
 * Note: Apps Script FormApp does not expose a reliable file-upload item
 * creator. The setup creates a required "photo links" field. If you want true
 * Google Forms file uploads, add one File Upload question to the generated form
 * manually after setup.
 */

const CONFIG={
  CALENDAR_ID:'lamtareservations@gmail.com',
  NOTIFY_EMAIL:'matt@bradingassociates.com',
  CLEANUP_FORM_ID:'',
  CLEANUP_FORM_URL:'',
  SHARED_SECRET:''
};

const KITCHEN_QUEUE_KEY='ROOM_RENTAL_KITCHEN_QUEUE';

function setupRoomRentalAutomation(){
  const form=getOrCreateCleanupForm_();
  installTrigger_('sendDueKitchenCleanupEmails',ScriptApp.newTrigger('sendDueKitchenCleanupEmails').timeBased().everyMinutes(15));
  installTrigger_('onKitchenCleanupSubmit',ScriptApp.newTrigger('onKitchenCleanupSubmit').forForm(form).onFormSubmit());
  Logger.log('Kitchen cleanup form URL: '+form.getPublishedUrl());
  Logger.log('Deploy this script as a Web App, then set ROOM_BOOKING_WEBHOOK_URL to the Web App URL.');
}

function doPost(e){
  try{
    const payload=JSON.parse((e.postData&&e.postData.contents)||'{}');
    if(CONFIG.SHARED_SECRET&&payload.sharedSecret!==CONFIG.SHARED_SECRET){
      return json_({ok:false,error:'Unauthorized'});
    }
    const event=createCalendarEvent_(payload);
    if(payload.booking&&payload.booking.kitchen){
      queueKitchenCleanup_(payload.booking,payload.cleanupFormUrl||CONFIG.CLEANUP_FORM_URL||getCleanupFormUrl_());
    }
    return json_({ok:true,eventId:event.getId(),cleanupQueued:!!(payload.booking&&payload.booking.kitchen)});
  }catch(err){
    return json_({ok:false,error:err.message||String(err)});
  }
}

function createCalendarEvent_(payload){
  const booking=payload.booking||{};
  if(!booking.date||!booking.start||!booking.end)throw new Error('Booking date, start, and end are required.');
  const start=new Date(booking.date+'T'+booking.start+':00');
  const end=new Date(booking.date+'T'+booking.end+':00');
  if(end<=start)end.setDate(end.getDate()+1);

  const calendarId=payload.calendarId||CONFIG.CALENDAR_ID;
  const calendar=calendarId?CalendarApp.getCalendarById(calendarId):CalendarApp.getDefaultCalendar();
  if(!calendar)throw new Error('Calendar not found. Check CALENDAR_ID or the calendar ID sent by the app.');

  const rooms=(booking.rooms||[]).join(', ');
  const description=[
    'Room reservation',
    'Reservation ID: '+(booking.id||''),
    'Renter: '+(booking.name||''),
    booking.organization?'Organization: '+booking.organization:'',
    booking.email?'Email: '+booking.email:'',
    booking.phone?'Phone: '+booking.phone:'',
    'Rooms: '+rooms,
    booking.kitchen?'Kitchen cleanup form required after reservation.':'Kitchen not reserved.',
    booking.purpose?'Purpose: '+booking.purpose:''
  ].filter(Boolean).join('\n');

  const options={
    description:description,
    location:booking.location||'146 Main St, Los Altos'
  };
  if(booking.email){
    options.guests=booking.email;
    options.sendInvites=true;
  }
  return calendar.createEvent('Room Rental - '+rooms,start,end,options);
}

function queueKitchenCleanup_(booking,formUrl){
  const list=getKitchenQueue_();
  const sendAfter=new Date(booking.date+'T'+booking.end+':00');
  const start=new Date(booking.date+'T'+booking.start+':00');
  if(sendAfter<=start)sendAfter.setDate(sendAfter.getDate()+1);
  list.push({
    id:booking.id,
    name:booking.name,
    email:booking.email,
    rooms:booking.rooms||[],
    date:booking.date,
    start:booking.start,
    end:booking.end,
    formUrl:formUrl,
    sendAfter:sendAfter.toISOString(),
    sent:false
  });
  saveKitchenQueue_(list);
}

function sendDueKitchenCleanupEmails(){
  const list=getKitchenQueue_();
  const now=new Date();
  let changed=false;
  list.forEach(item=>{
    if(item.sent||new Date(item.sendAfter)>now)return;
    const formUrl=item.formUrl||getCleanupFormUrl_();
    const subject='Kitchen cleanup confirmation - 146 Main St';
    const body=[
      'Hi '+(item.name||'there')+',',
      '',
      'Thank you for reserving the kitchen at 146 Main St.',
      '',
      'Please complete the kitchen cleanup confirmation form now that your reservation has ended:',
      formUrl,
      '',
      'Reservation ID: '+(item.id||''),
      'Reservation date: '+(item.date||'')+' '+(item.start||'')+'-'+(item.end||''),
      '',
      'Thank you,',
      'Brading Associates'
    ].join('\n');
    MailApp.sendEmail({
      to:item.email,
      subject:subject,
      body:body,
      htmlBody:body.replace(/\n/g,'<br>')
    });
    item.sent=true;
    item.sentAt=new Date().toISOString();
    changed=true;
  });
  if(changed)saveKitchenQueue_(list);
}

function onKitchenCleanupSubmit(e){
  const response=e.response;
  const lines=response.getItemResponses().map(itemResponse=>{
    return itemResponse.getItem().getTitle()+': '+formatFormAnswer_(itemResponse.getResponse());
  });
  const submittedAt=response.getTimestamp();
  const body=[
    'Kitchen cleanup form completed.',
    '',
    'Submitted: '+submittedAt,
    '',
    lines.join('\n')
  ].join('\n');
  MailApp.sendEmail({
    to:CONFIG.NOTIFY_EMAIL,
    subject:'Kitchen cleanup completed - 146 Main St',
    body:body,
    htmlBody:body.replace(/\n/g,'<br>')
  });
}

function getOrCreateCleanupForm_(){
  const form=CONFIG.CLEANUP_FORM_ID?FormApp.openById(CONFIG.CLEANUP_FORM_ID):FormApp.create('146 Main St Kitchen Cleanup Confirmation');
  if(form.getItems().length)return form;
  form.setDescription('Complete this form immediately after any reservation that includes kitchen use.');
  form.addTextItem().setTitle('Reservation ID').setRequired(true);
  form.addTextItem().setTitle('Renter name').setRequired(true);
  form.addTextItem().setTitle('Renter email').setRequired(true);
  form.addCheckboxItem()
    .setTitle('Kitchen cleanup confirmation')
    .setChoiceValues([
      'Kitchen surfaces cleaned',
      'Floors swept or mopped as needed',
      'All dishes washed',
      'All dishes put away',
      'Trash and recycling handled'
    ])
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('Kitchen cleanup photo links')
    .setHelpText('Paste links to photos here. To require direct uploads, add a Google Forms File Upload question manually after running setup.')
    .setRequired(true);
  form.addParagraphTextItem().setTitle('Additional notes').setRequired(false);
  form.setConfirmationMessage('Thank you. Your kitchen cleanup confirmation has been submitted.');
  try{form.setCollectEmail(true);}catch(err){}
  return form;
}

function getCleanupFormUrl_(){
  if(CONFIG.CLEANUP_FORM_URL)return CONFIG.CLEANUP_FORM_URL;
  return getOrCreateCleanupForm_().getPublishedUrl();
}

function installTrigger_(functionName,builder){
  ScriptApp.getProjectTriggers().forEach(trigger=>{
    if(trigger.getHandlerFunction()===functionName)ScriptApp.deleteTrigger(trigger);
  });
  builder.create();
}

function getKitchenQueue_(){
  const raw=PropertiesService.getScriptProperties().getProperty(KITCHEN_QUEUE_KEY)||'[]';
  try{return JSON.parse(raw);}catch(err){return [];}
}

function saveKitchenQueue_(list){
  PropertiesService.getScriptProperties().setProperty(KITCHEN_QUEUE_KEY,JSON.stringify(list.slice(-200)));
}

function formatFormAnswer_(answer){
  if(Array.isArray(answer))return answer.join(', ');
  return answer==null?'':String(answer);
}

function json_(data){
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
