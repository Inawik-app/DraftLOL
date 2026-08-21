import React, { useState, useEffect, useMemo, useRef } from "react";

/* ------------------------------------------------------------------ *
 *  DRAFT — outil d'aide à la draft LoL
 *  Zéro base de données : tout l'état tient dans un token partageable.
 *  Données champions : Data Dragon (CDN officiel Riot, CORS ouvert).
 * ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');

.dr { --ink:#080B11; --panel:#101722; --panel2:#161F2C; --line:#1F2C3D;
      --txt:#DCE4EF; --dim:#7F8FA5; --gold:#C8A254; --blue:#3B87DA; --red:#D8474B;
      --ok:#4FAE7A; --warn:#D9A441; --bad:#C8524F;
      background:var(--ink); color:var(--txt); font-family:Inter,system-ui,sans-serif;
      min-height:100%; font-size:13px; line-height:1.45; }
.dr *{box-sizing:border-box;}
.dr h1,.dr h2,.dr h3,.dr .cond{font-family:'Barlow Condensed',Impact,sans-serif;
      text-transform:uppercase; letter-spacing:.06em; font-weight:600; margin:0;}
.dr .mono{font-family:'JetBrains Mono',ui-monospace,monospace;}

.dr-shell{max-width:1240px;margin:0 auto;padding:14px 14px 60px;}
.dr-top{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;
        justify-content:space-between;padding-bottom:10px;border-bottom:1px solid var(--line);}
.dr-title{font-size:26px;line-height:1;letter-spacing:.14em;}
.dr-title span{color:var(--gold);}
.dr-sub{color:var(--dim);font-size:11px;letter-spacing:.1em;text-transform:uppercase;
        font-family:'Barlow Condensed',sans-serif;}

.dr-btn{background:var(--panel2);border:1px solid var(--line);color:var(--txt);
        font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.08em;
        font-size:13px;padding:5px 11px;cursor:pointer;transition:.12s;}
.dr-btn:hover{border-color:var(--gold);color:var(--gold);}
.dr-btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
.dr-btn.on{background:var(--gold);color:#0B0F16;border-color:var(--gold);}
.dr-btn.sm{font-size:11px;padding:3px 7px;}

.dr-styles{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0 14px;}

.dr-board{display:grid;grid-template-columns:1fr 320px 1fr;gap:14px;align-items:start;}
@media(max-width:900px){.dr-board{grid-template-columns:1fr;}}

.dr-side{background:var(--panel);border:1px solid var(--line);padding:10px;}
.dr-side.blue{border-top:2px solid var(--blue);}
.dr-side.red{border-top:2px solid var(--red);}
.dr-sidehead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}
.dr-sidehead .nm{font-size:16px;}
.dr-sidehead .sc{font-size:22px;font-family:'Barlow Condensed',sans-serif;line-height:1;}

.dr-banrow{display:flex;gap:4px;margin-bottom:10px;}
.dr-ban{width:34px;height:34px;background:var(--panel2);border:1px solid var(--line);
        position:relative;cursor:pointer;padding:0;overflow:hidden;flex:0 0 auto;}
.dr-ban img{width:100%;height:100%;filter:grayscale(1) brightness(.5);}
.dr-ban::after{content:"";position:absolute;inset:0;background:
   linear-gradient(45deg,transparent 45%,var(--bad) 45%,var(--bad) 55%,transparent 55%);opacity:.85;}
.dr-ban.empty::after{display:none;}
.dr-ban:hover{border-color:var(--gold);}

.dr-slot{display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #141C27;}
.dr-slot:last-child{border-bottom:none;}
.dr-role{width:30px;flex:0 0 30px;text-align:center;font-family:'Barlow Condensed',sans-serif;
         font-size:11px;color:var(--dim);letter-spacing:.08em;}
.dr-frame{width:52px;height:52px;flex:0 0 52px;background:var(--panel2);
          border:1px solid var(--line);cursor:pointer;padding:0;overflow:hidden;position:relative;
          clip-path:polygon(0 0,100% 0,100% 84%,84% 100%,0 100%);}
.dr-frame:hover,.dr-frame:focus-visible{border-color:var(--gold);outline:none;}
.dr-frame img{width:100%;height:100%;display:block;}
.dr-frame .plus{color:#33445C;font-size:22px;line-height:52px;}
.dr-meta{min-width:0;flex:1;}
.dr-meta .cn{font-family:'Barlow Condensed',sans-serif;font-size:15px;
             white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dr-meta .cp{color:var(--dim);font-size:10px;}
.dr-chips{display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;}
.dr-chip{font-size:9px;letter-spacing:.06em;text-transform:uppercase;padding:1px 4px;
         border:1px solid var(--line);color:var(--dim);
         font-family:'Barlow Condensed',sans-serif;}
.dr-chip.hit{border-color:var(--ok);color:var(--ok);}
.dr-chip.tier{border-color:var(--gold);color:var(--gold);}

.dr-sugg{display:flex;gap:3px;align-items:center;}
.dr-sugg button{width:26px;height:26px;padding:0;border:1px solid var(--line);
        background:var(--panel2);cursor:pointer;overflow:hidden;opacity:.75;transition:.12s;}
.dr-sugg button:hover,.dr-sugg button:focus-visible{opacity:1;border-color:var(--gold);outline:none;}
.dr-sugg img{width:100%;height:100%;display:block;}

.dr-center{background:var(--panel);border:1px solid var(--line);padding:12px;position:sticky;top:10px;}
.dr-score{display:flex;align-items:baseline;gap:8px;}
.dr-score .big{font-family:'Barlow Condensed',sans-serif;font-size:52px;line-height:.85;}
.dr-score .lab{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--dim);
               font-family:'Barlow Condensed',sans-serif;}
.dr-bar{height:3px;background:#1A2434;margin:8px 0 12px;}
.dr-bar i{display:block;height:100%;transition:width .3s;}

.dr-rail{display:flex;flex-direction:column;gap:5px;}
.dr-gauge{display:grid;grid-template-columns:78px 1fr 30px;gap:6px;align-items:center;}
.dr-gauge .g-l{font-family:'Barlow Condensed',sans-serif;font-size:11px;text-transform:uppercase;
               letter-spacing:.05em;color:var(--dim);}
.dr-pips{display:flex;gap:2px;}
.dr-pip{height:9px;flex:1;background:#18202D;border:1px solid #1D2839;}
.dr-pip.f{background:var(--ok);border-color:var(--ok);}
.dr-pip.f.low{background:var(--bad);border-color:var(--bad);}
.dr-pip.f.ex{background:var(--warn);border-color:var(--warn);}
.dr-pip.need{border-color:#33445C;border-style:dashed;}
.dr-gauge .g-v{font-size:10px;color:var(--dim);text-align:right;}

.dr-note{font-size:11px;padding:4px 6px;margin-top:4px;border-left:2px solid var(--line);color:var(--dim);}
.dr-note.bad{border-color:var(--bad);color:#E4A2A0;}
.dr-note.warn{border-color:var(--warn);color:#E0C48A;}
.dr-note.good{border-color:var(--ok);color:#93D3B2;}

.dr-detail{margin-top:14px;border-top:1px solid var(--line);padding-top:10px;min-height:150px;}
.dr-dhead{display:flex;gap:8px;align-items:center;}
.dr-dhead img{width:44px;height:44px;border:1px solid var(--line);}
.dr-dname{font-family:'Barlow Condensed',sans-serif;font-size:19px;line-height:1;}
.dr-dsec{margin-top:8px;}
.dr-dsec .t{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:.12em;
            text-transform:uppercase;color:var(--dim);margin-bottom:3px;}
.dr-delta{font-family:'Barlow Condensed',sans-serif;font-size:17px;}

.dr-modal{position:fixed;inset:0;background:rgba(4,7,12,.82);display:flex;
          align-items:flex-start;justify-content:center;padding:8vh 12px;z-index:50;}
.dr-picker{background:var(--panel);border:1px solid var(--line);width:100%;max-width:560px;
           box-shadow:0 24px 60px rgba(0,0,0,.6);}
.dr-picker input{width:100%;background:var(--ink);border:none;border-bottom:1px solid var(--line);
      color:var(--txt);padding:12px 14px;font-size:16px;font-family:'Barlow Condensed',sans-serif;
      letter-spacing:.06em;outline:none;}
.dr-results{max-height:52vh;overflow:auto;}
.dr-res{display:flex;gap:9px;align-items:center;width:100%;text-align:left;background:none;
        border:none;border-bottom:1px solid #141C27;padding:6px 10px;cursor:pointer;color:var(--txt);}
.dr-res img{width:34px;height:34px;flex:0 0 34px;}
.dr-res.sel{background:var(--panel2);}
.dr-res .rn{font-family:'Barlow Condensed',sans-serif;font-size:15px;}
.dr-res .rt{font-size:10px;color:var(--dim);}
.dr-res .rw{margin-left:auto;text-align:right;font-size:10px;}

.dr-players{margin-top:18px;background:var(--panel);border:1px solid var(--line);padding:12px;}
.dr-pgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:8px;}
.dr-pcard{background:var(--panel2);border:1px solid var(--line);padding:8px;}
.dr-in{width:100%;background:var(--ink);border:1px solid var(--line);color:var(--txt);
       padding:4px 6px;font-size:12px;margin-bottom:4px;font-family:inherit;}
.dr-in:focus{outline:1px solid var(--gold);}
textarea.dr-in{font-family:'JetBrains Mono',monospace;font-size:10px;resize:vertical;}
.dr-tier{display:flex;align-items:center;gap:5px;padding:2px 0;font-size:11px;}
.dr-tier img{width:20px;height:20px;}
.dr-tbtn{width:18px;height:18px;padding:0;border:1px solid var(--line);background:var(--ink);
         color:var(--gold);font-size:10px;cursor:pointer;font-family:'Barlow Condensed',sans-serif;}

.dr-token{display:flex;gap:6px;margin-top:8px;}
.dr-token input{flex:1;background:var(--ink);border:1px solid var(--line);color:var(--gold);
      padding:5px 7px;font-family:'JetBrains Mono',monospace;font-size:10px;}
.dr-foot{margin-top:22px;color:var(--dim);font-size:11px;border-top:1px solid var(--line);padding-top:10px;}
@media(prefers-reduced-motion:reduce){.dr *{transition:none!important;}}
`;

/* ---------------------------- taxonomie ---------------------------- */

