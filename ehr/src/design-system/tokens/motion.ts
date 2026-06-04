/**
 * Layer 1 — Foundation: Motion Design Tokens
 *
 * All transitions and animations must respect `prefers-reduced-motion`.
 * The `reducedMotion` guard in globals.css overrides durations to 0.01ms
 * system-wide — these values are only applied in full-motion environments.
 *
 * Clinical principle: motion should be subtle and purposeful.
 * Avoid decorative animations that delay information retrieval.
 */

/** Timing durations */
export const durations = {
  instant: '0ms',
  fast:    '100ms',   // micro-interactions: button press, checkbox toggle
  normal:  '200ms',   // standard: hover, focus, open/close small elements
  slow:    '300ms',   // deliberate: panel slide, modal enter/exit
  slower:  '500ms',   // prominent: page transition, skeleton fade-in
} as const;

/** Easing curves following Material Motion conventions */
export const easings = {
  linear:   'linear',
  easeIn:   'cubic-bezier(0.4, 0, 1, 1)',       // accelerate — exiting
  easeOut:  'cubic-bezier(0, 0, 0.2, 1)',        // decelerate — entering
  easeInOut:'cubic-bezier(0.4, 0, 0.2, 1)',      // standard — state changes
  spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)', // gentle overshoot — feedback
} as const;

/**
 * Semantic motion presets
 * Each preset pairs a duration with an easing for a specific UX intent.
 */
export const motionPresets = {
  /** Button, badge, checkbox state change */
  microInteraction: {
    duration: durations.fast,
    easing:   easings.easeInOut,
    css:      `${durations.fast} ${easings.easeInOut}`,
  },
  /** Dropdown open, tooltip show, focus ring */
  elementEnter: {
    duration: durations.normal,
    easing:   easings.easeOut,
    css:      `${durations.normal} ${easings.easeOut}`,
  },
  /** Dropdown close, popover dismiss */
  elementExit: {
    duration: durations.fast,
    easing:   easings.easeIn,
    css:      `${durations.fast} ${easings.easeIn}`,
  },
  /** Modal/panel slide in */
  panelEnter: {
    duration: durations.slow,
    easing:   easings.easeOut,
    css:      `${durations.slow} ${easings.easeOut}`,
  },
  /** Modal/panel slide out */
  panelExit: {
    duration: durations.normal,
    easing:   easings.easeIn,
    css:      `${durations.normal} ${easings.easeIn}`,
  },
  /** Skeleton loaders, fade-in data */
  contentLoad: {
    duration: durations.slower,
    easing:   easings.easeOut,
    css:      `${durations.slower} ${easings.easeOut}`,
  },
  /** Positive feedback (save success, vitals normal flash) */
  positiveFeedback: {
    duration: durations.normal,
    easing:   easings.spring,
    css:      `${durations.normal} ${easings.spring}`,
  },
} as const;

/** CSS transition shorthand helpers */
export const transitions = {
  colors:    `color ${motionPresets.microInteraction.css}, background-color ${motionPresets.microInteraction.css}, border-color ${motionPresets.microInteraction.css}`,
  opacity:   `opacity ${motionPresets.elementEnter.css}`,
  shadow:    `box-shadow ${motionPresets.microInteraction.css}`,
  transform: `transform ${motionPresets.elementEnter.css}`,
  all:       `all ${motionPresets.microInteraction.css}`,
} as const;

export type DurationKey    = keyof typeof durations;
export type EasingKey      = keyof typeof easings;
export type MotionPreset   = keyof typeof motionPresets;
