// @ts-check
import van from "./van-1.5.3.js"
import { publish, subscribe } from "./messaging.js"

let { tags, state, derive } = van
let { div, label, input } = tags

let filteredTags = state(localStorage.getItem("tags")?.split(",") ?? []),
    search = state(localStorage.getItem("search") ?? ""),
    total = state(document.querySelectorAll("ul#recipes > li").length)

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
    /** @type {NodeListOf<HTMLLIElement>} */ let $rows = document.querySelectorAll("ul#recipes > li")
    for (let $row of $rows) {
        let title = $row.dataset.title
        let liTags = getLiTags($row)
        if ((!search.val || title?.includes(search.val))
            && (filteredTags.val.length === 0 || liTags.some(x => filteredTags.val.includes(x)))) {
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