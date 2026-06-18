"use strict";(()=>{var e={};e.id=8961,e.ids=[8961],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},78301:(e,t,i)=>{i.r(t),i.d(t,{originalPathname:()=>g,patchFetch:()=>x,requestAsyncStorage:()=>l,routeModule:()=>c,serverHooks:()=>u,staticGenerationAsyncStorage:()=>m});var r={};i.r(r),i.d(r,{GET:()=>d,revalidate:()=>p});var a=i(49303),n=i(88716),o=i(60670),s=i(19692);let p=3600;async function d(e){let t=(0,s.e)(),{data:i}=await t.from("properties").select("*, images:property_images(url, is_cover, position)").eq("is_published",!0).neq("status","Vendida").neq("status","Rentada").neq("status","Pausada"),r=new URL(e.url).origin;return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<listings>
  <provider>
    <name>Inmobiliaria BS M\xe9rida</name>
    <website>https://www.bsmerida.com</website>
    <email>${process.env.NEXT_PUBLIC_BUSINESS_EMAIL||"bsmerida19@gmail.com"}</email>
    <phone>${process.env.NEXT_PUBLIC_BUSINESS_PHONE||"999 303 4815"}</phone>
  </provider>
  ${(i||[]).map(e=>`
  <listing>
    <id>${e.id}</id>
    <title><![CDATA[${e.title}]]></title>
    <description><![CDATA[${e.description||""}]]></description>
    <type>${e.type}</type>
    <operation>${"Venta"===e.operation?"for-sale":"for-rent"}</operation>
    <price>
      <amount>${e.price}</amount>
      <currency>MXN</currency>
      ${"Renta"===e.operation?"<period>monthly</period>":""}
    </price>
    <address><![CDATA[${e.address||""}]]></address>
    <city>${e.city||"M\xe9rida"}</city>
    <state>${e.state||"Yucat\xe1n"}</state>
    <country>MX</country>
    <zone><![CDATA[${e.zone||""}]]></zone>
    <details>
      <bedrooms>${e.bedrooms||0}</bedrooms>
      <bathrooms>${e.bathrooms||0}</bathrooms>
      <m2-construction>${e.m2_construction||0}</m2-construction>
      <m2-land>${e.m2_land||0}</m2-land>
      <parking>${e.parking||0}</parking>
    </details>
    <amenities>
      ${(e.amenities||[]).map(e=>`<amenity><![CDATA[${e}]]></amenity>`).join("")}
    </amenities>
    <images>
      ${(e.images||[]).sort((e,t)=>(t.is_cover?1:0)-(e.is_cover?1:0)||e.position-t.position).map(e=>`<image><url>${e.url}</url></image>`).join("")}
    </images>
    <listing-url>${r}/propiedad/${e.id}</listing-url>
    <updated-at>${e.updated_at}</updated-at>
  </listing>`).join("")}
</listings>`.trim(),{headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=3600"}})}let c=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/feed/xml/route",pathname:"/api/feed/xml",filename:"route",bundlePath:"app/api/feed/xml/route"},resolvedPagePath:"/Users/juanpi/bs-merida-crm/app/api/feed/xml/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:l,staticGenerationAsyncStorage:m,serverHooks:u}=c,g="/api/feed/xml/route";function x(){return(0,o.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:m})}},19692:(e,t,i)=>{i.d(t,{e:()=>n});var r=i(67721),a=i(71615);function n(){let e=(0,a.cookies)();return(0,r.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:i,options:r})=>e.set(t,i,r))}catch{}}}})}},49303:(e,t,i)=>{e.exports=i(30517)}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),r=t.X(0,[8948,7930,9702],()=>i(78301));module.exports=r})();