const TAG_LABEL = {
  frontline: "Frontline", engage: "Engage", disengage: "Peel/Disengage",
  poke: "Poke", burst: "Burst", dps: "DPS soutenu", ap: "AP", ad: "AD",
  waveclear: "Waveclear", pick: "Pick/Catch", dive: "Dive", scaling: "Scaling",
  mobility: "Mobilité", utility: "Utilitaire", splitpush: "Splitpush",
};

// Matrice éditable. Une ligne = un champion Data Dragon, tags séparés par des espaces.
// Ce qui n'est pas listé retombe sur une dérivation auto depuis les données Riot.
const CURATED = {
  Aatrox:"frontline dps ad engage", Ahri:"burst ap mobility pick", Akali:"dive burst ap mobility",
  Akshan:"pick ad mobility poke", Alistar:"engage frontline disengage", Amumu:"engage frontline ap",
  Anivia:"waveclear ap disengage scaling", Annie:"engage burst ap", Aphelios:"dps ad scaling",
  Ashe:"engage utility ad pick", AurelionSol:"poke ap scaling waveclear", Azir:"dps ap engage scaling",
  Bard:"pick utility poke ap", Belveth:"dps ad mobility scaling", Blitzcrank:"pick engage",
  Brand:"waveclear ap burst poke", Braum:"frontline disengage utility", Caitlyn:"poke ad waveclear splitpush",
  Camille:"dive splitpush ad mobility pick", Cassiopeia:"dps ap waveclear", Chogath:"frontline engage ap",
  Corki:"poke ad waveclear dps", Darius:"frontline dps ad", Diana:"dive burst ap engage",
  Draven:"dps ad", DrMundo:"frontline dps scaling", Ekko:"dive burst ap mobility",
  Elise:"dive pick ap", Evelynn:"pick burst ap mobility", Ezreal:"poke ad mobility scaling",
  Fiddlesticks:"engage ap burst", Fiora:"splitpush dps ad scaling", Fizz:"dive burst ap mobility",
  Galio:"engage frontline ap utility", Gangplank:"poke waveclear ad scaling", Garen:"frontline dps ad splitpush",
  Gnar:"frontline engage ad", Gragas:"frontline engage ap disengage", Graves:"dps ad mobility",
  Gwen:"dps ap splitpush scaling", Hecarim:"engage dive mobility ad", Heimerdinger:"poke waveclear ap",
  Hwei:"poke ap waveclear utility", Illaoi:"frontline dps ad", Irelia:"dive dps ad mobility",
  Ivern:"utility disengage engage ap", Janna:"disengage utility ap", JarvanIV:"engage dive ad frontline",
  Jax:"splitpush dps ad scaling", Jayce:"poke ad waveclear splitpush", Jhin:"poke ad burst pick",
  Jinx:"dps ad scaling waveclear", Kaisa:"dps ad dive mobility", Kalista:"dps ad engage",
  Karma:"poke utility disengage ap", Karthus:"dps ap waveclear scaling", Kassadin:"dive burst ap scaling mobility",
  Katarina:"dive burst ap mobility", Kayle:"dps ap scaling splitpush", Kayn:"dive burst ad mobility",
  Kennen:"engage ap dive poke", Khazix:"pick burst ad mobility", Kindred:"dps ad scaling",
  KogMaw:"dps ad scaling waveclear", KSante:"frontline engage disengage", Leblanc:"pick burst ap mobility",
  LeeSin:"pick engage ad mobility", Leona:"engage frontline", Lillia:"engage ap mobility",
  Lissandra:"engage ap disengage", Lucian:"dps ad mobility", Lulu:"utility disengage scaling ap",
  Lux:"poke burst ap pick", Malphite:"frontline engage ap", Malzahar:"pick ap waveclear",
  Maokai:"frontline engage disengage utility", MasterYi:"dps ad splitpush scaling",
  Milio:"utility disengage ap", MissFortune:"waveclear ad burst poke", MonkeyKing:"engage dive ad",
  Mordekaiser:"frontline dps ap", Morgana:"utility disengage pick ap", Nami:"utility disengage poke ap",
  Nasus:"frontline dps scaling splitpush", Nautilus:"engage frontline pick", Neeko:"engage burst ap",
  Nidalee:"poke ap mobility", Nilah:"dps ad dive disengage", Nocturne:"dive engage ad",
  Nunu:"engage frontline ap", Olaf:"dive dps ad", Orianna:"engage ap dps utility",
  Ornn:"frontline engage utility scaling", Pantheon:"engage burst ad", Poppy:"frontline disengage engage",
  Pyke:"pick engage burst mobility", Qiyana:"engage burst ad mobility", Quinn:"splitpush ad mobility pick",
  Rakan:"engage utility mobility disengage", Rammus:"engage frontline", RekSai:"dive engage ad",
  Rell:"engage frontline", Renata:"engage utility disengage ap", Renekton:"dive dps ad",
  Rengar:"pick burst ad mobility", Riven:"dive burst ad mobility", Rumble:"frontline ap dps engage",
  Ryze:"dps ap waveclear scaling", Samira:"dive dps ad mobility", Sejuani:"frontline engage utility",
  Senna:"poke ad utility scaling", Seraphine:"utility poke ap disengage", Sett:"frontline engage ad",
  Shaco:"pick burst splitpush", Shen:"frontline utility splitpush disengage", Singed:"frontline splitpush ap",
  Sion:"frontline engage waveclear", Sivir:"waveclear ad engage dps", Skarner:"engage frontline pick",
  Smolder:"dps ad scaling waveclear", Sona:"utility poke scaling ap", Soraka:"utility disengage scaling ap",
  Swain:"frontline ap dps utility", Sylas:"burst ap mobility dive", Syndra:"burst ap poke scaling",
  TahmKench:"frontline utility disengage pick", Taliyah:"pick engage ap waveclear",
  Talon:"pick burst ad mobility", Taric:"utility frontline engage", Teemo:"splitpush ap poke",
  Thresh:"pick engage utility", Tristana:"dps ad dive waveclear", Trundle:"frontline dps ad",
  Tryndamere:"splitpush dps ad scaling", Twitch:"dps ad pick scaling", TwistedFate:"pick engage ap waveclear",
  Udyr:"dps frontline splitpush", Urgot:"frontline dps ad", Varus:"poke ad engage",
  Vayne:"dps ad scaling splitpush", Veigar:"burst ap scaling waveclear", Velkoz:"poke ap burst",
  Vex:"engage burst ap disengage", Vi:"engage dive pick ad", Viego:"dps ad mobility",
  Viktor:"dps ap waveclear scaling", Vladimir:"dps ap scaling waveclear", Volibear:"dive dps frontline",
  Warwick:"dive dps frontline", Xayah:"dps ad disengage", Xerath:"poke ap burst",
  XinZhao:"engage dive ad", Yasuo:"dps ad mobility dive", Yone:"dps ad mobility dive",
  Yorick:"splitpush dps ad", Yuumi:"utility scaling disengage ap", Zac:"engage frontline dive",
  Zed:"pick burst ad mobility", Zeri:"dps ad mobility scaling", Ziggs:"poke waveclear ap",
  Zilean:"utility disengage poke ap", Zoe:"poke pick burst ap", Zyra:"waveclear ap poke engage",
};

