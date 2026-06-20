#import { useState, useEffect, useRef, useCallback } from "react";
import { useState, useEffect, useRef, useCallback } from "https://esm.sh/react@18";
/* =========================================================================
   SIMULASI UMRAH — RPG (gaya pixel berwarna, tanpa badan handheld)
   Top-down tile RPG: gerak grid, briefing + maklumat + doa + kuiz tiap stesen.
   Senarai manasik (to-do) = legend nombor 1..7 pada peta.
   Kandungan: Panduan Mengerjakan Umrah — Ust Jamaluddin bin Hashim (UniSZA).
   ========================================================================= */

// --- Palet penuh warna (gaya pixel handheld berwarna) ---
const C = {
  // lantai marmar
  floor: "#e9e4d2", floorAlt: "#ddd6bf", marbleLine: "#cfc8ad",
  ring: "#efe2b4", ringDot: "#caa94e",
  // dinding / tiang batu pasir
  wall: "#cdb07a", wallLite: "#e7d2a0", wallDark: "#8a6a3a", wallTop: "#a8854c",
  // Kaabah
  kaaba: "#1d1c26", kaabaShade: "#0f0e16", gold: "#dcb24a", goldLite: "#f4e29a",
  // air Zamzam
  water: "#3f95d8", waterLite: "#8ec8ee", waterDark: "#245f97", stone: "#a39c8c", stoneDark: "#6e695c",
  // bukit
  hill: "#b58a52", hillDark: "#7d5a30", snow: "#efe7cf",
  // Maqam Ibrahim
  domeGold: "#e6bb4d", domeLite: "#f6e29a", domeBase: "#3c6b3a", domeBaseLite: "#5a9152",
  // Miqat
  arch: "#cdb07a", archDark: "#6e542c", door: "#3a2c1a",
  // Tahallul (gunting)
  steel: "#b9c0c9", steelDark: "#6d7682",
  // player
  robe: "#f6f4ec", robeShade: "#cdc7b2", robeLine: "#9b9684",
  skin: "#e0ad7e", skinShade: "#b98453", hair: "#2c2118", sandal: "#7a5a34",
  // ui
  ink: "#2b2a24", dlgBg: "#f7f7ef", dlgBorder: "#283c8c",
  good: "#2f8f3a", bad: "#c0392b", blue: "#1d3a8c", brown: "#7a5a2a",
};

const TILE = 16;
const VIEW_W = 160, VIEW_H = 144; // resolusi skrin sebenar handheld (10x9 petak)
const SPEED = 2;                  // px/frame semasa bergerak (8 frame/petak)

// --- Peta (16 lebar x 14 tinggi). Aksara = jenis tile ---
//  #=dinding/tiang  .=lantai  ,=hiasan(tawaf ring)  K=Kaabah
//  M=Miqat I=MaqamIbrahim S=Safa W=Marwah Z=Zamzam H=Tahallul P=player start
const MAP = [
  "################",
  "#.S..........W.#",
  "#..,,,,,,,,,,..#",
  "#..,........,..#",
  "#.I,...KK...,Z.#",
  "#..,...KK...,..#",
  "#..,........,..#",
  "#..,,,,,,,,,,..#",
  "#......H.......#",
  "#..#.......#..,#",
  "#......M.......#",
  "#......P..L....#",
  "#..#.......#...#",
  "################",
];
const MAP_W = MAP[0].length, MAP_H = MAP.length;

const STATION_CHARS = "MISWZHKL"; // tile yang boleh di-"A"
const WALL_CHARS = "#KMISWZHL";   // tile berlanggar (player tak boleh masuk)

const tileAt = (tx, ty) =>
  ty < 0 || tx < 0 || ty >= MAP_H || tx >= MAP_W ? "#" : MAP[ty][tx];
const isWall = (tx, ty) => WALL_CHARS.includes(tileAt(tx, ty));

