# MARKET REQUIREMENTS DOCUMENT (MRD)
## Professional Scheduling & Calendar Interface - Cal.com Design System

**Document Version:** 2.0  
**Date:** July 10, 2026  
**Priority:** High  
**Status:** Approved for Development

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Vision
Create a world-class scheduling and calendar management interface that embodies cal.com's signature clean, professional aesthetic with exceptional usability, visual polish, and intuitive navigation.

### 1.2 Core Objectives
- **Professional Excellence:** Enterprise-grade UI matching cal.com's design standards
- **Calendar Superiority:** Best-in-class week/month calendar view with smooth navigation
- **Visual Clarity:** Clean, organized layout with perfect information hierarchy
- **User Efficiency:** Quick filtering, searching, and appointment management

---

## 2. DESIGN PHILOSOPHY (CAL.COM INSPIRED)

### 2.1 Core Principles
1. **Radical Simplicity** - Remove all unnecessary elements
2. **Monochrome Foundation** - Black, white, gray with strategic color accents
3. **Generous Whitespace** - Breathing room between all elements
4. **Subtle Depth** - Soft shadows, thin borders, layered cards
5. **Typography Excellence** - Cal Sans + Inter for professional clarity
6. **Consistent Rhythm** - 8px grid system throughout

### 2.2 Visual Identity
- **Neutral First:** 90% grayscale, 10% color accents
- **Professional Boldness:** Strong black headlines (#111111)
- **Soft Rounded Corners:** 8-12px radius standard
- **Thin Borders:** 1px hairline borders (#e5e7eb)
- **Subtle Shadows:** Multi-layer elevation system

---

## 3. VISUAL DESIGN SYSTEM

### 3.1 Color Palette

```css
/* Primary Brand Colors - Cal.com Style */
--primary-black: #111111;          /* Headlines, primary buttons */
--primary-white: #ffffff;          /* Backgrounds, cards */

/* Grayscale System */
--gray-50: #f9fafb;                /* Page background */
--gray-100: #f3f4f6;               /* Card backgrounds */
--gray-200: #e5e7eb;               /* Borders, dividers */
--gray-300: #d1d5db;               /* Hover borders */
--gray-400: #9ca3af;               /* Muted text */
--gray-500: #6b7280;               /* Secondary text */
--gray-600: #4b5563;               /* Body text */
--gray-700: #374151;               /* Primary text */
--gray-800: #1f2937;               /* Dark text */
--gray-900: #111827;               /* Headlines */

/* Accent Colors - Used Sparingly */
--accent-blue: #3b82f6;            /* Links, highlights */
--accent-emerald: #10b981;         /* Success, available */
--accent-amber: #f59e0b;           /* Pending, warning */
--accent-rose: #f43f5e;            /* Cancelled, error */
--accent-violet: #8b5cf6;          /* Proposed */

/* Status Colors - Pastel Variants */
--status-booked-bg: #d1fae5;
--status-booked-text: #065f46;
--status-pending-bg: #fef3c7;
--status-pending-text: #92400e;
--status-proposed-bg: #ede9fe;
--status-proposed-text: #6b21a8;
--status-arrived-bg: #dbeafe;
--status-arrived-text: #1e40af;
--status-fulfilled-bg: #d1fae5;
--status-fulfilled-text: #065f46;
--status-cancelled-bg: #fee2e2;
--status-cancelled-text: #991b1b;
```

### 3.2 Typography System

```css
/* Font Families */
--font-display: 'Cal Sans', 'Inter', system-ui, sans-serif;
--font-body: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Display Typography - Headlines */
--display-2xl: {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--gray-900);
}

--display-xl: {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--gray-900);
}

--display-lg: {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--gray-900);
}

--display-md: {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--gray-900);
}

/* Title Typography */
--title-lg: {
  font-family: var(--font-body);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--gray-900);
}

--title-md: {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--gray-900);
}

--title-sm: {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--gray-700);
}

/* Body Typography */
--body-lg: {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gray-700);
}

--body-md: {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gray-600);
}

--body-sm: {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gray-500);
}

/* Utility Typography */
--caption: {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray-500);
}

--label: {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--gray-600);
}
```

### 3.3 Spacing System

```css
/* 8px Grid System */
--space-0: 0px;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 28px;
--space-8: 32px;
--space-9: 36px;
--space-10: 40px;
--space-11: 44px;
--space-12: 48px;
--space-14: 56px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-28: 112px;
--space-32: 128px;

/* Section Spacing */
--section-padding: var(--space-24);
--card-padding: var(--space-6);
--content-padding: var(--space-8);
```

### 3.4 Border & Shadow System

```css
/* Border Radius */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 20px;
--radius-full: 9999px;

/* Borders */
--border-thin: 1px solid var(--gray-200);
--border-medium: 1px solid var(--gray-300);
--border-hover: 1px solid var(--gray-400);

/* Shadow System - Cal.com Style */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Card Shadow - Default */
--card-shadow: var(--shadow-sm);
--card-shadow-hover: var(--shadow-md);
```

---

## 4. COMPONENT SPECIFICATIONS

### 4.1 Page Header

```css
.page-header {
  margin-bottom: var(--space-8);
}

.page-title {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--gray-900);
  margin-bottom: var(--space-2);
}

.page-subtitle {
  font-size: 14px;
  line-height: 1.5;
  color: var(--gray-500);
  max-width: 600px;
}
```

### 4.2 Filter Bar

```css
.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  margin-bottom: var(--space-8);
  flex-wrap: wrap;
}

/* Search Input */
.search-input-wrapper {
  position: relative;
  min-width: 280px;
}

.search-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  padding-left: var(--space-10);
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--gray-700);
  background: var(--primary-white);
  border: var(--border-thin);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.search-input::placeholder {
  color: var(--gray-400);
}

.search-input:focus {
  outline: none;
  border-color: var(--gray-400);
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.05);
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
  width: 18px;
  height: 18px;
}

/* Dropdown Select */
.select-dropdown {
  padding: var(--space-3) var(--space-10) var(--space-3) var(--space-4);
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--gray-700);
  background: var(--primary-white);
  border: var(--border-thin);
  border-radius: var(--radius-md);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,...");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  transition: all 0.2s ease;
  min-width: 160px;
}

.select-dropdown:hover {
  border-color: var(--gray-300);
}

.select-dropdown:focus {
  outline: none;
  border-color: var(--gray-400);
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.05);
}
```

### 4.3 View Toggle Buttons

```css
.view-toggle-group {
  display: inline-flex;
  background: var(--gray-100);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  gap: var(--space-1);
}

.view-toggle-btn {
  padding: var(--space-2) var(--space-4);
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-600);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-toggle-btn:hover {
  color: var(--gray-900);
}

.view-toggle-btn.active {
  background: var(--primary-white);
  color: var(--gray-900);
  box-shadow: var(--shadow-xs);
}
```

### 4.4 Status Filter Pills

```css
.status-filters {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.status-pill.booked {
  background: var(--status-booked-bg);
  color: var(--status-booked-text);
}

.status-pill.pending {
  background: var(--status-pending-bg);
  color: var(--status-pending-text);
}

.status-pill.proposed {
  background: var(--status-proposed-bg);
  color: var(--status-proposed-text);
}

.status-pill.arrived {
  background: var(--status-arrived-bg);
  color: var(--status-arrived-text);
}

.status-pill.fulfilled {
  background: var(--status-fulfilled-bg);
  color: var(--status-fulfilled-text);
}

.status-pill.cancelled {
  background: var(--status-cancelled-bg);
  color: var(--status-cancelled-text);
}

.status-pill.active {
  border-color: currentColor;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
}

.status-pill:hover:not(.active) {
  opacity: 0.8;
}
```

### 4.5 Calendar Grid Container

```css
.calendar-container {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-4);
  margin-top: var(--space-6);
}

@media (max-width: 1024px) {
  .calendar-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .calendar-container {
    grid-template-columns: 1fr;
    overflow-x: auto;
    display: flex;
    flex-direction: column;
  }
}
```

### 4.6 Day Column Card

```css
.day-column {
  background: var(--primary-white);
  border: var(--border-thin);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  min-height: 480px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.day-column:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--gray-300);
}

.day-column.today {
  border-color: var(--gray-900);
  border-width: 2px;
}

.day-column-header {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-thin);
}

.day-name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-700);
  margin-bottom: var(--space-1);
}

.day-date {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  color: var(--gray-900);
  line-height: 1;
  letter-spacing: -0.02em;
}

.day-appointment-count {
  font-size: 13px;
  color: var(--gray-500);
  margin-top: var(--space-2);
  font-weight: 500;
}

.day-column.today .day-date {
  color: var(--accent-blue);
}
```

### 4.7 Empty State

```css
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8);
}

.empty-state-text {
  font-size: 14px;
  color: var(--gray-400);
  font-weight: 500;
  line-height: 1.5;
}

.empty-state-text span {
  display: block;
}
```

### 4.8 Appointment Card

```css
.appointment-card {
  background: var(--primary-white);
  border: var(--border-thin);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-left: 3px solid var(--accent-emerald);
}

.appointment-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--gray-300);
  transform: translateY(-2px);
}

.appointment-card:active {
  transform: translateY(0);
}

/* Status-specific left borders */
.appointment-card.status-booked {
  border-left-color: var(--accent-emerald);
}

.appointment-card.status-pending {
  border-left-color: var(--accent-amber);
}

.appointment-card.status-proposed {
  border-left-color: var(--accent-violet);
}

.appointment-card.status-arrived {
  border-left-color: var(--accent-blue);
}

.appointment-card.status-fulfilled {
  border-left-color: var(--accent-emerald);
}

.appointment-card.status-cancelled {
  border-left-color: var(--accent-rose);
  opacity: 0.7;
}

.appointment-patient-name {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: var(--space-2);
  line-height: 1.3;
}

.appointment-time {
  font-size: 13px;
  color: var(--gray-600);
  font-weight: 500;
  margin-bottom: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.appointment-time::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--gray-400);
}

.appointment-type {
  font-size: 13px;
  color: var(--gray-500);
  line-height: 1.4;
}

.appointment-status-badge {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  padding: var(--space-1) var(--space-2);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  border-radius: var(--radius-sm);
  background: var(--status-booked-bg);
  color: var(--status-booked-text);
}
```

### 4.9 Primary Action Button

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--primary-white);
  background: var(--primary-black);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.4;
}

