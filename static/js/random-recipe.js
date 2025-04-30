// @ts-check
import { subscribe } from "./messaging.js"
import { Details } from "./recipe-dropdown.js"
import van from "./van-1.5.3.js"

let { tags, state, derive } = van

let { a, article, button, content, details, dialog, div, form, fragment, header, p, summary } = tags

let recipes = []
let contentRefiltered = false

let pickedRecipes = state([])
let recipeIndex = state(-1)
let currentRecipe = state({ title: "Temp", href: "#" })
let showModal = state(false)
let totalRecipes = state(0)
let savedRecipes = state([])
let viewRecipes = state(false)

let $dialog
let $details
let $savedRecipes
let app = [
    button({
        class: "height-fit-content",
        onclick: _ => showModal.val = true
    }, "Pick Random"),
    $dialog = dialog({
        onclose: _ => showModal.val = false
    },

        form({ id: "close-random-recipe", method: "dialog" }),
        article(
            header(
                button({ form: "close-random-recipe", "aria-label": "Close", value: "cancel", rel: "prev" }),
                div({ class: "grid", hidden: () => viewRecipes.val },
                    button({ onclick: saveRecipe }, "Save Recipe"),
                    button({
                        onclick: () => viewRecipes.val = true,
                        hidden: () => savedRecipes.val.length === 0
                    }, () => `View Recipes (${savedRecipes.val.length})`)
                ),
                div({ hidden: () => !viewRecipes.val },
                    button({ onclick: () => viewRecipes.val = false }, "Back"),
                )
            ),
            () =>
                viewRecipes.val
                    ? $savedRecipes = div({ id: "saved-recipes", onclick: e => {
                        let details = e.target.parentElement
                        if (!(details instanceof HTMLDetailsElement)) return
                        for (let detail of $savedRecipes?.querySelectorAll("details") ?? []) {
                            if (detail !== details) detail.open = false
                        }
                    }}, ...savedRecipes.val.map((x, index) =>
                        div({ class: "flex space-between align-center" },
                            Details({ recipe: x }),
                            button({
                                onclick: () => {
                                    savedRecipes.val = savedRecipes.rawVal.filter((_, idx) => idx !== index)
                                    if (savedRecipes.rawVal.length === 0) viewRecipes.val = false
                                }
                            }, "X"),
                        ),
                    ))
                    : fragment(
                        p(() => `Recipe ${recipeIndex.val + 1} of ${totalRecipes.val}`),
                        $details = Details({ recipe: currentRecipe.val }),
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
                    )
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
        setCurrentRecipe(recipeIndex.val)
    } else if (recipeIndex.val < 0) {
        setCurrentRecipe(0)
    } else {
        setCurrentRecipe(recipeIndex.val)
    }
})

function pickRecipe() {
    let newRecipeIndex = Math.floor(Math.random() * recipes.length)
    let recipe = recipes[newRecipeIndex]
    recipes.splice(newRecipeIndex, 1)
    pickedRecipes.val.push(recipe)
}

function setCurrentRecipe(index) {
    let newRecipe = pickedRecipes.val[index]
    if (!newRecipe) return
    currentRecipe.val = newRecipe
}

function reset() {
    recipes =
        Array.from(document.querySelectorAll("ul#recipes > li:not(.hidden) > a") ?? [])
            .map(x => ({ title: x.textContent, href: x.getAttribute("href") ?? "" }))
    totalRecipes.val = recipes.length
    pickedRecipes.val = []
    recipeIndex.val = 0
}

function saveRecipe() {
    let recipe = pickedRecipes.rawVal[recipeIndex.rawVal]
    if (!recipe || savedRecipes.rawVal.find(x => recipeIndex.rawVal === x.index)) return
    savedRecipes.val = [...savedRecipes.rawVal, { ...recipe, index: recipeIndex.rawVal }]
}
