// js/solarSystem.js - Fixed event handling + full features (bloom, lens flare, popup, satellite, moon)
// Replace existing file with this version.

import * as THREE from "https://unpkg.com/three@0.127.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.127.0/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/UnrealBloomPass.js";

/* ============================
   Setup renderer / scene / camera
   ============================ */
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;

// ensure canvas doesn't cover UI and allows pointer interactions with UI above it
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0';
renderer.domElement.style.pointerEvents = 'auto';

document.body.appendChild(renderer.domElement);

// Make body focusable so keyboard events reliably arrive
document.body.tabIndex = 0;
document.body.style.outline = 'none';
document.body.focus();

// if user clicks anywhere, re-focus body (helps when dat.GUI steals focus)
window.addEventListener('click', () => { try { document.body.focus(); } catch(e){} });

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 3000);
camera.position.set(-50, 90, 150);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 2000;

/* ============================
   Loaders & textures
   ============================ */
const loader = new THREE.TextureLoader();
const starTex = loader.load('./image/stars.jpg', t => { t.encoding = THREE.sRGBEncoding; });
scene.background = starTex;
const sunTex = loader.load('./image/sun.jpg');

const paths = {
  merkurius: './image/mercury.jpg', venus: './image/venus.jpg', earth: './image/earth.jpg',
  mars: './image/mars.jpg', jupiter: './image/jupiter.jpg', saturn: './image/saturn.jpg',
  satRing: './image/saturn_ring.png', uranus: './image/uranus.jpg', uraRing: './image/uranus_ring.png',
  neptunus: './image/neptune.jpg'
};

/* ============================
   Lights
   ============================ */
const ambient = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(ambient);
const directional = new THREE.DirectionalLight(0xffffff, 0.12);
directional.position.set(20,40,10);
scene.add(directional);

// Sun point light (at center)
const sunLight = new THREE.PointLight(0xffeecc, 2.6, 2000, 2);
scene.add(sunLight);

/* ============================
   Composer & Bloom
   ============================ */
const renderPass = new RenderPass(scene, camera);
const composer = new EffectComposer(renderer);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.3, 0.4, 0.05);
bloomPass.threshold = 0.0;
bloomPass.strength = 1.2;
bloomPass.radius = 0.6;
composer.addPass(bloomPass);

/* ============================
   Sun glow controls (centralized)
   ============================ */
const sunSettings = {
  lightIntensity: 2.6,    // PointLight
  bloomStrength: 0.9,     // turunkan default supaya tidak terlalu ngejreng
  bloomThreshold: 0.25,   // 0 artinya semua objek bisa bloom; naikkan untuk selektif
  bloomRadius: 0.6,
  coronaOpacity: 0.05,
  flareFactor: 0.8,       // scaling untuk semua flare sprites
  color: '#ffcc66'
};

function applySunSettings() {
  sunLight.intensity = sunSettings.lightIntensity;
  bloomPass.threshold = sunSettings.bloomThreshold;
  bloomPass.strength  = sunSettings.bloomStrength;
  bloomPass.radius    = sunSettings.bloomRadius;
  if (corona && corona.material) corona.material.opacity = sunSettings.coronaOpacity;
  if (sun && sun.material && sun.material.color) sun.material.color.set(sunSettings.color);
  if (window.__flareSprites && window.__flareBaseOps) {
    window.__flareSprites.forEach((sp, i) => {
      sp.material.opacity = window.__flareBaseOps[i] * sunSettings.flareFactor;
    });
  }
}

/* ============================
   Starfield
   ============================ */
function makeStarfield(count = 1200, radius = 800) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  for (let i=0;i<count;i++){
    const phi = Math.acos(2*Math.random()-1);
    const theta = 2*Math.PI*Math.random();
    const r = radius * (0.5 + 0.5*Math.random());
    pos[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.cos(phi);
    pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.9, color: 0xbfcfdc }));
  pts.frustumCulled = false;
  scene.add(pts);
}
makeStarfield();

/* ============================
   Planets data & create
   ============================ */
const planetDefs = [
  { name:'Merkurius', size:3.2, dist:28, orbit:0.004, spin:0.004, tex: paths.merkurius },
  { name:'Venus',   size:5.8, dist:44, orbit:0.015, spin:0.002, tex: paths.venus },
  { name:'Bumi',   size:6.0, dist:62, orbit:0.01, spin:0.02, tex: paths.earth },
  { name:'Mars',    size:4.0, dist:78, orbit:0.008, spin:0.018, tex: paths.mars },
  { name:'Jupiter', size:12.0, dist:100, orbit:0.002, spin:0.04, tex: paths.jupiter },
  { name:'Saturnus',  size:10.0, dist:138, orbit:0.0009, spin:0.038, tex: paths.saturn, ring:{inner:10, outer:20, tex: paths.satRing} },
  { name:'Uranus',  size:7.0, dist:176, orbit:0.0004, spin:0.03, tex: paths.uranus, ring:{inner:7, outer:12, tex: paths.uraRing} },
  { name:'Neptunus', size:7.0, dist:200, orbit:0.0001, spin:0.032, tex: paths.neptunus },
];

