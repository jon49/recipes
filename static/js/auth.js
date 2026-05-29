// @ts-check
// Renders the auth-aware button in the site header. The editor stores its
// PocketBase token in localStorage (same origin as these pages), so we can tell
// whether someone is logged in without a network call:
//   - Home page:   "Log in" (logged out) or "New recipe" (logged in)
//   - Recipe page: "Edit" (logged in only)
//   - Anywhere else / logged out recipe: nothing
// The mount point (#auth-actions) carries data-page and data-slug, set by
// layouts/partials/header.html.

/** Decode a JWT payload without verifying it (we only need the expiry). */
function decodeJwt(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function isLoggedIn() {
  const token = localStorage.getItem("pb_token")
  if (!token) return false
  const payload = decodeJwt(token)
  return !!payload && (!payload.exp || payload.exp * 1000 > Date.now())
}

const el = document.getElementById("auth-actions")
if (el) {
  const loggedIn = isLoggedIn()
  let link = null
  if (el.dataset.page === "home") {
    link = loggedIn
      ? { href: "/editor/?new=1", text: "New recipe" }
      : { href: "/editor/", text: "Log in" }
  } else if (el.dataset.page === "recipe" && loggedIn) {
    link = { href: "/editor/?slug=" + encodeURIComponent(el.dataset.slug || ""), text: "Edit" }
  }
  if (link) {
    const a = document.createElement("a")
    a.href = link.href
    a.textContent = link.text
    a.setAttribute("role", "button")
    a.className = "secondary auth-btn"
    el.appendChild(a)
  }
}
