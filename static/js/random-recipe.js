// @ts-check
import { subscribe } from "./messaging.js"
import van from "./van-1.5.3.js"

let { tags, state, derive } = van

let { article, button, content, details, dialog, div, form, p, summary } = tags

let recipes = []
let contentRefiltered = false

let pickedRecipes = state([])
let recipeIndex = state(-1)
let currentRecipe = state({ title: "Temp", href: "#" })
let showModal = state(false)
let recipeDetails = state("<p>Loading...</p>")
let totalRecipes = state(0)

let $dialog
let $details
let app = [
    button({
        class: "height-fit-content",
        onclick: _ => showModal.val = true
    }, "Pick Random"),
    $dialog = dialog({
        onclose: _ => showModal.val = false
    },
        article(
            div({ class: "grid" },
                form({ method: "dialog" }, button("Close")),
                button({ onclick: reset }, "Reset")),
            p(() => `Recipe ${recipeIndex.val + 1} of ${totalRecipes.val}`),
            $details = details(
                summary({
                    class: "pt-2 pb-2",
                    onclick: e => {
                        if (!e.target.parentElement.open) {
                            getRecipe(currentRecipe.rawVal.href)
                        }
                    }
                }, () => currentRecipe.val.title),
                content({ innerHTML: () => recipeDetails.val })
            ),
            div({ class: "grid" },
                button({
                    onclick: () => {
                        recipeIndex.val > 0 ? recipeIndex.val -= 1 : null
                        $details.open = false
                    }
                }, "Previous"),
                button({
                    onclick: () => {
                        (recipeIndex.val < pickedRecipes.rawVal.length - 1 || recipes.length > 0)
                            && (recipeIndex.val += 1);
                        $details.open = false
                    }
                }, "Next")
            ),
        ))
]

document.getElementById("app")?.append(...app)

subscribe("filtered-content", () => {
    contentRefiltered = true
})

derive(() => {
    if (showModal.val) {
        $dialog.showModal()
        if (contentRefiltered || pickedRecipes.rawVal.length === 0) {
            contentRefiltered = false
            reset()
        }
    }
})

derive(() => {
    if (recipeIndex.val >= pickedRecipes.rawVal.length) {
        pickRecipe()
        recipeDetails.val = "<p>Loading...</p>"
        setCurrentRecipe(recipeIndex.val)
    } else if (recipeIndex.val < 0) {
        setCurrentRecipe(0)
    } else {
        setCurrentRecipe(recipeIndex.val)
        recipeDetails.val = "<p>Loading...</p>"
    }
})

async function getRecipe(url) {
    let text = await fetch(url).then(response => response.text())
    let parser = new DOMParser()
    let doc = parser.parseFromString(text, "text/html")
    let recipe = doc.querySelector("content")
    recipeDetails.val = recipe?.innerHTML ?? "No recipe found"
}

function pickRecipe() {
    let newRecipeIndex = Math.floor(Math.random() * recipes.length)
    let recipe = recipes[newRecipeIndex]
    recipes.splice(newRecipeIndex, 1)
    pickedRecipes.val.push(recipe)
}

function setCurrentRecipe(index) {
    let newRecipe = pickedRecipes.val[index]
    if (!newRecipe) {
        // Do nothing
    } else {
        currentRecipe.val = newRecipe
    }
}

function reset() {
    recipes =
        Array.from(document.querySelectorAll("li:not(.hidden) > a") ?? [])
            .map(x => ({ title: x.textContent, href: x.getAttribute("href") ?? "" }))
    totalRecipes.val = recipes.length
    pickedRecipes.val = []
    recipeIndex.val = 0
}
