# Sajan Bhandari — Portfolio

A static portfolio hosted on GitHub Pages (custom domain in `CNAME`). No build step.

## Editing content

All text lives in [`content/site.json`](content/site.json). Edit it directly, or use the built-in CMS:

1. Open `/admin` on the live site.
2. Create a [fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new) for this repo with **Contents: Read and write**.
3. Sign in, edit, and press **Save & publish**. This commits to the repo and GitHub Pages redeploys in about a minute.

The token is kept only in your browser's local storage. Uploaded images go to `assets/uploads/`.

## Local preview

```
python -m http.server
```