// Real facts for info panel
const dataForInfo = {
  Merkurius: { radius_km: 2439.7, orbital_period_days: 88, rotation_hours: 1407.6 },
  Venus:   { radius_km: 6051.8, orbital_period_days: 224.7, rotation_hours: -5832.5 },
  Bumi:   { radius_km: 6371.0, orbital_period_days: 365.25, rotation_hours: 23.93 },
  Mars:    { radius_km: 3389.5, orbital_period_days: 687, rotation_hours: 24.62 },
  Jupiter: { radius_km: 69911, orbital_period_days: 4333, rotation_hours: 9.92 },
  Saturnus:  { radius_km: 58232, orbital_period_days: 10759, rotation_hours: 10.66 },
  Uranus:  { radius_km: 25362, orbital_period_days: 30687, rotation_hours: -17.24 },
  Neptunus: { radius_km: 24622, orbital_period_days: 60190, rotation_hours: 16.11 },
};

const planetDescriptions = {
  Merkurius: `Merkurius adalah planet terkecil dan tercepat di Tata Surya. Merkurius menyelesaikan orbitnya mengelilingi Matahari hanya dalam 88 hari Bumi. Kedekatannya dengan Matahari menyebabkan perbedaan suhu yang ekstrem: suhu siang hari dapat mencapai 800∘F (430∘C), sementara tanpa atmosfer untuk menahan panas, suhu malam hari anjlok hingga −290∘F(−180∘C). Meskipun terdekat, ia bukanlah planet terpanas, dan lingkungan yang keras ini membuatnya tidak mungkin mendukung kehidupan seperti yang ada di bumi. Merkurius berotasi sangat lambat, membutuhkan 59 hari Bumi untuk satu putaran, yang menghasilkan hari matahari yang sangat panjang, setara dengan 176 hari Bumi. Planet ini tidak memiliki bulan maupun cincin, dan karena kemiringan sumbunya hanya 2 derajat, ia tidak mengalami musim.
Permukaan Merkurius yang sebagian besar berwarna abu-abu kecokelatan mirip dengan Bulan, dipenuhi kawah tubrukan besar, termasuk Cekungan Caloris, serta tebing curam yang terbentuk saat interior planet mendingin. Di bawah permukaannya, Merkurius memiliki inti logam besar yang besarnya sekitar 85% radius planet, menjadikannya planet terpadat kedua setelah Bumi. Alih-alih atmosfer, ia memiliki eksosfer tipis yang terdiri dari atom yang terlepas dari permukaannya oleh angin matahari. Medan magnet planet, meskipun lemah, berinteraksi dengan angin matahari, terkadang menciptakan "tornado magnetik" yang menyalurkan plasma panas ke permukaan. Diperkirakan terdapat es air di dalam kawah yang berada dalam bayangan permanen di kutubnya.
`,

  Venus: `Venus adalah planet kedua dari Matahari dan sering dijuluki "kembaran jahat" Bumi karena kemiripan ukuran dan struktur internalnya. Namun, ia adalah planet terpanas di Tata Surya. Ini disebabkan oleh atmosfernya yang sangat tebal, didominasi karbon dioksida dan awan asam sulfat, yang memerangkap panas dalam efek rumah kaca yang tak terkendali, membuat suhu permukaannya cukup panas untuk melelehkan timbal. Uniknya, Venus berputar sangat lambat ke arah yang berlawanan dari kebanyakan planet, di mana satu hari Venus (243 hari Bumi) lebih lama daripada satu tahunnya (225 hari Bumi). Permukaan planet, yang sebagian besar dinamai dari nama-nama wanita, secara geologis masih muda dan terus-menerus dibentuk ulang oleh aktivitas vulkanik ekstrem, meskipun kemungkinan besar tidak mendukung kehidupan di permukaannya.
Meskipun permukaannya adalah “neraka”, sekitar 30 mil (50 kilometer) di atasnya, suhu dan tekanan atmosfernya memungkinkan adanya kehidupan mikroba. Venus tidak memiliki bulan, tetapi ia memiliki quasi-satelit bernama Zoozve. Planet ini tidak memiliki medan magnet internal, melainkan medan magnet terinduksi yang dihasilkan dari interaksi atmosfer luarnya dengan angin matahari. Ilmuwan mempelajari Venus yang memiliki nasib sangat berbeda dari Bumi, meski memiliki struktur serupa, sebagai studi kasus kunci untuk memahami bagaimana planet-planet berbatu terbentuk dan apa yang menyebabkan perubahan drastis dalam lingkungan planet.`,

  Bumi: `Bumi adalah planet terestrial terbesar dan satu-satunya tempat di alam semesta yang kita ketahui mendukung kehidupan, berkat suhunya yang ramah dan kelimpahan air cair di permukaannya. Ditemukan pada jarak 1 unit astronomi (AU) atau 93 juta mil dari Matahari, Bumi membutuhkan 365.25 hari untuk mengorbit dan 23.9 jam untuk berotasi. Kemiringan sumbu rotasi sebesar 23.4 derajat adalah penyebab utama siklus tahunan musim yang kita alami. Inti besi-nikel cair dan rotasi cepat planet menghasilkan medan magnet yang melindungi kehidupan dengan membelokkan angin matahari, menyebabkan fenomena aurora.
Dengan radius khatulistiwa 7.926 mil (12.756 kilometer), Bumi terdiri dari empat lapisan utama—inti dalam yang padat, inti luar yang cair, mantel yang kental, dan kerak terluar—yang terus bergerak melalui proses tektonik lempeng. Permukaan Bumi yang dinamis, dengan gunung berapi dan pegunungan, 71% ditutupi oleh lautan global. Atmosfernya terdiri dari 78% nitrogen dan 21% oksigen, berfungsi sebagai perisai pelindung dari radiasi berbahaya dan meteoroid. Bumi memiliki satu Bulan yang sangat penting, yang menstabilkan kemiringan planet dan iklim dari waktu ke waktu, tetapi planet kita tidak memiliki cincin. Nama "Earth" sendiri berasal dari kata dalam bahasa Jerman yang berarti "tanah" atau "dasar".
`,

  Mars: `Mars dijuluki "Planet Merah" karena kandungan mineral besi yang berkarat (teroksidasi) di permukaannya, adalah planet keempat dan salah satu yang paling sering dijelajahi di Tata Surya. Berjarak rata-rata 1.5 AU dari Matahari dan berukuran sekitar setengah Bumi, Mars memiliki hari yang durasinya sangat mirip dengan Bumi, disebut sol (24.6 jam).Kemiringan sumbu rotasinya (25 derajat) juga mirip dengan Bumi, menghasilkan musim yang berbeda, meskipun durasinya bervariasi karena orbitnya yang elips. Mars memiliki dua bulan kecil berbentuk kentang, Phobos dan Deimos, yang kemungkinan merupakan asteroid yang tertangkap. Para ilmuwan sangat tertarik pada masa lalu Mars, di mana banyak bukti menunjukkan bahwa planet ini dulunya jauh lebih basah dan hangat, dengan adanya jaringan lembah sungai, delta, dan air-es yang masih ada di bawah permukaan kutubnya saat ini.
Permukaan Mars yang dingin dan gersang memiliki fitur topografi yang ekstrem, termasuk sistem ngarai raksasa Valles Marineris (panjangnya 10 kali Grand Canyon Bumi) dan gunung berapi terbesar di Tata Surya, Olympus Mons (tiga kali lebih tinggi dari Gunung Everest). Mars memiliki atmosfer tipis yang sebagian besar terdiri dari karbon dioksida, yang tidak memberikan banyak perlindungan dari meteoroid dan memungkinkan suhu berfluktuasi antara 70∘F (20∘C) dan sekitar −225∘F (−153∘C). Meskipun saat ini tidak memiliki medan magnet global, area di kerak selatan menunjukkan adanya sisa-sisa medan magnet purba. Kondisi ini membuat para ilmuwan lebih fokus pada pencarian tanda-tanda kehidupan mikroba purba, bukan kehidupan yang saat ini masih berkembang.`,

  Jupiter: `Jupiter adalah planet terbesar di Tata Surya, dengan radius 11 kali lebih lebar dari Bumi. Planet gas raksasa ini terutama terdiri dari hidrogen dan helium dan memiliki hari terpendek di Tata Surya (9.9jam), tetapi satu tahunnya berlangsung sekitar 12 tahun Bumi. Jupiter memiliki inti yang diperkirakan sebagian larut ("kabur") dan dikelilingi oleh lautan hidrogen cair yang bersifat metalik, yang menghasilkan medan magnet paling kuat di Tata Surya sekitar 16 hingga 54 kali lipat kekuatan Bumi. Meskipun Jupiter sendiri tidak ramah terhadap kehidupan, beberapa bulannya, terutama Europa, diyakini memiliki lautan air cair di bawah permukaan esnya, menjadikannya salah satu tempat paling mungkin untuk mencari kehidupan di luar Bumi. Jupiter memiliki 95 bulan yang diakui secara resmi, termasuk empat satelit Galilea (Io, Europa, Ganymede, dan Callisto), dan juga memiliki sistem cincin yang gelap dan sulit dilihat.
Karena Jupiter adalah raksasa gas, ia tidak memiliki permukaan, tekanan dan suhu ekstrem di bagian dalamnya akan menghancurkan pesawat ruang angkasa. Penampilan Jupiter didominasi oleh pita-pita berwarna-warni yang mengelilingi planet disebut sabuk (gelap) dan zona (terang) serta badai siklon masif. Yang paling terkenal adalah Bintik Merah Besar (Great Red Spot), badai raksasa yang ukurannya dua kali lipat Bumi dan telah berlangsung selama ratusan tahun.Data dari pesawat ruang angkasa Juno mengungkapkan bahwa badai-badai ini jauh lebih tinggi dari yang diperkirakan, dengan Bintik Merah Besar memanjang hingga 300 mil (500 kilometer) di bawah puncak awan. Rotasi Jupiter yang cepat menciptakan arus jet yang kuat dan dalam yang memisahkan awan-awan ini. Atmosfernya terdiri dari lapisan awan amonia dan air yang dingin dan berangin, menciptakan pemandangan unik yang terus-menerus berubah.`,

  Saturnus: `Saturnus adalah raksasa gas yang sebagian besar terdiri dari hidrogen dan helium, menjadikannya satu-satunya planet di Tata Surya dengan kerapatan rata-rata lebih rendah dari air, ia bisa mengapung di air jika ada wadah yang cukup besar. Saturnus terkenal karena sistem cincinnya yang spektakuler dan kompleks, yang terbuat dari miliaran bongkahan kecil es dan batu yang mengorbit planet. Sistem cincin utamanya membentang hingga 175.000 mil dari planet tetapi tingginya hanya sekitar 30 kaki. Saturnus memiliki hari terpendek kedua di Tata Surya (10.7 jam) dan membutuhkan 29.4 tahun Bumi untuk menyelesaikan satu orbit. Kemiringan sumbunya (26.73 derajat) mirip dengan Bumi, sehingga ia mengalami musim.
Saturnus tidak memiliki permukaan padat, tekanan dan suhu ekstrem di bagian dalamnya akan menghancurkan pesawat ruang angkasa. Atmosfernya menunjukkan pita-pita samar berwarna kuning, cokelat, dan abu-abu, dengan kecepatan angin yang mencapai 1.600 kaki per detik (500 meter per detik) di khatulistiwa. Fitur atmosfernya yang paling unik adalah struktur jet stream berbentuk heksagon enam sisi di kutub utara. Saturnus memiliki 146 bulan yang diakui secara resmi, termasuk bulan-bulan menarik seperti Titan (dengan danau metana) dan Enceladus(dengan lautan internal), yang berpotensi mendukung kehidupan. Mirip dengan Jupiter, Saturnus memiliki inti padat yang dikelilingi oleh hidrogen logam cair, yang menghasilkan medan magnet kuat (578 kali kekuatan Bumi) dan menyebabkan fenomena aurora.`,

  Uranus: `Uranus adalah raksasa es yang sangat dingin dan berangin, ditemukan pada tahun 1781 menggunakan teleskop. Planet ini memiliki ciri khas yang paling unik di Tata Surya: ia berotasi hampir 90 derajat dari bidang orbitnya, membuatnya tampak berguling ke samping saat mengelilingi Matahari. Kemiringan ekstrem 97.77derajat ini menghasilkan musim yang paling ekstrem, di mana salah satu kutub dapat mengalami musim dingin yang gelap selama 21 tahun. Uranus membutuhkan sekitar 84 tahun Bumi untuk mengorbit Matahari dan satu hari hanya berlangsung sekitar 17 jam, dan seperti Venus, ia berotasi ke arah yang berlawanan dari sebagian besar planet. Planet ini memiliki 28 bulan yang dinamai dari karakter karya William Shakespeare dan Alexander Pope, serta 13 cincin samaryang terdiri dari dua kelompok: sistem bagian dalam yang gelap dan dua cincin luar berwarna merah dan biru.
Uranus tidak memiliki permukaan padat, melainkan sebagian besar terdiri dari cairan panas dan padat dari material "es" (air, metana, dan amonia) di atas inti berbatu kecil. Warna biru-hijau khasnya berasal dari gas metana dalam atmosfernya yang menyerap cahaya merah. Atmosfernya, yang sebagian besar terdiri dari hidrogen dan helium, adalah salah satu yang terdingin di Tata Surya, dengan kecepatan angin mencapai 560 mil per jam (900 kilometer per jam). Uranus memiliki magnetosfer yang sangat tidak biasa, di mana sumbu magnetnya miring hampir 60 derajat dari sumbu rotasinya dan juga bergeser dari pusat planet. Hal ini menyebabkan medan magnetnya memilin ke bentuk pembuka botol (corkscrew) dan menghasilkan aurora yang tidak sejajar dengan kutubnya. Uranus juga merupakan planet terpadat kedua setelah Saturnus.`,

  Neptunus: `Neptunus adalah planet kedelapan dan terjauh dari Matahari, berjarak 30 AU (sekitar 2.8 miliar mil). Ia adalah satu-satunya planet yang tidak terlihat dengan mata telanjang, dan ditemukan pada tahun 1846 melalui perhitungan matematis terhadap gangguan orbit Uranus. Dinamai dari dewa laut Romawi, Neptunus empat kali lebih lebar dari Bumi. Ia memiliki hari yang relatif singkat (16 jam), tetapi satu tahunnya sangat panjang, yaitu sekitar 165 tahun Bumi. Kemiringan porosnya yang mirip dengan Bumi (28 derajat) menghasilkan musim yang sangat panjang, masing-masing berlangsung lebih dari 40 tahun. Neptunus dikenal sebagai dunia paling berangin di Tata Surya, dengan kecepatan angin melebihi 1.200 mil per jam (2.000 kilometer per jam), jauh lebih kuat daripada di Bumi atau Jupiter.
Neptunus tidak memiliki permukaan padat, melainkan sebagian besar terdiri dari cairan padat dan panas dari material "es" (air, metana, dan amonia) di atas inti berbatu. Gas metana dalam atmosfernya (terutama hidrogen dan helium) memberikan warna biru tua. Neptunus memiliki 16 bulan yang diketahui, di mana yang terbesar, Triton, bergerak dalam orbit mundur (retrograde) dan menunjukkan adanya geyser es aktif meskipun suhunya sangat dingin. Neptunus juga memiliki lima cincin utama dan empat busur cincin yang misterius. Medan magnetnya sangat kuat (27kali kekuatan Bumi) tetapi sangat tidak sejajar dengan poros rotasinya (miring 47 derajat), menyebabkan variasi yang liar saat berotasi, mirip dengan Uranus.`

};


