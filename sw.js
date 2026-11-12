const C='kaizen-v2';
try{importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:"AIzaSyD_36rvEXsOH5XEXJhqxxOokIjyKq1Mwa8",authDomain:"habit-tracking-6be1c.firebaseapp.com",projectId:"habit-tracking-6be1c",messagingSenderId:"221005274545",appId:"1:221005274545:web:4134129bee4aa601c53190"});
firebase.messaging().onBackgroundMessage(p=>{const d=p.data||{};return self.registration.showNotification(d.title||'KAIZEN',{body:d.body||'',tag:d.tag||'kaizen'})})}catch(e){}
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||!(u.origin===location.origin||['www.gstatic.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)))return;
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{});return res}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if('focus' in c)return c.focus()}return clients.openWindow('./')}))});
