# L Lang ↔ Gödel Encoder/Decoder

A Vite + TypeScript frontend that runs Python encoding/decoding logic in the browser via Pyodide.
The UI loads and executes `backend/encoder.py` directly (without editing that file).

## Local Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm preview
```

## GitHub Pages Deployment

- Vite `base` is configured for this repository path: `/l_lang-godel-encoder/`.
- A GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys `dist/` on pushes to `main`.
- In repo settings, set **Pages** source to **GitHub Actions**.

## App Features

- Single instruction encode (L instruction to exponent + A/B/C/D values)
- Program encode (line list to prime-power factor expression)
- Exponent decode (single/multi exponent to L instructions)
- Full decode from `x` (prime factoring path to decoded instructions)