const root = new THREE.Object3D();
scene.add(root);

function makeOrbitRing(distance) {
  const segs = 200;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(segs*3);
  for (let i=0;i<segs;i++){
    const t = (i/segs) * Math.PI * 2;
    pos[i*3+0] = Math.cos(t) * distance;
    pos[i*3+1] = 0;
    pos[i*3+2] = Math.sin(t) * distance;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  return new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color:0x666666, opacity:0.65, transparent:true }));
}

const planetObjs = [];
for (const pd of planetDefs) {
  const parent = new THREE.Object3D();
  root.add(parent);

  const ring = makeOrbitRing(pd.dist);
  scene.add(ring);

  let tex = null;
  try { tex = loader.load(pd.tex); if (tex) tex.encoding = THREE.sRGBEncoding; } catch(e){ tex = null; }
  const mat = new THREE.MeshStandardMaterial({ map: tex || null, roughness: 1.0, metalness: 0.0, color: tex ? 0xffffff : 0x888888 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(pd.size, 48, 36), mat);
  mesh.position.set(pd.dist, 0, 0);
  parent.add(mesh);

  if (pd.ring) {
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(pd.ring.inner, pd.ring.outer, 64),
      new THREE.MeshBasicMaterial({
        map: loader.load(pd.ring.tex),
        side: THREE.DoubleSide,
        transparent: true
      })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    parent.add(ringMesh);
    ringMesh.position.set(pd.dist, 0, 0);
  }


  // label sprite
  const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = "rgba(255,255,255,0.02)"; ctx.fillRect(0,0,256,64);
  ctx.fillStyle = "#ffe8b6"; ctx.font = "26px sans-serif"; ctx.fillText(pd.name, 8, 36);
  const labelTex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent:true, opacity:0.9 }));
  sprite.scale.set(4,1,1);
  sprite.position.set(pd.dist, pd.size + 1.2, 0);
  root.add(sprite);

  planetObjs.push({ def: pd, parent, mesh, ring, sprite });
}