.btn-primary:hover {
  background: var(--gray-800);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--gray-700);
  background: var(--primary-white);
  border: var(--border-thin);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.4;
}

.btn-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
}
```

---

## 5. CALENDAR-SPECIFIC REQUIREMENTS

### 5.1 Week View Specifications

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Page Header                                                  │
│ Title: "Scheduling"                                         │
│ Subtitle: "Calendar, booking, and slot management"          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Filter Bar (Sticky on scroll)                               │
│ [Search] [Providers▼] [Locations▼] [Today][Week][Month][All]│
│                                    [booked][pending][...]    │
└─────────────────────────────────────────────────────────────┘

┌────────┬────────┬────────┬────────┬────────┬────────┬───────
│  Sun   │  Mon   │  Tue   │  Wed   │  Thu   │  Fri   │  Sat  │
│   5    │   6    │   7    │   8    │   9    │  10    │  11   │
│ 0 appts│ 0 appts│ 0 appts│ 0 appts│ 2 appts│ 0 appts│ 0...  │
├────────┼────────┼────────┼────────┼────────┼────────┼───────┤
│        │        │        │        │        │        │       │
│ No     │ No     │ No     │ No     │ ┌──── │ No     │ No    │
│ appts  │ appts  │ appts  │ appts  ││John│ │ appts  │ appts │
│        │        │        │        ││Smit│ │        │       │
│        │        │        │        │────┘ │        │       │
│        │        │        │        │ ────┐│        │       │
│        │        │        │        ││Mary│ │        │       │
│        │        │        │        ││John│ │        │       │
│        │        │        │        │└────┘ │        │       │
│        │        │        │        │        │        │       │
────────┴────────┴────────┴────────┴────────┴────────┴───────┘
```

