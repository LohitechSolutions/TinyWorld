# Tiny Worlds: Lost Dimensions

A self-contained 3D browser exploration game. Travel miniature floating islands, collect energy crystals, solve quiet environmental puzzles, and restore a lost universe.

Built with **React**, **Vite**, and **Three.js**. No backend, accounts, or API keys are required.

## Play

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

## Controls

### Desktop
- **W A S D** or arrow keys — move (relative to the camera)
- **Shift** — run
- **Space** — jump
- **E** — interact with switches, nodes, signs, and portals
- **Mouse drag** — look around
- **Esc** — pause

### Touch
- Left joystick — walk (push farther to run)
- Jump / E buttons — jump and interact
- Drag on the world — look around

## Worlds

1. **Verdant Isle** — open from the first session. Collect 3 crystals, wake the ruin switch to raise a bridge, align the plaza nodes, then activate the portal. A cottage plate opens a cave behind the waterfall.
2. **Crystal Caverns** — unlocks after restoring Verdant Isle. Gate switch, twin plates, and a heart-alignment sequence.
3. **Sky Temple** — unlocks after restoring the caverns. Stair mechanism, wing plates, sanctum order, and a final restoration.

Progress and settings are saved in `localStorage`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Typecheck and create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Playwright smoke test (dev server must be running) |
| `npm run lint` | Lint `src/` with oxlint |

## Deployment

The production build is a static site. Deploy the `dist` folder to Vercel, Netlify, or any static host.

```bash
npm run build
```

- **Vercel:** import the repo; the Vite preset works with `vercel.json`.
- **Netlify:** uses `netlify.toml` (`npm run build`, publish `dist`).

Asset paths are relative (`base: './'`), so the game also works from a subfolder.

## Architecture

- `src/game` — renderer, player, camera, collision, audio, world builder
- `src/worlds` — data-driven island definitions
- `src/screens` — menus, HUD overlays, pause and completion
- `src/services/saveService.ts` — versioned local save + settings
- `public/assets/images` — logo, key art, and world cards

The 3D worlds are generated procedurally from those definitions. Images support the menus; they are not a substitute for the playable scenes.

## Character and assets

The explorer is a local procedural mesh with an animation state machine (idle, walk, run, jump, fall, land, interact, pickup, respawn). No licensed rigged GLB was available in the repository, so the game does not depend on a remote model service.

Nunito and Fraunces are bundled locally under the SIL Open Font License (`public/assets/fonts`). No font CDN is required at runtime.

## Known limitations

- Character animation is procedural rather than a rigged imported model.
- Music and sound effects are synthesized in the browser (Web Audio), so they respect autoplay rules and start after the first interaction.
- Camera pull-in uses simplified tree and landmark blockers; very thin props can still clip occasionally.
- Physical-device mobile performance has not been measured.

## Visual upgrade notes

Menus, HUD, explorer silhouette, camera recovery, island underside, mixed tree types, water, landmarks, and quality settings were refined in place on the original engine. Gameplay rules and save format were not changed.
