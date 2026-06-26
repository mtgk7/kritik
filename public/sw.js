const CACHE = 'kritik-v1'
const SHELL = ['/', '/sonuclar', '/karli-tahminler', '/kupon']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // addAll tek başarısız olursa tümü iptal olmasın
      return Promise.allSettled(SHELL.map(url => c.add(url)))
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  // API ve Supabase bypass
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return
  // Statik asset: cache-first
  if (url.pathname.match(/\.(png|jpg|svg|woff2?|css|js)$/)) {
    e.respondWith(
      caches.match(e.request).then(r =>
        r || fetch(e.request).then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()))
          return res
        })
      )
    )
  }
})

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Kritik', {
      body:  data.body  ?? '',
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      data:  { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const target = event.notification.data?.url ?? '/'
      for (const c of list) {
        if (c.url === target && 'focus' in c) return c.focus()
      }
      if (clients.openWindow) return clients.openWindow(target)
    })
  )
})
