"use client";

import { useEffect } from "react";
import { syncRoomFromLocation } from "@/lib/room";

/** Keeps the WebRTC room alive across client-side route changes (/ ↔ /tiers). */
export function RoomConnector() {
  useEffect(() => {
    syncRoomFromLocation();
    window.addEventListener("hashchange", syncRoomFromLocation);
    return () => window.removeEventListener("hashchange", syncRoomFromLocation);
  }, []);

  return null;
}
