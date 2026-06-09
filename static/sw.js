let cacheVersion = "dynamic-cache-6"

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

    // Page navigations always revalidate, so a refresh shows the latest. Other
    // assets use the default cache mode, letting the browser's HTTP cache honor
    // Cache-Control/Expires and revalidate with the ETag (304 when unchanged).
    // Both fall back to the Cache API when the network is unavailable.
    let cacheMode = request.mode === "navigate" ? "no-cache" : "default"
    event.respondWith(networkWithOfflineFallback(event, cacheMode))
})

async function networkWithOfflineFallback(event, cacheMode) {
    let cache = await caches.open(cacheVersion)
    try {
        let response = await fetch(event.request, { cache: cacheMode })
        if (response.ok) {
            cache.put(event.request, response.clone())
        }
        return response
    } catch (e) {
        let cached = await cache.match(event.request)
        return cached || Response.error()
    }
}