**Requirements:**
- 7-column grid for desktop week view
- Equal column widths
- Minimum day column height: 480px
- Smooth horizontal scroll on mobile
- Today indicator (bold border, colored date)
- Appointment count in header
- Click-to-expand day details

### 5.2 Month View Specifications

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Month Header                                                 │
│ [< Previous] [July 2026] [Next >]                           │
└─────────────────────────────────────────────────────────────┘

┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  29 │  30 │   1 │   2 │   3 │   4 │   5 │
│  0  │  0  │  2  │  1  │  0  │  3  │  0  │
├─────┼──────────┼─────┼──────────┼─────┤
│  6  │  7  │  8  │  9  │ 10  │ 11  │ 12  │
│  1  │  0  │  2  │  0  │  1  │  0  │  2  │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

**Requirements:**
- 7-column grid
- Day cells with appointment count dots
- Click day to expand week view
- Current month days highlighted
- Previous/next month days muted
- Smooth month transitions

### 5.3 Day View Specifications

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Day Header                                                   │
│ Thursday, July 9, 2026                      [<] [Today] [>] │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Timeline View (30-min intervals)                            │
│                                                              │
│  8:00 AM                                                     │
│  ─────────────────────────────────────────────────────────  │
│  8:30 AM                                                     │
│  ─────────────────────────────────────────────────────────  │
│  9:00 AM                                                     │
│  ────────────────────────────────────────────────────────  │
│  9:30 AM ────────────────────────────────────┐             │
│          │ John Smith                         │             │
│          │ 11:00 AM - Consultation            │             │
│          └────────────────────────────────────┘             │
│ 10:00 AM                                                     │
│  ─────────────────────────────────────────────────────────  │
│ 10:30 AM ┌────────────────────────────────────┐             │
│          │ Mary Johnson                       │             │
│          │ 11:00 AM - Follow-up               │             │
│          └────────────────────────────────────┘             │
│ 11:00 AM                                                     │
└─────────────────────────────────────────────────────────────┘
```

**Requirements:**
- 30-minute time slots
- Current time indicator (red line)
- Drag-and-drop appointment rescheduling
- Click empty slot to create appointment
- Smooth scrolling to current time
- Business hours highlighted (8 AM - 6 PM)

### 5.4 Calendar Navigation

```css
.calendar-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.calendar-nav-buttons {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.nav-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-white);
  border: var(--border-thin);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--gray-600);
}

