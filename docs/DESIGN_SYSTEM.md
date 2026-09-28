# Design System

## 1. Source of truth

Figma is the visual source of truth:

https://www.figma.com/design/u8UwhKxDdk5qvK4WezjJnQ/Cinema-Web-UI-Cinematic-Dark?node-id=3-2

Before implementing a screen:

1. Read the exact frame.
2. Retrieve its screenshot.
3. Inspect visible child nodes.
4. Record dimensions and tokens.
5. Compare with current implementation.
6. Resolve mismatches before declaring completion.

## 2. Principles

- Cinematic dark appearance
- Clear visual hierarchy
- Accessible contrast
- Consistent spacing
- Responsive layouts
- Predictable interaction states
- Reusable semantic tokens
- No hardcoded Figma values in component templates

## 3. Token hierarchy

### Primitive tokens

Raw reusable scales:

```text
--primitive-color-*
--primitive-space-*
--primitive-radius-*
--primitive-font-size-*
--primitive-line-height-*
```

### Semantic tokens

Meaning within the application:

```text
--color-background
--color-surface
--color-primary
--color-secondary
--color-accent
--color-text-primary
--color-text-secondary
--color-border
```

### Component tokens

Values owned by a component:

```text
--movie-card-width
--movie-card-height
--header-height
--sidebar-width
--button-height
--dialog-width
```

## 4. Initial color baseline

These values are provisional until verified against Figma:

```css
:root {
  --color-background: #090a0d;
  --color-surface: #15171c;
  --color-primary: #b91c35;
  --color-accent: #f4b942;
  --color-text-primary: #f5f2ed;
  --color-text-secondary: #9ca3af;
}
```

A Figma value takes precedence over this baseline.

## 5. Required variables

Variables must cover:

### Color

```text
background
surface
elevated surface
primary
secondary
accent
text
muted text
border
success
warning
error
focus
overlay
```

### Layout

```text
content width
page padding
header height
mobile navigation height
sidebar width
section spacing
grid gap
```

### Component dimensions

```text
button height
input height
poster width
poster height
card width
card height
dialog width
drawer width
icon size
avatar size
```

### Typography

```text
font family
font size
font weight
line height
letter spacing
```

### Effects

```text
border width
radius
shadow
opacity
transition duration
z-index
```

## 6. Hardcoding policy

Do not use:

```text
bg-[#...]
text-[#...]
w-[...px]
h-[...px]
max-w-[...px]
gap-[...px]
rounded-[...px]
text-[...px]
```

Use:

```text
bg-[var(--color-primary)]
text-[var(--color-text-primary)]
w-[var(--movie-card-width)]
min-h-[var(--movie-card-height)]
gap-[var(--movie-card-gap)]
```

Prefer semantic CSS classes when a Tailwind class list becomes difficult to understand.

## 7. Responsive policy

Breakpoints must be defined centrally.

CSS variables may change inside media queries, but they must not be used as media query conditions.

Valid approach:

```css
:root {
  --layout-page-padding: 1rem;
}

@media (min-width: 48rem) {
  :root {
    --layout-page-padding: 2rem;
  }
}
```

Breakpoint values must be documented in the Tailwind or responsive configuration.

## 8. UI primitives

Use Reka UI for behavior-heavy components.

Create project-specific wrappers under:

```text
src/shared/ui
```

Expected primitives:

- Button
- IconButton
- Input
- Textarea
- Select
- Checkbox
- RadioGroup
- Dialog
- Drawer
- DropdownMenu
- Tooltip
- Tabs
- Badge
- Skeleton
- EmptyState
- ErrorState
- Pagination

## 9. Movie card constraints

Movie cards must handle variable content without visual misalignment.

Required behavior:

- Consistent poster aspect ratio
- Consistent card height within a grid
- Title line clamp based on Figma
- Reserved title area
- Stable metadata layout
- Actions aligned consistently
- Missing image state
- Missing metadata state
- Keyboard-accessible interaction
- Visible focus state

Do not modify data to make cards align.

## 10. Accessibility

Every interactive component must support:

- Semantic element
- Keyboard navigation
- Visible focus
- Disabled state
- Accessible name
- Correct ARIA behavior
- Reduced-motion preference when animation exists
- Sufficient contrast
