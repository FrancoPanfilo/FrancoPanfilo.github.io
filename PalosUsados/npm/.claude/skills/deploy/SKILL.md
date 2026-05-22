---
name: deploy
description: Build the Palos Usados SPA and verify it's ready to deploy to Vercel
disable-model-invocation: true
---

Run `npm run build` in the `C:\Users\Usuario-PC\OneDrive\Escritorio\OneDrive\FrancoPanfilo.github.io\PalosUsados\npm` directory.

- If the build **succeeds**: confirm that the output is ready and remind the user to push to the Vercel-connected branch (or deploy via `vercel --prod` if the CLI is available).
- If the build **fails**: show the full error, identify the likely cause, and stop — do not attempt fixes unless explicitly asked.

Do not modify any files. Do not commit anything. Build only.
