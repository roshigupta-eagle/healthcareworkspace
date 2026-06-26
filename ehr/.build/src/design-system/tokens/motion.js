"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitions = exports.motionPresets = exports.easings = exports.durations = void 0;
/** Timing durations */
exports.durations = {
    instant: '0ms',
    fast: '100ms', // micro-interactions: button press, checkbox toggle
    normal: '200ms', // standard: hover, focus, open/close small elements
    slow: '300ms', // deliberate: panel slide, modal enter/exit
    slower: '500ms', // prominent: page transition, skeleton fade-in
};
/** Easing curves following Material Motion conventions */
exports.easings = {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)', // accelerate — exiting
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)', // decelerate — entering
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', // standard — state changes
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // gentle overshoot — feedback
};
/**
 * Semantic motion presets
 * Each preset pairs a duration with an easing for a specific UX intent.
 */
exports.motionPresets = {
    /** Button, badge, checkbox state change */
    microInteraction: {
        duration: exports.durations.fast,
        easing: exports.easings.easeInOut,
        css: `${exports.durations.fast} ${exports.easings.easeInOut}`,
    },
    /** Dropdown open, tooltip show, focus ring */
    elementEnter: {
        duration: exports.durations.normal,
        easing: exports.easings.easeOut,
        css: `${exports.durations.normal} ${exports.easings.easeOut}`,
    },
    /** Dropdown close, popover dismiss */
    elementExit: {
        duration: exports.durations.fast,
        easing: exports.easings.easeIn,
        css: `${exports.durations.fast} ${exports.easings.easeIn}`,
    },
    /** Modal/panel slide in */
    panelEnter: {
        duration: exports.durations.slow,
        easing: exports.easings.easeOut,
        css: `${exports.durations.slow} ${exports.easings.easeOut}`,
    },
    /** Modal/panel slide out */
    panelExit: {
        duration: exports.durations.normal,
        easing: exports.easings.easeIn,
        css: `${exports.durations.normal} ${exports.easings.easeIn}`,
    },
    /** Skeleton loaders, fade-in data */
    contentLoad: {
        duration: exports.durations.slower,
        easing: exports.easings.easeOut,
        css: `${exports.durations.slower} ${exports.easings.easeOut}`,
    },
    /** Positive feedback (save success, vitals normal flash) */
    positiveFeedback: {
        duration: exports.durations.normal,
        easing: exports.easings.spring,
        css: `${exports.durations.normal} ${exports.easings.spring}`,
    },
};
/** CSS transition shorthand helpers */
exports.transitions = {
    colors: `color ${exports.motionPresets.microInteraction.css}, background-color ${exports.motionPresets.microInteraction.css}, border-color ${exports.motionPresets.microInteraction.css}`,
    opacity: `opacity ${exports.motionPresets.elementEnter.css}`,
    shadow: `box-shadow ${exports.motionPresets.microInteraction.css}`,
    transform: `transform ${exports.motionPresets.elementEnter.css}`,
    all: `all ${exports.motionPresets.microInteraction.css}`,
};
