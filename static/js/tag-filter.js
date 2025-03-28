// @ts-check
import van from "./van-1.5.3.js"
import { publish } from "./messaging.js"

let { tags, state, derive } = van
let { article, button, dialog, div, footer, form, header } = tags

let $tagListTemplate = document.getElementById("tag-list")
if (!($tagListTemplate instanceof HTMLTemplateElement)) throw new Error("Template not found")

let $tagList = $tagListTemplate.content
let tagList = Array.from($tagList.querySelectorAll("input")).map(x => x.value)

let showModal = state(false)
let filteredTags = state(
    localStorage.getItem("tags")?.split(",")
    ?? tagList
    ?? [])
let filterCount = state(filteredTags.val.length)

let $tagListLocation
let $dialog
let app = [
    button({
        class: "height-fit-content",
        onclick: _ => { showModal.val = true }
    }, () => `Tags (${filterCount.val})`),
    $dialog = dialog({
        onclose: _ => showModal.val = false
    },
        article(
            header(
                button({ form: "close-tag-filter", "aria-label": "Close", value: "cancel", rel: "prev" }),
                button({ onclick: toggleTags }, derive(() =>
                    filteredTags.val.length === 0 || filteredTags.rawVal.length < tagList.length
                        ? "Select All"
                        : "Uncheck All")
                )),
            form({
                id: "close-tag-filter",
                method: "dialog",
                onchange: _ =>
                    filteredTags.val =
                    Array.from($tagListLocation.querySelectorAll("input:checked"))
                        .map(x => x.value)
            }
                , $tagListLocation = div()
                , footer(button({ onclick: _ => (publish("tag-filter-close", filteredTags.val), filterCount.val = filteredTags.rawVal.length) }, "OK"))
            ))
    )
]

function toggleTags() {
    if (filteredTags.val.length === 0 || filteredTags.rawVal.length < tagList.length) {
        filteredTags.val = tagList
    }
    else {
        filteredTags.val = []
    }
    for (let $input of $tagListLocation.querySelectorAll("input")) {
        $input.checked = filteredTags.val.includes($input.value)
    }
}

derive(() => {
    if (showModal.val) {
        for (let $input of $tagListLocation.querySelectorAll("input")) {
            $input.checked = filteredTags.val.includes($input.value)
        }
        $dialog.showModal()
    }
})

derive(() => {
    localStorage.setItem("tags", filteredTags.val.join(","))
})

$tagListLocation.append($tagList)

document.getElementById("app")?.append(...app)
