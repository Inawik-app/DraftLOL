/** Fixed layout constants for /tiers — root width must never depend on content. */
export const TIERS_PAGE_WIDTH_PX = 1240;

export const SEARCH_RESULT_COLS = 6;
export const SEARCH_RESULT_ROWS = 2;
/** Chip row: 24px icon + 8px vertical padding + 2×1px border ≈ 38px */
export const SEARCH_CHIP_HEIGHT_PX = 38;
export const SEARCH_GRID_GAP_PX = 6;
export const SEARCH_RESULTS_HEIGHT_PX =
  SEARCH_RESULT_ROWS * SEARCH_CHIP_HEIGHT_PX +
  (SEARCH_RESULT_ROWS - 1) * SEARCH_GRID_GAP_PX;

export const TIER_COLUMN_WIDTH_PX = 396;
export const TIER_COLUMN_HEIGHT_PX = 480;
export const TIER_GRID_GAP_PX = 12;

export const ROLE_FILTER_BUTTON_WIDTH_PX = 48;
export const ROLE_FILTER_GAP_PX = 4;
export const ROLE_FILTER_BAR_WIDTH_PX =
  6 * ROLE_FILTER_BUTTON_WIDTH_PX + 5 * ROLE_FILTER_GAP_PX;

export const SEARCH_COLUMN_WIDTH_PX = Math.floor(
  (TIERS_PAGE_WIDTH_PX -
    28 -
    24 -
    (SEARCH_RESULT_COLS - 1) * SEARCH_GRID_GAP_PX) /
    SEARCH_RESULT_COLS,
);
