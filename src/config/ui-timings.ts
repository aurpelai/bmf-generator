// Delay before the auto-save toast appears (suppresses flicker on quick edits).
export const AUTO_SAVE_TOAST_DELAY_MS = 800;

// How long any transient toast (auto-save, "Copied", etc.) stays on screen.
export const TOAST_DURATION_MS = 2000;

// Debounce for re-packing the atlas preview after the selection changes.
export const ATLAS_REPACK_DEBOUNCE_MS = 800;

// Delay before resetting a dialog's internal state once it closes (waits for the
// close animation so users don't see fields flicker mid-fade-out).
export const DIALOG_RESET_DELAY_MS = 200;
