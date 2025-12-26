// @ts-check
import van from "./van-1.5.3.js"

let { tags, state } = van

let { content, details, summary } = tags

/**
 * Auto loading recipe dropdown
 * @param {{ recipe: { title: string, href: string }, name: string | undefined, class: string | undefined }} param0
 * @returns
 */
export function Details({ recipe, name, class: classes }) {
    let recipeDetails = state("<p>Loading...</p>")
    return details({ class: classes },
        summary({
            role: "button",
            class: "ellipsis",
            name,
            onclick: e => {
                if (!e.target.parentElement.open) {
                    setRecipe(recipe.href, recipe.title)
                    .then(x => recipeDetails.val = x)
                }
            },
            onclose: () => recipeDetails.val = "<p>Loading...</p>"
        }, () => recipe.title),
        content({ innerHTML: () => recipeDetails.val })
    )
}

/**
 * Fetch recipe and return modified HTML
 * @param {string} url
 * @param {string | undefined} title
 * @returns string
 */
async function setRecipe(url, title) {
    let text = await fetch(url).then(response => response.text())
    let parser = new DOMParser()
    let doc = parser.parseFromString(text, "text/html")
    let recipe = doc.querySelector("content")
    return `<p><a href="${url}">${title ?? url}</a></p>${recipe?.innerHTML ?? "No recipe found"}`
}