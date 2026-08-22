"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { PROFILES, type ProfileKey } from "@/data/profiles";
import {
  emptyRoleProfiles,
  type OpggRegion,
  type RoleProfile,
} from "@/lib/opggLink";
import {
  clearOpponentProfiles,
  loadAllyProfiles,
  loadOpggRegion,
  loadOpponentProfiles,
  saveAllyProfiles,
  saveOpggRegion,
  saveOpponentProfiles,
} from "@/lib/playerLocalStorage";
import {
  archiveCurrentGame,
  buildSeriesExport,
  computeLockedChampions,
  endSeriesState,
  lockedChampionsByGame,
  parseSeriesImport,
  startSeries,
  type GameResult,
  type LockScope,
  type SeriesState,
  EMPTY_SERIES,
} from "@/lib/series";
import {
  clearLastTerminatedSeries,
  loadLastTerminatedSeries,
  saveLastTerminatedSeries,
} from "@/lib/seriesStorage";
import {
  getChampionById,
  getDraftMap,
  isRoomConnected,
  isRoomPersistenceReady,
  readSharedDraft,
  readSharedPlayers,
  hasSharedDraftKeys,
  subscribeChampionCatalog,
  subscribeDraftMap,
  subscribePlayersMap,
  subscribeRoomStatus,
  writeSharedDraft,
  writeSharedPlayer,
  type SharedDraftPayload,
  type SharedPlayerEntry,
} from "@/lib/room";
import { orderedChampionIdsFromTierLists } from "@/lib/championGridOrder";
import { playerTiersToTierLists, tierListsToPlayerTiers } from "@/lib/tierList";
import { decodeTierSeed, encodeTierSeed } from "@/lib/tierSeed";
import type { Champion, Player, TierLabel } from "@/lib/types";

export type TeamId = "blue" | "red";

export const ROLE_LABELS = ["TOP", "JGL", "MID", "ADC", "SUP"] as const;

type TeamChampions = (Champion | null)[];
type TeamBans = string[];
type TeamPickIds = { blue: string[]; red: string[] };

const LOCAL_ORIGIN = "local";
const emptyPickIds = (): TeamPickIds => ({
  blue: ["", "", "", "", ""],
  red: ["", "", "", "", ""],
});
const emptyBanIds = (): TeamBans => ["", "", "", "", ""];

function resolvePickIds(ids: string[]): TeamChampions {
  return ids.map((id) => {
    if (!id) return null;
    return getChampionById(id) ?? null;
  });
}

function entryFromPlayer(player: Player): SharedPlayerEntry {
  return {
    name: player.name,
    tierSeed: encodeTierSeed(
      playerTiersToTierLists(player.tiers as Record<string, TierLabel>),
    ),
  };
}

function playerFromSharedEntry(entry: SharedPlayerEntry): Omit<Player, "opgg"> {
  const decoded = decodeTierSeed(entry.tierSeed);
  const tiers = decoded.ok ? tierListsToPlayerTiers(decoded.lists) : {};
  const tierPoolOrder = decoded.ok
    ? orderedChampionIdsFromTierLists(decoded.lists)
    : [];
  return {
    name: entry.name,
    tiers,
    tierPoolOrder,
  };
}

function playersFromAllyProfiles(profiles: RoleProfile[]): Player[] {
  return profiles.map((p) => ({
    name: p.name,
    opgg: p.opgg,
    tiers: {},
    tierPoolOrder: [],
  }));
}

export function emptyPlayers(): Player[] {
  return playersFromAllyProfiles(loadAllyProfiles());
}

function isProfileKey(value: string): value is ProfileKey {
  return Object.prototype.hasOwnProperty.call(PROFILES, value);
}

function sharedPayload(
  profileKey: ProfileKey,
  pickIds: TeamPickIds,
  bans: { blue: TeamBans; red: TeamBans },
  series: SeriesState,
): SharedDraftPayload {
  return { profileKey, picks: pickIds, bans, series };
}

