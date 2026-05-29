/// <reference path="../pb_data/types.d.ts" />
//
// Recipes editor API (served to the browser via nginx at /api/recipes/*).
//
// Design: the markdown files in the Hugo repo are the source of truth.
// PocketBase only provides auth + these three routes. On save we write the
// file, commit it to the canonical repo on the Pi, and trigger a rebuild.
// All routes require a logged-in superuser.
//
// IMPORTANT: PocketBase runs each route handler in a separate pooled JSVM, so
// handlers CANNOT access variables or functions declared at file scope — only
// injected globals ($os, $apis, ...) survive. Everything a handler needs
// (config paths, the safeSlug helper) is therefore defined INSIDE the handler.
// Do not hoist these back to the top of the file; they will become undefined
// at request time.

// The recipe list comes from Hugo's generated /index.json (title, slug, tags,
// categories), so there is no list route here — only load and save.

// GET /api/recipes/{slug} -> raw markdown text
routerAdd("GET", "/api/recipes/{slug}", (e) => {
    const SRC = $os.getenv("RECIPES_SRC") || "/var/www/recipes.jnyman.com/src"
    const CONTENT = $os.getenv("RECIPES_CONTENT") || (SRC + "/content")

    const slug = e.request.pathValue("slug")
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
        throw new BadRequestError("Invalid recipe name.")
    }
    const text = toString($os.readFile(CONTENT + "/" + slug + ".md"))
    return e.string(200, text)
}, $apis.requireSuperuserAuth())

// POST /api/recipes/{slug}  body: {"content": "..."}
// Writes the file, commits it, and kicks off a (detached) rebuild.
routerAdd("POST", "/api/recipes/{slug}", (e) => {
    const SRC = $os.getenv("RECIPES_SRC") || "/var/www/recipes.jnyman.com/src"
    const CONTENT = $os.getenv("RECIPES_CONTENT") || (SRC + "/content")
    const REBUILD = $os.getenv("RECIPES_REBUILD") || (SRC + "/rebuild.sh")

    const slug = e.request.pathValue("slug")
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
        throw new BadRequestError("Invalid recipe name.")
    }
    const content = e.requestInfo().body.content
    if (typeof content !== "string") {
        throw new BadRequestError("Missing 'content' string.")
    }

    const file = CONTENT + "/" + slug + ".md"
    $os.writeFile(file, content, 0o644)

    // Commit to the canonical Pi repo. A no-op edit makes `git commit` exit
    // non-zero ("nothing to commit"); that throws here and we ignore it.
    // RECIPES_NO_COMMIT=1 skips committing (used by the local dev server).
    if (!$os.getenv("RECIPES_NO_COMMIT")) {
        let committed = false
        try {
            $os.cmd("git", "-C", SRC, "add", file).output()
            $os.cmd("git", "-C", SRC, "commit", "-m", "Edit " + slug + " via editor").output()
            committed = true
        } catch (_) { /* nothing to commit */ }

        // Push to GitHub so the edit is backed up off-Pi and the laptop can
        // pull it (publishing fast-forwards the Pi from GitHub). Best-effort:
        // a push failure (e.g. offline) must not fail the save or block the
        // rebuild, so it's caught and logged.
        if (committed) {
            try {
                $os.cmd("git", "-C", SRC, "push", "origin", "HEAD").output()
            } catch (err) {
                console.log("[recipes] git push failed: " + err)
            }
        }
    }

    // rebuild.sh detaches itself and returns immediately.
    $os.cmd(REBUILD).output()

    return e.json(200, { ok: true })
}, $apis.requireSuperuserAuth())

// DELETE /api/recipes/{slug}
// Removes the file, commits the deletion, and kicks off a (detached) rebuild.
routerAdd("DELETE", "/api/recipes/{slug}", (e) => {
    const SRC = $os.getenv("RECIPES_SRC") || "/var/www/recipes.jnyman.com/src"
    const CONTENT = $os.getenv("RECIPES_CONTENT") || (SRC + "/content")
    const REBUILD = $os.getenv("RECIPES_REBUILD") || (SRC + "/rebuild.sh")

    const slug = e.request.pathValue("slug")
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
        throw new BadRequestError("Invalid recipe name.")
    }

    const file = CONTENT + "/" + slug + ".md"
    // $os.remove throws if the file is missing; treat that as a 404-ish error.
    try {
        $os.remove(file)
    } catch (_) {
        throw new BadRequestError("Recipe not found.")
    }

    // Commit the deletion and push it, mirroring the save route.
    // RECIPES_NO_COMMIT=1 skips committing (used by the local dev server).
    if (!$os.getenv("RECIPES_NO_COMMIT")) {
        let committed = false
        try {
            $os.cmd("git", "-C", SRC, "add", file).output()
            $os.cmd("git", "-C", SRC, "commit", "-m", "Delete " + slug + " via editor").output()
            committed = true
        } catch (_) { /* nothing to commit */ }

        if (committed) {
            try {
                $os.cmd("git", "-C", SRC, "push", "origin", "HEAD").output()
            } catch (err) {
                console.log("[recipes] git push failed: " + err)
            }
        }
    }

    // rebuild.sh detaches itself and returns immediately.
    $os.cmd(REBUILD).output()

    return e.json(200, { ok: true })
}, $apis.requireSuperuserAuth())
