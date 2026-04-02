// @ts-check
import van from "./van-1.5.3.js"
import { publish, subscribe } from "./messaging.js"

let { tags, state, derive } = van
let { div, label, input } = tags

let filteredTags = state(localStorage.getItem("tags")?.split(",") ?? []),
    search = state(localStorage.getItem("search") ?? ""),
    total = state(document.querySelectorAll("ul#recipes > li").length)

/** @type {NodeListOf<HTMLLIElement>} */
let $rows = document.querySelectorAll("ul#recipes > li")
let haystack = Array.from($rows, $row => $row.dataset.title ?? "")

// @ts-ignore
let uf = new uFuzzy({ intraMode: 1 })

let $filter
let app = div({ role: "group" },
    ($filter = label(
        input({
            type: "search",
            placeholder: "Search",
            oninput: e => search.val = e.target.value.toLowerCase(),
            value: search.val
        }), () => `Search - ${total.val} recipes found.`)),
)

subscribe("tag-filter-close", data => {
    filteredTags.val = data
})

derive(() => {
    localStorage.setItem("search", search.val)
})

derive(() => {
    let count = 0
    let matchedIdxs = null

    if (search.val) {
        let [idxs, info, order] = uf.search(haystack, search.val)
        if (idxs != null && idxs.length > 0) {
            matchedIdxs = new Set(order ? order.map(i => idxs[i]) : idxs)
        }
    }

    for (let i = 0; i < $rows.length; i++) {
        let $row = $rows[i]
        let liTags = getLiTags($row)
        let matchesSearch = !search.val || (matchedIdxs != null && matchedIdxs.has(i))
        let matchesTags = filteredTags.val.length === 0 || liTags.some(x => filteredTags.val.includes(x))

        if (matchesSearch && matchesTags) {
            $row.classList.remove("hidden")
            count++
        } else {
            $row.classList.add("hidden")
        }
    }
    total.val = count
    publish("filtered-content")
})

/**
 * @param {HTMLLIElement & { tags?: string[] }} li
 */
function getLiTags(li) {
    if (!li.tags) {
        li.tags = li.dataset.tags?.split(",") ?? []
    }
    return li.tags
}

let $app = document.getElementById("app")
if ($app) {
    $app.innerHTML = ''
    $app.prepend(app)
}