// --- Data manasik (rujukan: Panduan Mengerjakan Umrah, Ust Jamaluddin, UniSZA) ---
//     Sahkan teks doa dengan rujukan manasik / pegawai agama sebelum guna sebenar.
const STATIONS = {
  M: {
    id: "miqat", name: "MIQAT",
    brief: "Anda berada di miqat — sempadan untuk memulakan ihram. Di sini anda akan mandi sunat, memakai kain ihram, menunaikan solat sunat ihram dua rakaat, kemudian berniat umrah dan bertalbiah.",
    info: [
      "Miqat ialah tempat yang ditetapkan syarak untuk berniat ihram. Bagi jemaah dari Malaysia, niat wajib dilakukan sebelum kapal terbang melepasi miqat Qarn Manazil.",
      "Bagi lelaki, pakaian ihram ialah dua helai kain putih yang tidak berjahit: sehelai menutup antara pusat dan lutut, sehelai lagi sebagai selendang. Selepas berniat, segala pantang larang ihram pun bermula.",
    ],
    dua: { ar: "نَوَيْتُ الْعُمْرَةَ وَأَحْرَمْتُ بِهَا لِلّٰهِ تَعَالَى", rom: "Nawaitul-'umrata wa ahramtu biha lillahi Ta'ala",
           mean: "Sahaja aku berniat umrah dan berihram dengannya kerana Allah Taala." },
    quiz: { q: "Berapa helai kain ihram bagi jemaah lelaki?", opts: ["Satu helai", "Dua helai", "Tiga helai"],
            ans: 1, why: "Dua helai kain yang tidak berjahit — sehelai menutup antara pusat dan lutut, sehelai lagi sebagai selendang." },
  },
  L: {
    id: "larangan", name: "LARANGAN IHRAM",
    brief: "Sebaik berniat ihram, anda tertakluk kepada pantang larang ihram sehingga selesai umrah. Di sini anda akan belajar tiga kategori larangan, dan disunatkan memperbanyak talbiah.",
    info: [
      "Pantang larang ihram terbahagi kepada tiga kategori: larangan khusus lelaki, larangan khusus wanita, dan larangan umum bagi kedua-duanya.",
      "Lelaki dilarang memakai pakaian berjahit atau bersarung (seperti seluar dan baju) dan menutup kepala. Wanita pula dilarang menutup muka.",
      "Larangan umum termasuk memakai bau-bauan, memotong rambut atau kuku, memburu binatang darat, dan bersetubuh. Jika dilanggar dengan sengaja, dikenakan dam (takhyir dan taqdir).",
    ],
    dua: { ar: "لَبَّيْكَ اللّٰهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ",
           rom: "Labbaikallahumma labbaik, labbaika la syarika laka labbaik, innal-hamda wan-ni'mata laka wal-mulk, la syarika lak",
           mean: "Aku datang menyahut panggilan-Mu, ya Allah. Tidak ada sekutu bagi-Mu. Sesungguhnya segala pujian, nikmat dan pemerintahan adalah milik-Mu." },
    quiz: { q: "Yang manakah DILARANG semasa dalam ihram?", opts: ["Memakai cermin mata", "Memakai bau-bauan", "Menggunakan payung"],
            ans: 1, why: "Memakai bau-bauan ialah larangan umum ihram. Cermin mata dan payung pula dibenarkan tanpa dam." },
  },
  K: {
    id: "tawaf", name: "TAWAF",
    brief: "Anda tiba di Kaabah. Mula-mula ambil wuduk, kemudian kelilingi Kaabah tujuh kali bermula di sudut Hajarul Aswad, dengan Kaabah sentiasa berada di sebelah kiri anda.",
    info: [
      "Tawaf ialah mengelilingi Kaabah sebanyak tujuh pusingan mengikut arah lawan jam. Ia bermula dan berakhir di sudut Hajarul Aswad.",
      "Bagi lelaki, disunatkan berlari-lari anak (ramal) pada tiga pusingan pertama, dan berjalan seperti biasa pada pusingan keempat hingga ketujuh. Disunatkan juga beristilam (menyentuh) Hajarul Aswad.",
    ],
    dua: { ar: "اللّٰهُمَّ إِنِّي أُرِيدُ طَوَافَ بَيْتِكَ الْحَرَامِ سَبْعَةَ أَشْوَاطٍ طَوَافَ الْعُمْرَةِ لِلّٰهِ تَعَالَى",
           rom: "Allahumma inni uridu tawafa baitikal-haram, sab'ata asywat, tawafal-'umrati lillahi Ta'ala",
           mean: "Sahaja aku tawaf Baitullah tujuh keliling tawaf umrah kerana Allah Taala." },
    quiz: { q: "Semasa tawaf, Kaabah hendaklah berada di sebelah mana?", opts: ["Sebelah kanan", "Sebelah kiri", "Di hadapan"],
            ans: 1, why: "Baitullah hendaklah sentiasa berada di sebelah kiri bahu sepanjang tujuh pusingan tawaf." },
  },
  I: {
    id: "maqam", name: "MAQAM IBRAHIM",
    brief: "Selepas tawaf, anda akan menunaikan solat sunat tawaf dua rakaat di belakang Maqam Ibrahim, kemudian berdoa di Multazam.",
    info: [
      "Disunatkan menunaikan solat sunat tawaf dua rakaat di belakang Maqam Ibrahim sebaik selesai tawaf. Pada rakaat pertama dibaca surah al-Kafirun dan rakaat kedua surah al-Ikhlas selepas al-Fatihah.",
      "Maqam Ibrahim ialah tempat yang terdapat kesan tapak kaki Nabi Ibrahim a.s. Solat ini boleh dilakukan pada bila-bila masa di Tanah Haram tanpa terikat dengan lima waktu tahrim.",
    ],
    dua: { ar: "وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى", rom: "Wattakhizu min maqami Ibrahima musalla",
           mean: "Dan jadikanlah sebahagian daripada Maqam Ibrahim itu sebagai tempat solat." },
    quiz: { q: "Berapa rakaat solat sunat tawaf di belakang Maqam Ibrahim?", opts: ["Dua rakaat", "Empat rakaat"],
            ans: 0, why: "Dua rakaat — surah al-Kafirun pada rakaat pertama dan surah al-Ikhlas pada rakaat kedua." },
  },
  Z: {
    id: "zamzam", name: "AIR ZAMZAM",
    brief: "Sebelum keluar untuk saie, anda disunatkan minum air zamzam sepuas-puasnya sambil berdoa dengan penuh harapan.",
    info: [
      "Selepas solat sunat tawaf serta berdoa di Maqam Ibrahim dan Multazam, disunatkan minum air zamzam sepuas-puasnya, kemudian keluar ke tempat saie melalui Bab al-Safa.",
    ],
    dua: { ar: "اللّٰهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا وَاسِعًا وَشِفَاءً مِنْ كُلِّ دَاءٍ",
           rom: "Allahumma inni as'aluka 'ilman nafi'an, wa rizqan wasi'an, wa syifa'an min kulli da'in",
           mean: "Ya Allah, aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang luas, dan kesembuhan daripada segala penyakit." },
    quiz: { q: "Bilakah air zamzam disunatkan diminum?", opts: ["Sebelum tawaf", "Selepas solat sunat tawaf, sebelum saie"],
            ans: 1, why: "Disunatkan minum air zamzam sepuas-puasnya selepas solat sunat tawaf, sebelum keluar untuk melakukan saie." },
  },
  S: {
    id: "safa", name: "BUKIT SAFA",
    brief: "Anda naik ke Bukit Safa untuk memulakan saie. Menghadap Kaabah, angkat kedua-dua tangan dan berdoa, kemudian mula berjalan menuju Bukit Marwah.",
    info: [
      "Saie ialah berjalan ulang-alik antara Bukit Safa dan Bukit Marwah. Ia wajib dimulakan di Bukit Safa dan disudahi di Bukit Marwah.",
      "Jarak antara Safa dan Marwah lebih kurang 473 meter. Jemaah lelaki disunatkan berlari-lari anak pada kawasan yang bertanda lampu hijau.",
    ],
    dua: { ar: "إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللّٰهِ", rom: "Innas-Safa wal-Marwata min sha'a'irillah",
           mean: "Sesungguhnya Safa dan Marwah itu antara syiar (tanda) Allah." },
    quiz: { q: "Saie wajib dimulakan di bukit yang mana?", opts: ["Bukit Marwah", "Bukit Safa"],
            ans: 1, why: "Saie bermula di Bukit Safa dan berakhir di Bukit Marwah." },
  },
  W: {
    id: "marwah", name: "BUKIT MARWAH",
    brief: "Setiap kali sampai ke Safa atau Marwah dikira satu perjalanan. Teruskan ulang-alik sehingga cukup tujuh perjalanan, berakhir di Marwah.",
    info: [
      "Saie dikira tujuh kali: dari Safa ke Marwah dikira satu, dan dari Marwah ke Safa dikira satu. Saie berakhir di Bukit Marwah.",
      "Niat saie hendaklah dikekalkan sepanjang melakukannya, dan disunatkan berturut-turut (muwalat) antara setiap perjalanan.",
    ],
    dua: { ar: "أَبْدَأُ بِمَا بَدَأَ اللّٰهُ بِهِ", rom: "Abda'u bima bada'allahu bih",
           mean: "Aku mulakan dengan apa yang Allah mulakan dengannya." },
    quiz: { q: "Berapa kali perjalanan saie yang wajib dicukupkan?", opts: ["Lima kali", "Tujuh kali", "Sembilan kali"],
            ans: 1, why: "Tujuh perjalanan: Safa ke Marwah satu, Marwah ke Safa satu, dan berakhir di Marwah." },
  },
  H: {
    id: "tahalul", name: "TAHALLUL",
    brief: "Selepas saie, anda akan bergunting atau bercukur rambut (afdal di Marwah). Dengan ini anda bertahallul dan umrah pun selesai.",
    info: [
      "Bergunting atau bercukur menandakan tahallul, iaitu terlepas daripada segala pantang larang ihram. Afdal bagi lelaki bercukur keseluruhannya, manakala wanita memadai dengan bergunting sahaja.",
      "Jika memilih untuk bergunting, disunatkan sekurang-kurangnya tiga helai rambut sepanjang kadar satu ruas jari. Umrah dikira lengkap apabila semua rukun disempurnakan dengan tertib.",
    ],
    dua: { ar: "اللّٰهُ أَكْبَر، اللّٰهُ أَكْبَر، اللّٰهُ أَكْبَر", rom: "Allahu Akbar, Allahu Akbar, Allahu Akbar",
           mean: "Allah Maha Besar." },
    quiz: { q: "Sekurang-kurangnya berapa helai rambut disunatkan digunting?", opts: ["Satu helai", "Tiga helai", "Tujuh helai"],
            ans: 1, why: "Sekurang-kurangnya tiga helai rambut sepanjang kadar satu ruas jari, mengikut yang disunatkan." },
  },
};
const ORDER = ["miqat", "larangan", "tawaf", "maqam", "zamzam", "safa", "marwah", "tahalul"];
const TOTAL = ORDER.length;
const ST_BY_ID = {}; Object.values(STATIONS).forEach((s) => { ST_BY_ID[s.id] = s; });
const CHAR_BY_ID = { miqat: "M", larangan: "L", tawaf: "K", maqam: "I", zamzam: "Z", safa: "S", marwah: "W", tahalul: "H" };
const NUM_OF = (id) => ORDER.indexOf(id) + 1; // nombor turutan = legend pada peta

