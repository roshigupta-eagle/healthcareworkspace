'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useKeyboardNav = useKeyboardNav;
/**
 * Layer 6 — Hook: useKeyboardNav
 *
 * Generic roving-tabindex keyboard navigation for list-like widgets
 * (menus, listboxes, option groups, toolbar buttons).
 *
 * Follows the WAI-ARIA 1.2 "Roving tabindex" pattern:
 *  - Only one element in the group has tabindex="0" at a time
 *  - Arrow keys move focus within the group
 *  - Home/End jump to first/last
 *  - Circular navigation is optional
 *
 * Usage:
 *   const { activeIndex, getItemProps } = useKeyboardNav({ count: items.length });
 *   items.map((item, i) => <button {...getItemProps(i)}>{item.label}</button>)
 */
const react_1 = require("react");
function useKeyboardNav({ count, orientation = 'vertical', circular = true, initialIndex = 0, onSelect, }) {
    const [activeIndex, setActiveIndex] = (0, react_1.useState)(initialIndex);
    const moveTo = (0, react_1.useCallback)((next) => {
        const bounded = circular
            ? ((next % count) + count) % count
            : Math.max(0, Math.min(count - 1, next));
        setActiveIndex(bounded);
    }, [count, circular]);
    const handleKeyDown = (0, react_1.useCallback)((e, index) => {
        const isVertical = orientation === 'vertical' || orientation === 'both';
        const isHorizontal = orientation === 'horizontal' || orientation === 'both';
        switch (e.key) {
            case 'ArrowDown':
                if (isVertical) {
                    e.preventDefault();
                    moveTo(index + 1);
                }
                break;
            case 'ArrowUp':
                if (isVertical) {
                    e.preventDefault();
                    moveTo(index - 1);
                }
                break;
            case 'ArrowRight':
                if (isHorizontal) {
                    e.preventDefault();
                    moveTo(index + 1);
                }
                break;
            case 'ArrowLeft':
                if (isHorizontal) {
                    e.preventDefault();
                    moveTo(index - 1);
                }
                break;
            case 'Home':
                e.preventDefault();
                setActiveIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setActiveIndex(count - 1);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                onSelect === null || onSelect === void 0 ? void 0 : onSelect(index);
                break;
        }
    }, 
    // onSelect intentionally in deps — callers must memoize it if referentially stable
    [moveTo, count, orientation, onSelect]);
    const getItemProps = (0, react_1.useCallback)((index) => ({
        tabIndex: index === activeIndex ? 0 : -1,
        'aria-selected': index === activeIndex,
        onKeyDown: (e) => handleKeyDown(e, index),
        onFocus: () => setActiveIndex(index),
    }), [activeIndex, handleKeyDown]);
    return { activeIndex, setActiveIndex, getItemProps };
}
