// @ts-check
import van from "./van-1.5.3.js"

let { tags, state } = van

let { content, details, summary } = tags
                        
/**
 * Auto loading recipe dropdown
 * @param {{ recipe: { title: string, href: string } }} param0 
 * @returns 
 */
export function Details({ recipe }) {
    let recipeDetails = state("<p>Loading...</p>")
    return details(
        summary({
            class: "pt-2 pb-2",
            onclick: e => {
                if (!e.target.parentElement.open) {
                    setRecipe(recipe.href)
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
 * @returns string
 */
async function setRecipe(url) {
    let text = await fetch(url).then(response => response.text())
    let parser = new DOMParser()
    let doc = parser.parseFromString(text, "text/html")
    let recipe = doc.querySelector("content")
    return `<p><a href="${url}">${location.href.slice(0, -1) + url}</a></p>${recipe?.innerHTML ?? "No recipe found"}`
}