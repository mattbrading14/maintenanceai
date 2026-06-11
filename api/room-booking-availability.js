const DEFAULT_TIME_ZONE='America/Los_Angeles';

export default async function handler(req,res){
  const origin=req.headers.origin||'';
  const host=req.headers.host||'';
  const allowedOrigins=['https://'+host,'http://'+host];
  if(origin&&allowedOrigins.includes(origin))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');

  if(req.method==='OPTIONS')return res.status(200).end();
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});

  try{
    const feedUrl=(process.env.ROOM_BOOKING_ICAL_URL||'').trim();
    if(!feedUrl)return res.status(200).json({ok:true,configured:false,events:[],message:'Calendar availability feed is not configured on the server.'});

    const url=new URL(feedUrl);
    if(url.protocol!=='https:'||url.hostname!=='calendar.google.com'||!url.pathname.includes('/calendar/ical/')){
      return res.status(500).json({ok:false,error:'Configured room booking iCal URL must be a Google Calendar iCal feed URL.'});
    }

    const start=parseRequestDate(req.query?.start)||new Date();
    const end=parseRequestDate(req.query?.end)||new Date(start.getTime()+90*24*60*60*1000);
    if(end<=start)return res.status(400).json({ok:false,error:'End date must be after start date.'});

    const upstream=await fetch(url.toString(),{headers:{'Accept':'text/calendar,text/plain,*/*'}});
    if(!upstream.ok)return res.status(502).json({ok:false,error:'Unable to read calendar availability feed.',upstreamStatus:upstream.status});

    const text=await upstream.text();
    const events=parseIcsEvents(text)
      .filter(event=>event.end>start&&event.start<end)
      .sort((a,b)=>a.start-b.start)
      .map(event=>({
        uid:event.uid,
        summary:event.summary,
        location:event.location,
        start:event.start.toISOString(),
        end:event.end.toISOString(),
        allDay:event.allDay
      }));

    return res.status(200).json({ok:true,configured:true,events});
  }catch(err){
    return res.status(500).json({ok:false,error:err.message||String(err)});
  }
}

function parseRequestDate(value){
  const raw=Array.isArray(value)?value[0]:value;
  if(!raw)return null;
  const date=new Date(raw);
  return isNaN(date)?null:date;
}

function parseIcsEvents(text){
  const lines=unfoldIcsLines(text);
  const events=[];
  let event=null;
  for(const line of lines){
    if(line==='BEGIN:VEVENT'){event={};continue;}
    if(line==='END:VEVENT'){
      const parsed=normalizeEvent(event);
      if(parsed)events.push(parsed);
      event=null;
      continue;
    }
    if(!event)continue;
    const parsed=parseIcsLine(line);
    if(!parsed)continue;
    if(!event[parsed.name])event[parsed.name]=[];
    event[parsed.name].push(parsed);
  }
  return events;
}

function unfoldIcsLines(text){
  return String(text||'').replace(/\r\n/g,'\n').split('\n').reduce((lines,line)=>{
    if((line.startsWith(' ')||line.startsWith('\t'))&&lines.length){
      lines[lines.length-1]+=line.slice(1);
    }else{
      lines.push(line.trimEnd());
    }
    return lines;
  },[]);
}

function parseIcsLine(line){
  const idx=line.indexOf(':');
  if(idx<0)return null;
  const namePart=line.slice(0,idx);
  const value=line.slice(idx+1);
  const parts=namePart.split(';');
  const name=parts.shift().toUpperCase();
  const params={};
  for(const part of parts){
    const eq=part.indexOf('=');
    if(eq>0)params[part.slice(0,eq).toUpperCase()]=part.slice(eq+1);
  }
  return {name,params,value};
}

function normalizeEvent(event){
  if(!event||firstValue(event.STATUS)==='CANCELLED')return null;
  const startProp=firstProp(event.DTSTART);
  if(!startProp)return null;
  const endProp=firstProp(event.DTEND);
  const start=parseIcsDate(startProp);
  let end=endProp?parseIcsDate(endProp):null;
  if(!start)return null;
  if(!end)end=new Date(start.getTime()+(startProp.allDay?24:1)*60*60*1000);
  if(end<=start)end=new Date(start.getTime()+60*60*1000);
  return {
    uid:firstValue(event.UID)||'',
    summary:unescapeIcsText(firstValue(event.SUMMARY)||'Busy'),
    location:unescapeIcsText(firstValue(event.LOCATION)||''),
    start,
    end,
    allDay:!!startProp.allDay
  };
}

function firstProp(values){return values&&values[0]?values[0]:null;}
function firstValue(values){return values&&values[0]?values[0].value:'';}

function parseIcsDate(prop){
  const value=prop.value||'';
  if(/^\d{8}$/.test(value)){
    prop.allDay=true;
    const y=Number(value.slice(0,4)),m=Number(value.slice(4,6)),d=Number(value.slice(6,8));
    return zonedTimeToUtc(y,m,d,0,0,0,prop.params.TZID||DEFAULT_TIME_ZONE);
  }
  const match=value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if(!match)return null;
  const [,yy,mo,dd,hh,mi,ss,z]=match;
  const y=Number(yy),m=Number(mo),d=Number(dd),h=Number(hh),min=Number(mi),sec=Number(ss);
  if(z)return new Date(Date.UTC(y,m-1,d,h,min,sec));
  return zonedTimeToUtc(y,m,d,h,min,sec,prop.params.TZID||DEFAULT_TIME_ZONE);
}

function zonedTimeToUtc(y,m,d,h,min,sec,timeZone){
  const localMs=Date.UTC(y,m-1,d,h,min,sec);
  let utcMs=localMs;
  for(let i=0;i<2;i++){
    utcMs=localMs-getTimeZoneOffsetMs(new Date(utcMs),timeZone);
  }
  return new Date(utcMs);
}

function getTimeZoneOffsetMs(date,timeZone){
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone,
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit',
    hourCycle:'h23'
  }).formatToParts(date).reduce((acc,part)=>{
    if(part.type!=='literal')acc[part.type]=part.value;
    return acc;
  },{});
  const asUtc=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second));
  return asUtc-date.getTime();
}

function unescapeIcsText(value){
  return String(value||'').replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\');
}