/* ============================
   Sun (emissive + lens flare)
   ============================ */
const sunMat = new THREE.MeshBasicMaterial({ map: sunTex || null, color: 0xffcc66 });
const sun = new THREE.Mesh(new THREE.SphereGeometry(15, 64, 48), sunMat);
scene.add(sun);
sunLight.position.copy(sun.position);

// corona
const corona = new THREE.Mesh(new THREE.SphereGeometry(17.5, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent:true, opacity:0.06 }));
scene.add(corona);

// lens flare via canvas texture
function makeFlareTexture(size=256, color='#ffd27a') {
  const c = document.createElement('canvas'); c.width=c.height=size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  g.addColorStop(0.0, color); g.addColorStop(0.15, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, 'rgba(255,200,120,0.4)'); g.addColorStop(1.0, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
  return new THREE.CanvasTexture(c);
}
const flareTex = makeFlareTexture(256);
window.__flareSprites = [];
window.__flareBaseOps = [];

function addFlare() {
  const group = new THREE.Object3D();
  const params = [{scale:200,op:0.9},{scale:300,op:0.12},{scale:420,op:0.06}];
  for (const p of params) {
    const mat = new THREE.SpriteMaterial({
      map: flareTex,
      blending: THREE.AdditiveBlending,
      transparent:true,
      opacity:p.op,
      depthWrite:false
    });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(p.scale,p.scale,1);
    sp.position.set(0,0,0);
    group.add(sp);

    // simpan referensi + opacity dasar
    window.__flareSprites.push(sp);
    window.__flareBaseOps.push(p.op);
  }
  sun.add(group);
}
addFlare();

// sesudah addFlare() DAN sesudah corona dibuat, panggil:
applySunSettings();

/* ============================
   Earth moon + satellite
   ============================ */
const earthObj = planetObjs.find(x => x.def.name === 'Bumi');
if (earthObj) {
  // moon
  const moonParent = new THREE.Object3D();
  earthObj.mesh.add(moonParent);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshStandardMaterial({ color:0x888888 }));
  moon.position.set(9,0,0);
  moonParent.add(moon);
  earthObj.moon = { parent: moonParent, mesh: moon, orbit:0.02, spin:0.02 };

  // satellite
  const satParent = new THREE.Object3D();
  earthObj.mesh.add(satParent);
  const sat = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6), new THREE.MeshStandardMaterial({ color:0xffdd55 }));
  sat.position.set(11, 2, 0);
  satParent.add(sat);
  earthObj.satellite = { parent: satParent, mesh: sat, orbit: 0.08, spin: 0.1, enabled: true };
}

