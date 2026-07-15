# VividCraft Brand Guide

**Brand:** VividCraft  
**Version:** v1.0  
**Date:** 15 July 2026  
**Status:** Confirmed Reference Document  
**Audience:** Designers, developers, marketers  
**Scope:** Web app · Marketing · Creator tools  

**Design references:** [WEBTOON](https://www.webtoons.com/) · [Tapas](https://tapas.io/menu/2/subtab/7) · [GlobalComix](https://globalcomix.com/)

**Token file:** `VividCraft-Brand-Tokens-v1.0.json`  
**Visual showcase:** `VividCraft-Brand-Showcase-v1.0.html`

---

## How to Use This Guide

| Role | Read first |
|------|------------|
| Designer | §2 Logo · §3 Colour · §5 UI Patterns · §6 Components |
| Developer | §3 · §4 · §7 CSS/Tailwind · JSON tokens |
| Writer | §8 Tone of Voice |

**Default theme:** Dark-first (immersive reader/marketplace like WEBTOON). Light mode supported for accessibility and print.

---

## 1. Our Brand

### 1.1 Who We Are

VividCraft is a digital marketplace for comics, illustration, and creative assets. Creators publish watermarked previews; fans browse, collect, and purchase. Built as a modern microservices platform with real-time order updates (SSE) and creator dashboards.

### 1.2 Positioning

| Dimension | VividCraft |
|-----------|------------|
| **Category** | Digital comic & art marketplace |
| **Audience** | Creators (publishers) · Fans (collectors/readers) |
| **Promise** | Discover vivid stories and art — own them instantly |
| **Feel** | Immersive dark UI · Teal energy · Premium catalog |
| **References** | WEBTOON (cards, trending) · Tapas (daily discovery) · GlobalComix (catalog browse) |

### 1.3 Personality

Vivid · Immersive · Creator-first · Trustworthy · Modern

---

## 2. Logo System

### 2.1 The Mark

- **V Mark** — angular stroke forming **V**, solid `#65DCD5` on `#321E48` tile
- **Wordmark** — **Vivid** in white · **Craft** in `#65DCD5`

| Configuration | Use |
|---------------|-----|
| Full (mark + wordmark) | Nav, login, marketing hero |
| Signature (mark only) | Favicon, app icon, compact spaces |

### 2.2 Background Rules

| Logo variant | Background |
|--------------|------------|
| Full on dark | `#1A1226`, `#321E48`, hero with scrim |
| Full on light | `#F4F8F7`, `#FFFFFF` — mark on violet tile, wordmark in violet |

**Clear space:** 1× mark height on all sides.  
**Minimum:** 120px full digital · 28px signature · favicon 32px on `#321E48`.

### 2.3 Misuse — Never

✗ Stretch, rotate, skew  
✗ Drop shadow on wordmark  
✗ Place on busy cover art without a solid dark scrim  
✗ Use `#65DCD5` as full logo background  
✗ Separate “Vivid” and “Craft” styling  

---

## 3. Colour System

### 3.1 Core Palette (confirmed)

| Name | Hex | Role |
|------|-----|------|
| **Violet Primary** | `#321E48` | Nav, primary buttons (light), headings, brand anchor |
| **Slate Secondary** | `#43637E` | Secondary UI, borders, metadata, inactive chips |
| **Teal Accent** | `#65DCD5` | CTA fills, links & active states **on dark**, badges, focus rings |
| **Mint Highlight** | `#D9FFF4` | Soft tints, hover washes, prices on dark covers |

**Proportions:** 50% neutral · 35% violet · 15% teal. The rich feel comes from **restraint** — violet anchors structure, teal appears sparingly, neutrals carry the layout.

> **No gradients.** Solid fills only. Depth comes from solid surfaces, borders, and shadows. Scrims over cover art use a solid semi-transparent panel (e.g. `rgba(23,19,31,0.6)`), not a gradient.

### 3.2 Accent for Light Backgrounds

Bright teal `#65DCD5` **fails contrast as text on light** (~1.9:1). For accent text/links on light backgrounds use:

| Name | Hex | Role |
|------|-----|------|
| **Teal Deep** | `#1E8E86` | Accent text & links on light mode (WCAG AA 4.6:1) |

Bright teal stays reserved for dark backgrounds and solid accent fills (buttons, chips, badges).

### 3.3 Extended Neutrals (refined, desaturated)

| Name | Hex | Use |
|------|-----|-----|
| Ink | `#17131F` | Dark page background |
| Surface | `#211B2C` | Cards, panels |
| Surface High | `#2A2236` | Modals, dropdowns, hover |
| Nav | `#2A1A3D` | Nav bar — always this violet in both themes |
| Mist | `#9A93A6` | Secondary text on dark |
| Slate Muted | `#6B7B85` | Secondary text on light |
| Off-White | `#F4F8F7` | Light mode page background |
| Border (light) | `#E4EDEB` | Light mode borders |
| White | `#FFFFFF` | Text on dark · light cards |

### 3.4 Functional Colours (UI only)

| State | Hex |
|-------|-----|
| Success / Paid | `#3DD68C` |
| Warning / Pending | `#F5B942` |
| Error / Failed | `#F07178` |
| Info | `#65DCD5` |

### 3.5 Genre / Product Type Chips

Inspired by Tapas & WEBTOON category pills.

| Type | Background | Text |
|------|------------|------|
| COMIC | `rgba(101,220,213,0.15)` | `#65DCD5` |
| ART | `rgba(217,255,244,0.12)` | `#D9FFF4` |
| ASSET | `rgba(245,185,66,0.12)` | `#F5B942` |
| Romance | `rgba(240,127,177,0.15)` | `#F07FB1` |
| Fantasy | `rgba(101,220,213,0.15)` | `#65DCD5` |
| Action | `rgba(245,185,66,0.15)` | `#F5B942` |

### 3.6 Accessibility

| Pair | Ratio | Result |
|------|-------|--------|
| `#FFFFFF` on `#321E48` | ~12:1 | ✅ All text |
| `#1E8E86` on `#F4F8F7` | ~4.6:1 | ✅ Accent text on light |
| `#65DCD5` on `#17131F` | ~8:1 | ✅ UI / large text on dark |
| `#9A93A6` on `#17131F` | ~5:1 | ✅ Captions 12px+ |
| `#65DCD5` on `#FFFFFF` | ~1.9:1 | ❌ Never — use Teal Deep |

---

## 4. Typography

### 4.1 Typefaces

| Role | Family | Weights |
|------|--------|---------|
| Display / Headings | **Sora** | 600, 700, 800 |
| Body / UI | **Plus Jakarta Sans** | 400, 500, 600, 700 |
| Price / Code | **JetBrains Mono** | 400, 500 |

```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 4.2 Scale

| Level | Size | Font | Use |
|-------|------|------|-----|
| Display | 48px | Sora 800 | Hero, marketing |
| H1 | 36px | Sora 700 | Page title |
| H2 | 28px | Sora 700 | Section (Trending, Daily) |
| H3 | 22px | Plus Jakarta 600 | Card title |
| Body | 16px | Plus Jakarta 400 | Descriptions |
| Label | 13px | Plus Jakarta 600 | Nav, chips |
| Caption | 12px | Plus Jakarta 500 | Views, dates |
| Price | 18px | JetBrains Mono 500 | Checkout, cards |

### 4.3 Colour (dark default)

| Element | Colour |
|---------|--------|
| Heading | `#FFFFFF` |
| Body | `#E8F4F2` |
| Secondary | `#8BA3AD` |
| Link / accent | `#65DCD5` |
| Link hover | `#D9FFF4` |

---

## 5. UI Patterns (Comic Marketplace)

Patterns distilled from [WEBTOON](https://www.webtoons.com/), [Tapas](https://tapas.io/menu/2/subtab/7), [GlobalComix](https://globalcomix.com/).

### 5.1 Product / Comic Card

- **Aspect ratio:** 3∶4 (vertical cover — industry standard)
- **Radius:** 12px cover · 16px container
- **Overlay:** Solid semi-transparent bottom scrim (`rgba(23,19,31,0.6)`) for title + price
- **Hover:** `translateY(-4px)` + teal glow shadow
- **Badges:** Rank `#1–#10` circle top-left · type chip top-right

### 5.2 Horizontal Carousels

- “Trending”, “New Releases”, “Daily” sections
- Snap scroll · 16px gap · peek next card 24px
- Section header: H2 + “View all →” link in `#65DCD5`

### 5.3 Genre Filter Bar

- Horizontal scroll chip row below search
- Pill radius 999px · padding 8px 16px
- Active: `#65DCD5` bg · `#1A1226` text
- Inactive: `rgba(67,99,126,0.3)` · `#D9FFF4` text

### 5.4 Hero / Featured Banner

- Min height 320px · full-bleed cover art
- Solid violet panel or dark scrim over art
- CTA: Primary teal button “Read now” / “Add to cart”

### 5.5 Creator Dashboard

- Lighter glass panels on `#251A35`
- Upload zone dashed `#43637E` border → solid `#65DCD5` on drag
- Success watermark preview in 3∶4 frame

### 5.6 Orders & Notifications

- Status badges use functional colours
- Live updates via SSE toast — teal left accent bar
- No polling UI spinners on orders list

---

## 6. Components

### 6.1 Buttons (dark mode default)

| Type | Background | Text |
|------|------------|------|
| Primary | `#65DCD5` | `#1A1226` |
| Secondary | transparent | `#D9FFF4` + border `rgba(101,220,213,0.35)` |
| Ghost | transparent | `#8BA3AD` |
| Violet | `#321E48` | `#FFFFFF` |

Radius 10px · Plus Jakarta 600 14px · padding 10px 22px

### 6.2 Cards (glass panel)

```css
.glass-panel {
  background: rgba(37, 26, 53, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(101, 220, 213, 0.12);
  border-radius: 16px;
}
```

### 6.3 Inputs

- Background `rgba(255,255,255,0.06)`
- Border `rgba(101,220,213,0.15)`
- Focus: border `#65DCD5` + ring `rgba(101,220,213,0.2)`
- Radius 12px

### 6.4 Navbar

- Height 64px · sticky top
- Background `rgba(26,18,38,0.85)` + blur 12px
- Border bottom `rgba(101,220,213,0.12)`
- Cart badge: `#65DCD5` circle · `#1A1226` count

---

## 7. Developer Implementation

### 7.1 CSS Variables

```css
/* Dark (default) — refined, desaturated */
:root, html[data-theme='dark'] {
  --vc-ink: #17131F;
  --vc-primary: #321E48;
  --vc-secondary: #43637E;
  --vc-accent: #65DCD5;
  --vc-highlight: #D9FFF4;
  --vc-surface: #211B2C;
  --vc-surface-hi: #2A2236;
  --vc-nav: #2A1A3D;
  --vc-text: #E9E7EE;
  --vc-text-muted: #9A93A6;
  --vc-border: rgba(255, 255, 255, 0.09);
  --vc-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
}

/* Light */
html[data-theme='light'] {
  --vc-page-bg: #F4F8F7;
  --vc-text: #1E1A24;
  --vc-text-heading: #321E48;
  --vc-text-muted: #6B7B85;
  --vc-accent: #1E8E86;   /* Teal Deep for legibility */
  --vc-card-bg: #FFFFFF;
  --vc-border: #E4EDEB;
  --vc-shadow: 0 2px 8px rgba(50, 30, 72, 0.06);
}
```

### 7.2 Tailwind Mapping

Update `apps/web-client/tailwind.config.js`:

```js
colors: {
  vivid: {
    50: '#D9FFF4',
    100: '#B8F5ED',
    200: '#8EEDE4',
    300: '#65DCD5',  // teal accent (dark)
    400: '#1E8E86',  // teal deep (light text)
    500: '#43637E',  // slate secondary
    600: '#321E48',  // violet primary
    700: '#2A1A3D',  // nav
    800: '#211B2C',  // surface
    900: '#17131F',  // ink
  },
  surface: {
    DEFAULT: '#17131F',
    card: '#211B2C',
    elevated: '#2A2236',
    border: 'rgba(255, 255, 255, 0.09)',
  },
}
```

### 7.3 Migration from current purple theme

Current app uses fuchsia `#c026d3` scale — replace with token palette above. Keep animation names (`fade-in`, `slide-up`, `shimmer`).

---

## 8. Tone of Voice

**Vivid** — energetic but not hype.  
**Clear** — fans understand what they buy; creators understand payouts.  
**Respectful** — artists own their work.

| Do | Don't |
|----|-------|
| “Discover comics and art from independent creators.” | “Revolutionary disruptive content platform.” |
| “Your order is paid. Download is ready.” | “OMG your purchase went through!!!” |
| “Publish a preview with VividCraft watermark protection.” | “Upload stuff to our ecosystem.” |

**Product terms:** listing · preview · watermark · checkout · creator · fan · digital goods

---

## 9. Imagery

### Approved
- Vertical comic covers (3∶4), high resolution
- Creator artwork with watermark visible on previews
- Dark UI screenshots showing real catalog

### Forbidden
- Blurry or stretched cover crops
- Removing watermark from marketing screenshots
- Stock photos unrelated to comics/art
- Competitor logos (WEBTOON, Tapas) in our materials

**Cover on card:** always a solid bottom scrim (`rgba(23,19,31,0.6)`) min 42% height.

---

## 10. File Naming

```
vividcraft-[type]-[variant].[ext]

Examples:
vividcraft-logo-full-dark.svg
vividcraft-logo-mark-teal.svg
vividcraft-app-icon-1024.png
```

Lowercase · hyphens only.

---

## 11. Consistency Checklist

| Check | Status |
|-------|--------|
| Core 4 colours locked | ✅ |
| Dark-first + light mode rules | ✅ |
| Comic card 3∶4 pattern | ✅ |
| WEBTOON/Tapas-inspired patterns documented | ✅ |
| JSON tokens for dev | ✅ |
| Tailwind mapping provided | ✅ |
| SSE / no-polling reflected in UX notes | ✅ |

---

*Questions: see `docs/README.md` or project maintainers.*
