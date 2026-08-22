/** Probes whether localStorage is usable (blocked in some private browsing modes). */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const key = "__draftboard_ls_probe__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export const LOCAL_STORAGE_UNAVAILABLE_MSG =
  "Stockage local indisponible (navigation privée ou paramètres du navigateur). La draft et le lien fonctionnent pour cette session ; la synchro temps réel peut être moins fiable — préfère un onglet normal si tu partages la salle.";
