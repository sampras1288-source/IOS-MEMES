const V='memes-v1';
const CORE=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','memes/manifest.json'];
self.addEventListener('install',ev=>{
  self.skipWaiting();
  ev.waitUntil((async()=>{
    const c=await caches.open(V);
    await c.addAll(CORE);
    try{
      const list=await (await fetch('memes/manifest.json',{cache:'no-store'})).json();
      await c.addAll(list.flatMap(b=>[b.image,b.sound]).filter(Boolean).map(f=>'memes/'+f));
    }catch(e){}
  })());
});
self.addEventListener('activate',ev=>{
  ev.waitUntil((async()=>{
    for(const k of await caches.keys())if(k!==V)await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',ev=>{
  const r=ev.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  ev.respondWith((async()=>{
    const c=await caches.open(V);
    const hit=await c.match(r.url,{ignoreSearch:true});
    if(!hit){
      try{const net=await fetch(r);if(net.status===200)c.put(r.url,net.clone());return net}
      catch(e){return new Response('',{status:504})}
    }
    const range=r.headers.get('range');
    if(range){ // Safari просит звук кусками
      const buf=await hit.arrayBuffer();
      const m=/bytes=(\d*)-(\d*)/.exec(range);
      const s=m[1]?+m[1]:0,e=m[2]?Math.min(+m[2],buf.byteLength-1):buf.byteLength-1;
      return new Response(buf.slice(s,e+1),{status:206,headers:{'Content-Type':hit.headers.get('Content-Type')||'audio/wav','Content-Range':`bytes ${s}-${e}/${buf.byteLength}`,'Content-Length':String(e-s+1)}});
    }
    fetch(r).then(n=>{if(n.status===200)c.put(r.url,n)}).catch(()=>{});
    return hit;
  })());
});