/* ============================
   Raycaster & Info Panel (UI)
   ============================ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/* ============================
   Overlay detail: half-sphere 3D
   ============================ */
let halfScene, halfCamera, halfRenderer, halfMesh, halfLight;
const overlayEl = document.getElementById('planetOverlay');
const ovTitle   = document.getElementById('ovTitle');
const ovDesc    = document.getElementById('ovDesc');
const ovClose   = document.getElementById('ovClose');

if (ovClose) {
  ovClose.onclick = closeOverlay;
  // ESC untuk menutup
  window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeOverlay(); });
}

/* ============ Overlay badge 3D (bola tekstur planet) ============ */
let badgeScene, badgeCam, badgeRenderer, badgeGroup, badgeAnimId, badgeControls;

function initBadge() {
  const canvas = document.getElementById('planetBadge');
  if (!canvas) return;

  badgeScene = new THREE.Scene();          // tanpa background
  badgeScene.background = null;

  // kamera & renderer transparan
  badgeCam = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.01, 2000);
  badgeCam.position.set(0, 0, 6);

  badgeRenderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, premultipliedAlpha:false });
  badgeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  badgeRenderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  badgeRenderer.setClearColor(0x000000, 0); // full transparan

  // lampu
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(2, 2, 3);
  const rim = new THREE.DirectionalLight(0x99bbff, 0.25); rim.position.set(-2, -1, -3);
  badgeScene.add(amb, dir, rim);

  // OrbitControls khusus badge
  badgeControls = new OrbitControls(badgeCam, badgeRenderer.domElement);
  badgeControls.enableDamping = true;
  badgeControls.enablePan = false;
  badgeControls.rotateSpeed = 0.9;
  badgeControls.zoomSpeed   = 0.45;
  badgeControls.enableZoom  = true;

  // hentikan event bocor ke scene utama
  badgeRenderer.domElement.style.touchAction = 'none';
  ['pointerdown','pointermove','pointerup','wheel','contextmenu'].forEach(type => {
    badgeRenderer.domElement.addEventListener(type, e => e.stopPropagation(), { passive:false });
  });

  window.addEventListener('resize', resizeBadge);
  resizeBadge();
}

