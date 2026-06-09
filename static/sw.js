let cacheVersion = "dynamic-cache-4"

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

    event.respondWith(staleWhileRevalidate(event))
})

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
