import { CURATED } from "../src/data/tags.ts";

type RiotChampion = {
  id: string;
  name: string;
};

type ChampionsResponse = {
  data: Record<string, RiotChampion>;
};

const versions = (await (
  await fetch("https://ddragon.leagueoflegends.com/api/versions.json")
).json()) as string[];
const version = versions[0];

const payload = (await (
  await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`,
  )
).json()) as ChampionsResponse;

const roster = Object.values(payload.data).sort((a, b) =>
  a.id.localeCompare(b.id),
);
const curatedKeys = Object.keys(CURATED).sort((a, b) => a.localeCompare(b));
const rosterIds = new Set(roster.map((c) => c.id));

console.log(`Patch          : ${version}`);
console.log(`Roster         : ${roster.length} champions`);
console.log(`CURATED        : ${curatedKeys.length} entrées`);
console.log("");

const missing = roster.filter((c) => !(c.id in CURATED));
console.log(`Absents de CURATED (${missing.length})`);
if (missing.length === 0) {
  console.log("  (aucun)");
} else {
  const idWidth = Math.max(...missing.map((c) => c.id.length));
  for (const c of missing) {
    console.log(`  ${c.id.padEnd(idWidth)}  ${c.name}`);
  }
}
console.log("");

const orphans = curatedKeys.filter((id) => !rosterIds.has(id));
console.log(`Clés CURATED hors patch (${orphans.length})`);
if (orphans.length === 0) {
  console.log("  (aucune)");
} else {
  for (const id of orphans) {
    console.log(`  ${id}`);
  }
}
console.log("");

const bothAdAp: string[] = [];
for (const id of curatedKeys) {
  const tags = CURATED[id].split(" ");
  const hasAd = tags.includes("ad");
  const hasAp = tags.includes("ap");
  if (hasAd && hasAp) {
    bothAdAp.push(id);
  }
}

console.log(
  `Avertissement — CURATED avec ad et ap ensemble (${bothAdAp.length})`,
);
if (bothAdAp.length === 0) {
  console.log("  (aucune)");
} else {
  const idWidth = Math.max(...bothAdAp.map((id) => id.length));
  for (const id of bothAdAp) {
    console.log(`  ${id.padEnd(idWidth)}  ${CURATED[id]}  ← à vérifier (hybride ?)`);
  }
}

process.exit(0);
