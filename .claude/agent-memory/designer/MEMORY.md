# Designer Memory -- JeffBoard

(Consolidated from former ui-consistency-reviewer and ux-design-strategist agents in JB-36)

## Project Overview
- **Stack:** React 18 + TypeScript + Tailwind CSS v4 + Zustand + Firebase Firestore
- **Design brief:** `D:/code/jeffboard/.claude/design-brief.md` (created 2026-02-09)
- **Prototype file:** `D:/code/jeffboard/prototype-token-dashboard.html`

## Design Patterns Discovered
- **Primary color:** Blue-600 (#2563EB) for CTAs, active states, focus rings
- **Card pattern:** White bg, rounded-lg, shadow-sm, border border-gray-200, hover:shadow-md
- **Navigation:** Top header with centered project selector; pages toggled via segmented control
- **Mobile:** PWA with scroll-snap columns; 2-col grids on small screens; horizontal scroll for tables
- **Icons:** Inline SVG, Heroicons outline style (24x24 viewBox, strokeWidth 2)
- **Font:** system-ui stack, no custom fonts
- **Animations:** animate-fade-in (0.3s ease-out, translateY 8px)

## Playwright MCP Notes
- Cannot use `file://` URLs -- must serve via HTTP
- Tailwind CDN works: `<script src="https://cdn.tailwindcss.com"></script>`
- The `tailwindcss.config` global variable from CDN may fail silently; Tailwind classes still apply
- Use `node -e "require('http')..."` for quick static file serving (more reliable than Python on Windows)
- Port used: 8770 (node HTTP server)
- `page.setContent()` not available (no `require` in evaluate context)
- Full page screenshots work well; for scrolled views, scroll the `<main>` element's scrollTop

## JeffBoard CLI Notes
- CLI: `node D:/code/jeffboard/cli/dist/index.js`
- Service account: `D:/code/jeffboard/cli/service-account.json`
- Image upload works with `--image` flag on `note` command
- Always ack notes before starting work

## JB-11 Token Dashboard Design Decisions
- **Navigation:** Board/Tokens segmented control in header (not sidebar, not tab bar)
- **Summary cards:** 4 KPI cards in grid (Total Tokens, Total Cost, Avg/Story, Sessions)
- **Cost by complexity:** 4-column breakdown with proportional progress bars
- **Bar chart:** Horizontal bars ranked by cost, story ID on left, cost inside bar, complexity on right
- **Filters:** Epic dropdown + Priority pills + Complexity pills, consistent with existing FilterBar pattern
- **Table:** Sortable columns (ID, Title, Size, Tokens, Cost, Sessions), epic badges, pagination
- **Empty state:** Reduced opacity row with "No data" for stories without tokenUsage
- **Responsive:** 2-col summary on mobile, horizontally scrollable table
