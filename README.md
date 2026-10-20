# SMiloBo Portfolio

Personal portfolio and AI outfit color lab.

## Local development

```bash
pnpm install
pnpm dev
```

The development site runs at `http://127.0.0.1:5173/`.

## GitHub Pages

Pushes to `main` deploy the static site through the workflow in
`.github/workflows/deploy-pages.yml`.

GitHub Pages hosts the frontend only. To enable the online carrot assistant,
set the repository Actions variable `VITE_ADVISOR_ENDPOINT` to a deployed
`/api/carrot` URL. Without it, the frontend uses the built-in offline replies.
