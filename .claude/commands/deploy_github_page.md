Deploy this project to GitHub Pages. Follow these steps carefully and in order.

## Arguments

Optional: `$ARGUMENTS` — GitHub repository name (e.g. `my-repo`). If not provided, derive it from the project directory name or `package.json` name field.

## Step 1 — Gather info

1. Read `package.json` to get the project name.
2. Run `git remote -v` to check if a remote origin already exists and extract the repo name/owner if so.
3. Run `gh auth status` to confirm the GitHub CLI is authenticated. If it fails, tell the user to run `gh auth login` and stop.
4. If no remote exists, determine the target repo name:
   - Use `$ARGUMENTS` if provided.
   - Otherwise use the sanitized `name` field from `package.json` (lowercase, spaces → hyphens).
5. Run `gh api user --jq '.login'` to get the authenticated GitHub username.

## Step 2 — Initialize git (if needed)

If the current directory is not a git repository (no `.git` folder):
```bash
git init
git add .
git commit -m "Initial commit"
```

## Step 3 — Create or connect the GitHub repository

If no remote origin exists:
1. Run `gh repo create <repo-name> --public --source=. --remote=origin --push` to create the repo and push the main branch.
   - If that command fails because the repo already exists, instead run:
     ```bash
     gh repo set-default <username>/<repo-name>
     git remote add origin https://github.com/<username>/<repo-name>.git
     git push -u origin main
     ```
2. Confirm the remote is set: `git remote -v`.

If a remote origin already exists, just note the repo URL and continue.

## Step 4 — Install gh-pages

Check if `gh-pages` is already in `devDependencies` in `package.json`. If not:
```bash
npm install --save-dev gh-pages
```

## Step 5 — Configure vite.config.ts for GitHub Pages

GitHub Pages serves the site under `https://<username>.github.io/<repo-name>/`, so Vite's `base` must be set to `/<repo-name>/`.

Read `vite.config.ts` and check if `base` is already set inside `defineConfig({...})`.

- If `base` is missing or set to `'/'`, update the config to add `base: '/<repo-name>/'` inside `defineConfig`.
- Do not remove any existing aliases or settings.

Example change (add `base` right after the opening brace of `defineConfig({`):
```ts
export default defineConfig({
  base: '/<repo-name>/',
  plugins: [react()],
  // ...rest unchanged
});
```

## Step 6 — Add deploy script to package.json

Read `package.json` and check the `scripts` section. Add (or update) a `deploy` script if it is not already correct:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d build"
```

## Step 7 — Commit config changes

Stage and commit any changes made to `vite.config.ts` and `package.json`:
```bash
git add vite.config.ts package.json package-lock.json
git commit -m "Configure Vite base path and gh-pages deploy script for GitHub Pages"
git push
```
If there is nothing to commit, skip this step.

## Step 8 — Build and deploy

```bash
npm run deploy
```

This runs the `predeploy` (build) then pushes the `build/` output to the `gh-pages` branch on GitHub.

## Step 9 — Enable GitHub Pages (if needed)

Run the following to set the Pages source to the `gh-pages` branch:
```bash
gh api -X PUT repos/<username>/<repo-name>/pages \
  --field source[branch]=gh-pages \
  --field source[path]=/ \
  --silent || true
```
(GitHub may have already auto-detected the branch; the `|| true` prevents failure if Pages was already configured.)

## Step 10 — Report the result

Print a clear summary:
- The GitHub repository URL: `https://github.com/<username>/<repo-name>`
- The live GitHub Pages URL: `https://<username>.github.io/<repo-name>/`
- Note that Pages can take **1–3 minutes** to go live after the first deploy.
- If any step failed, explain what went wrong and what the user should do next.
