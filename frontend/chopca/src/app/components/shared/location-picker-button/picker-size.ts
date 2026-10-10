/**
 * Display intent for a location picker surface.
 *
 * The pixel dimensions differ per device — the intent is constant.
 *  - `compact`     — a focused, modest surface (e.g. a quick tweak)
 *  - `comfortable` — the default; room to see the map and controls
 *  - `immersive`   — the map is the task; as much space as the device allows
 *
 * On phones every intent is full width; `immersive` is also full height.
 */
export type PickerSize = 'compact' | 'comfortable' | 'immersive';
