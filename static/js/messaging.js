export function publish(name, data) {
    document.dispatchEvent(new CustomEvent(name, { detail: data }))
}

export function subscribe(name, callback) {
    let handler = e => callback(e.detail)
    document.addEventListener(name, handler)
}