.nav-button:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
  color: var(--gray-900);
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.calendar-period-label {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--gray-900);
  min-width: 200px;
  text-align: center;
}

.today-button {
  padding: var(--space-2) var(--space-4);
  font-size: 14px;
  font-weight: 600;
  background: var(--primary-white);
  border: var(--border-thin);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.today-button:hover {
  background: var(--gray-50);
}
```

### 5.5 Time Slot Indicators

```css
.time-slot {
  display: flex;
  min-height: 60px;
  border-bottom: 1px solid var(--gray-100);
  position: relative;
}

.time-label {
  width: 80px;
  padding: var(--space-2);
  font-size: 13px;
  color: var(--gray-500);
  font-weight: 500;
  flex-shrink: 0;
}

.time-slot-content {
  flex: 1;
  padding: var(--space-2);
  position: relative;
}

.current-time-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-rose);
  z-index: 10;
  pointer-events: none;
}

.current-time-indicator::before {
  content: "";
  position: absolute;
  left: -6px;
  top: -4px;
  width: 8px;
  height: 8px;
  background: var(--accent-rose);
  border-radius: 50%;
}

.business-hours {
  background: var(--gray-50);
}

.non-business-hours {
  background: var(--primary-white);
  opacity: 0.5;
}
```

### 5.6 Appointment Drag & Drop

```css
.appointment-card.dragging {
  opacity: 0.8;
  cursor: grabbing;
  box-shadow: var(--shadow-xl);
  transform: scale(1.02);
  z-index: 100;
}

.appointment-card.drag-over {
  border-color: var(--accent-blue);
  border-style: dashed;
  background: rgba(59, 130, 246, 0.05);
}

.drop-zone {
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
  color: var(--gray-500);
  font-size: 14px;
  margin: var(--space-2) 0;
  transition: all 0.2s ease;
}

.drop-zone.active {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.05);
  color: var(--accent-blue);
}
```

### 5.7 Quick Actions Menu

```css
.quick-actions {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: none;
  gap: var(--space-1);
}

.appointment-card:hover .quick-actions {
  display: flex;
}

.quick-action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-white);
  border: var(--border-thin);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--gray-600);
  padding: 0;
}

