# Koiboard V3 Extracted Logic

This project keeps the original `koiboard` project read-only and reuses its non-visual behavior as typed frontend logic.

## API Contract

- `GET /api/health`: connection check and latency sampling.
- `GET /api/config`: returns `{ config }` from Koipy runtime state.
- `PUT /api/config`: accepts `{ config }`, writes the draft to runtime memory, returns normalized `{ config }`.
- `POST /api/config/validate`: accepts `{ config }`, validates against Koipy config model.
- `POST /api/config/apply`: accepts `{ mode }`, where mode is `save`, `save_reload`, or `discard_reload`.
- `GET /api/config/export`: returns YAML text for preview/download.

Requests use `X-Access-Password` when a password is supplied. `apiBase` can be empty for same-origin deployment or absolute for cross-origin deployment.

## Extracted Modules

- `src/lib/api.ts`: API base normalization, request headers, response unwrapping, YAML export/download.
- `src/lib/configPath.ts`: YAMLPath tokenizing, `getAt`/`setAt`/`deleteAt`, path indexing, masking, summaries, field help lookup, risk detection.
- `src/lib/defaults.ts`: default rule/slave/script/command/color-stop factories and random speed/delay gradient generation.
- `src/data/metadata.ts`: section definitions, storage keys, sensitive/color patterns, field help, reserved script names, runtime field schema.
- `src/hooks/useKoipyConfig.ts`: draft lifecycle, health state, validation, save/apply flows, JSON/YAML editor state, local storage persistence.

## Frontend Rewrite Notes

- The old frontend's DOM string rendering was not copied. React components now consume typed logic and metadata.
- Animations use GSAP only for transform/opacity entrance and view transitions, with `prefers-reduced-motion` respected.
- The layout is responsive across sidebar, workspace, inspector, cards, forms, JSON/YAML editor, and toast feedback.
