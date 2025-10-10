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
  mercury: './image/mercury.jpg', venus: './image/venus.jpg', earth: './image/earth.jpg',
  mars: './image/mars.jpg', jupiter: './image/jupiter.jpg', saturn: './image/saturn.jpg',
  satRing: './image/saturn_ring.png', uranus: './image/uranus.jpg', uraRing: './image/uranus_ring.png',
  neptune: './image/neptune.jpg', pluto: './image/pluto.jpg'
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
  { name:'Mercury', size:3.2, dist:28, orbit:0.004, spin:0.004, tex: paths.mercury },
  { name:'Venus',   size:5.8, dist:44, orbit:0.015, spin:0.002, tex: paths.venus },
  { name:'Earth',   size:6.0, dist:62, orbit:0.01, spin:0.02, tex: paths.earth },
  { name:'Mars',    size:4.0, dist:78, orbit:0.008, spin:0.018, tex: paths.mars },
  { name:'Jupiter', size:12.0, dist:100, orbit:0.002, spin:0.04, tex: paths.jupiter },
  { name:'Saturn',  size:10.0, dist:138, orbit:0.0009, spin:0.038, tex: paths.saturn, ring:{inner:10, outer:20, tex: paths.satRing} },
  { name:'Uranus',  size:7.0, dist:176, orbit:0.0004, spin:0.03, tex: paths.uranus, ring:{inner:7, outer:12, tex: paths.uraRing} },
  { name:'Neptune', size:7.0, dist:200, orbit:0.0001, spin:0.032, tex: paths.neptune },
  { name:'Pluto',   size:2.8, dist:216, orbit:0.0007, spin:0.008, tex: paths.pluto }
];

// Real facts for info panel
const dataForInfo = {
  Mercury: { radius_km: 2439.7, orbital_period_days: 88, rotation_hours: 1407.6 },
  Venus:   { radius_km: 6051.8, orbital_period_days: 224.7, rotation_hours: -5832.5 },
  Earth:   { radius_km: 6371.0, orbital_period_days: 365.25, rotation_hours: 23.93 },
  Mars:    { radius_km: 3389.5, orbital_period_days: 687, rotation_hours: 24.62 },
  Jupiter: { radius_km: 69911, orbital_period_days: 4333, rotation_hours: 9.92 },
  Saturn:  { radius_km: 58232, orbital_period_days: 10759, rotation_hours: 10.66 },
  Uranus:  { radius_km: 25362, orbital_period_days: 30687, rotation_hours: -17.24 },
  Neptune: { radius_km: 24622, orbital_period_days: 60190, rotation_hours: 16.11 },
  Pluto:   { radius_km: 1188.3, orbital_period_days: 90560, rotation_hours: -153.3 }
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
function addFlare() {
  const group = new THREE.Object3D();
  const params = [{scale:200,op:0.9},{scale:300,op:0.12},{scale:420,op:0.06}];
  for (const p of params) {
    const mat = new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, transparent:true, opacity:p.op, depthWrite:false });
    const sp = new THREE.Sprite(mat); sp.scale.set(p.scale,p.scale,1); sp.position.set(0,0,0); group.add(sp);
  }
  sun.add(group);
}
addFlare();

/* ============================
   Earth moon + satellite
   ============================ */
const earthObj = planetObjs.find(x => x.def.name === 'Earth');
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

const infoPanel = document.getElementById('infoPanel');
const infoTitle = document.getElementById('infoTitle');
const infoContent = document.getElementById('infoContent');
const closeInfo = document.getElementById('closeInfo');
closeInfo.addEventListener('click', ()=> infoPanel.style.display = 'none');

// handle pointer events on canvas first (more reliable)
function handlePointerDown(e) {
  // ignore clicks on UI (if clicked on an element with data-ui)
  // but simpler: if event target is inside a UI element, skip raycast
  const path = e.composedPath && e.composedPath();
  if (path && path.some(el => el && el.id && (el.id === 'hud' || el.id === 'infoPanel' || el.classList && el.classList.contains('dg'))) ) {
    return;
  }
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = planetObjs.map(p => p.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length) {
    const hit = hits[0].object;
    const p = planetObjs.find(pp => pp.mesh === hit);
    if (p) showPlanetInfo(p);
  } else {
    infoPanel.style.display = 'none';
  }
}

// attach both to canvas and window as fallback
renderer.domElement.addEventListener('pointerdown', handlePointerDown);
window.addEventListener('pointerdown', handlePointerDown);

// also pointermove on canvas to update pointer (not strictly required here)
renderer.domElement.addEventListener('pointermove', (e)=>{
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (e.clientY / window.innerHeight) * 2 + 1;
});

/* show info panel and action buttons */
function showPlanetInfo(pobj) {
  const name = pobj.def.name;
  const facts = dataForInfo[name] || {};
  infoTitle.innerText = name;
  infoContent.innerHTML = `
    <strong>Visual radius (units):</strong> ${pobj.def.size}<br>
    <strong>Orbit radius (units):</strong> ${pobj.def.dist}<br>
    <strong>Real radius:</strong> ${facts.radius_km ? facts.radius_km.toLocaleString() + ' km' : '—'}<br>
    <strong>Orbital period:</strong> ${facts.orbital_period_days ? facts.orbital_period_days.toLocaleString() + ' days' : '—'}<br>
    <strong>Rotation:</strong> ${facts.rotation_hours ? facts.rotation_hours + ' hours' : '—'}<br>
    <div style="margin-top:8px;font-size:12px;color:#ccc;">Click the buttons to Fly or toggle satellite (Earth).</div>
    <div style="margin-top:6px;">
      <button id="focusBtn" class="btn">Fly to</button>
      ${pobj.satellite ? `<button id="toggleSatBtn" class="btn">${pobj.satellite.enabled ? 'Disable' : 'Enable'} Satellite</button>` : ''}
    </div>
  `;
  infoPanel.style.display = 'block';

  document.getElementById('focusBtn').onclick = ()=> flyToPlanet(pobj);
  if (pobj.satellite) {
    const togg = document.getElementById('toggleSatBtn');
    togg.onclick = () => { pobj.satellite.enabled = !pobj.satellite.enabled; togg.innerText = pobj.satellite.enabled ? 'Disable Satellite' : 'Enable Satellite'; };
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
    const opts = { 'Show path': true, 'Satellite (Earth)': true, speed: 1.0, 'Real view': true };
    gui.add(opts, 'Real view').onChange(v => { ambient.intensity = v ? 0.12 : 0.8; });
    gui.add(opts, 'Show path').onChange(v => { planetObjs.forEach(p => { p.ring.visible = v; p.sprite.visible = v; }); });
    gui.add(opts, 'Satellite (Earth)').onChange(v => { if (earthObj && earthObj.satellite) earthObj.satellite.enabled = v; });
    const sp = gui.add(opts, 'speed', 0, 20).name('Speed');
    sp.onChange(v => { simSpeed = v; if (speedValEl) speedValEl.innerText = simSpeed.toFixed(2); });
    // move gui to bottom-right via CSS (styles.css contains rule .dg.ac)
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