const PROFILES = {
  teamfight: { name: "Teamfight", targets:{ frontline:2, dps:2, engage:1, utility:2, waveclear:2, ap:2, ad:2 } },
  poke:      { name: "Poke / Siège", targets:{ poke:3, waveclear:3, disengage:2, ap:2, ad:2, frontline:1 } },
  dive:      { name: "Dive / All-in", targets:{ engage:2, dive:3, mobility:3, burst:2, frontline:1, ad:2 } },
  pick:      { name: "Pick / Catch", targets:{ pick:3, burst:3, mobility:2, waveclear:1, ap:1, ad:1 } },
  protect:   { name: "Protect the carry", targets:{ utility:3, disengage:3, dps:2, scaling:2, frontline:1 } },
  split:     { name: "Splitpush 1-3-1", targets:{ splitpush:2, waveclear:3, disengage:2, mobility:2, scaling:1 } },
  scaling:   { name: "Scaling", targets:{ scaling:3, waveclear:3, frontline:2, disengage:2, utility:1 } },
};

const ROLES = [
  { id:"top", label:"TOP" }, { id:"jgl", label:"JGL" }, { id:"mid", label:"MID" },
  { id:"adc", label:"ADC" }, { id:"sup", label:"SUP" },
];

const AFF = { S: 1, A: 0.7, B: 0.4 };
const TIERS = ["S", "A", "B"];

