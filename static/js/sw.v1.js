let cacheVersion = 'dynamic-cache'

let alwaysCache = [
    "/js/filter.js",
    "/js/messaging.js",
    "/js/random-recipe.js",
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

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(cacheVersion).then(cache => {
            return cache.match(event.request)
            .then(response => {
                if (response) {
                    // If the response expires is not expired return it immediately
                    let expires = response.headers.get('expires')
                    if (expires && new Date(expires) > new Date()) {
                        return response;
                    }

                    // Check if the ETag has changed
                    return fetch(event.request, { method: 'HEAD' })
                        .then(headResponse => {
                            if (headResponse.headers.get('ETag') === response.headers.get('ETag')) {
                                return response;
                            } else {
                                return fetchAndCache(event.request, cache);
                            }
                        })
                        .catch(() => {
                            // If the HEAD request fails, return the cached response
                            return response;
                        })
                } else {
                    return fetchAndCache(event.request, cache);
                }
            });
        })
    );
});

function fetchAndCache(request, cache) {
    return fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    });
}