function resizeBadge(){
  const canvas = document.getElementById('planetBadge');
  if (!badgeRenderer || !canvas) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  badgeRenderer.setSize(w, h, false);
  badgeCam.aspect = w / h;
  badgeCam.updateProjectionMatrix();
}

function fitBadgeToView(object, cam, controls, margin = 1.35) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);

  object.position.sub(center); // pusatkan di (0,0,0)

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = cam.fov * Math.PI / 180;
  let dist = (maxDim/2) / Math.tan(fov/2);
  dist *= margin;

  cam.position.set(0, 0, dist);
  cam.near = Math.max(0.01, dist / 100);
  cam.far  = dist * 100;
  cam.updateProjectionMatrix();

  if (controls) {
    controls.target.set(0,0,0);
    controls.minDistance = dist * 0.5;
    controls.maxDistance = dist * 2.5;
    controls.update();
  }
}

function startBadgeLoop(){
  cancelAnimationFrame(badgeAnimId);
  (function loop(){
    badgeAnimId = requestAnimationFrame(loop);
    if (badgeGroup) badgeGroup.rotation.y += 0.003; // auto spin ringan (opsional)
    if (badgeControls) badgeControls.update();
    if (badgeRenderer && badgeCam) badgeRenderer.render(badgeScene, badgeCam);
  })();
}


function showPlanetBadge(def, options = {}) {
  const { smallPlanet = true, scale = 0.85 } = options;
  if (!badgeRenderer) initBadge();

  // bersihkan sebelumnya
  disposeBadge();

  // grup baru
  badgeGroup = new THREE.Object3D();
  badgeScene.add(badgeGroup);

  // bola
  const sphereR = smallPlanet ? 1.1 : 1.6;
  const tex = new THREE.TextureLoader().load(def.tex, t => {
    t.encoding = THREE.sRGBEncoding;

    // pastikan fit dilakukan setelah texture siap (bounding box stabil)
    requestAnimationFrame(() => fitBadgeToView(badgeGroup, badgeCam, badgeControls, 1.35));
  });
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(sphereR, 64, 48),
    new THREE.MeshStandardMaterial({ map: tex, roughness:0.85, metalness:0.05 })
  );
  sphere.renderOrder = 1;
  badgeGroup.add(sphere);

  // ring (jika ada)
  if (def.ring) {
    const ringTex = new THREE.TextureLoader().load(def.ring.tex, t => {
      t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    });

    // jarak aman supaya “keluar” dari bola
    const inner = sphereR * 1.35;
    const outer = sphereR * 2.2;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 192),
      new THREE.MeshBasicMaterial({ map: ringTex, transparent:true, alphaTest:0.18, depthWrite:true })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 2;
    badgeGroup.add(ring);

    // tilt spesifik
    if (def.name === 'Saturnus') badgeGroup.rotation.z = THREE.MathUtils.degToRad(26);
    if (def.name === 'Uranus') badgeGroup.rotation.z = THREE.MathUtils.degToRad(98);
  }

  // skala keseluruhan kalau dibutuhkan
  badgeGroup.scale.setScalar(scale);

  // mulai loop
  startBadgeLoop();
}


function disposeBadge(){
  cancelAnimationFrame(badgeAnimId);
  if (badgeGroup) {
    badgeGroup.traverse(obj => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      }
    });
    if (badgeScene) badgeScene.remove(badgeGroup);
    badgeGroup = null;
  }
}


function openOverlay(pobj){
  overlayEl.style.display = 'block';
  document.body.style.overflow = 'hidden';
  ovTitle.textContent = pobj.def.name;
  ovDesc.textContent  = planetDescriptions[pobj.def.name] || 'No description.';
  if (controls) controls.enabled = false;

  // mode planet kecil “berdiri sendiri”
  showPlanetBadge(pobj.def, { smallPlanet:true, scale:0.85 });
}


function closeOverlay(){
  overlayEl.style.display = 'none';
  document.body.style.overflow = '';
  if (controls) controls.enabled = true;
  disposeBadge();
}



// handle pointer events on canvas first (more reliable)
function handlePointerDown(e) {
  // Abaikan klik pada UI (dat.GUI)
  const path = e.composedPath && e.composedPath();
  if (path && path.some(el => el && el.classList && el.classList.contains('dg'))) return;

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(planetObjs.map(p => p.mesh), false);
  if (hits.length) {
    const hit = hits[0].object;
    const pobj = planetObjs.find(p => p.mesh === hit);
    if (pobj) {
      flyToPlanet(pobj);   // opsional: tetap terbang ke planetnya
      openOverlay(pobj);   // tampilkan overlay half-planet + paragraf
    }
  }
  // tidak ada infoPanel lagi
}

