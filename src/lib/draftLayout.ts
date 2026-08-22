/** Fixed layout constants for the draft board — dimensions never depend on content. */
export const DRAFT_BOARD_WIDTH_PX = 1240;

export const DRAFT_COLUMN_GAP_PX = 14;
export const DRAFT_TEAM_COLUMN_WIDTH_PX = 386;
export const DRAFT_CENTER_COLUMN_WIDTH_PX = 440;

export const CHAMPION_GRID_COLS = 6;
export const CHAMPION_GRID_GAP_PX = 4;
export const CHAMPION_GRID_PADDING_PX = 10;
export const CHAMPION_GRID_CELL_PX = Math.floor(
  (DRAFT_CENTER_COLUMN_WIDTH_PX -
    CHAMPION_GRID_PADDING_PX * 2 -
    (CHAMPION_GRID_COLS - 1) * CHAMPION_GRID_GAP_PX) /
    CHAMPION_GRID_COLS,
);

export const CHAMPION_GRID_SEARCH_HEIGHT_PX = 36;
export const CHAMPION_GRID_FILTERS_HEIGHT_PX = 28;
export const CHAMPION_GRID_SCROLL_HEIGHT_PX = 480;

export const ROLE_FILTER_BUTTON_WIDTH_PX = 48;
export const ROLE_FILTER_GAP_PX = 4;

export const DRAFT_ANALYSIS_BAR_HEIGHT_PX = 200;

export type SlotTarget = {
  team: "blue" | "red";
  kind: "pick" | "ban";
  index: number;
};

export function nextEmptySlot(
  team: SlotTarget["team"],
  picks: { blue: (unknown | null)[]; red: (unknown | null)[] },
  bans: { blue: string[]; red: string[] },
  after?: SlotTarget | null,
): SlotTarget | null {
  const order: SlotTarget[] = [];
  for (let i = 0; i < 5; i++) order.push({ team, kind: "ban", index: i });
  for (let i = 0; i < 5; i++) order.push({ team, kind: "pick", index: i });

  let start = 0;
  if (after && after.team === team) {
    const idx = order.findIndex(
      (s) => s.kind === after.kind && s.index === after.index,
    );
    if (idx >= 0) start = idx + 1;
  }

  for (let i = start; i < order.length; i++) {
    const s = order[i]!;
    if (s.kind === "ban" && !bans[team][s.index]) return s;
    if (s.kind === "pick" && !picks[team][s.index]) return s;
  }
  return null;
}

export function slotKey(slot: SlotTarget): string {
  return `${slot.team}-${slot.kind}-${slot.index}`;
}
