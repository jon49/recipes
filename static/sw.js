let cacheVersion = "dynamic-cache-5"

let alwaysCache = [
    "/js/auth.js",
    "/js/filter.js",
    "/js/messaging.js",
    "/js/random-recipe.js",
    "/js/recipe-dropdown.js",
    "/js/tag-filter.js",
    "/js/van-1.5.3.js",
]

self.addEventListener("install", e =>
    e.waitUntil(
        caches
            .open(cacheVersion)
            .then(cache => cache.addAll(alwaysCache))
            .then(() => {
                self.skipWaiting()
            })
    )
)

self.addEventListener("activate", e => { e.waitUntil(deleteOldCache()) })

async function deleteOldCache() {
    let cacheNames = await caches.keys()
    let toDeleteOldCaches =
        cacheNames
            .filter(cache => cache !== cacheVersion)
            .map(cache => caches.delete(cache))
    return Promise.all(toDeleteOldCaches)
}

self.addEventListener("fetch", event => {
    let request = event.request
    if (request.method !== "GET") return

    let url = new URL(request.url)
    if (url.origin !== self.location.origin) return

    // The editor reads live data through these; never serve them from cache.
    if (url.pathname.startsWith("/api/") || url.pathname === "/index.json") return

    if (request.mode === "navigate") {
        // Pages (home + recipes): network-first so a refresh always shows the
        // latest, falling back to the cache only when offline.
        event.respondWith(networkFirst(event))
    } else {
        // Assets: stale-while-revalidate for fast loads.
        event.respondWith(staleWhileRevalidate(event))
    }
})

// Network-first: fetch a fresh copy (revalidating against the server, so an
// unchanged page is a cheap 304), update the cache, and serve it. Fall back to
// the cached copy when the network is unavailable.
async function networkFirst(event) {
    let cache = await caches.open(cacheVersion)
    try {
        let response = await fetch(event.request, { cache: "no-cache" })
        if (response.ok) {
            cache.put(event.request, response.clone())
        }
        return response
    } catch (e) {
        let cached = await cache.match(event.request)
        return cached || Response.error()
    }
}

// Stale-while-revalidate: serve the cached response immediately (if any) while
// fetching a fresh copy in the background to replace it for next time. On a
// cache miss, wait for the network.
async function staleWhileRevalidate(event) {
    let request = event.request
    let cache = await caches.open(cacheVersion)
    let cached = await cache.match(request)

    let fromNetwork = fetch(request)
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone())
            }
            return response
        })
        .catch(() => undefined)

    if (cached) {
        // Keep the worker alive until the background refresh finishes.
        event.waitUntil(fromNetwork)
        return cached
    }
    return (await fromNetwork) || Response.error()
}