// teks typewriter semasa bagi sesuatu scene
const twOf = (s) => {
  if (!s) return null;
  if (s.phase === "info" && s.pageIdx < s.pages.info.length) return s.pages.info[s.pageIdx];
  if (s.phase === "result") return s.pages.result[s.pageIdx];
  return null;
};

// ============================ AUDIO (square-wave) ============================
function useBeeper(muted) {
  const ctxRef = useRef(null);
  const ensure = () => {
    if (!ctxRef.current) {
      try { ctxRef.current = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ctxRef.current = null; }
    }
    return ctxRef.current;
  };
  return useCallback((freq, dur = 0.08, type = "square", vol = 0.05) => {
    if (muted) return;
    const ac = ensure(); if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime;
    o.start(t); g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.stop(t + dur);
  }, [muted]);
}

// ============================ DRAWING ============================
function drawTile(ctx, ch, x, y) {
  // base marmar
  ctx.fillStyle = C.floor; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = C.marbleLine;
  ctx.fillRect(x, y + TILE - 1, TILE, 1); ctx.fillRect(x + TILE - 1, y, 1, TILE);

  if (ch === ",") { // ring tawaf
    ctx.fillStyle = C.ring; ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = C.ringDot;
    ctx.fillRect(x + 3, y + 3, 2, 2); ctx.fillRect(x + 11, y + 11, 2, 2);
    ctx.fillRect(x + 11, y + 3, 2, 2); ctx.fillRect(x + 3, y + 11, 2, 2);
  } else if (ch === "#") { // tiang batu pasir
    ctx.fillStyle = C.wall; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = C.wallLite; ctx.fillRect(x, y, TILE, 2);
    ctx.fillStyle = C.wallDark;
    ctx.fillRect(x, y + TILE - 2, TILE, 2); ctx.fillRect(x + TILE - 2, y, 2, TILE);
    ctx.fillStyle = C.wallTop; ctx.fillRect(x + 4, y + 4, 8, 8);
  } else if (ch === "K") { // Kaabah + jalur emas
    ctx.fillStyle = C.kaaba; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = C.kaabaShade; ctx.fillRect(x + TILE - 2, y, 2, TILE);
    ctx.fillStyle = C.gold; ctx.fillRect(x, y + 4, TILE, 3);
    ctx.fillStyle = C.goldLite; ctx.fillRect(x, y + 4, TILE, 1);
  } else if (ch === "S" || ch === "W") { // bukit
    ctx.fillStyle = C.hill;
    ctx.beginPath(); ctx.moveTo(x + 8, y + 1); ctx.lineTo(x + 15, y + 15); ctx.lineTo(x + 1, y + 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.hillDark;
    ctx.beginPath(); ctx.moveTo(x + 8, y + 1); ctx.lineTo(x + 15, y + 15); ctx.lineTo(x + 8, y + 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.snow;
    ctx.beginPath(); ctx.moveTo(x + 8, y + 1); ctx.lineTo(x + 11, y + 6); ctx.lineTo(x + 5, y + 6); ctx.closePath(); ctx.fill();
  } else if (ch === "Z") { // perigi Zamzam
    ctx.fillStyle = C.stone; ctx.fillRect(x + 2, y + 2, 12, 12);
    ctx.fillStyle = C.stoneDark; ctx.fillRect(x + 2, y + 2, 12, 2);
    ctx.fillStyle = C.water; ctx.fillRect(x + 4, y + 4, 8, 8);
    ctx.fillStyle = C.waterLite; ctx.fillRect(x + 5, y + 5, 3, 2);
    ctx.fillStyle = C.waterDark; ctx.fillRect(x + 8, y + 9, 3, 2);
  } else if (ch === "I") { // Maqam Ibrahim — kubah emas
    ctx.fillStyle = C.domeBase; ctx.fillRect(x + 3, y + 9, 10, 5);
    ctx.fillStyle = C.domeBaseLite; ctx.fillRect(x + 3, y + 9, 10, 1);
    ctx.fillStyle = C.domeGold;
    ctx.beginPath(); ctx.arc(x + 8, y + 9, 5, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = C.domeLite; ctx.fillRect(x + 6, y + 6, 2, 2);
    ctx.fillStyle = C.domeGold; ctx.fillRect(x + 7, y + 2, 2, 3);
  } else if (ch === "M") { // Miqat — gerbang
    ctx.fillStyle = C.arch; ctx.fillRect(x + 2, y + 2, 12, 12);
    ctx.fillStyle = C.archDark; ctx.fillRect(x + 2, y + 2, 12, 2);
    ctx.fillStyle = C.door; ctx.fillRect(x + 5, y + 6, 6, 8);
    ctx.fillStyle = C.archDark; ctx.fillRect(x + 5, y + 6, 6, 1);
  } else if (ch === "H") { // Tahallul — gunting
    ctx.fillStyle = C.steel;
    ctx.fillRect(x + 4, y + 3, 2, 7); ctx.fillRect(x + 10, y + 3, 2, 7);
    ctx.fillRect(x + 5, y + 9, 6, 2);
    ctx.fillStyle = C.steelDark;
    ctx.fillRect(x + 3, y + 10, 3, 3); ctx.fillRect(x + 10, y + 10, 3, 3);
  } else if (ch === "L") { // papan tanda larangan ihram (bulatan merah + palang)
    ctx.fillStyle = C.steelDark; ctx.fillRect(x + 7, y + 10, 2, 4);
    ctx.fillStyle = C.bad;
    ctx.beginPath(); ctx.arc(x + 8, y + 6, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(x + 4, y + 5, 8, 2);
  }
}

// --- font pixel kecil (3x5) untuk nombor legend pada peta ---
const DIG = {
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
};
function drawDigit(ctx, x, y, n, color) {
  const g = DIG[n]; if (!g) return;
  ctx.fillStyle = color;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++)
    if (g[r][c] === "1") ctx.fillRect(x + c, y + r, 1, 1);
}

// tag bernombor di atas stesen (hijau=siap, biru=sekarang, kelabu=belum)
function drawTag(ctx, x, y, num, state, pulse) {
  const bg = state === "done" ? C.good : state === "next" ? C.blue : "#4a4a52";
  if (state === "next") { // cincin berdenyut + anak panah turun
    ctx.fillStyle = `rgba(29,58,140,${0.18 + 0.22 * pulse})`;
    ctx.fillRect(x - 1, y - 1, 11, 11);
    const by = -2 - Math.round(pulse * 2);
    ctx.fillStyle = C.blue;
    ctx.fillRect(x + 4, y + by, 1, 3); ctx.fillRect(x + 3, y + by + 2, 3, 1); ctx.fillRect(x + 4, y + by + 3, 1, 1);
  }
  ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, 9, 9);
  ctx.fillStyle = bg; ctx.fillRect(x + 1, y + 1, 7, 7);
  if (state === "done") { // tanda ✓
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 3, y + 5, 1, 1); ctx.fillRect(x + 4, y + 6, 1, 1);
    ctx.fillRect(x + 5, y + 4, 1, 1); ctx.fillRect(x + 6, y + 3, 1, 1); ctx.fillRect(x + 5, y + 5, 1, 1);
  } else {
    drawDigit(ctx, x + 3, y + 2, num, "#fff");
  }
}

function drawPlayer(ctx, x, y, dir, walk) {
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(x + 4, y + 14, 8, 2);   // bayang
  ctx.fillStyle = C.robe; ctx.fillRect(x + 4, y + 7, 8, 7);                // ihram
  ctx.fillStyle = C.robeShade; ctx.fillRect(x + 4, y + 11, 8, 3);
  ctx.fillStyle = C.robeLine;
  ctx.fillRect(x + 3, y + 7, 1, 7); ctx.fillRect(x + 12, y + 7, 1, 7); ctx.fillRect(x + 4, y + 13, 8, 1);
  ctx.fillStyle = C.skin; ctx.fillRect(x + 5, y + 2, 6, 5);                // kepala
  ctx.fillStyle = C.skinShade; ctx.fillRect(x + 5, y + 6, 6, 1);
  ctx.fillStyle = C.hair; ctx.fillRect(x + 5, y + 1, 6, 2);
  // mata ikut arah
  ctx.fillStyle = C.hair;
  if (dir === "down") { ctx.fillRect(x + 6, y + 4, 1, 1); ctx.fillRect(x + 9, y + 4, 1, 1); }
  else if (dir === "left") ctx.fillRect(x + 6, y + 4, 1, 1);
  else if (dir === "right") ctx.fillRect(x + 9, y + 4, 1, 1);
  // kaki (animasi jalan)
  ctx.fillStyle = C.sandal;
  ctx.fillRect(walk ? x + 5 : x + 9, y + 14, 2, 2);
}

// ============================ COMPONENT ============================
export default function UmrahRPG() {
  const [mode, setMode] = useState("title"); // title | overworld | scene | win
  const [muted, setMuted] = useState(false);
  const [doneList, setDoneList] = useState([]); // ids selesai (utk HUD + render)
  const [scene, setScene] = useState(null);     // {ch, phase, pageIdx, pages, sel, correct}
  const [typed, setTyped] = useState(0);

  const beep = useBeeper(muted);
  const canvasRef = useRef(null);

  // --- ref untuk loop (elak re-render setiap frame) ---
  const player = useRef({ tx: 7, ty: 11, px: 7 * TILE, py: 11 * TILE, dir: "up", moving: false, walk: false });
  const held = useRef({ up: false, down: false, left: false, right: false });
  const modeRef = useRef(mode);
  const doneRef = useRef(new Set());
  const sceneRef = useRef(null);
  const typedRef = useRef(0);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { typedRef.current = typed; }, [typed]);

  // text semasa untuk typewriter
  const tw = twOf(scene);

  // typewriter
  useEffect(() => {
    setTyped(0);
    if (tw == null) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1; setTyped(i);
      if (i % 2 === 0) beep(420, 0.015, "square", 0.02);
      if (i >= tw.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tw]);

  // ---------------- buka stesen ----------------
  const openStation = useCallback((ch) => {
    const st = STATIONS[ch];
    setScene({
      ch,
      phase: "info",
      pageIdx: 0,
      sel: 0,
      correct: null,
      pages: { info: [st.brief, ...st.info], result: [] }, // muka surat 0 = BRIEFING
    });
    setMode("scene");
    beep(660, 0.06); setTimeout(() => beep(880, 0.06), 70);
  }, [beep]);

  // ---------------- interaksi (tekan A di overworld) ----------------
  const interact = useCallback(() => {
    const pl = player.current;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[pl.dir];
    const fx = pl.tx + d[0], fy = pl.ty + d[1];
    const ch = tileAt(fx, fy);
    if (STATION_CHARS.includes(ch)) openStation(ch);
    else beep(180, 0.05); // bunyi "tak boleh"
  }, [openStation, beep]);

  // ---------------- maju dialog (A dalam scene) ----------------
  const advance = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    const st = STATIONS[s.ch];
    const cur = twOf(s);

    // INFO (muka surat: briefing -> info -> doa)
    if (s.phase === "info") {
      const nText = s.pages.info.length;
      const onText = s.pageIdx < nText;
      if (onText && cur && typedRef.current < cur.length) { setTyped(cur.length); return; }
      if (s.pageIdx < nText) { beep(520, 0.04); setScene({ ...s, pageIdx: s.pageIdx + 1 }); return; }
      beep(700, 0.06); setScene({ ...s, phase: "quiz", sel: 0 }); // di muka doa -> kuiz
      return;
    }

    // QUIZ (A = sahkan)
    if (s.phase === "quiz") {
      const ok = s.sel === st.quiz.ans;
      if (ok) { beep(660, 0.07); setTimeout(() => beep(990, 0.1), 80); }
      else { beep(150, 0.18, "sawtooth"); }
      const fb = ok ? "BETUL! " + st.quiz.why : "Cuba lagi nanti. Jawapan: " + st.quiz.opts[st.quiz.ans];
      setScene({ ...s, phase: "result", correct: ok, pageIdx: 0, pages: { ...s.pages, result: [fb] } });
      return;
    }

    // RESULT -> tamat stesen
    if (s.phase === "result") {
      if (cur && typedRef.current < cur.length) { setTyped(cur.length); return; }
      doneRef.current.add(st.id);
      setDoneList(ORDER.filter((id) => doneRef.current.has(id)));
      beep(560, 0.05);
      setScene(null);
      setMode(doneRef.current.size === TOTAL ? "win" : "overworld");
    }
  }, [beep]);

  // ---------------- input handler pusat ----------------
  const input = useCallback((act) => {
    const m = modeRef.current;
    if (m === "title") { if (act === "a") { beep(880, 0.08); setMode("overworld"); } return; }
    if (m === "win") { if (act === "a") {
      doneRef.current = new Set(); setDoneList([]);
      player.current = { tx: 7, ty: 11, px: 7 * TILE, py: 11 * TILE, dir: "up", moving: false, walk: false };
      setMode("title");
    } return; }
    if (m === "overworld") {
      if (act === "a") interact();
      else if (["up", "down", "left", "right"].includes(act)) held.current[act] = true;
      return;
    }
    if (m === "scene") {
      if (act === "a") advance();
      else if (act === "b") {
        const s = sceneRef.current;
        if (s && (s.phase === "info" || s.phase === "quiz")) { beep(200, 0.05); setScene(null); setMode("overworld"); }
      } else if (act === "up" || act === "down") {
        const s = sceneRef.current;
        if (!s || s.phase !== "quiz") return;
        const n = STATIONS[s.ch].quiz.opts.length;
        beep(400, 0.03);
        const sel = act === "up" ? (s.sel - 1 + n) % n : (s.sel + 1) % n;
        setScene({ ...s, sel });
      }
    }
  }, [interact, advance, beep]);

  const release = useCallback((dir) => { held.current[dir] = false; }, []);

  // ---------------- keyboard ----------------
  useEffect(() => {
    const KD = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
      Enter: "a", " ": "a", z: "a", Z: "a",
      Backspace: "b", x: "b", X: "b",
    };
    const down = (e) => {
      const k = KD[e.key]; if (!k) return;
      e.preventDefault(); input(k);
    };
    const up = (e) => {
      const k = KD[e.key]; if (!k) return;
      if (["up", "down", "left", "right"].includes(k)) release(k);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [input, release]);

  // ---------------- game loop ----------------
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let raf;

    const step = () => {
      const pl = player.current;

      // gerak hanya di overworld
      if (modeRef.current === "overworld") {
        if (pl.moving) {
          const tgx = pl.tx * TILE, tgy = pl.ty * TILE;
          if (pl.px < tgx) pl.px = Math.min(pl.px + SPEED, tgx);
          else if (pl.px > tgx) pl.px = Math.max(pl.px - SPEED, tgx);
          if (pl.py < tgy) pl.py = Math.min(pl.py + SPEED, tgy);
          else if (pl.py > tgy) pl.py = Math.max(pl.py - SPEED, tgy);
          if (pl.px === tgx && pl.py === tgy) { pl.moving = false; pl.walk = !pl.walk; }
        } else {
          const h = held.current;
          let dir = null;
          if (h.up) dir = "up"; else if (h.down) dir = "down";
          else if (h.left) dir = "left"; else if (h.right) dir = "right";
          if (dir) {
            pl.dir = dir;
            const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
            const nx = pl.tx + d[0], ny = pl.ty + d[1];
            if (!isWall(nx, ny)) { pl.tx = nx; pl.ty = ny; pl.moving = true; beep(330, 0.02, "square", 0.02); }
          }
        }
      }

      // ---- render dunia ----
      const camX = Math.max(0, Math.min(pl.px + 8 - VIEW_W / 2, MAP_W * TILE - VIEW_W));
      const camY = Math.max(0, Math.min(pl.py + 8 - VIEW_H / 2, MAP_H * TILE - VIEW_H));
      ctx.fillStyle = C.floor; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.save(); ctx.translate(-Math.round(camX), -Math.round(camY));

      const nextId = ORDER.find((id) => !doneRef.current.has(id));
      const pulse = (Math.sin(performance.now() / 220) + 1) / 2;
      const t0x = Math.floor(camX / TILE), t1x = t0x + 11;
      const t0y = Math.floor(camY / TILE), t1y = t0y + 10;
      for (let ty = t0y; ty <= t1y; ty++) {
        for (let tx = t0x; tx <= t1x; tx++) {
          if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
          const ch = MAP[ty][tx];
          drawTile(ctx, ch, tx * TILE, ty * TILE);
          if (STATION_CHARS.includes(ch)) {
            const st = STATIONS[ch];
            const done = doneRef.current.has(st.id);
            const state = done ? "done" : st.id === nextId ? "next" : "todo";
            drawTag(ctx, tx * TILE, ty * TILE, NUM_OF(st.id), state, pulse);
          }
        }
      }
      drawPlayer(ctx, Math.round(pl.px), Math.round(pl.py), pl.dir, pl.walk);
      ctx.restore();

      // scanline halus (kesan skrin lama)
      ctx.fillStyle = "rgba(0,0,0,0.035)";
      for (let yy = 0; yy < VIEW_H; yy += 2) ctx.fillRect(0, yy, VIEW_W, 1);

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [beep]);

  // objektif seterusnya (turutan)
  const firstUndone = ORDER.find((id) => !doneList.includes(id));
  const nextName = firstUndone ? ST_BY_ID[firstUndone].name : "SELESAI";

  // ============================ UI ============================
  const st = scene ? STATIONS[scene.ch] : null;
  const onDuaPage = scene && scene.phase === "info" && scene.pageIdx === scene.pages.info.length;
  const section = !scene ? "" :
    scene.phase === "quiz" ? "KUIZ" :
    scene.phase === "result" ? "SEMAKAN" :
    onDuaPage ? "DOA" :
    scene.pageIdx === 0 ? "BRIEFING" : "MAKLUMAT";

  return (
    <div style={styles.wrap}>
      <style>{cssExtra}</style>

      <div style={styles.topbar}>
        <span style={styles.logo}>SIMULASI UMRAH · RPG</span>
        <button onClick={() => setMuted((m) => !m)} style={styles.mute}>{muted ? "🔇" : "🔊"}</button>
      </div>

      <div style={styles.stage}>
        {/* ---- skrin (tanpa border handheld) ---- */}
        <div style={styles.screen}>
          <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} style={styles.canvas} />

          {mode === "overworld" && (
            <div style={styles.hud}>
              <span>MANASIK {doneList.length}/{TOTAL}</span>
              <span style={{ opacity: 0.85 }}>&gt; {nextName}</span>
            </div>
          )}

          {mode === "title" && (
            <div style={styles.overlay}>
              <div style={styles.kaabaBig}>▮▮</div>
              <div style={styles.titleBig}>SIMULASI<br />UMRAH</div>
              <div style={styles.titleSub}>RPG · EDISI WARNA</div>
              <div className="blink" style={styles.press}>TEKAN A</div>
            </div>
          )}

          {mode === "win" && (
            <div style={styles.overlay}>
              <div style={styles.titleBig}>UMRAH<br />SELESAI!</div>
              <div style={styles.titleSub}>{TOTAL} / {TOTAL} MANASIK SELESAI</div>
              <div style={{ ...styles.titleSub, marginTop: 6, fontSize: 14 }}>تَقَبَّلَ اللّٰهُ</div>
              <div style={{ ...styles.titleSub, marginTop: 2 }}>Semoga umrah diterima.</div>
              <div className="blink" style={styles.press}>A = MAIN SEMULA</div>
            </div>
          )}

          {mode === "scene" && (
            <div style={styles.dlgBox}>
              <div style={styles.dlgHead}>
                <span style={styles.dlgName}>#{NUM_OF(st.id)} · {st.name}</span>
                <span style={styles.section}>{section}</span>
              </div>

              {scene.phase === "info" && !onDuaPage && (
                <div style={styles.dlgText}>{tw ? tw.slice(0, typed) : ""}</div>
              )}

              {onDuaPage && (
                <div style={styles.duaWrap}>
                  <div style={styles.duaAr} dir="rtl">{st.dua.ar}</div>
                  <div style={styles.duaRom}>{st.dua.rom}</div>
                  <div style={styles.duaMean}>"{st.dua.mean}"</div>
                </div>
              )}

              {scene.phase === "quiz" && (
                <div>
                  <div style={styles.qText}>{st.quiz.q}</div>
                  {st.quiz.opts.map((o, i) => (
                    <div key={i} style={styles.opt}>
                      <span style={{ width: 10, display: "inline-block" }}>{scene.sel === i ? "▶" : ""}</span>
                      {o}
                    </div>
                  ))}
                </div>
              )}

              {scene.phase === "result" && (
                <div style={{ ...styles.dlgText, color: scene.correct ? C.good : C.bad }}>
                  {tw ? tw.slice(0, typed) : ""}
                </div>
              )}

              <div className="blink" style={styles.dlgHint}>
                {scene.phase === "quiz" ? "▲▼ pilih · A sahkan" : "A ►"}
              </div>
            </div>
          )}
        </div>

        {/* ---- senarai manasik (to-do) = legend nombor peta ---- */}
        <div style={styles.todo}>
          <div style={styles.todoTitle}>SENARAI MANASIK</div>
          <div style={styles.todoHint}>Nombor = lokasi pada peta. Pergi ikut 1 → 7.</div>
          {ORDER.map((id) => {
            const s = ST_BY_ID[id];
            const done = doneList.includes(id);
            const isNext = !done && firstUndone === id;
            const badgeBg = done ? C.good : isNext ? C.blue : "#9a958a";
            return (
              <div key={id} style={{ ...styles.todoItem, ...(isNext ? styles.todoNext : {}) }}>
                <span style={{ ...styles.badge, background: badgeBg }}>{done ? "✓" : NUM_OF(id)}</span>
                <span style={styles.todoName}>{s.name}</span>
                <span style={{ ...styles.todoStatus, color: done ? C.good : isNext ? C.blue : "#9a958a" }}>
                  {done ? "Selesai" : isNext ? "Sekarang" : "Belum"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- kawalan (untuk skrin sentuh) ---- */}
      <div style={styles.controls}>
        <div style={styles.dpad}>
          <button style={{ ...styles.dbtn, ...styles.dUp }} onPointerDown={(e) => { e.preventDefault(); input("up"); }} onPointerUp={() => release("up")} onPointerLeave={() => release("up")}>▲</button>
          <button style={{ ...styles.dbtn, ...styles.dLeft }} onPointerDown={(e) => { e.preventDefault(); input("left"); }} onPointerUp={() => release("left")} onPointerLeave={() => release("left")}>◀</button>
          <button style={{ ...styles.dbtn, ...styles.dRight }} onPointerDown={(e) => { e.preventDefault(); input("right"); }} onPointerUp={() => release("right")} onPointerLeave={() => release("right")}>▶</button>
          <button style={{ ...styles.dbtn, ...styles.dDown }} onPointerDown={(e) => { e.preventDefault(); input("down"); }} onPointerUp={() => release("down")} onPointerLeave={() => release("down")}>▼</button>
          <div style={styles.dCenter} />
        </div>

        <div style={styles.abWrap}>
          <button style={{ ...styles.abBtn, ...styles.bBtn }} onPointerDown={(e) => { e.preventDefault(); input("b"); }}>B</button>
          <button style={{ ...styles.abBtn, ...styles.aBtn }} onPointerDown={(e) => { e.preventDefault(); input("a"); }}>A</button>
        </div>
      </div>

      <p style={styles.note}>
        Gunakan anak panah atau WASD untuk bergerak · A = Enter/Space · B = Backspace. Lawati stesen mengikut nombor 1 hingga 7 secara tertib.
        Kandungan berdasarkan Panduan Mengerjakan Umrah (UniSZA). Sahkan teks doa dengan rujukan manasik atau pegawai agama sebelum digunakan untuk pembelajaran sebenar.
      </p>
    </div>
  );
}

// ============================ STYLES ============================
const mono = "'Courier New', ui-monospace, monospace";
const styles = {
  wrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: 16, background: "#171922", minHeight: "100%", fontFamily: mono },
  topbar: { width: "min(96vw, 620px)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  logo: { color: "#e7e3d4", fontSize: 13, fontWeight: 800, fontStyle: "italic", letterSpacing: 1 },
  mute: { background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 0 },
  stage: { width: "min(96vw, 620px)", display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" },

  // skrin tanpa badan handheld — cuma bingkai nipis
  screen: { position: "relative", flex: "1 1 300px", maxWidth: 380, minWidth: 240, background: C.floor, borderRadius: 6, overflow: "hidden", aspectRatio: "160 / 144", border: "3px solid #2b2d3a", boxShadow: "0 6px 18px rgba(0,0,0,.45)" },
  canvas: { width: "100%", height: "100%", display: "block", imageRendering: "pixelated" },
  hud: { position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "3px 6px", fontSize: 9, fontWeight: 700, color: C.ink, background: "rgba(255,255,255,.82)", letterSpacing: 0.5, borderBottom: `1px solid ${C.dlgBorder}` },
  overlay: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 4, background: "linear-gradient(#bfe0f5 0%, #d7e6e0 55%, #e9e4d2 100%)" },
  kaabaBig: { fontSize: 30, letterSpacing: -4, color: C.kaaba, textShadow: `0 2px 0 ${C.gold}`, marginBottom: 2 },
  titleBig: { fontSize: 26, fontWeight: 900, lineHeight: 1.05, letterSpacing: 1, color: C.blue, textShadow: "1px 1px 0 #fff" },
  titleSub: { fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.brown },
  press: { fontSize: 11, fontWeight: 800, marginTop: 10, letterSpacing: 1, color: C.blue },
  dlgBox: { position: "absolute", left: 5, right: 5, bottom: 5, minHeight: 58, maxHeight: "80%", overflowY: "auto", background: C.dlgBg, border: `3px solid ${C.dlgBorder}`, borderRadius: 5, padding: "6px 9px 9px", color: C.ink, boxShadow: "inset 0 0 0 1px #fff" },
  dlgHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 4 },
  dlgName: { fontSize: 9, fontWeight: 800, letterSpacing: 1, background: C.dlgBorder, color: "#fff", padding: "1px 5px", borderRadius: 2 },
  section: { fontSize: 8, fontWeight: 800, letterSpacing: 1, color: C.dlgBorder, border: `1px solid ${C.dlgBorder}`, borderRadius: 2, padding: "0 4px", flexShrink: 0 },
  dlgText: { fontSize: 11, lineHeight: 1.4, fontWeight: 700, minHeight: 30, color: C.ink },
  duaWrap: { textAlign: "center", padding: "2px 0" },
  duaAr: { fontSize: 19, lineHeight: 1.5, color: C.kaaba, fontFamily: "'Traditional Arabic', 'Scheherazade', serif" },
  duaRom: { fontSize: 10, fontWeight: 800, fontStyle: "italic", marginTop: 2, color: C.brown },
  duaMean: { fontSize: 9, marginTop: 2, color: "#5b6b76" },
  qText: { fontSize: 11, fontWeight: 800, marginBottom: 4, lineHeight: 1.3, color: C.ink },
  opt: { fontSize: 11, fontWeight: 700, lineHeight: 1.55, color: C.ink },
  dlgHint: { textAlign: "right", fontSize: 9, fontWeight: 700, color: C.dlgBorder, marginTop: 5 },

  // senarai manasik (to-do) + legend
  todo: { flex: "1 1 220px", maxWidth: 260, minWidth: 200, background: "#20222e", borderRadius: 8, padding: "12px 12px 14px", color: "#e7e3d4" },
  todoTitle: { fontSize: 12, fontWeight: 800, letterSpacing: 1, marginBottom: 2 },
  todoHint: { fontSize: 10, color: "#9a9aa8", marginBottom: 10, lineHeight: 1.35 },
  todoItem: { display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6, marginBottom: 3 },
  todoNext: { background: "rgba(46,107,208,.18)", boxShadow: "inset 0 0 0 1px rgba(120,160,230,.5)" },
  badge: { width: 18, height: 18, flexShrink: 0, borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" },
  todoName: { flex: 1, fontSize: 11, fontWeight: 700, color: "#e7e3d4" },
  todoStatus: { fontSize: 9, fontWeight: 700, letterSpacing: 0.5 },

  // kawalan sentuh
  controls: { width: "min(96vw, 620px)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, padding: "0 4px" },
  dpad: { position: "relative", width: 96, height: 96 },
  dbtn: { position: "absolute", width: 32, height: 32, background: "#2b2d3a", color: "#cdd0dc", border: "none", borderRadius: 5, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none", userSelect: "none" },
  dUp: { top: 0, left: 32 }, dDown: { bottom: 0, left: 32 }, dLeft: { left: 0, top: 32 }, dRight: { right: 0, top: 32 },
  dCenter: { position: "absolute", top: 32, left: 32, width: 32, height: 32, background: "#2b2d3a" },
  abWrap: { display: "flex", gap: 16, alignItems: "flex-end", transform: "rotate(-18deg)" },
  abBtn: { width: 46, height: 46, borderRadius: "50%", border: "none", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", touchAction: "none", userSelect: "none", boxShadow: "0 3px 0 rgba(0,0,0,.35)" },
  bBtn: { background: "#2f6bd0" }, aBtn: { background: "#d23b3b", marginBottom: 16 },
  note: { color: "#8a8a98", fontSize: 11, maxWidth: 420, textAlign: "center", marginTop: 18, lineHeight: 1.5, fontFamily: mono },
};

const cssExtra = `
@keyframes blink { 0%,60%{opacity:1} 61%,100%{opacity:0} }
.blink { animation: blink 0.9s steps(1) infinite; }
button:active { filter: brightness(1.25); }
`;
