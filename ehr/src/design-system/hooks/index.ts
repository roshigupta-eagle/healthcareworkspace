/**
 * Layer 6 — Interaction Hooks: Barrel Export
 */

export { useFocusTrap }    from './useFocusTrap';

export { useKeyboardNav }  from './useKeyboardNav';
export type { UseKeyboardNavOptions, UseKeyboardNavResult, Orientation } from './useKeyboardNav';

export { useAnnouncer }    from './useAnnouncer';
export type { UseAnnouncerResult } from './useAnnouncer';

export { useDebounce }     from './useDebounce';

export { useAsync }        from './useAsync';
export type { AsyncStatus, AsyncState, UseAsyncResult } from './useAsync';

export { useConfirmation } from './useConfirmation';
export type { UseConfirmationOptions, UseConfirmationResult } from './useConfirmation';