.quick-action-btn:hover {
  background: var(--gray-50);
  color: var(--gray-900);
}

.quick-action-btn.edit:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.quick-action-btn.delete:hover {
  border-color: var(--accent-rose);
  color: var(--accent-rose);
}
```

---

## 6. INTERACTION DESIGN

### 6.1 Hover States

```css
/* All Interactive Elements */
.btn-primary:hover,
.btn-secondary:hover,
.appointment-card:hover,
.day-column:hover,
.select-dropdown:hover,
.nav-button:hover {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Card Lift Effect */
.appointment-card:hover,
.day-column:hover {
  transform: translateY(-2px);
}

/* Button Press Effect */
.btn-primary:active,
.btn-secondary:active,
.nav-button:active {
  transform: translateY(0);
}
```

### 6.2 Focus States

```css
/* Keyboard Navigation Focus */
*:focus-visible {
  outline: 2px solid var(--gray-900);
  outline-offset: 2px;
}

.search-input:focus-visible,
.select-dropdown:focus-visible,
.btn-primary:focus-visible,
.btn-secondary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.1);
}
```

### 6.3 Loading States

```css
/* Skeleton Loader */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-100) 25%,
    var(--gray-200) 50%,
    var(--gray-100) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--gray-200);
  border-top-color: var(--gray-900);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### 6.4 Transitions & Animations

```css
/* Page Transitions */
.page-transition {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Calendar View Switch */
.calendar-view-switch {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Appointment Card Entry */
.appointment-card-enter {
  animation: cardEntry 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes cardEntry {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Smooth Scroll */
.calendar-container {
  scroll-behavior: smooth;
}
```

### 6.5 Tooltips

```css
.tooltip {
  position: absolute;
  padding: var(--space-2) var(--space-3);
  background: var(--gray-900);
  color: var(--primary-white);
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-md);
  white-space: nowrap;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
}

.tooltip.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(-4px);
}

.tooltip::after {
  content: "";
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid var(--gray-900);
}
```

---

## 7. LAYOUT & ORGANIZATION

### 7.1 Page Structure

```css
.page-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
}

.page-header-section {
  margin-bottom: var(--space-8);
}

.filter-section {
  position: sticky;
  top: 0;
  background: var(--primary-white);
  z-index: 100;
  padding: var(--space-4) 0;
  border-bottom: var(--border-thin);
  margin-bottom: var(--space-6);
}

.calendar-section {
  position: relative;
}

/* Responsive Breakpoints */
@media (max-width: 1280px) {
  .page-wrapper {
    max-width: 100%;
    padding: var(--space-6) var(--space-4);
  }
}

@media (max-width: 768px) {
  .page-wrapper {
    padding: var(--space-4) var(--space-3);
  }
  
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input-wrapper {
    min-width: 100%;
  }
  
  .status-filters {
    overflow-x: auto;
    margin-left: 0;
    padding-bottom: var(--space-2);
  }
}
```

### 7.2 Grid System

```css
/* Main Calendar Grid */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-4);
}

/* Responsive Grid */
@media (max-width: 1024px) {
  .calendar-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .calendar-grid {
    grid-template-columns: 1fr;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
}

/* Consistent Spacing */
.section-spacing {
  margin-bottom: var(--space-8);
}

.card-spacing {
  margin-bottom: var(--space-4);
}

.inline-spacing {
  margin-right: var(--space-3);
}
```

### 7.3 Information Hierarchy

**Priority Levels:**
1. **Primary:** Patient name, appointment time, day/date
2. **Secondary:** Appointment type, status badge, location
3. **Tertiary:** Notes, provider name, additional details

**Visual Weight:**
- Headlines: 600 weight, larger size, black color
- Body: 400 weight, medium size, gray-600
- Meta: 500 weight, small size, gray-500

---

## 8. QUALITY STANDARDS

### 8.1 Visual Quality Checklist

- [ ] All elements aligned to 4px grid
- [ ] Consistent border-radius (8px standard, 12px for cards)
- [ ] No visual inconsistencies or misalignments
- [ ] Crisp 1px borders using #e5e7eb
- [ ] Proper text contrast ratios (4.5:1 minimum)
- [ ] Consistent spacing throughout
- [ ] Smooth, professional animations
- [ ] Pixel-perfect implementation

