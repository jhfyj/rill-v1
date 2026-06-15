# Rill Design System

The foundational tokens and components for the Rill site. Tokens live in
[`src/index.css`](src/index.css) inside Tailwind v4's `@theme {}` block, so each one generates a
real utility class (no `tailwind.config.js`).

## Typography

System font stacks with graceful fallbacks. Only Figtree is loaded as a web font
(Google Fonts, in [`index.html`](index.html)). Palatino renders natively on Windows, Optima on
macOS; both fall back elsewhere.

| Role    | Utility         | Stack                                                                |
| ------- | --------------- | -------------------------------------------------------------------- |
| Titles  | `font-title`    | `"Palatino Linotype", "Book Antiqua", Palatino, serif`               |
| Headers | `font-heading`  | `Optima, "Optima nova", Candara, "Gill Sans", "Segoe UI", sans-serif`|
| Body    | `font-body`     | `Figtree, ui-sans-serif, system-ui, -apple-system, sans-serif`       |

## Color

**Brand navy** — `brand-50 … brand-900`. `brand-700` (`#1d3a5c`) is the primary action base.

| Token             | Hex       | Usage                          |
| ----------------- | --------- | ------------------------------ |
| `brand-50`        | `#eef2f7` | tint / hover backgrounds       |
| `brand-100`       | `#d6e0ea` | active backgrounds, hero wash  |
| `brand-700`       | `#1d3a5c` | primary button, logo, links    |
| `brand-800/900`   | `#172d47` / `#101f33` | hover / active, headings |

**Neutrals** — `surface` (`#f4f2ee`, cream navbar fill), `surface-muted` (`#e9e6df`),
`ink` (`#1a2233`, body text), `ink-muted` (`#5b6473`, secondary text).

## Radius & elevation

- `rounded-pill` → `9999px` (the navbar bar, buttons)
- `shadow-glass` → soft drop shadow + inner top highlight for glassmorphic surfaces

## Glass surface recipe

```
bg-surface/70 backdrop-blur-md border border-white/50 shadow-glass
```

## Button — [`src/components/Button.tsx`](src/components/Button.tsx)

`<Button variant size>` — extends native `<button>` attributes.

| Variant     | Appearance                  | States                                  |
| ----------- | --------------------------- | --------------------------------------- |
| `primary`   | Filled navy, white text     | hover `brand-800`, active `brand-900`   |
| `secondary` | Outlined navy               | hover `brand-50`, active `brand-100`    |
| `tertiary`  | Text-only navy              | hover `brand-50`, active `brand-100`    |

Sizes: `sm` (h-9), `md` (h-10, default), `lg` (h-11). All variants share a focus-visible ring
(`brand-400`) and disabled styling.

```tsx
<Button variant="primary">Sign Up</Button>
<Button variant="secondary" size="lg">Learn more</Button>
<Button variant="tertiary">Sign in</Button>
```