/* ============================
   Hover tooltip (light info)
   ============================ */
let hoveredPlanet = null;
let lastMouse = { x: 0, y: 0 };
let pointerInCanvas = false;

// bikin tooltip DOM
const hoverTip = document.createElement('div');
hoverTip.id = 'hoverTip';
Object.assign(hoverTip.style, {
  position: 'fixed',
  zIndex: '10',
  pointerEvents: 'none',
  padding: '10px 12px',
  borderRadius: '10px',
  font: '12px/1.35 system-ui, sans-serif',
  color: '#fff',
  background: 'rgba(0,0,0,.75)',
  border: '1px solid rgba(255,255,255,.15)',
  boxShadow: '0 6px 18px rgba(0,0,0,.35)',
  transform: 'translate(10px, 10px)',
  display: 'none',
  maxWidth: '280px'
});
document.body.appendChild(hoverTip);

function fullInfoHTML(name, def, facts) {
  const r   = facts.radius_km ? `${facts.radius_km.toLocaleString()} km` : '—';
  const y   = facts.orbital_period_days ? `${facts.orbital_period_days.toLocaleString()} days` : '—';
  const rot = (facts.rotation_hours !== undefined) ? `${facts.rotation_hours} hours` : '—';
  return `
    <div style="font-weight:700;font-size:14px;margin:-2px 0 8px">${name}</div>
    <div><b>Visual radius (units):</b> ${def.size}</div>
    <div><b>Orbit radius (units):</b> ${def.dist}</div>
    <div><b>Real radius:</b> ${r}</div>
    <div><b>Orbital period:</b> ${y}</div>
    <div><b>Rotation:</b> ${rot}</div>
    <div style="margin-top:8px;font-size:11px;opacity:.85">Klik planet untuk fly to</div>
  `;
}

// attach both to canvas and window as fallback
renderer.domElement.addEventListener('pointerdown', handlePointerDown);

// sudah ada listener pointermove di canvas — tambahkan update posisi mouse
renderer.domElement.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  lastMouse.x = e.clientX; lastMouse.y = e.clientY;
});

// tandai ketika mouse masuk/keluar canvas
renderer.domElement.addEventListener('pointerenter', () => { pointerInCanvas = true; });
renderer.domElement.addEventListener('pointerleave', () => {
  pointerInCanvas = false;
  hoveredPlanet = null;
  hoverTip.style.display = 'none';
});


/* ============================
   Hover detection & tooltip
   ============================ */
let lastHoverCheck = 0;
const HOVER_INTERVAL_MS = 60; // throttle ringan

function findPlanetByMesh(mesh) {
  return planetObjs.find(p => p.mesh === mesh) || null;
}

function updateHover() {
  if (!pointerInCanvas) return;

  // throttle
  const now = performance.now();
  if (now - lastHoverCheck < HOVER_INTERVAL_MS) return;
  lastHoverCheck = now;

  // raycast
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(planetObjs.map(p => p.mesh), false);

  if (hits.length) {
    const pobj = findPlanetByMesh(hits[0].object);
    if (pobj && hoveredPlanet !== pobj) {
      hoveredPlanet = pobj;
      const name = pobj.def.name;
      const facts = dataForInfo[name] || {};
      hoverTip.innerHTML = fullInfoHTML(name, pobj.def, facts);
      hoverTip.style.display = 'block';
    }
  } else {
    hoveredPlanet = null;
    hoverTip.style.display = 'none';
  }

  // posisikan tooltip di dekat kursor
  if (hoverTip.style.display !== 'none') {
    const pad = 12;
    let tx = lastMouse.x + pad;
    let ty = lastMouse.y + pad;

    // cegah tooltip keluar layar
    const w = hoverTip.offsetWidth, h = hoverTip.offsetHeight;
    if (tx + w > window.innerWidth - 6) tx = lastMouse.x - w - 8;
    if (ty + h > window.innerHeight - 6) ty = lastMouse.y - h - 8;

    hoverTip.style.left = `${tx}px`;
    hoverTip.style.top = `${ty}px`;
  }
}

/* ============================
   Camera fly-to (smooth lookAt)
   ============================ */
let isFlying = false;
let flyFrom = new THREE.Vector3();
let flyTo = new THREE.Vector3();
let flyTarget = new THREE.Vector3();
let flyStart = 0, flyDuration = 0;

function flyToPlanet(pobj, duration=1200) {
  flyFrom.copy(camera.position);
  const world = pobj.mesh.getWorldPosition(new THREE.Vector3());
  // offset relative to size - place camera slightly back and above
  const offset = new THREE.Vector3(0, Math.max(8, pobj.def.size + 8), pobj.def.size*3 + 12);
  flyTo.copy(world).add(offset);
  flyTarget.copy(world);
  flyStart = performance.now();
  flyDuration = duration;
  isFlying = true;
}

function updateFly() {
  if (!isFlying) return;
  const now = performance.now();
  const t = Math.min(1, (now - flyStart) / flyDuration);
  const ease = t<0.5 ? 2*t*t : -1 + (4 - 2*t)*t; // easeInOut
  camera.position.lerpVectors(flyFrom, flyTo, ease);
  camera.lookAt(flyTarget);
  if (t === 1) isFlying = false;
}

