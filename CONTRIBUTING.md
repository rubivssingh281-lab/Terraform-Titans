# Contributing & Team Workflow

EcholytiX is built by a 4-person team. Each member owns a set of "parts" (coherent
slices of the codebase). We use a **feature-branch + pull-request** workflow so that
`main` always builds and runs, and every merge is a reviewable unit of work.

## Ownership

| Member | Area | Parts |
|---|---|---|
| Member 1 | Frontend Core, Theme & Navigation | P1–P4, P16 |
| Member 2 | Blink, Morse & Speech | P5–P8, P19 |
| Member 3 | Sign Language, Gesture AI & Dashboard | P9–P11, P17, P18 |
| Member 4 | Backend, Realtime & DevOps | P12–P15, P20 |

Full file-level mapping lives in `DIVISION_OF_WORK.md`.

## Branch & PR flow

1. Sync `main`: `git checkout main && git pull`
2. Branch per part: `git checkout -b feature/p05-blink-to-morse`
3. Add **only your part's files**, commit with a clear message:
   ```bash
   git add src/components/BlinkToText.tsx
   git commit -m "feat(blink): add Blink-to-Morse detection module (P5)"
   ```
4. Push and open a PR into `main`: `git push -u origin feature/p05-blink-to-morse`
5. A teammate reviews; CI (type-check + build) must pass; then merge.

**Everyone commits their own parts from their own GitHub account** — that keeps the
history and authorship genuine.

## Keeping `main` runnable

Merge in dependency order so `main` compiles after every merge:

1. **Foundation first:** P1 (scaffold) → P4 (types/data) → P3 (theme) → P13 (db) → P12 (server) → model-data parts (P8, P11).
2. **Then feature modules** (P5, P6, P9, P16, P17, P18, P19, P14, ...) in any order. Each
   feature PR also adds the one line that wires it into `src/App.tsx` / navigation, so the
   app builds and runs after each merge.
3. **DevOps (P20)** can land any time — it doesn't affect the app build.

## Commit message convention

`type(scope): summary (Pxx)` — e.g. `feat(sign): geometric gesture classifier (P10)`.
Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`.

## Before you push

```bash
npm run lint     # type-check
npm run build    # ensure it still builds
```
