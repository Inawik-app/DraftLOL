import { describe, expect, it } from "vitest";
import {
  CHAMPION_GRID_COLS,
  DRAFT_ANALYSIS_BAR_HEIGHT_PX,
  DRAFT_BOARD_WIDTH_PX,
  DRAFT_CENTER_COLUMN_WIDTH_PX,
  DRAFT_TEAM_COLUMN_WIDTH_PX,
  nextEmptySlot,
} from "./draftLayout";

describe("draftLayout", () => {
  it("three columns plus gaps equal board width", () => {
    expect(DRAFT_TEAM_COLUMN_WIDTH_PX * 2 + DRAFT_CENTER_COLUMN_WIDTH_PX + 14 * 2).toBe(
      DRAFT_BOARD_WIDTH_PX,
    );
  });

  it("nextEmptySlot scans bans then picks", () => {
    const picks = {
      blue: [null, null, null, null, null],
      red: [null, null, null, null, null],
    };
    const bans = {
      blue: ["Ahri", "", "", "", ""],
      red: ["", "", "", "", ""],
    };
    expect(nextEmptySlot("blue", picks, bans, null)).toEqual({
      team: "blue",
      kind: "ban",
      index: 1,
    });
  });

  it("grid uses six fixed columns", () => {
    expect(CHAMPION_GRID_COLS).toBe(6);
  });

  it("analysis bar has fixed height", () => {
    expect(DRAFT_ANALYSIS_BAR_HEIGHT_PX).toBe(200);
  });
});
