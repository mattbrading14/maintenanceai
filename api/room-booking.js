export default async function handler(req,res){
  const origin=req.headers.origin||'';
  const host=req.headers.host||'';
  const allowedOrigins=['https://'+host,'http://'+host];
  if(origin&&allowedOrigins.includes(origin))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');

  if(req.method==='OPTIONS')return res.status(200).end();
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});

  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const automationUrl=(process.env.ROOM_BOOKING_WEBHOOK_URL||'').trim();
    if(!automationUrl)return res.status(200).json({ok:false,configured:false,message:'Room booking automation URL is not configured on the server.'});

    const target=new URL(automationUrl);
    if(target.protocol!=='https:'||target.hostname!=='script.google.com'){
      return res.status(500).json({ok:false,error:'Configured room booking automation URL must be a Google Apps Script web app URL.'});
    }

    const booking=body.booking||{};
    const cleanupFormUrl=safeGoogleFormUrl(body.cleanupFormUrl||process.env.KITCHEN_CLEANUP_FORM_URL||'');
    const safeBooking={
      id:booking.id,
      name:booking.name,
      organization:booking.organization,
      email:booking.email,
      phone:booking.phone,
      type:booking.type,
      purpose:booking.purpose,
      rooms:Array.isArray(booking.rooms)?booking.rooms:[],
      kitchen:!!booking.kitchen,
      date:booking.date,
      start:booking.start,
      end:booking.end,
      hours:booking.hours,
      location:booking.location||'146 Main St, Los Altos'
    };

    const upstream=await fetch(automationUrl,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sharedSecret:process.env.ROOM_BOOKING_SHARED_SECRET||'',
        calendarId:body.calendarId||process.env.ROOM_BOOKING_CALENDAR_ID||'',
        cleanupFormUrl,
        notifyEmail:process.env.ROOM_BOOKING_NOTIFY_EMAIL||'matt@bradingassociates.com',
        booking:safeBooking
      })
    });

    const text=await upstream.text();
    let data;
    try{data=text?JSON.parse(text):{};}catch(e){data={raw:text};}
    return res.status(upstream.ok?200:502).json({
      ok:upstream.ok,
      upstreamStatus:upstream.status,
      eventId:data.eventId||data.id||'',
      data
    });
  }catch(err){
    return res.status(500).json({ok:false,error:err.message||String(err)});
  }
}

function safeGoogleFormUrl(value){
  const raw=String(value||'').trim();
  if(!raw)return '';
  try{
    const url=new URL(raw);
    if(url.protocol!=='https:')return '';
    if(url.hostname==='forms.gle'||(url.hostname==='docs.google.com'&&url.pathname.startsWith('/forms/')))return url.toString();
  }catch(e){}
  return '';
}