/* ---------------------------- utilitaires ---------------------------- */

function deriveTags(c) {
  const t = new Set(); const i = c.info || { attack:5, magic:5, defense:5 };
  if (i.magic >= i.attack) t.add("ap"); if (i.attack >= i.magic) t.add("ad");
  const k = c.tags || [];
  if (k.includes("Tank")) { t.add("frontline"); t.add("engage"); }
  if (k.includes("Marksman")) { t.add("dps"); }
  if (k.includes("Assassin")) { t.add("burst"); t.add("mobility"); t.add("pick"); }
  if (k.includes("Mage")) { t.add("ap"); t.add("waveclear"); }
  if (k.includes("Support")) { t.add("utility"); }
  if (k.includes("Fighter")) { t.add("dps"); }
  return [...t];
}

// autocomplete par sous-séquence : les lettres doivent apparaître dans l'ordre.
// "kss" -> Kassadin, "mrgn" -> Morgana, "twf" -> Twisted Fate.
function subseq(q, name) {
  if (!q) return 0;
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s = q.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!s) return 0;
  let i = 0, gaps = 0, last = -1;
  for (const ch of s) {
    const at = n.indexOf(ch, i);
    if (at === -1) return null;
    if (last >= 0) gaps += at - last - 1;
    last = at; i = at + 1;
  }
  let score = 1000 - gaps * 8 - n.length;
  if (n.startsWith(s)) score += 600;
  return score;
}

function tagCounts(list) {
  const c = {};
  list.forEach(ch => ch.tags.forEach(t => { c[t] = (c[t] || 0) + 1; }));
  return c;
}

function scoreComp(picks, profile) {
  const filled = picks.filter(Boolean);
  const n = filled.length;
  const counts = tagCounts(filled.map(p => p.champ));
  const scale = Math.max(n, 1) / 5;
  let got = 0, max = 0;
  const rows = [];
  for (const [tag, target] of Object.entries(profile.targets)) {
    const need = target * scale;
    const have = counts[tag] || 0;
    max += target;
    got += (need > 0 ? Math.min(have / need, 1) : 1) * target;
    let status = "ok";
    if (have < need - 0.35) status = "low";
    else if (have > need + 1.2) status = "high";
    rows.push({ tag, have, target, need, status });
  }
  let base = max ? (got / max) * 100 : 0;
  const notes = [];
  if (!n) return { score: 0, base: 0, rows, notes, counts, affBonus: 0 };

  const ex = rows.filter(r => r.status === "high");
  if (ex.length) {
    base -= ex.length * 4;
    notes.push({ t:"warn", m:`Excès : ${ex.map(r => TAG_LABEL[r.tag]).join(", ")} — redondant pour ce profil.` });
  }
  const ad = counts.ad || 0, ap = counts.ap || 0;
  if (n >= 3) {
    if (!ad) { base -= 14; notes.push({ t:"bad", m:"Zéro dégât AD : ils empilent la magie et tu ne passes plus." }); }
    else if (!ap) { base -= 14; notes.push({ t:"bad", m:"Zéro dégât AP : une seule armure annule ta comp." }); }
    else if (n >= 4 && Math.min(ad, ap) === 1) { base -= 5; notes.push({ t:"warn", m:"Dégâts très déséquilibrés, un seul profil de résistance à monter." }); }
  }
  if (n >= 4 && !(counts.frontline || 0)) {
    base -= 10; notes.push({ t:"bad", m:"Aucune frontline : personne pour absorber l'engage adverse." });
  }
  const affSum = filled.reduce((s, p) => s + (AFF[p.tier] || 0), 0);
  const affBonus = (affSum / n) * 12;
  if (affBonus > 5) notes.push({ t:"good", m:"Maîtrise personnelle élevée : les écarts au profil sont compensés." });
  const low = rows.filter(r => r.status === "low").sort((a,b) => (b.need-b.have)-(a.need-a.have)).slice(0,2);
  if (n >= 2 && low.length) notes.push({ t:"warn", m:`Il manque : ${low.map(r => TAG_LABEL[r.tag]).join(", ")}.` });

  return { score: Math.max(0, Math.min(100, base + affBonus)), base, rows, notes, counts, affBonus };
}

const scoreColor = s => s >= 72 ? "var(--ok)" : s >= 48 ? "var(--warn)" : "var(--bad)";

/* ---------------------------- token ---------------------------- */

const TOKEN_PREFIX = "DRAFT1.";

function encodeToken(state) {
  const compact = {
    p: state.profileKey,
    b: state.picks.blue.map(p => p ? p.id : ""),
    r: state.picks.red.map(p => p ? p.id : ""),
    bb: state.bans.blue, rb: state.bans.red,
    pl: state.players.map(pl => ({ n: pl.name, o: pl.opgg, t: pl.tiers, s: pl.stats })),
  };
  return TOKEN_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
}
function decodeToken(tok) {
  const raw = tok.trim().replace(TOKEN_PREFIX, "");
  return JSON.parse(decodeURIComponent(escape(atob(raw))));
}

/* ---------------------------- app ---------------------------- */