export function useDraft(initialProfile: ProfileKey = "teamfight") {
  const [pickIds, setPickIds] = useState(emptyPickIds);
  const [bans, setBans] = useState({
    blue: emptyBanIds(),
    red: emptyBanIds(),
  });
  const [profileKey, setProfileKey] = useState<ProfileKey>(initialProfile);
  const [series, setSeries] = useState<SeriesState>({ ...EMPTY_SERIES });
  const [lastTerminatedSeries, setLastTerminatedSeries] =
    useState<SeriesState | null>(null);
  const [players, setPlayers] = useState<Player[]>(emptyPlayers);
  const [opponents, setOpponents] = useState<RoleProfile[]>(() =>
    loadOpponentProfiles(),
  );
  const [opggRegion, setOpggRegionState] = useState<OpggRegion>(() =>
    loadOpggRegion(),
  );
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [roomLive, setRoomLive] = useState(false);
  const playersRef = useRef(players);
  playersRef.current = players;
  const seriesRef = useRef(series);
  seriesRef.current = series;
  const profileKeyRef = useRef(profileKey);
  profileKeyRef.current = profileKey;

  const picks = useMemo(
    () => ({
      blue: resolvePickIds(pickIds.blue),
      red: resolvePickIds(pickIds.red),
    }),
    [pickIds, catalogVersion],
  );

  const locked = useMemo(() => computeLockedChampions(series), [series]);
  const lockedByGame = useMemo(
    () => lockedChampionsByGame(series),
    [series],
  );

  useEffect(() => subscribeChampionCatalog(() => setCatalogVersion((v) => v + 1)), []);

  useEffect(
    () =>
      subscribeRoomStatus(() => {
        setRoomLive(isRoomConnected());
      }),
    [],
  );

  useEffect(() => {
    setLastTerminatedSeries(loadLastTerminatedSeries());
  }, []);

  const persistAllyProfiles = useCallback((next: Player[]) => {
    saveAllyProfiles(next.map((p) => ({ name: p.name, opgg: p.opgg })));
  }, []);

  const publishPlayerSlot = useCallback((index: number, player: Player) => {
    if (!isRoomConnected() || !isRoomPersistenceReady()) return;
    writeSharedPlayer(index, entryFromPlayer(player));
  }, []);

  const pushSharedDraft = useCallback(
    (
      nextProfile: ProfileKey,
      nextPickIds: TeamPickIds,
      nextBans: { blue: TeamBans; red: TeamBans },
      nextSeries: SeriesState,
    ) => {
      if (!isRoomConnected() || !getDraftMap() || !isRoomPersistenceReady()) return;
      writeSharedDraft(
        sharedPayload(nextProfile, nextPickIds, nextBans, nextSeries),
      );
    },
    [],
  );

  const applyRemoteDraft = useCallback((payload: SharedDraftPayload) => {
    setProfileKey(
      isProfileKey(payload.profileKey) ? payload.profileKey : "teamfight",
    );
    setPickIds({
      blue: [...payload.picks.blue],
      red: [...payload.picks.red],
    });
    setBans({
      blue: [...payload.bans.blue],
      red: [...payload.bans.red],
    });
    setSeries(payload.series);
  }, []);

  const applyRemotePlayers = useCallback(
    (remote: ReturnType<typeof readSharedPlayers>) => {
      setPlayers((prev) =>
        prev.map((p, i) => {
          const entry = remote[i];
          if (!entry) return p;
          const shared = playerFromSharedEntry(entry);
          return {
            name: shared.name,
            opgg: p.opgg,
            tiers: shared.tiers,
            tierPoolOrder: shared.tierPoolOrder,
          };
        }),
      );
    },
    [],
  );

  useEffect(() => {
    let cleanupObserve: (() => void) | undefined;

    const unsubMap = subscribeDraftMap((map) => {
      cleanupObserve?.();

      const onMapChange = (_event: Y.YMapEvent<unknown>, tr: Y.Transaction) => {
        if (tr.origin === LOCAL_ORIGIN) return;
        const remote = readSharedDraft(map);
        if (remote) applyRemoteDraft(remote);
      };

      map.observe(onMapChange);

      if (hasSharedDraftKeys(map)) {
        const remote = readSharedDraft(map);
        if (remote) applyRemoteDraft(remote);
      }

      cleanupObserve = () => map.unobserve(onMapChange);
    });

    return () => {
      cleanupObserve?.();
      unsubMap();
    };
  }, [applyRemoteDraft]);

  useEffect(() => {
    let cleanupObserve: (() => void) | undefined;

    const unsubMap = subscribePlayersMap((map) => {
      cleanupObserve?.();

      const onMapChange = (_event: Y.YMapEvent<unknown>, tr: Y.Transaction) => {
        if (tr.origin === LOCAL_ORIGIN) return;
        applyRemotePlayers(readSharedPlayers(map));
      };

      map.observe(onMapChange);

      if (map.size > 0) {
        applyRemotePlayers(readSharedPlayers(map));
      }

      cleanupObserve = () => map.unobserve(onMapChange);
    });

    return () => {
      cleanupObserve?.();
      unsubMap();
    };
  }, [applyRemotePlayers]);

  const setPick = useCallback(
    (team: TeamId, index: number, champ: Champion | null) => {
      setPickIds((prev) => {
        const next = {
          ...prev,
          [team]: prev[team].map((id, i) => (i === index ? (champ?.id ?? "") : id)),
        };
        pushSharedDraft(profileKey, next, bans, series);
        return next;
      });
    },
    [bans, profileKey, pushSharedDraft, series],
  );

  const setBan = useCallback(
    (team: TeamId, index: number, id: string) => {
      setBans((prev) => {
        const next = {
          ...prev,
          [team]: prev[team].map((v, i) => (i === index ? id : v)),
        };
        pushSharedDraft(profileKey, pickIds, next, series);
        return next;
      });
    },
    [pickIds, profileKey, pushSharedDraft, series],
  );

  const setProfile = useCallback(
    (key: ProfileKey) => {
      setProfileKey(key);
      pushSharedDraft(key, pickIds, bans, series);
    },
    [pickIds, bans, pushSharedDraft, series],
  );

  const updateAllyProfile = useCallback(
    (index: number, patch: Partial<RoleProfile>) => {
      setPlayers((prev) => {
        const next = prev.map((p, i) => (i === index ? { ...p, ...patch } : p));
        persistAllyProfiles(next);
        if (patch.name !== undefined) {
          publishPlayerSlot(index, next[index]!);
        }
        return next;
      });
    },
    [persistAllyProfiles, publishPlayerSlot],
  );

  const updateOpponentProfile = useCallback(
    (index: number, patch: Partial<RoleProfile>) => {
      setOpponents((prev) => {
        const next = prev.map((p, i) => (i === index ? { ...p, ...patch } : p));
        saveOpponentProfiles(next);
        return next;
      });
    },
    [],
  );

  const setOpggRegion = useCallback((region: OpggRegion) => {
    setOpggRegionState(region);
    saveOpggRegion(region);
  }, []);

  const clearOpponents = useCallback(() => {
    const empty = emptyRoleProfiles();
    setOpponents(empty);
    clearOpponentProfiles();
  }, []);

  const updatePlayer = useCallback(
    (index: number, patch: Partial<Player>) => {
      setPlayers((prev) => {
        const next = prev.map((p, i) => (i === index ? { ...p, ...patch } : p));
        persistAllyProfiles(next);
        if (patch.name !== undefined || patch.tiers !== undefined) {
          publishPlayerSlot(index, next[index]!);
        }
        return next;
      });
    },
    [persistAllyProfiles, publishPlayerSlot],
  );

  const importPlayerTiers = useCallback(
    (
      index: number,
      tiers: Record<string, TierLabel>,
      tierPoolOrder: string[] = [],
    ) => {
      setPlayers((prev) => {
        const next = prev.map((p, i) =>
          i === index ? { ...p, tiers: { ...tiers }, tierPoolOrder } : p,
        );
        publishPlayerSlot(index, next[index]!);
        return next;
      });
    },
    [publishPlayerSlot],
  );

  const resetBoard = useCallback(() => {
    const nextPickIds = emptyPickIds();
    const nextBans = { blue: emptyBanIds(), red: emptyBanIds() };
    setPickIds(nextPickIds);
    setBans(nextBans);
    pushSharedDraft(profileKey, nextPickIds, nextBans, series);
  }, [profileKey, pushSharedDraft, series]);

  const toggleSeries = useCallback(
    (active: boolean) => {
      if (active) {
        clearLastTerminatedSeries();
        setLastTerminatedSeries(null);
        const next = startSeries();
        setSeries(next);
        pushSharedDraft(profileKey, pickIds, bans, next);
        return;
      }
      const current = seriesRef.current;
      if (current.games.length > 0) {
        saveLastTerminatedSeries(current);
        setLastTerminatedSeries(current);
      }
      const next = endSeriesState();
      setSeries(next);
      pushSharedDraft(profileKey, pickIds, bans, next);
    },
    [profileKey, pickIds, bans, pushSharedDraft],
  );

  const setLockScope = useCallback(
    (scope: LockScope) => {
      const next = { ...seriesRef.current, lockScope: scope };
      setSeries(next);
      pushSharedDraft(profileKeyRef.current, pickIds, bans, next);
    },
    [pickIds, bans, pushSharedDraft],
  );

  const validateGame = useCallback(
    (result: GameResult) => {
      const current = seriesRef.current;
      if (!current.active) return;
      const nextSeries = archiveCurrentGame(
        current,
        pickIds,
        profileKeyRef.current,
        result,
      );
      const nextPickIds = emptyPickIds();
      const nextBans = { blue: emptyBanIds(), red: emptyBanIds() };
      setSeries(nextSeries);
      setPickIds(nextPickIds);
      setBans(nextBans);
      pushSharedDraft(profileKeyRef.current, nextPickIds, nextBans, nextSeries);
    },
    [pickIds, pushSharedDraft],
  );

  const endSeries = useCallback(() => {
    const current = seriesRef.current;
    if (current.games.length > 0) {
      saveLastTerminatedSeries(current);
      setLastTerminatedSeries(current);
    }
    const next = endSeriesState();
    setSeries(next);
    pushSharedDraft(profileKeyRef.current, pickIds, bans, next);
  }, [pickIds, bans, pushSharedDraft]);

  const importSeries = useCallback(
    (raw: unknown) => {
      const next = parseSeriesImport(raw);
      setSeries(next);
      pushSharedDraft(profileKeyRef.current, pickIds, bans, next);
    },
    [pickIds, bans, pushSharedDraft],
  );

  const exportSeriesPayload = useCallback((): string | null => {
    const current = seriesRef.current;
    if (current.active || current.games.length > 0) {
      return JSON.stringify(buildSeriesExport(current), null, 2);
    }
    const last = loadLastTerminatedSeries();
    if (last) return JSON.stringify(buildSeriesExport(last), null, 2);
    return null;
  }, []);

  const used = useMemo(() => {
    const ids = new Set<string>();
    for (const team of ["blue", "red"] as const) {
      for (const id of pickIds[team]) {
        if (id) ids.add(id);
      }
      for (const id of bans[team]) {
        if (id) ids.add(id);
      }
    }
    return ids;
  }, [pickIds, bans]);

  return {
    picks,
    bans,
    profileKey,
    series,
    locked,
    lockedByGame,
    lastTerminatedSeries,
    players,
    opponents,
    opggRegion,
    setOpggRegion,
    updateAllyProfile,
    updateOpponentProfile,
    clearOpponents,
    setPick,
    setBan,
    setProfile,
    updatePlayer,
    importPlayerTiers,
    resetBoard,
    toggleSeries,
    setLockScope,
    validateGame,
    endSeries,
    importSeries,
    exportSeriesPayload,
    used,
  };
}
