import type { Profile } from "@/lib/types";

export const PROFILES = {
  teamfight: {
    name: "Teamfight",
    targets: {
      frontline: 2,
      dps: 2,
      engage: 1,
      utility: 2,
      waveclear: 2,
      ap: 2,
      ad: 2,
    },
  },
  poke: {
    name: "Poke / Siège",
    targets: {
      poke: 3,
      waveclear: 3,
      disengage: 2,
      ap: 2,
      ad: 2,
      frontline: 1,
    },
  },
  dive: {
    name: "Dive / All-in",
    targets: {
      engage: 2,
      dive: 3,
      mobility: 3,
      burst: 2,
      frontline: 1,
      ad: 2,
    },
  },
  pick: {
    name: "Pick / Catch",
    targets: {
      pick: 3,
      burst: 3,
      mobility: 2,
      waveclear: 1,
      ap: 1,
      ad: 1,
    },
  },
  protect: {
    name: "Protect the carry",
    targets: {
      utility: 3,
      disengage: 3,
      dps: 2,
      scaling: 2,
      frontline: 1,
    },
  },
  split: {
    name: "Splitpush 1-3-1",
    targets: {
      splitpush: 2,
      waveclear: 3,
      disengage: 2,
      mobility: 2,
      scaling: 1,
    },
  },
  scaling: {
    name: "Scaling",
    targets: {
      scaling: 3,
      waveclear: 3,
      frontline: 2,
      disengage: 2,
      utility: 1,
    },
  },
} as const satisfies Record<string, Profile>;

export type ProfileKey = keyof typeof PROFILES;