### 8.2 Performance Requirements

**Loading Performance:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.0s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

**Calendar Performance:**
- Week view render: < 500ms
- Month view render: < 300ms
- Day view render: < 200ms
- Appointment drag: 60fps smooth
- View transitions: < 300ms

### 8.3 Accessibility Requirements

**WCAG 2.1 AA Compliance:**
- Color contrast ratio: 4.5:1 minimum
- Keyboard navigation: Full support
- Focus indicators: Visible on all interactive elements
- Screen reader support: ARIA labels, semantic HTML
- Touch targets: Minimum 44x44px

**Keyboard Shortcuts:**
- `←` `→` : Navigate between days/weeks
- `T` : Jump to today
- `W` : Switch to week view
- `M` : Switch to month view
- `D` : Switch to day view
- `N` : Create new appointment
- `Esc` : Close modals/dropdowns

### 8.4 Cross-Browser Compatibility

**Supported Browsers:**
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

**Testing Requirements:**
- Visual consistency across all browsers
- Feature detection for modern APIs
- Graceful degradation for older browsers
- Touch and mouse interaction support

---

## 9. IMPLEMENTATION GUIDELINES

### 9.1 Component Architecture

**Modular Structure:**
```
components/
├── calendar/
│   ├── CalendarContainer.tsx
│   ├── DayColumn.tsx
│   ├── AppointmentCard.tsx
│   ├── TimeSlot.tsx
│   ├── CalendarNavigation.tsx
│   ── ViewToggle.tsx
├── filters/
│   ├── SearchInput.tsx
│   ├── SelectDropdown.tsx
│   ── StatusPills.tsx
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   └── Card.tsx
── layout/
    ├── PageHeader.tsx
    ├── FilterBar.tsx
    └── CalendarGrid.tsx
```

### 9.2 State Management

**Calendar State:**
```typescript
interface CalendarState {
  currentDate: Date;
  viewMode: 'day' | 'week' | 'month' | 'all';
  selectedProviders: string[];
  selectedLocations: string[];
  statusFilters: AppointmentStatus[];
  searchQuery: string;
  selectedAppointment: Appointment | null;
  dragState: DragState | null;
}
```

### 9.3 Data Structure

**Appointment Model:**
```typescript
interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  providerName: string;
  providerId: string;
  location: string;
  startTime: DateTime;
  endTime: DateTime;
  type: string;
  status: 'booked' | 'pending' | 'proposed' | 'arrived' | 'fulfilled' | 'cancelled';
  notes?: string;
  color?: string;
}
```

### 9.4 API Integration

**Required Endpoints:**
- `GET /api/appointments?start=&end=&provider=&location=`
- `GET /api/providers`
- `GET /api/locations`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `DELETE /api/appointments/:id`
- `PATCH /api/appointments/:id/reschedule`

---

## 10. SUCCESS METRICS

### 10.1 Quality Metrics

- **Visual Consistency Score:** 98%+ adherence to design system
- **Performance Score:** 95+ on Lighthouse
- **Accessibility Score:** 100% WCAG 2.1 AA
- **Cross-Browser Compatibility:** 100% feature parity

### 10.2 User Experience Metrics

- **Task Completion Rate:** > 98% for booking flow
- **Time to Book Appointment:** < 45 seconds average
- **User Satisfaction:** > 4.7/5 in usability testing
- **Error Rate:** < 0.5% for calendar interactions
- **Navigation Efficiency:** < 3 clicks to any appointment

### 10.3 Technical Metrics

- **Bundle Size:** < 300KB initial load
- **API Response Time:** < 200ms p95
- **Calendar Render Time:** < 500ms for week view
- **Memory Usage:** < 50MB for calendar data
- **Uptime:** 99.9% availability

---

## 11. TESTING REQUIREMENTS

### 11.1 Visual Testing

- [ ] Pixel-perfect comparison with design mockups
- [ ] Cross-browser visual regression testing
- [ ] Responsive design testing (mobile, tablet, desktop)
- [ ] Dark mode compatibility (if applicable)
- [ ] High DPI display testing

### 11.2 Functional Testing

