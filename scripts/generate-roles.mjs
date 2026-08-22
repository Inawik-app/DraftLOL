import fs from "node:fs";
import https from "node:https";

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });
}

const OVERRIDES = {
  LeeSin: ["jgl"],
  MasterYi: ["jgl"],
  Nunu: ["jgl"],
  Ivern: ["jgl"],
  Lillia: ["jgl"],
  Hecarim: ["jgl"],
  Karthus: ["jgl"],
  Fiddlesticks: ["jgl"],
  Elise: ["jgl"],
  Nidalee: ["jgl"],
  Kindred: ["jgl"],
  Graves: ["jgl"],
  Diana: ["jgl"],
  Ekko: ["jgl"],
  KhaZix: ["jgl"],
  Rengar: ["jgl"],
  Evelynn: ["jgl"],
  Shaco: ["jgl"],
  Nocturne: ["jgl"],
  Warwick: ["jgl"],
  Zac: ["jgl"],
  Amumu: ["jgl"],
  Sejuani: ["jgl"],
  Rammus: ["jgl"],
  Vi: ["jgl"],
  JarvanIV: ["jgl"],
  XinZhao: ["jgl"],
  Volibear: ["top", "jgl"],
  Olaf: ["top", "jgl"],
  Trundle: ["top", "jgl"],
  Udyr: ["top", "jgl"],
  Shyvana: ["jgl"],
  Belveth: ["jgl"],
  Briar: ["jgl"],
  Viego: ["jgl"],
  Taliyah: ["jgl", "mid"],
  Quinn: ["top", "adc"],
  Teemo: ["top", "adc"],
  Vayne: ["top", "adc"],
  Lucian: ["adc", "mid"],
  Corki: ["mid", "adc"],
  Tristana: ["adc", "mid"],
  Yasuo: ["mid", "top"],
  Yone: ["mid", "top"],
  Zed: ["mid"],
  Akali: ["mid"],
  Katarina: ["mid"],
  Sylas: ["mid", "jgl"],
  Qiyana: ["mid", "jgl"],
  Talon: ["mid", "jgl"],
  Pyke: ["sup", "mid"],
  Senna: ["adc", "sup"],
  Swain: ["mid", "sup", "adc"],
  Veigar: ["mid", "sup"],
  Brand: ["mid", "sup"],
  Velkoz: ["mid", "sup"],
  Xerath: ["mid", "sup"],
  Ziggs: ["mid", "adc"],
  Heimerdinger: ["mid", "top"],
  Singed: ["top"],
  Garen: ["top"],
  Darius: ["top"],
  Camille: ["top"],
  Fiora: ["top"],
  Jax: ["top"],
  Kennen: ["top"],
  Jayce: ["top"],
  Gangplank: ["top"],
  Ornn: ["top"],
  Sion: ["top"],
  ChoGath: ["top"],
  Malphite: ["top"],
  Maokai: ["top", "sup", "jgl"],
  Poppy: ["top", "sup", "jgl"],
  Shen: ["top", "sup"],
  Galio: ["mid", "sup"],
  Taric: ["sup"],
  Yuumi: ["sup"],
  Soraka: ["sup"],
  Lulu: ["sup"],
  Janna: ["sup"],
  Nami: ["sup"],
  Sona: ["sup"],
  Milio: ["sup"],
  Renata: ["sup"],
  Bard: ["sup"],
  Thresh: ["sup"],
  Blitzcrank: ["sup"],
  Leona: ["sup"],
  Nautilus: ["sup", "mid"],
  Alistar: ["sup"],
  Braum: ["sup"],
  Rakan: ["sup"],
  Zilean: ["sup"],
  Karma: ["sup", "mid"],
  Lux: ["mid", "sup"],
  Morgana: ["sup", "mid"],
  Zyra: ["sup", "mid"],
  Ashe: ["adc"],
  Jinx: ["adc"],
  Caitlyn: ["adc"],
  Ezreal: ["adc"],
  KaiSa: ["adc"],
  Jhin: ["adc"],
  Varus: ["adc"],
  Xayah: ["adc"],
  Aphelios: ["adc"],
  Samira: ["adc"],
  Zeri: ["adc"],
  Smolder: ["adc"],
  Nilah: ["adc"],
  Twitch: ["adc"],
  KogMaw: ["adc"],
  Draven: ["adc"],
  MissFortune: ["adc"],
  Kalista: ["adc"],
  Ahri: ["mid"],
  Annie: ["mid"],
  Anivia: ["mid"],
  AurelionSol: ["mid"],
  Azir: ["mid"],
  Cassiopeia: ["mid"],
  Fizz: ["mid"],
  Leblanc: ["mid"],
  Lissandra: ["mid"],
  Malzahar: ["mid"],
  Neeko: ["mid", "sup"],
  Orianna: ["mid"],
  Ryze: ["mid"],
  Syndra: ["mid"],
  TwistedFate: ["mid"],
  Viktor: ["mid"],
  Vladimir: ["mid"],
  Zoe: ["mid"],
  Aurora: ["mid"],
  Naafiri: ["mid"],
  Ambessa: ["top"],
  Mel: ["mid"],
  Yunara: ["adc"],
};

function inferRoles(champ) {
  if (OVERRIDES[champ.id]) return OVERRIDES[champ.id];
  const rt = champ.tags;
  const roles = new Set();
  if (rt.includes("Marksman")) roles.add("adc");
  if (rt.includes("Support")) roles.add("sup");
  if (rt.includes("Assassin")) {
    roles.add("mid");
    roles.add("jgl");
  } else if (rt.includes("Mage")) {
    roles.add("mid");
  }
  if (rt.includes("Fighter")) {
    roles.add("top");
    if (!rt.includes("Assassin")) roles.add("jgl");
  }
  if (rt.includes("Tank")) {
    roles.add("top");
    roles.add("sup");
    if (!rt.includes("Support")) roles.add("jgl");
  }
  if (roles.size === 0) roles.add("mid");
  return [...roles].sort();
}

const versions = await get(
  "https://ddragon.leagueoflegends.com/api/versions.json",
);
const patch = versions[0];
const data = await get(
  `https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/champion.json`,
);

const entries = Object.values(data.data)
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((c) => `  ${c.id}: ${JSON.stringify(inferRoles(c))},`)
  .join("\n");

const out = `// GENERATED first pass from Data Dragon riot tags + manual overrides — review by hand.
// Patch reference: ${patch}

export type DraftRole = "top" | "jgl" | "mid" | "adc" | "sup";

export const ROLE_INDEX: Record<DraftRole, number> = {
  top: 0,
  jgl: 1,
  mid: 2,
  adc: 3,
  sup: 4,
};

export const ROLES_BY_INDEX: DraftRole[] = ["top", "jgl", "mid", "adc", "sup"];

/** championId -> playable draft roles */
export const CHAMPION_ROLES: Record<string, DraftRole[]> = {
${entries}
};

export function rolesForChampion(id: string): DraftRole[] {
  return CHAMPION_ROLES[id] ?? ["mid"];
}

export function championPlaysRole(id: string, role: DraftRole): boolean {
  return rolesForChampion(id).includes(role);
}
`;

fs.writeFileSync("src/data/roles.ts", out);
console.log(`Wrote ${Object.keys(data.data).length} champions to src/data/roles.ts`);