export default function DraftTool() {
  const [version, setVersion] = useState(null);
  const [champs, setChamps] = useState([]);
  const [err, setErr] = useState(null);

  const [profileKey, setProfileKey] = useState("teamfight");
  const [picks, setPicks] = useState({ blue: [null,null,null,null,null], red: [null,null,null,null,null] });
  const [bans, setBans] = useState({ blue: ["","","","",""], red: ["","","","",""] });
  const [players, setPlayers] = useState(ROLES.map(r => ({ role:r.id, name:"", opgg:"", tiers:{}, stats:{} })));
  const [picker, setPicker] = useState(null);   // {team,kind,index}
  const [hover, setHover] = useState(null);     // {id, team, index}
  const [tokenIn, setTokenIn] = useState("");
  const [flash, setFlash] = useState("");
  const [openPlayers, setOpenPlayers] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const v = await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json();
        const ver = v[0];
        const d = await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/fr_FR/champion.json`)).json();
        if (dead) return;
        const list = Object.values(d.data).map(c => {
          const cur = CURATED[c.id];
          let tags = cur ? cur.split(" ") : deriveTags(c);
          if (!tags.includes("ad") && !tags.includes("ap")) tags = tags.concat(deriveTags(c).filter(t => t==="ad"||t==="ap"));
          return { id:c.id, name:c.name, title:c.title, tags:[...new Set(tags)], curated:!!cur, riot:c.tags };
        }).sort((a,b) => a.name.localeCompare(b.name,"fr"));
        setVersion(ver); setChamps(list);
      } catch (e) { if (!dead) setErr("Data Dragon injoignable. Vérifie la connexion et recharge."); }
    })();
    return () => { dead = true; };
  }, []);

  const byId = useMemo(() => Object.fromEntries(champs.map(c => [c.id, c])), [champs]);
  const icon = id => `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;
  const profile = PROFILES[profileKey];

  const used = useMemo(() => new Set([
    ...picks.blue.filter(Boolean).map(p => p.id), ...picks.red.filter(Boolean).map(p => p.id),
    ...bans.blue.filter(Boolean), ...bans.red.filter(Boolean),
  ]), [picks, bans]);

  const tierOf = (roleIdx, id) => players[roleIdx].tiers[id] || null;

  const teamPicks = team => picks[team].map((p, i) =>
    p ? { champ: p, tier: team === "blue" ? tierOf(i, p.id) : null, roleIdx: i } : null);

  const blueEval = useMemo(() => scoreComp(teamPicks("blue"), profile), [picks, profile, players]);
  const redEval  = useMemo(() => scoreComp(teamPicks("red"), profile), [picks, profile]);

  // impact d'un champion s'il était ajouté à un slot donné
  const deltaFor = (team, roleIdx, champ) => {
    const cur = teamPicks(team);
    const before = scoreComp(cur, profile).score;
    const next = cur.slice();
    next[roleIdx] = { champ, tier: team === "blue" ? tierOf(roleIdx, champ.id) : null, roleIdx };
    return scoreComp(next, profile).score - before;
  };

  const suggestions = useMemo(() => {
    if (!champs.length) return {};
    const out = {};
    ROLES.forEach((r, i) => {
      if (picks.blue[i]) return;
      const cur = teamPicks("blue");
      const before = scoreComp(cur, profile).score;
      const ranked = champs
        .filter(c => !used.has(c.id))
        .map(c => {
          const next = cur.slice();
          next[i] = { champ:c, tier: tierOf(i, c.id), roleIdx:i };
          const d = scoreComp(next, profile).score - before;
          const t = tierOf(i, c.id);
          const known = t ? 0 : -6;            // on privilégie le pool réel du joueur
          return { c, v: d + (t ? AFF[t] * 10 : 0) + known };
        })
        .sort((a, b) => b.v - a.v).slice(0, 5);
      out[i] = ranked.map(x => x.c);
    });
    return out;
  }, [champs, picks, profile, players, used]);

  /* actions */
  const setPick = (team, i, champ) => setPicks(p => ({ ...p, [team]: p[team].map((v, k) => k===i ? champ : v) }));
  const setBan  = (team, i, id)    => setBans(b => ({ ...b, [team]: b[team].map((v, k) => k===i ? id : v) }));

  const commit = champ => {
    const { team, kind, index } = picker;
    if (kind === "pick") setPick(team, index, champ); else setBan(team, index, champ ? champ.id : "");
    setPicker(null);
  };

  const reset = () => {
    setPicks({ blue:[null,null,null,null,null], red:[null,null,null,null,null] });
    setBans({ blue:["","","","",""], red:["","","","",""] });
  };

  const token = useMemo(() => {
    if (!champs.length) return "";
    try { return encodeToken({ profileKey, picks, bans, players }); } catch { return ""; }
  }, [profileKey, picks, bans, players, champs]);

  const copyToken = async () => {
    try { await navigator.clipboard.writeText(token); say("Token copié."); }
    catch { say("Copie refusée par le navigateur — sélectionne le champ à la main."); }
  };
  const say = m => { setFlash(m); setTimeout(() => setFlash(""), 2600); };

  const loadToken = () => {
    try {
      const d = decodeToken(tokenIn);
      setProfileKey(PROFILES[d.p] ? d.p : "teamfight");
      setPicks({ blue: d.b.map(id => byId[id] || null), red: d.r.map(id => byId[id] || null) });
      setBans({ blue: d.bb || ["","","","",""], red: d.rb || ["","","","",""] });
      if (d.pl) setPlayers(ROLES.map((r, i) => ({
        role:r.id, name:d.pl[i]?.n || "", opgg:d.pl[i]?.o || "",
        tiers:d.pl[i]?.t || {}, stats:d.pl[i]?.s || {},
      })));
      setTokenIn(""); say("Salle chargée.");
    } catch { say("Token illisible. Recopie-le en entier, préfixe compris."); }
  };

  /* champion mis en avant dans le panneau détail */
  const focus = hover ? byId[hover.id] : null;

  if (err) return <div className="dr"><style>{CSS}</style><div className="dr-shell"><p>{err}</p></div></div>;
  if (!version) return (
    <div className="dr"><style>{CSS}</style><div className="dr-shell">
      <div className="dr-sub">Chargement du patch depuis Data Dragon…</div></div></div>);

  return (
    <div className="dr">
      <style>{CSS}</style>
      <div className="dr-shell">

        <header className="dr-top">
          <div>
            <h1 className="dr-title">Draft<span>.</span>board</h1>
            <div className="dr-sub">Patch {version} · {champs.length} champions · aucune donnée stockée</div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {flash && <span className="dr-sub" style={{ color:"var(--gold)" }}>{flash}</span>}
            <button className="dr-btn" onClick={() => setOpenPlayers(o => !o)}>Joueurs</button>
            <button className="dr-btn" onClick={reset}>Nouvelle draft</button>
          </div>
        </header>

        <div className="dr-styles">
          <span className="dr-sub" style={{ alignSelf:"center", marginRight:4 }}>Style visé</span>
          {Object.entries(PROFILES).map(([k, p]) => (
            <button key={k} className={"dr-btn sm" + (k === profileKey ? " on" : "")}
                    onClick={() => setProfileKey(k)}>{p.name}</button>
          ))}
        </div>

        <div className="dr-board">
          <TeamColumn
            team="blue" label="Bleu — nous" ev={blueEval} picks={picks.blue} bans={bans.blue}
            icon={icon} suggestions={suggestions} profile={profile} players={players}
            onFrame={(kind, i) => setPicker({ team:"blue", kind, index:i })}
            onHover={(id, i) => setHover(id ? { id, team:"blue", index:i } : null)}
            onSuggest={(i, c) => setPick("blue", i, c)}
            tierOf={tierOf}
          />

          <aside className="dr-center">
            <div className="dr-score">
              <span className="big" style={{ color: scoreColor(blueEval.score) }}>
                {Math.round(blueEval.score)}
              </span>
              <span className="lab">score compo bleue<br />
                {blueEval.affBonus > 0.5 && <em style={{ color:"var(--gold)", fontStyle:"normal" }}>
                  dont +{Math.round(blueEval.affBonus)} affinité</em>}
              </span>
            </div>
            <div className="dr-bar">
              <i style={{ width:`${blueEval.score}%`, background: scoreColor(blueEval.score) }} />
            </div>

            <div className="dr-rail">
              {blueEval.rows.map(r => <Gauge key={r.tag} row={r} />)}
            </div>

            {Object.keys(blueEval.counts).filter(t => !profile.targets[t]).length > 0 && (
              <div className="dr-chips" style={{ marginTop:8 }}>
                <span className="dr-sub" style={{ marginRight:4 }}>hors profil</span>
                {Object.keys(blueEval.counts).filter(t => !profile.targets[t]).map(t => (
                  <span key={t} className="dr-chip">{TAG_LABEL[t]} ×{blueEval.counts[t]}</span>
                ))}
              </div>
            )}

            <div style={{ marginTop:10 }}>
              {blueEval.notes.map((n, i) => <div key={i} className={"dr-note " + n.t}>{n.m}</div>)}
              {!blueEval.notes.length && <div className="dr-note">Choisis un premier champion pour lancer l'analyse.</div>}
            </div>

            <Detail champ={focus} hover={hover} icon={icon} profile={profile} ev={blueEval}
                    deltaFor={deltaFor} players={players} picks={picks} tierOf={tierOf} />
          </aside>

          <TeamColumn
            team="red" label="Rouge — adverse" ev={redEval} picks={picks.red} bans={bans.red}
            icon={icon} suggestions={{}} profile={profile} players={players}
            onFrame={(kind, i) => setPicker({ team:"red", kind, index:i })}
            onHover={(id, i) => setHover(id ? { id, team:"red", index:i } : null)}
            onSuggest={() => {}} tierOf={() => null}
          />
        </div>

        {openPlayers && (
          <section className="dr-players">
            <h2 style={{ fontSize:16 }}>Joueurs, tier lists et stats perso</h2>
            <div className="dr-sub">Tout est encodé dans le token — rien ne quitte ton navigateur.</div>
            <div className="dr-pgrid">
              {ROLES.map((r, i) => (
                <PlayerCard key={r.id} role={r} idx={i} data={players[i]} champs={champs} icon={icon}
                  onChange={patch => setPlayers(ps => ps.map((p, k) => k===i ? { ...p, ...patch } : p))} />
              ))}
            </div>
          </section>
        )}

        <section className="dr-players">
          <h2 style={{ fontSize:16 }}>Token de salle</h2>
          <div className="dr-sub">Colle-le à ton équipe pour partager la draft, les tier lists et le style visé.</div>
          <div className="dr-token">
            <input readOnly value={token} onFocus={e => e.target.select()} />
            <button className="dr-btn" onClick={copyToken}>Copier</button>
          </div>
          <div className="dr-token">
            <input value={tokenIn} onChange={e => setTokenIn(e.target.value)}
                   placeholder="Coller un token reçu…" />
            <button className="dr-btn" onClick={loadToken} disabled={!tokenIn}>Charger</button>
          </div>
        </section>

        <footer className="dr-foot">
          Tags champions : {champs.filter(c => c.curated).length} réglés à la main, le reste dérivé
          automatiquement des données Riot. Édite <span className="mono">CURATED</span> pour ajuster.
        </footer>
      </div>

      {picker && (
        <Picker champs={champs} used={used} icon={icon} profile={profile}
          slotTier={picker.kind === "pick" && picker.team === "blue" ? id => tierOf(picker.index, id) : () => null}
          delta={c => picker.kind === "pick" ? deltaFor(picker.team, picker.index, c) : 0}
          matchup={c => {
            if (picker.kind !== "pick" || picker.team !== "blue") return null;
            const enemy = picks.red[picker.index];
            const s = players[picker.index].stats?.[c.id];
            if (!enemy || !s?.vs?.[enemy.id]) return null;
            return { wr: s.vs[enemy.id], vs: enemy.name };
          }}
          onPick={commit} onClose={() => setPicker(null)}
          title={picker.kind === "ban" ? "Ban" : `${ROLES[picker.index].label} · ${picker.team === "blue" ? "bleu" : "rouge"}`} />
      )}
    </div>
  );
}

/* ---------------------------- sous-composants ---------------------------- */

function Gauge({ row }) {
  const slots = Math.max(row.target, Math.ceil(row.have), 1);
  const pips = Array.from({ length: Math.min(slots, 5) }, (_, i) => {
    const filled = i < row.have;
    const needed = i < Math.round(row.need);
    let cls = "dr-pip";
    if (filled) cls += " f" + (row.status === "low" ? " low" : row.status === "high" && i >= Math.round(row.need) ? " ex" : "");
    else if (needed) cls += " need";
    return <span key={i} className={cls} />;
  });
  return (
    <div className="dr-gauge">
      <span className="g-l">{TAG_LABEL[row.tag]}</span>
      <span className="dr-pips">{pips}</span>
      <span className="g-v">{row.have}/{row.target}</span>
    </div>
  );
}

function TeamColumn({ team, label, ev, picks, bans, icon, suggestions, profile, onFrame, onHover, onSuggest, tierOf }) {
  const needed = new Set(ev.rows.filter(r => r.status === "low").map(r => r.tag));
  return (
    <section className={"dr-side " + team}>
      <div className="dr-sidehead">
        <span className="nm cond">{label}</span>
        <span className="sc" style={{ color: scoreColor(ev.score) }}>{Math.round(ev.score)}</span>
      </div>

      <div className="dr-banrow">
        {bans.map((id, i) => (
          <button key={i} className={"dr-ban" + (id ? "" : " empty")} onClick={() => onFrame("ban", i)}
                  title={id ? `Ban ${id}` : "Ajouter un ban"} aria-label={id ? `Ban ${id}` : "Ajouter un ban"}>
            {id ? <img src={icon(id)} alt="" /> : null}
          </button>
        ))}
      </div>

      {ROLES.map((r, i) => {
        const p = picks[i];
        const tier = tierOf(i, p?.id);
        return (
          <div className="dr-slot" key={r.id}>
            <span className="dr-role">{r.label}</span>
            <button className="dr-frame" onClick={() => onFrame("pick", i)}
                    onMouseEnter={() => p && onHover(p.id, i)} onFocus={() => p && onHover(p.id, i)}
                    onMouseLeave={() => onHover(null)} aria-label={p ? p.name : `Choisir ${r.label}`}>
              {p ? <img src={icon(p.id)} alt="" /> : <span className="plus">+</span>}
            </button>
            <div className="dr-meta">
              {p ? (
                <>
                  <div className="cn">{p.name}</div>
                  <div className="dr-chips">
                    {tier && <span className="dr-chip tier">Tier {tier}</span>}
                    {p.tags.filter(t => profile.targets[t]).map(t => (
                      <span key={t} className={"dr-chip" + (needed.has(t) ? "" : " hit")}>{TAG_LABEL[t]}</span>
                    ))}
                  </div>
                </>
              ) : suggestions[i]?.length ? (
                <div className="dr-sugg">
                  {suggestions[i].map(c => (
                    <button key={c.id} title={`${c.name} — ${c.tags.map(t => TAG_LABEL[t]).join(", ")}`}
                            onClick={() => onSuggest(i, c)}
                            onMouseEnter={() => onHover(c.id, i)} onMouseLeave={() => onHover(null)}>
                      <img src={icon(c.id)} alt={c.name} />
                    </button>
                  ))}
                </div>
              ) : <span className="cp">Vide</span>}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Detail({ champ, hover, icon, profile, ev, deltaFor, players, picks, tierOf }) {
  if (!champ) return (
    <div className="dr-detail">
      <div className="dr-sub">Survole un champion ou une suggestion</div>
      <p style={{ color:"var(--dim)", fontSize:12, marginTop:6 }}>
        Ses forces, ce qu'il ne couvre pas dans la compo actuelle et son impact sur le score s'affichent ici.
      </p>
    </div>
  );
  const idx = hover.index;
  const inTeam = hover.team === "blue";
  const already = inTeam && picks.blue[idx]?.id === champ.id;
  const delta = inTeam ? (already ? null : deltaFor("blue", idx, champ)) : null;
  const tier = inTeam ? tierOf(idx, champ.id) : null;
  const helps = champ.tags.filter(t => profile.targets[t]);
  const gaps = ev.rows.filter(r => r.status === "low" && !champ.tags.includes(r.tag)).map(r => r.tag);
  const enemy = picks.red[idx];
  const st = players[idx]?.stats?.[champ.id];
  const wr = st?.vs?.[enemy?.id];

  return (
    <div className="dr-detail">
      <div className="dr-dhead">
        <img src={icon(champ.id)} alt="" />
        <div>
          <div className="dr-dname">{champ.name}</div>
          <div className="cp" style={{ color:"var(--dim)", fontSize:11 }}>{champ.title}</div>
        </div>
      </div>

      <div className="dr-dsec">
        <div className="t">Apporte</div>
        <div className="dr-chips">
          {champ.tags.map(t => (
            <span key={t} className={"dr-chip" + (helps.includes(t) ? " hit" : "")}>{TAG_LABEL[t]}</span>
          ))}
        </div>
      </div>

      <div className="dr-dsec">
        <div className="t">Ne couvre pas</div>
        {gaps.length
          ? <div className="dr-chips">{gaps.map(t => <span key={t} className="dr-chip">{TAG_LABEL[t]}</span>)}</div>
          : <span style={{ color:"var(--dim)", fontSize:11 }}>Rien de critique pour ce profil.</span>}
      </div>

      {delta !== null && (
        <div className="dr-dsec">
          <div className="t">Impact sur le score</div>
          <span className="dr-delta" style={{ color: delta >= 0 ? "var(--ok)" : "var(--bad)" }}>
            {delta >= 0 ? "+" : ""}{Math.round(delta)} pts
          </span>
          {tier && <span style={{ color:"var(--gold)", fontSize:11, marginLeft:8 }}>
            Tier {tier} pour ce joueur — pénalité de profil réduite.
          </span>}
        </div>
      )}

      {wr != null && (
        <div className="dr-dsec">
          <div className="t">Ton historique</div>
          <span style={{ color: wr >= 52 ? "var(--ok)" : wr >= 45 ? "var(--warn)" : "var(--bad)", fontSize:14 }}>
            {wr}% de winrate face à {enemy.name}
          </span>
          {st?.games && <span style={{ color:"var(--dim)", fontSize:11, marginLeft:6 }}>({st.games} parties sur le champion)</span>}
        </div>
      )}
    </div>
  );
}

function Picker({ champs, used, icon, onPick, onClose, title, delta, slotTier, matchup, profile }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const base = champs.filter(c => !used.has(c.id));
    if (!q.trim()) {
      return base.map(c => ({ c, d: delta(c) })).sort((a, b) => b.d - a.d).slice(0, 40);
    }
    return base.map(c => ({ c, s: subseq(q, c.name), d: delta(c) }))
      .filter(x => x.s !== null).sort((a, b) => b.s - a.s).slice(0, 40);
  }, [q, champs, used]);

  useEffect(() => setSel(0), [q]);

  const key = e => {
    if (e.key === "Escape") return onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[sel]) onPick(results[sel].c);
  };

  return (
    <div className="dr-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dr-picker" onKeyDown={key}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 12px 0" }}>
          <span className="dr-sub">{title}</span>
          <button className="dr-btn sm" onClick={onClose}>Fermer</button>
        </div>
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
               placeholder="Tape les lettres dans l'ordre — kss, mrgn, twf…" />
        <div className="dr-results">
          {results.map((x, i) => {
            const m = matchup(x.c);
            const t = slotTier(x.c.id);
            return (
              <button key={x.c.id} className={"dr-res" + (i === sel ? " sel" : "")}
                      onMouseEnter={() => setSel(i)} onClick={() => onPick(x.c)}>
                <img src={icon(x.c.id)} alt="" />
                <span>
                  <span className="rn">{x.c.name}</span>
                  {t && <span style={{ color:"var(--gold)", fontSize:10, marginLeft:6 }}>Tier {t}</span>}
                  <br />
                  <span className="rt">{x.c.tags.filter(tg => profile.targets[tg]).map(tg => TAG_LABEL[tg]).join(" · ") || x.c.tags.map(tg => TAG_LABEL[tg]).slice(0,3).join(" · ")}</span>
                </span>
                <span className="rw">
                  <span style={{ color: x.d >= 0 ? "var(--ok)" : "var(--bad)" }}>
                    {x.d >= 0 ? "+" : ""}{Math.round(x.d)}
                  </span>
                  {m && <><br /><span style={{ color: m.wr >= 52 ? "var(--ok)" : "var(--bad)" }}>{m.wr}% vs {m.vs}</span></>}
                </span>
              </button>
            );
          })}
          {!results.length && <div style={{ padding:14, color:"var(--dim)" }}>Aucun champion disponible pour ces lettres.</div>}
        </div>
        <div style={{ padding:"6px 12px", borderTop:"1px solid var(--line)" }}>
          <button className="dr-btn sm" onClick={() => onPick(null)}>Vider le cadre</button>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ role, data, champs, icon, onChange }) {
  const [q, setQ] = useState("");
  const found = useMemo(() => q.trim()
    ? champs.map(c => ({ c, s: subseq(q, c.name) })).filter(x => x.s !== null)
        .sort((a,b) => b.s - a.s).slice(0, 4).map(x => x.c) : [], [q, champs]);

  const cycle = id => {
    const cur = data.tiers[id];
    const next = cur === "S" ? "A" : cur === "A" ? "B" : cur === "B" ? null : "S";
    const t = { ...data.tiers };
    if (next) t[id] = next; else delete t[id];
    onChange({ tiers: t });
  };

  return (
    <div className="dr-pcard">
      <div className="dr-sub" style={{ color:"var(--gold)" }}>{role.label}</div>
      <input className="dr-in" placeholder="Pseudo" value={data.name}
             onChange={e => onChange({ name: e.target.value })} />
      <input className="dr-in" placeholder="Lien op.gg / u.gg" value={data.opgg}
             onChange={e => onChange({ opgg: e.target.value })} />

      <input className="dr-in" placeholder="Ajouter au pool…" value={q} onChange={e => setQ(e.target.value)} />
      {found.map(c => (
        <button key={c.id} className="dr-btn sm" style={{ marginRight:3, marginBottom:3 }}
                onClick={() => { cycle(c.id); setQ(""); }}>+ {c.name}</button>
      ))}

      <div style={{ marginTop:6 }}>
        {Object.entries(data.tiers).length === 0 && <span style={{ color:"var(--dim)", fontSize:11 }}>Pool vide.</span>}
        {Object.entries(data.tiers)
          .sort((a,b) => TIERS.indexOf(a[1]) - TIERS.indexOf(b[1]))
          .map(([id, t]) => (
          <div className="dr-tier" key={id}>
            <img src={icon(id)} alt="" />
            <button className="dr-tbtn" onClick={() => cycle(id)} title="Changer de tier">{t}</button>
            <span style={{ flex:1 }}>{id}</span>
            <button className="dr-tbtn" onClick={() => {
              const n = { ...data.tiers }; delete n[id]; onChange({ tiers:n });
            }} title="Retirer">×</button>
          </div>
        ))}
      </div>

      <details style={{ marginTop:6 }}>
        <summary className="dr-sub" style={{ cursor:"pointer" }}>Stats perso (JSON)</summary>
        <textarea className="dr-in" rows={4}
          placeholder={`{"Ahri":{"games":42,"wr":57,"vs":{"Zed":45,"Syndra":63}}}`}
          defaultValue={Object.keys(data.stats || {}).length ? JSON.stringify(data.stats) : ""}
          onBlur={e => {
            const v = e.target.value.trim();
            if (!v) return onChange({ stats:{} });
            try { onChange({ stats: JSON.parse(v) }); e.target.style.borderColor = "var(--line)"; }
            catch { e.target.style.borderColor = "var(--bad)"; }
          }} />
      </details>
    </div>
  );
}