/* ============================
   GUI, HUD, keyboard controls
   ============================ */
let paused = false;
let simSpeed = 1.0;

const speedValEl = document.getElementById('speedVal');
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', ()=> {
    controls.reset();
    camera.position.set(-50,90,150);
    simSpeed = 1.0;
    if (speedValEl) speedValEl.innerText = simSpeed.toFixed(2);
    document.body.focus();
  });
}

// dat.GUI if present
if (window.dat && dat) {
  try {
    const gui = new dat.GUI();
    const opts = { 'Show path': true, 'Satellite (Bumi)': true, speed: 1.0, 'Real view': true };
    const optsFolder = gui.addFolder('Options');
    optsFolder.add(opts, 'Real view').onChange(v => { ambient.intensity = v ? 0.12 : 0.8; });
    optsFolder.add(opts, 'Show path').onChange(v => { planetObjs.forEach(p => { p.ring.visible = v; p.sprite.visible = v; }); });
    optsFolder.add(opts, 'Satellite (Bumi)').onChange(v => { if (earthObj && earthObj.satellite) earthObj.satellite.enabled = v; });
    const sp = optsFolder.add(opts, 'speed', 0, 20).name('Speed');
    sp.onChange(v => { simSpeed = v; if (speedValEl) speedValEl.innerText = simSpeed.toFixed(2); });
    // move gui to bottom-right via CSS (styles.css contains rule .dg.ac)
    const sunFolder = gui.addFolder('Sun Glow');
    sunFolder.add(sunSettings, 'lightIntensity', 0, 5, 0.01).name('Sun Light').onChange(applySunSettings);
    sunFolder.add(sunSettings, 'bloomStrength', 0, 2, 0.01).name('Bloom Strength').onChange(applySunSettings);
    sunFolder.add(sunSettings, 'bloomThreshold', 0, 1, 0.01).name('Bloom Threshold').onChange(applySunSettings);
    sunFolder.add(sunSettings, 'bloomRadius', 0, 2, 0.01).name('Bloom Radius').onChange(applySunSettings);
    sunFolder.add(sunSettings, 'coronaOpacity', 0, 0.5, 0.01).name('Corona Opacity').onChange(applySunSettings);
    sunFolder.add(sunSettings, 'flareFactor', 0, 1, 0.01).name('Flare Opacity').onChange(applySunSettings);
    sunFolder.addColor(sunSettings, 'color').name('Sun Color').onChange(applySunSettings);
  } catch (e) {
    console.warn('dat.GUI error', e);
  }
}

// Ensure keyboard events always come to window/body even if GUI focuses
function onKey(e) {
  if (e.code === 'Space') { paused = !paused; e.preventDefault(); }
  else if (e.code === 'ArrowUp') { simSpeed = Math.min(20, simSpeed + 0.1); if (speedValEl) speedValEl.innerText = simSpeed.toFixed(2); }
  else if (e.code === 'ArrowDown') { simSpeed = Math.max(0.1, simSpeed - 0.1); if (speedValEl) speedValEl.innerText = simSpeed.toFixed(2); }
  else if (e.code === 'KeyH') { planetObjs.forEach(p => { p.ring.visible = !p.ring.visible; p.sprite.visible = !p.sprite.visible; }); }
}
// attach on window and document.body for redundancy
window.addEventListener('keydown', onKey, false);
document.body.addEventListener('keydown', onKey, false);

/* ============================
   Animation loop & updates
   ============================ */
const clock = new THREE.Clock();

function update(dt) {
  if (!paused) {
    for (const p of planetObjs) {
      p.parent.rotation.y += (p.def.orbit || 0) * simSpeed;
      p.mesh.rotation.y += (p.def.spin || 0) * simSpeed;
      if (p.moon) {
        p.moon.parent.rotation.y += (p.moon.orbit || 0) * simSpeed;
        p.moon.mesh.rotation.y += (p.moon.spin || 0) * simSpeed;
      }
      if (p.satellite) {
        if (p.satellite.enabled) {
          p.satellite.parent.rotation.y += (p.satellite.orbit || 0) * simSpeed;
          p.satellite.mesh.rotation.y += (p.satellite.spin || 0) * simSpeed;
          p.satellite.mesh.visible = true;
        } else {
          p.satellite.mesh.visible = false;
        }
      }
      if (p.sprite) p.sprite.position.y = p.def.size + 1.0 + Math.sin(clock.elapsedTime * 0.5 + p.def.dist) * 0.06;
    }
    // sun pulse
    const s = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.02;
    sun.scale.set(s,s,s);
    corona.scale.set(1.03*s,1.03*s,1.03*s);
  }
  updateFly();
}

function render() {
  composer.render();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  update(dt);
  controls.update();

  // cek hover tiap frame (terthrottle di dalam fungsi)
  updateHover();

  render();
}
animate();

/* ============================
   Resize
   ============================ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================
   Helpful console notes
   ============================ */
console.log('Solar System enhanced (events fixed). If UI still not reactive: ensure styles.css is loaded and that UI elements exist in index.html.');
console.log('Textures expected in ./image/: sun.jpg, stars.jpg, earth.jpg, etc. Run a static server to avoid CORS (python -m http.server).');

