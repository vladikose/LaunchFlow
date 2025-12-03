# LaunchFlow Design Guidelines

## Design Approach

**Selected Approach:** Design System - Modern Productivity Aesthetic

Drawing inspiration from Linear, Asana, and Notion for information-dense productivity applications. Focus on clarity, hierarchy, and efficient workflows rather than visual flair.

**Core Principles:**
- Information clarity over decoration
- Consistent, predictable patterns
- Dense data presentation with breathing room
- Professional, trustworthy appearance

---

## Typography

**Font Stack:** Inter (primary), SF Pro (fallback)
- **Display/Headers:** 600 weight, 2xl-4xl sizes
- **Section Titles:** 600 weight, xl-2xl sizes  
- **Body Text:** 400 weight, base-lg sizes
- **Labels/Metadata:** 500 weight, sm size
- **Captions/Timestamps:** 400 weight, xs-sm sizes

**Hierarchy Example:**
- Page titles: text-3xl font-semibold
- Card headers: text-xl font-semibold
- Stage names: text-lg font-medium
- Body content: text-base
- Metadata (dates, authors): text-sm text-gray-600

---

## Layout & Spacing System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section margins: mb-8 to mb-12
- Card spacing: gap-4 to gap-6
- Tight spacing (badges, chips): gap-2

**Container Strategy:**
- App wrapper: max-w-7xl mx-auto
- Content areas: max-w-6xl
- Sidebar: fixed w-64
- Modals: max-w-2xl

**Grid Patterns:**
- Dashboard stats: grid-cols-3 gap-6
- Project cards: grid-cols-2 lg:grid-cols-3 gap-4
- Task lists: Single column with dividers

---

## Component Library

### Navigation
**Top Bar:** Fixed header with logo left, global search center, user menu/notifications right (h-16, px-6)

**Sidebar:** Fixed left navigation (w-64) with company logo, main nav items, expandable project list, settings at bottom

### Project Timeline (Core Component)
**Vertical Roadmap Display:**
- Left rail: Connecting line (2px, 8 unit margin)
- Stage cards: Full-width with left border indicator (4px)
- Card structure: Header (stage name + status dropdown), dates row, description, file attachments grid, comments section
- Spacing between stages: mb-6

### Stage Cards
**Card Anatomy:**
- Container: border rounded-lg p-6 hover:shadow-md transition
- Header: flex justify-between (stage name left, status dropdown right)
- Dates row: flex gap-4 (start date, deadline with edit icon)
- Content sections: Dividers between description, files, comments
- Action buttons: Right-aligned (Assign Task, Add Comment, Attach File)

### Data Tables
**Product Lists:**
- Striped rows for readability
- Editable cells with hover states
- Add/remove row buttons
- Headers: Sticky, font-semibold, border-bottom-2

### Forms & Inputs
**Text Fields:** border rounded px-4 py-2 focus:ring-2
**Dropdowns:** Same height as text fields, chevron icon right
**File Upload:** Dashed border dropzone + file list below
**Buttons:** Primary (solid), Secondary (outline), Tertiary (ghost)

### Modals & Overlays
**Modal Structure:**
- Backdrop: Dark overlay (bg-opacity-50)
- Container: Centered, rounded-lg, max-w-2xl
- Header: p-6 border-b (title left, close right)
- Body: p-6
- Footer: p-6 border-t (actions right-aligned)

### Status Indicators
**Status Badges:** px-3 py-1 rounded-full text-sm font-medium
**Overdue Highlight:** Light red background (bg-red-50), red border-left-4
**Progress Indicators:** Linear progress bars for stage completion

### Comments System
**Comment Thread:**
- Avatar (8x8) left, content right
- Author name + timestamp: text-sm
- Comment text: text-base
- Actions: Reply, Edit (text-sm links)
- @Mentions: Highlighted inline

### Notifications
**Toast Notifications:** Top-right corner, slide-in animation
**Email Badge:** Numeric indicator on bell icon
**Task Counter:** Badge on "My Tasks" nav item

---

## Key Layouts

### Dashboard (Admin)
Three-column stats grid at top (mb-8), followed by charts section (grid-cols-2), active projects list below

### Project List View
Header with filters/search (mb-6), grid of project cards with thumbnail, title, metadata, progress indicator

### Project Detail View
Breadcrumb navigation, project header (title, responsible, actions), tabbed interface (Timeline, Files, Settings), main content area with vertical stage timeline

### My Tasks View
Single-column list, grouped by project, sorted by deadline, each task showing project name, stage, assignment date, description

---

## Animation Strategy

**Minimal, Purposeful Only:**
- Hover states: Subtle shadow/border changes
- Modal entry: Fade-in (200ms)
- Dropdown menus: Slide-down (150ms)
- No scroll animations, no decorative motion

---

## Images

**Minimal Image Usage:**
- Company logos: Small, contained (32x32 to 48x48)
- User avatars: Circular (24x24 to 40x40)
- File preview thumbnails: Square (64x64)
- Product renders: Stage-specific, constrained width

**No Hero Images** - This is a utility application focused on data and workflows, not marketing content.

---

## Accessibility & Interaction

- All interactive elements: min-height 44px for touch targets
- Focus states: Clear ring-2 outline
- Form labels: Always visible, associated with inputs
- Error states: Red border + text message below field
- Loading states: Skeleton screens for data-heavy views