"use strict";(()=>{var e={};e.id=7108,e.ids=[7108],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},96113:(e,o,t)=>{t.r(o),t.d(o,{originalPathname:()=>b,patchFetch:()=>x,requestAsyncStorage:()=>m,routeModule:()=>l,serverHooks:()=>f,staticGenerationAsyncStorage:()=>u});var r={};t.r(r),t.d(r,{POST:()=>d,dynamic:()=>c});var a=t(49303),i=t(88716),n=t(60670),s=t(87070),p=t(3370);let c="force-dynamic";async function d(e){let{messages:o,propertyCtx:t,sessionId:r}=await e.json(),a=(0,p.eI)(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY),i=process.env.NEXT_PUBLIC_SITE_URL||"https://bs-merida-crm.vercel.app",{data:n}=await a.from("properties").select("id, title, type, operation, price, currency, zone, city, bedrooms, bathrooms, m2_construction, status").eq("status","Disponible").order("created_at",{ascending:!1}).limit(40),c=(n||[]).map(e=>`[${e.id}] ${e.title} | ${e.type} en ${e.operation} | $${Number(e.price).toLocaleString("es-MX")} ${e.currency||"MXN"} | ${[e.zone,e.city].filter(Boolean).join(", ")} | ${e.bedrooms}rec ${e.bathrooms}ba${e.m2_construction?` ${e.m2_construction}m\xb2`:""}`).join("\n"),d=t?`
EL VISITANTE EST\xc1 VIENDO ESTA PROPIEDAD:
Nombre: ${t.title}
Operaci\xf3n: ${t.operation}
ID: ${t.id}
Responde sobre esta propiedad. Para mostrarla usa [PROPS|${t.id}]
`:"",l=`Eres Sof\xeda, asistente virtual de BS M\xe9rida Inmobiliaria. Eres c\xe1lida, inteligente y conoces el mercado inmobiliario mexicano.
${d}
INVENTARIO DISPONIBLE (formato: [ID] nombre | detalles):
${c||"Sin propiedades disponibles."}

C\xd3MO MOSTRAR PROPIEDADES:
Cuando recomiendes propiedades, incluye al final de tu mensaje:
[PROPS|id1,id2,id3]
Ejemplo: [PROPS|abc-123,def-456]
M\xe1ximo 3 propiedades por mensaje. Solo IDs del inventario de arriba.
El sistema convierte eso en tarjetas bonitas con foto autom\xe1ticamente.

TUS OBJETIVOS:
1. Entender qu\xe9 busca el cliente (operaci\xf3n, tipo, zona, presupuesto)
2. Recomendar propiedades del inventario con tarjetas visuales
3. Capturar nombre y WhatsApp de forma natural en la conversaci\xf3n
4. Cuando tengas nombre Y tel\xe9fono, agrega al final: [LEAD|nombre=X|telefono=Y|presupuesto=Z|zona=W|operacion=V]

REGLAS:
- Respuestas CORTAS: 1-3 oraciones + las tarjetas hacen el trabajo visual
- Si alguien describe lo que busca, muestra propiedades inmediatamente
- Pregunta nombre/tel\xe9fono despu\xe9s de que haya inter\xe9s real, no al inicio
- Nunca inventes datos que no est\xe9n en el inventario
- Siempre en espa\xf1ol, tono amigable y profesional`,m=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY||"","anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:500,system:l,messages:o})}),u=await m.json();if(u.error)return s.NextResponse.json({error:u.error.message},{status:500});let f=u.content?.[0]?.text||"Lo siento, hubo un error. \xbfPuedes intentar de nuevo?",b=null,x=f.match(/\[LEAD\|([^\]]+)\]/);x&&(b={},x[1].split("|").forEach(e=>{let[o,t]=e.split("=");o&&t&&(b[o.trim()]=t.trim())}),f=f.replace(/\[LEAD\|[^\]]+\]\s*/g,"").trim());let E=[],S=f.match(/\[PROPS\|([^\]]+)\]/);if(S){let e=S[1].split(",").map(e=>e.trim()).filter(Boolean);if(f=f.replace(/\[PROPS\|[^\]]+\]\s*/g,"").trim(),e.length){let{data:o}=await a.from("properties").select("id, title, type, operation, price, currency, zone, city, bedrooms, bathrooms, m2_construction").in("id",e),{data:t}=await a.from("property_images").select("property_id, url").in("property_id",e).eq("is_cover",!0),r=Object.fromEntries((t||[]).map(e=>[e.property_id,e.url]));E=(o||[]).sort((o,t)=>e.indexOf(o.id)-e.indexOf(t.id)).map(e=>({id:e.id,title:e.title,type:e.type,operation:e.operation,price:e.price,currency:e.currency||"MXN",zone:[e.zone,e.city].filter(Boolean).join(", "),bedrooms:e.bedrooms,bathrooms:e.bathrooms,m2:e.m2_construction,cover:r[e.id]||null,url:`${i}/propiedad/${e.id}`}))}}return r&&await a.from("chatbot_messages").insert({session_id:r,from_bot:!0,message:f}),s.NextResponse.json({reply:f,leadData:b,propertyCards:E})}let l=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/sofia/route",pathname:"/api/sofia",filename:"route",bundlePath:"app/api/sofia/route"},resolvedPagePath:"/Users/juanpi/bs-merida-crm/app/api/sofia/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:m,staticGenerationAsyncStorage:u,serverHooks:f}=l,b="/api/sofia/route";function x(){return(0,n.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:u})}},49303:(e,o,t)=>{e.exports=t(30517)}};var o=require("../../../webpack-runtime.js");o.C(e);var t=e=>o(o.s=e),r=o.X(0,[8948,7930,7070],()=>t(96113));module.exports=r})();