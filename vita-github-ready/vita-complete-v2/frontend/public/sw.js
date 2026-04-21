/**
 * VI Vita Intelligence — Service Worker
 * =======================================
 * Handles:
 *   1. Static asset caching (app shell)
 *   2. API request caching strategy
 *   3. Push notification display
 *   4. Offline fallback
 *
 * Place this file at: frontend/public/sw.js
 */

const CACHE_VERSION  = 'vi-v3-2'
const STATIC_CACHE   = `${CACHE_VERSION}-static`
const API_CACHE      = `${CACHE_VERSION}-api`

// Assets to cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
]

// ── Install ─────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    }).then(() => self.skipWaiting())
  )
})

// ── Activate ─────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch Strategy ───────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API calls: Network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    // Don't cache POST/payment requests
    if (request.method !== 'GET') return

    // Cache safe GET APIs (products, quiz mappings)
    const cacheable = ['/api/products/', '/api/coupons/']
    if (cacheable.some((p) => url.pathname.startsWith(p))) {
      event.respondWith(
        fetch(request).then((resp) => {
          const clone = resp.clone()
          caches.open(API_CACHE).then((c) => c.put(request, clone))
          return resp
        }).catch(() => caches.match(request))
      )
    }
    return
  }

  // Static assets: Cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone))
        }
        return resp
      })
    }).catch(() => {
      // Offline fallback for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/')
      }
    })
  )
})

// ── Push Notifications ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'VI Health', body: event.data.text() }
  }

  const { title, body, icon, url, badge, tag } = data

  event.waitUntil(
    self.registration.showNotification(title || 'VI Vita Intelligence', {
      body:    body    || 'Check your health dashboard',
      icon:    icon    || '/icons/icon-192.png',
      badge:   badge   || '/icons/icon-72.png',
      tag:     tag     || 'vi-notification',
      data:    { url: url || '/' },
      actions: [
        { action: 'open',    title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss'  },
      ],
      requireInteraction: false,
    })
  )
})

// ── Notification Click ───────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
