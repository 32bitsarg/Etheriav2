---
version: alpha
name: Etheria
description: A photography-first strategy game landing inspired by Apple's marketing canvas. Premium white space, Inter display type with tight tracking, single amber accent (#d97706), and edge-to-edge game imagery. UI chrome recedes so the game can speak.

colors:
  primary: "#d97706"
  primary-hover: "#b45309"
  primary-focus: "#f59e0b"
  on-primary: "#ffffff"
  ink: "#1c1917"
  ink-muted: "#57534e"
  ink-subtle: "#a8a29e"
  canvas: "#ffffff"
  canvas-parchment: "#fafaf9"
  surface: "#f5f5f4"
  hairline: "#e7e5e4"
  hairline-strong: "#d6d3d1"
  surface-dark: "#1c1917"
  on-dark: "#fafaf9"
  on-dark-muted: "#a8a29e"

typography:
  hero-display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.03em
  display-lg:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.10
    letterSpacing: -0.02em
  display-md:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -0.01em
  subhead:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  body-lg:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.60
    letterSpacing: 0
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.60
    letterSpacing: 0
  body-sm:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  caption:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: 0
  eyebrow:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.30
    letterSpacing: 0.05em
  button:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: 0
  button-sm:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: 0

rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 16px
  xl: 20px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 24px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 24px
    border: "1px solid {colors.hairline-strong}"
  button-on-dark:
    backgroundColor: "{colors.on-dark}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 24px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  card-base:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.hairline}"
  card-feature:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: 56px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    padding: 48px 24px
---

## Overview

Etheria's landing page is a **photography-first strategy game marketing canvas** inspired by Apple's approach. The game imagery leads, UI chrome recedes. A single amber accent (#d97706) carries every interactive element. Typography uses Inter with tight negative tracking at display sizes for a premium, confident feel.

**Key Characteristics:**
- Photography-first: game screenshots and hero imagery dominate
- Single amber accent (#d97706) for all CTAs and links
- Inter font with negative letter-spacing at display sizes
- Clean white canvas with subtle parchment (#fafaf9) for section rhythm
- Pill-shaped primary CTAs, rounded cards at 16px
- Generous whitespace — sections breathe with 80px vertical padding

## Colors

### Brand & Accent
- **Amber** ({colors.primary}): #d97706 — The single brand-level interactive color. All CTAs, links, focus signals.
- **Amber Hover** ({colors.primary-hover}): #b45309 — Pressed state.
- **Amber Light** ({colors.primary-focus}): #f59e0b — Focus ring.

### Surface
- **Pure White** ({colors.canvas}): #ffffff — Dominant canvas.
- **Parchment** ({colors.canvas-parchment}): #fafaf9 — Alternating section backgrounds.
- **Surface** ({colors.surface}): #f5f5f4 — Subtle cards and inputs.
- **Hairline** ({colors.hairline}): #e7e5e4 — 1px borders.
- **Hairline Strong** ({colors.hairline-strong}): #d6d3d1 — Input borders.

### Text
- **Ink** ({colors.ink}): #1c1917 — Headlines and body on light surfaces.
- **Ink Muted** ({colors.ink-muted}): #57534e — Secondary text.
- **Ink Subtle** ({colors.ink-subtle}): #a8a29e — Tertiary, captions.

## Typography

### Principles
- **Negative letter-spacing** at display sizes (-0.03em to -0.01em) for the signature "tight" feel.
- **Body at 16px**, not 14px. Extra breathing room.
- **Weight 700** for headlines, **600** for buttons, **400** for body.
- **Line-height 1.60** for body — editorial, readable.

## Layout

### Spacing
- Base unit: 4px
- Section vertical padding: 80px
- Card padding: 24px
- Button padding: 12px × 24px

### Grid
- Max content width: 1200px
- Card grids: 3-up desktop, 2-up tablet, 1-up mobile

## Shapes

- **Buttons**: {rounded.md} (10px) — clean rectangles, not pills
- **Cards**: {rounded.lg} (16px)
- **Badges/pills**: {rounded.full}

## Do's and Don'ts

### Do
- Use amber (#d97706) for every interactive element
- Set headlines in Inter 700 with negative letter-spacing
- Alternate white and parchment sections for rhythm
- Let game imagery dominate — UI recedes

### Don't
- Don't introduce a second accent color
- Don't add shadows to cards or buttons
- Don't use gradients as decorative backgrounds
- Don't set body copy below 16px
