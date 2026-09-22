# Your Parts — Member 1: Frontend Core, Theme & Navigation

This zip contains **only your files**, laid out in the same folders as the project so
they drop straight into the shared repo. Unzip on top of the cloned repo.

## Your parts (5)
- **P1 — Repo scaffold & build config:** `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `metadata.json`, `src/vite-env.d.ts`
- **P2 — App shell & entry:** `src/App.tsx`, `src/main.tsx`
- **P3 — Global theme & design tokens:** `src/index.css`
- **P4 — Shared types & seed data:** `src/types.ts`, `src/data.ts`
- **P16 — Navigation:** `src/components/Header.tsx`, `src/components/BottomNavBar.tsx`

> You own the **foundation** — commit P1 → P4 → P3 first so the app skeleton builds before
> the feature modules land.

## How to add your parts
```bash
git checkout main && git pull
git checkout -b feature/p01-scaffold
# copy your files in, then:
git add index.html package.json package-lock.json vite.config.ts tsconfig.json .gitignore metadata.json src/vite-env.d.ts
git commit -m "chore(scaffold): project scaffold & build config (P1)"
git push -u origin feature/p01-scaffold
# open a Pull Request into main
```
Repeat one branch/PR per part (P2, P3, P4, P16). Commit from **your own** GitHub account.

See `CONTRIBUTING.md` (in Member 4's parts) for the full workflow and merge order.
