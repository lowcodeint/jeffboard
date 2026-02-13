# Design Brief -- JeffBoard

## Visual Identity
- **Primary color:** Blue-600 (`#2563EB`) -- used for CTAs, active states, links, focus rings
- **Secondary color:** Gray-500 (`#6B7280`) -- used for labels, metadata, inactive text
- **Accent colors:** Status-specific (Red-500 for P0/blocked, Orange-500 for P1, Yellow-500 for P2, Green-500 for done, Purple-50 for in-review)
- **Background (light):** Gray-50 (`#F9FAFB`) body, White (`#FFFFFF`) cards/surfaces
- **Background (dark):** Gray-950 (`#030712`) body, Gray-900 (`#111827`) cards/surfaces
- **Border color:** Gray-200 (`#E5E7EB`) light, Gray-700 (`#374151`) dark
- **Font family:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`
- **Border radius:** `rounded-lg` (8px) for cards/inputs, `rounded-2xl` (16px) for sheets/modals, `rounded-full` for avatars/badges

## Component Library
- **Framework:** React 18 + TypeScript
- **CSS:** Tailwind CSS v4 (imported via `@import 'tailwindcss'`)
- **UI components:** Custom (no external component library)
- **Icons:** Inline SVG (Heroicons style -- outline stroke, 24x24 viewBox, strokeWidth 2)
- **State management:** Zustand with persist middleware
- **Data:** Firebase Firestore with real-time onSnapshot listeners

## Layout Patterns
- **Page structure:** Full-height flex column: sticky header -> optional banners -> scrollable main content
- **Responsive approach:** Mobile-first PWA; horizontal scroll-snap for columns on mobile, same layout on desktop
- **Spacing scale:** Tailwind defaults (4px increments). Common patterns: `px-4 py-3` for containers, `p-4` for cards, `gap-2`/`gap-3` for flex items
- **Safe areas:** iOS safe-area-inset support via `env(safe-area-inset-top/bottom)`

## Design Conventions
- **Cards:** White bg, `rounded-lg`, `shadow-sm`, `border border-gray-200`, `border-l-4` for status accents, `hover:shadow-md active:scale-[0.98]` interaction, min 44px touch target
- **Forms:** Label as `text-xs font-medium text-gray-500 mb-1`, inputs with `rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500`
- **Buttons (primary):** `bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50`
- **Buttons (secondary):** `border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50`
- **Buttons (icon):** `p-1.5 text-gray-600 hover:text-gray-900 transition-colors`
- **Tables:** Not yet established -- define in JB-11 token dashboard design
- **Empty states:** Not yet established -- use centered text with muted color
- **Loading states:** Full-page `AppLoadingSpinner`, skeleton lists (`LoadingSkeleton`) for columns
- **Badges:** `rounded-full px-2 py-0.5 text-xs font-semibold` with semantic bg colors
- **Bottom sheets:** Fixed bottom, `rounded-t-2xl shadow-2xl max-h-[90vh]`, backdrop blur

## Animations
- `animate-fade-in`: 0.3s ease-out, translateY(8px) to 0
- `animate-slide-up`: 0.3s ease-out, translateY(100%) to 0 (toasts)
- `animate-slide-down`: 0.3s ease-out, translateY(-100%) to 0 (banners)
- All interactive transitions: `transition-colors` or `transition-all duration-200`

## Tone
- Clean, functional, and information-dense -- this is a developer/PM tool, not a consumer product
- Prioritize scannability and quick status recognition over decoration
- Use color semantically (green = done, red = blocked/critical, blue = active/primary)

## Agent Color System
Each AI agent has a distinct color for avatars and identification:
- product-manager: Yellow-400 (`#FACC15`)
- solution-architect: Orange-400 (`#FB923C`)
- lead-engineer: Cyan-400 (`#22D3EE`)
- security-reviewer: Red-400 (`#F87171`)
- designer: Blue-400 (`#60A5FA`)
- quality-inspector: Purple-400 (`#C084FC`)

## Do's and Don'ts
- **Do:** Follow the existing gray+blue palette. Use semantic colors consistently. Keep touch targets at 44px minimum. Support dark mode for every new component.
- **Do:** Use Tailwind utility classes. Use inline SVG for icons (Heroicons outline style).
- **Don't:** Introduce new third-party UI libraries. Use fixed pixel widths that break mobile. Add decorative elements that don't serve a functional purpose.
- **Don't:** Use color alone to convey meaning -- always pair with text/icons for accessibility.
