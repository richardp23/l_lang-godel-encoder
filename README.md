# L Lang ↔ Gödel Encoder/Decoder

A Vite + TypeScript frontend that runs Python encoding/decoding logic in the browser via Pyodide.
The UI loads and executes `backend/encoder.py` directly (without editing that file).

## Authors

- Richard Perez Jr. — UI/website implementation.
- Jacob Montufar — backend encoder functionality.

## Inspiration

- Inspired by Dr. Ronald Fechter's Theory of Computation class @ St. John's University.
- Based on the original [L interpreter](https://anthonyvallejo23.github.io/L-Theoretical-Programming-Language/) by Anthony Vallejo.

## App Features

- Single instruction encode (L instruction to exponent + A/B/C/D values)
- Program encode (line list to prime-power factor expression)
- Exponent decode (single/multi exponent to L instructions)
- Full decode from `x` (prime factoring path to decoded instructions)

## For Developers

### Technical Stack

- [Vite](https://vite.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [React](https://react.dev/)
- [Pyodide](https://pyodide.org/)
- [GitHub Pages](https://docs.github.com/en/pages)

### Architecture Breakdown

- **Frontend:** `src/App.tsx` provides the React UI (forms, validation, output rendering, runtime status).
- **Runtime:** Pyodide loads in-browser from CDN in `index.html`; encode/decode runs client-side with no server API.
- **Python core:** `backend/encoder.py` contains the original parsing/math logic and a CLI `main()` guarded by `if __name__ == "__main__":`.
- **Browser bridge:** `backend/pyodide_bridge.py` exposes UI-friendly operations and `__call_api(name, payload_json)` for JS interop.
- **Execution flow:** App loads raw `encoder.py` and `pyodide_bridge.py`, creates in-memory Python modules, imports `__call_api`, then calls bridge methods from UI handlers.
- **Formatting layer:** `src/resultFormat.ts` maps returned JSON payloads into readable output text per workflow.

### Local Development

```bash
pnpm install
pnpm dev
```

### Build

```bash
pnpm build
pnpm preview
```

### Testing

Run these from the repo root:

```bash
pnpm test
pnpm test:watch
pnpm test:backend
```

### Deployment (GitHub Pages)

- Vite `base` is configured for `/l_lang-godel-encoder/`.
- `.github/workflows/deploy.yml` builds and deploys `dist/` on pushes to `main`.
- In repo settings, set **Pages** source to **GitHub Actions**.