- [ ] Week view displays 7 days correctly
- [ ] Month view shows correct dates
- [ ] Day view shows 24-hour timeline
- [ ] Appointment drag-and-drop works smoothly
- [ ] Filters apply correctly
- [ ] Search functionality returns accurate results
- [ ] View transitions are smooth
- [ ] Keyboard navigation works throughout

### 11.3 Performance Testing

- [ ] Load time under 3 seconds
- [ ] Smooth 60fps animations
- [ ] No layout shift during loading
- [ ] Efficient re-rendering on updates
- [ ] Memory leak testing

### 11.4 Accessibility Testing

- [ ] Screen reader compatibility (VoiceOver, NVDA, JAWS)
- [ ] Keyboard-only navigation
- [ ] Focus management
- [ ] ARIA labels and roles
- [ ] Color contrast verification
- [ ] Touch target sizes

---

## 12. REFERENCES & INSPIRATION

### 12.1 Design Resources

- **Cal.com Design System:** https://design.cal.com/
- **Cal.com GitHub:** https://github.com/calcom/cal.com
- **Tailwind CSS:** https://tailwindcss.com/
- **Radix UI:** https://www.radix-ui.com/

### 12.2 Tools & Libraries

**Recommended Stack:**
- **Framework:** React 18+ / Next.js 14+
- **Styling:** Tailwind CSS
- **Components:** Radix UI, Headless UI
- **Date Handling:** date-fns or Day.js
- **Calendar Logic:** react-calendar or custom
- **State Management:** Zustand or Redux Toolkit
- **Drag & Drop:** @dnd-kit/core
- **Animations:** Framer Motion
- **Testing:** Jest, React Testing Library, Cypress

---

## 13. APPROVAL & SIGN-OFF

**Document Prepared By:** Product Design Team  
**Date:** July 10, 2026  
**Version:** 2.0  
**Status:** Approved for Development

**Stakeholder Approvals:**
- [ ] Product Manager
- [ ] Design Lead
- [ ] Engineering Lead
- [ ] UX Research Lead

---

## APPENDIX A: QUICK REFERENCE CHEATSHEET

### Color Quick Reference
```
Primary: #111111 (Black)
Canvas: #ffffff (White)
Surface: #f3f4f6 (Gray-100)
Border: #e5e7eb (Gray-200)
Text Primary: #111827 (Gray-900)
Text Secondary: #6b7280 (Gray-500)
```

### Spacing Quick Reference
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
section: 96px
```

### Typography Quick Reference
```
Display: Cal Sans, 600, -0.02em tracking
Body: Inter, 400
Buttons: 14px, 600 weight
Headlines: 32px-48px, 600 weight
```

### Border Radius Quick Reference
```
sm: 4px
md: 8px (standard)
lg: 12px (cards)
xl: 16px
full: 9999px (pills)
```

### Shadow Quick Reference
```
sm: 0 1px 3px rgba(0,0,0,0.1)
md: 0 4px 6px rgba(0,0,0,0.1)
lg: 0 10px 15px rgba(0,0,0,0.1)
```

---

**END OF DOCUMENT**

---

## IMPLEMENTATION NOTES FOR AI MODEL

When implementing this design:

1. **Start with the Design System:** Set up all CSS variables/tokens first
2. **Build Components Bottom-Up:** Start with buttons, inputs, then cards, then calendar
3. **Focus on Whitespace:** Cal.com's secret is generous padding and margins
4. **Typography is Key:** Use Cal Sans for headlines, Inter for body
5. **Monochrome First:** Build in grayscale, add color accents last
6. **Test Responsiveness Early:** Mobile-first approach
7. **Performance Matters:** Lazy load calendar data, virtualize long lists
8. **Accessibility First:** Semantic HTML, ARIA labels, keyboard navigation
9. **Smooth Animations:** Use CSS transforms, not width/height
10. **Polish Details:** Hover states, focus rings, loading states

**Key Cal.com Patterns to Replicate:**
- Black primary buttons (#111111)
- Thin hairline borders (#e5e7eb)
- Soft rounded corners (8-12px)
- Generous whitespace (32px+ padding)
- Subtle shadows (multi-layer)
- Clean typography (negative letter-spacing)
- Pastel status badges (never bright colors)
- Consistent 8px grid system

This MRD provides everything needed to create a professional, cal.com-inspired scheduling interface that is polished, organized, and easy to navigate.
