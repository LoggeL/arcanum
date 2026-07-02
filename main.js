// ============ Arcanum — Entkomme dem Turm des Erzmagiers ============
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ---------- Grundgerüst ----------

const ROOM_RADIUS = 9;
const WALL_HEIGHT = 5.5;
const EYE_HEIGHT = 1.7;

// Level 2: Das Observatorium
const R2 = 7.5;
const C2Z = -22.3;
const WALL2_H = 6.2;

const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0a1a);
scene.fog = new THREE.FogExp2(0x0d0a1a, 0.028);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, EYE_HEIGHT, 4.5);
camera.rotation.order = 'YXZ';

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Toon-Verlauf: vier harte Stufen für den Märchenbuch-Look
const gradientData = new Uint8Array([60, 60, 60, 255, 120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
const gradientMap = new THREE.DataTexture(gradientData, 4, 1, THREE.RGBAFormat);
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap, ...opts });
}

// ---------- Licht ----------

scene.add(new THREE.HemisphereLight(0x4a5588, 0x2a1f14, 0.65));

const torchLights = [];
function makeTorch(angle) {
  const g = new THREE.Group();
  const r = ROOM_RADIUS - 0.45;
  g.position.set(Math.sin(angle) * r, 2.6, Math.cos(angle) * r);
  g.lookAt(0, 2.6, 0);

  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6), toon(0x4a3220));
  stick.rotation.x = Math.PI / 4;
  g.add(stick);

  const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 10), toon(0x3a3a44));
  bracket.position.set(0, 0.05, 0.12);
  g.add(bracket);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.42, 7),
    new THREE.MeshBasicMaterial({ color: 0xffb347 })
  );
  flame.position.set(0, 0.5, 0.25);
  g.add(flame);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff0b0 })
  );
  glow.position.copy(flame.position).y -= 0.12;
  g.add(glow);

  const light = new THREE.PointLight(0xff8c3a, 26, 16, 2);
  light.position.copy(flame.position);
  g.add(light);

  torchLights.push({ light, flame, seed: Math.random() * 100 });
  scene.add(g);
}
[Math.PI * 0.3, Math.PI * 0.7, Math.PI * 1.3, Math.PI * 1.7].forEach(makeTorch);

// ---------- Der Turmraum ----------

const DOOR_THETA_GAP = 0.28; // Wandlücke für die Tür (bei -Z, also theta = PI)
const wall = new THREE.Mesh(
  new THREE.CylinderGeometry(ROOM_RADIUS, ROOM_RADIUS, WALL_HEIGHT, 48, 1, true, Math.PI + DOOR_THETA_GAP / 2, Math.PI * 2 - DOOR_THETA_GAP),
  toon(0x565b70, { side: THREE.BackSide })
);
wall.position.y = WALL_HEIGHT / 2;
scene.add(wall);

const floor = new THREE.Mesh(new THREE.CircleGeometry(ROOM_RADIUS, 48), toon(0x6b4a2e));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Sockelleiste aus dunklem Stein
const skirt = new THREE.Mesh(
  new THREE.CylinderGeometry(ROOM_RADIUS - 0.05, ROOM_RADIUS + 0.1, 0.5, 48, 1, true, Math.PI + DOOR_THETA_GAP / 2, Math.PI * 2 - DOOR_THETA_GAP),
  toon(0x3a3d4d, { side: THREE.BackSide })
);
skirt.position.y = 0.25;
scene.add(skirt);

const ceiling = new THREE.Mesh(new THREE.CircleGeometry(ROOM_RADIUS, 48), toon(0x2c2438));
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = WALL_HEIGHT;
scene.add(ceiling);

// Deckenbalken
for (let i = 0; i < 6; i++) {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, ROOM_RADIUS * 2 - 0.6), toon(0x4a3220));
  beam.position.y = WALL_HEIGHT - 0.12;
  beam.rotation.y = (i / 6) * Math.PI;
  scene.add(beam);
}

// Teppich
const carpet = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), toon(0x7a2230));
carpet.rotation.x = -Math.PI / 2;
carpet.position.y = 0.01;
scene.add(carpet);
const carpetRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 2.75, 32), toon(0xc9a227));
carpetRing.rotation.x = -Math.PI / 2;
carpetRing.position.y = 0.02;
scene.add(carpetRing);

// Bogenfenster mit Nachthimmel + Mond
function makeWindow(angle, withMoon) {
  const g = new THREE.Group();
  const r = ROOM_RADIUS - 0.15;
  g.position.set(Math.sin(angle) * r, 3.1, Math.cos(angle) * r);
  g.lookAt(0, 3.1, 0);

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.6),
    new THREE.MeshBasicMaterial({ color: 0x1e2a55 })
  );
  g.add(sky);

  const arch = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 16, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x1e2a55 })
  );
  arch.position.y = 0.8;
  g.add(arch);

  if (withMoon) {
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 20),
      new THREE.MeshBasicMaterial({ color: 0xe8ecff })
    );
    moon.position.set(0.18, 0.55, 0.02);
    g.add(moon);
    const moonlight = new THREE.PointLight(0x8aa0ff, 6, 10, 2);
    moonlight.position.z = 1;
    g.add(moonlight);
  }

  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.3), toon(0x3a3d4d));
  sill.position.set(0, -0.85, 0.1);
  g.add(sill);

  scene.add(g);
}
makeWindow(Math.PI * 0.5, true);
makeWindow(Math.PI * 1.5, false);
makeWindow(0, false);

// Schwebender Kristall unter der Decke
const crystal = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.45),
  new THREE.MeshBasicMaterial({ color: 0x7de8e0 })
);
crystal.position.set(0, WALL_HEIGHT - 1.2, 0);
scene.add(crystal);
const crystalLight = new THREE.PointLight(0x5fd8d0, 10, 14, 2);
crystalLight.position.copy(crystal.position);
scene.add(crystalLight);

// Staub in der Luft
const dustCount = 220;
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  const a = Math.random() * Math.PI * 2;
  const rr = Math.random() * (ROOM_RADIUS - 1);
  dustPos[i * 3] = Math.sin(a) * rr;
  dustPos[i * 3 + 1] = Math.random() * WALL_HEIGHT;
  dustPos[i * 3 + 2] = Math.cos(a) * rr;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0xf0c84a, size: 0.035, transparent: true, opacity: 0.55, sizeAttenuation: true,
}));
scene.add(dust);

// ---------- Interaktion: Registry ----------

const interactables = [];
function register(object, label, onUse) {
  const entry = { object, label, onUse, enabled: true };
  object.traverse((c) => { c.userData.entry = entry; });
  object.userData.entry = entry;
  interactables.push(entry);
  return entry;
}

// ---------- Kollision ----------

const colliders = []; // { x, z, r }
function block(x, z, r) { colliders.push({ x, z, r }); }

// ---------- Möbel & Rätselobjekte ----------

const RUNES = {
  feuer: { name: 'Feuerrune', glyph: 'ᚠ', color: 0xff5a3c },
  mond: { name: 'Mondrune', glyph: 'ᛗ', color: 0x8aa0ff },
  stern: { name: 'Sternenrune', glyph: 'ᛏ', color: 0xf0c84a },
};

function runeStone(runeKey, scale = 1) {
  const rune = RUNES[runeKey];
  const g = new THREE.Group();
  const stone = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.16 * scale),
    new THREE.MeshBasicMaterial({ color: rune.color })
  );
  g.add(stone);
  const halo = new THREE.PointLight(rune.color, 3, 3, 2);
  g.add(halo);
  g.userData.spin = true;
  return g;
}

// --- Schreibtisch mit Zauberbuch ---
{
  const desk = new THREE.Group();
  desk.position.set(5.8, 0, 2.8);
  desk.rotation.y = -Math.PI / 3;

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), toon(0x5a3a22));
  top.position.y = 0.95;
  desk.add(top);
  for (const [dx, dz] of [[-0.95, -0.4], [0.95, -0.4], [-0.95, 0.4], [0.95, 0.4]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), toon(0x4a2e1a));
    leg.position.set(dx, 0.47, dz);
    desk.add(leg);
  }

  // aufgeschlagenes Buch
  const book = new THREE.Group();
  book.position.set(0.1, 1.04, 0);
  const pageL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.6), toon(0xe9d8ab));
  pageL.position.x = -0.21; pageL.rotation.z = 0.12;
  const pageR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.6), toon(0xe9d8ab));
  pageR.position.x = 0.21; pageR.rotation.z = -0.12;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.04, 0.66), toon(0x6b1f2a));
  spine.position.y = -0.04;
  book.add(pageL, pageR, spine);
  desk.add(book);

  // Tintenfass + Feder
  const ink = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8), toon(0x22263a));
  ink.position.set(-0.7, 1.07, -0.25);
  desk.add(ink);
  const quill = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.5, 5), toon(0xdde4f0));
  quill.position.set(-0.68, 1.3, -0.24);
  quill.rotation.z = 0.5;
  desk.add(quill);

  // Weinflasche (Decoy)
  const bottle = new THREE.Group();
  const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.3, 10), toon(0x2e4a2e));
  bottleBody.position.y = 0.15;
  const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.14, 8), toon(0x2e4a2e));
  bottleNeck.position.y = 0.36;
  bottle.add(bottleBody, bottleNeck);
  bottle.position.set(0.85, 1.01, 0.3);
  desk.add(bottle);
  register(bottle, 'Weinflasche', () => {
    toast('Ein 300 Jahre alter Elfenwein. Der Korken sitzt fester als das Türsiegel.');
    sound.thud();
  });

  scene.add(desk);
  block(5.8, 2.8, 1.5);

  register(book, 'Zauberbuch lesen', () => {
    openReading('Vom Wesen der vier Flammen', `
      <p>»Wer das Wächterfeuer wecken will, entzünde die Kerzen, wie die Welt entstand:</p>
      <p><i>Zuerst erwacht die <b>Sonne</b>,<br>
      dann vergießt das Herz sein <b>Blut</b>,<br>
      es folgt das tiefe <b>Meer</b>,<br>
      und zuletzt schweigt der <b>Wald</b>.</i>«</p>
      <p>Darunter, hastig gekritzelt: <i>Schlüssel wieder in die Schatulle legen!! Nicht vergessen!!</i></p>
    `);
    if (state.objectivePhase === 0) setObjective(1);
  });
}

// --- Bücherregal mit Mondrune ---
{
  const shelf = new THREE.Group();
  shelf.position.set(-6.6, 0, 3.2);
  shelf.lookAt(0, 0, 0);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 0.5), toon(0x4a2e1a));
  frame.position.y = 1.6;
  shelf.add(frame);

  const bookColors = [0x7a2230, 0x2e4a6b, 0x3f6b3a, 0xc9a227, 0x6b3a7a, 0x8c4a2e];
  for (let row = 0; row < 4; row++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.46), toon(0x5a3a22));
    board.position.set(0, 0.5 + row * 0.72, 0.03);
    shelf.add(board);
    let x = -1.05;
    while (x < 0.95) {
      const w = 0.1 + Math.random() * 0.14;
      const h = 0.38 + Math.random() * 0.22;
      // eine Lücke pro Regal lassen
      if (Math.random() < 0.12) { x += 0.25; continue; }
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.3),
        toon(bookColors[Math.floor(Math.random() * bookColors.length)])
      );
      b.position.set(x + w / 2, 0.53 + row * 0.72 + h / 2, 0.08);
      b.rotation.z = (Math.random() - 0.5) * 0.08;
      shelf.add(b);
      x += w + 0.02;
    }
  }

  // Mondrune zwischen den Büchern
  const moonRune = runeStone('mond', 0.9);
  moonRune.position.set(0.4, 2.0, 0.3);
  shelf.add(moonRune);
  register(moonRune, 'Mondrune nehmen', (entry) => {
    collectRune('mond', entry, moonRune);
  });

  // Schädel auf dem Regal (Decoy)
  const skull = new THREE.Group();
  const skullDome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), toon(0xd8cfb8));
  const skullJaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.14), toon(0xc8bfa8));
  skullJaw.position.set(0, -0.1, 0.02);
  skull.add(skullDome, skullJaw);
  skull.position.set(-0.75, 3.0, 0.15);
  shelf.add(skull);
  register(skull, 'Schädel betrachten', () => {
    toast('Der Schädel grinst. Er weiß etwas — aber er sagt nichts.');
    sound.thud();
  });

  scene.add(shelf);
  block(-6.6, 3.2, 1.7);
}

// --- Kessel mit Feuerrune ---
{
  const cauldron = new THREE.Group();
  cauldron.position.set(5.2, 0, -3.4);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), toon(0x2c2f3a));
  body.scale.y = 0.85;
  body.position.y = 0.75;
  cauldron.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 8, 20), toon(0x3a3d4d));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.32;
  cauldron.add(rim);
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), toon(0x22242e));
    const a = (i / 3) * Math.PI * 2;
    leg.position.set(Math.sin(a) * 0.5, 0.2, Math.cos(a) * 0.5);
    cauldron.add(leg);
  }

  // grünes Gebräu
  const brew = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ color: 0x52d273 }));
  brew.rotation.x = -Math.PI / 2;
  brew.position.y = 1.28;
  cauldron.add(brew);
  const brewLight = new THREE.PointLight(0x52d273, 7, 6, 2);
  brewLight.position.y = 1.7;
  cauldron.add(brewLight);

  scene.add(cauldron);
  block(5.2, -3.4, 1.2);

  register(cauldron, 'Im Kessel wühlen', (entry) => {
    if (entry.searched) return;
    entry.searched = true;
    entry.label = 'Kessel';
    const fireRune = runeStone('feuer', 0.9);
    fireRune.position.set(5.2, 1.55, -3.4);
    scene.add(fireRune);
    toast('Zwischen Kräuterresten und etwas, das besser unbenannt bleibt: eine Feuerrune!');
    sound.pickup();
    register(fireRune, 'Feuerrune nehmen', (e2) => collectRune('feuer', e2, fireRune));
  });
}

// --- Kisten mit Sternenrune ---
{
  const crates = new THREE.Group();
  crates.position.set(1.6, 0, 6.4);
  crates.rotation.y = 0.4;

  const c1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon(0x6b4a2e));
  c1.position.y = 0.5;
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), toon(0x5a3a22));
  c2.position.set(1, 0.4, 0.2);
  c2.rotation.y = 0.5;
  const c3 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), toon(0x7a5a3a));
  c3.position.set(0.3, 1.35, 0);
  c3.rotation.y = -0.3;
  crates.add(c1, c2, c3);
  scene.add(crates);
  block(1.9, 6.4, 1.4);

  const starRune = runeStone('stern', 0.9);
  starRune.position.set(2.3, 0.45, 5.5);
  scene.add(starRune);
  register(starRune, 'Sternenrune nehmen', (entry) => collectRune('stern', entry, starRune));
}

// --- Falsche Rune auf der Fensterbank (Decoy) ---
{
  const fakeRune = new THREE.Group();
  const stone = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.15),
    new THREE.MeshBasicMaterial({ color: 0x8a8a92 })
  );
  fakeRune.add(stone);
  fakeRune.position.set(0, 2.35, 8.55);
  fakeRune.userData.spin = true;
  scene.add(fakeRune);
  register(fakeRune, 'Graue Rune nehmen', (entry) => {
    entry.enabled = false;
    scene.remove(fakeRune);
    toast('Die graue Rune zerbröselt zu Staub in deiner Hand. Eine Fälschung — der Erzmagier traut niemandem.');
    sound.thud();
  });
}

// --- Standspiegel (Decoy) ---
{
  const mirror = new THREE.Group();
  mirror.position.set(-3.4, 0, 6.9);
  mirror.lookAt(0, 0, 0);

  const mFrame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.3, 0.1), toon(0x4a2e1a));
  mFrame.position.y = 1.35;
  mFrame.rotation.x = -0.08;
  mirror.add(mFrame);
  const mGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.05), new THREE.MeshBasicMaterial({ color: 0x9ab0c8 }));
  mGlass.position.set(0, 1.35, 0.06);
  mGlass.rotation.x = -0.08;
  mirror.add(mGlass);
  for (const dx of [-0.35, 0.35]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), toon(0x3a2414));
    foot.position.set(dx, 0.05, 0);
    mirror.add(foot);
  }

  scene.add(mirror);
  block(-3.4, 6.9, 0.9);

  let mirrorLooks = 0;
  register(mirror, 'In den Spiegel schauen', () => {
    mirrorLooks++;
    const lines = [
      'Dein Spiegelbild zuckt mit den Schultern. Keine Hilfe.',
      'Dein Spiegelbild tippt sich vielsagend an die Stirn und deutet … irgendwohin.',
      'Dein Spiegelbild ist kurz verschwunden. Du beschließt, nicht darüber nachzudenken.',
    ];
    toast(lines[(mirrorLooks - 1) % lines.length]);
    sound.thud();
  });
}

// --- Mauseloch (Decoy) ---
{
  const holeAngle = 1.05;
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 12, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x0a0810 })
  );
  const hr = ROOM_RADIUS - 0.12;
  hole.position.set(Math.sin(holeAngle) * hr, 0.5, Math.cos(holeAngle) * hr);
  hole.lookAt(0, 0.5, 0);
  scene.add(hole);
  register(hole, 'Mauseloch untersuchen', () => {
    toast('Ein Mauseloch. Du passt nicht hindurch. Wirklich nicht. Auch nicht mit Magie.');
    sound.thud();
  });
}

// --- Kerzentisch (Rätsel 2) ---
const CANDLE_ORDER = ['gold', 'rot', 'blau', 'gruen'];
const CANDLE_DEFS = {
  gold: { color: 0xf0c84a, name: 'die goldene Kerze' },
  rot: { color: 0xc23a3a, name: 'die rote Kerze' },
  blau: { color: 0x3a6bc2, name: 'die blaue Kerze' },
  gruen: { color: 0x3f8c3a, name: 'die grüne Kerze' },
};
const candles = {};
{
  const table = new THREE.Group();
  table.position.set(-5.4, 0, -3.6);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 20), toon(0x5a3a22));
  top.position.y = 0.9;
  table.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.9, 8), toon(0x4a2e1a));
  leg.position.y = 0.45;
  table.add(leg);

  const spots = { gold: [-0.45, -0.3], rot: [0.45, -0.3], blau: [-0.45, 0.4], gruen: [0.45, 0.4] };
  for (const key of Object.keys(spots)) {
    const def = CANDLE_DEFS[key];
    const [cx, cz] = spots[key];
    const g = new THREE.Group();
    g.position.set(cx, 0.95, cz);

    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.45, 10), toon(def.color));
    wax.position.y = 0.22;
    g.add(wax);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 7), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    flame.position.y = 0.55;
    flame.visible = false;
    g.add(flame);
    const light = new THREE.PointLight(def.color, 0, 4, 2);
    light.position.y = 0.6;
    g.add(light);

    table.add(g);
    candles[key] = { group: g, flame, light, lit: false };
    register(g, `${def.name[0].toUpperCase()}${def.name.slice(1)} entzünden`, () => lightCandle(key));
  }

  scene.add(table);
  block(-5.4, -3.6, 1.2);
}

// --- Schatulle mit Schlüssel ---
let chest, chestLid;
{
  chest = new THREE.Group();
  chest.position.set(-6.9, 0, -1.2);
  chest.lookAt(0, 0, 0);

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.65), toon(0x6b3a1a));
  base.position.y = 0.25;
  chest.add(base);

  chestLid = new THREE.Group();
  chestLid.position.set(0, 0.5, -0.32);
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.65), toon(0x7a4a26));
  lidMesh.position.set(0, 0.11, 0.32);
  chestLid.add(lidMesh);
  chest.add(chestLid);

  for (const dx of [-0.4, 0.4]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.68), toon(0xc9a227));
    band.position.set(dx, 0.26, 0);
    chest.add(band);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.08), toon(0xc9a227));
  lock.position.set(0, 0.45, 0.36);
  chest.add(lock);

  scene.add(chest);
  block(-6.9, -1.2, 1.0);

  register(chest, 'Schatulle öffnen', (entry) => {
    if (!state.candlesSolved) {
      toast('Verschlossen. Vier kalte Kerzen wachen darüber — vielleicht wollen sie zuerst brennen.');
      sound.thud();
      return;
    }
    if (state.chestOpened) return;
    state.chestOpened = true;
    entry.label = 'Schatulle';
    animations.push({ t: 0, dur: 0.8, fn: (k) => { chestLid.rotation.x = -k * 1.9; } });
    const key = new THREE.Group();
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), new THREE.MeshBasicMaterial({ color: 0xf0c84a }));
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), new THREE.MeshBasicMaterial({ color: 0xf0c84a }));
    shaft.position.y = -0.16;
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0xf0c84a }));
    bit.position.set(0.04, -0.26, 0);
    key.add(bow, shaft, bit);
    key.position.copy(chest.position).y = 0.75;
    key.userData.spin = true;
    const keyLight = new THREE.PointLight(0xf0c84a, 3, 3, 2);
    key.add(keyLight);
    scene.add(key);
    toast('Die Schatulle springt auf. Darin: ein Messingschlüssel.');
    sound.success();
    register(key, 'Messingschlüssel nehmen', (e2) => {
      e2.enabled = false;
      scene.remove(key);
      state.hasKey = true;
      fillSlot('key');
      toast('Der Messingschlüssel ist warm, als hätte ihn nie jemand abgelegt.');
      sound.pickup();
      updateObjective();
    });
  });
}

// --- Sockel vor der Tür (Rätsel 1) ---
const pedestals = [];
{
  const positions = [[-2.4, -4.6], [0, -5.3], [2.4, -4.6]];
  for (let i = 0; i < 3; i++) {
    const [px, pz] = positions[i];
    const g = new THREE.Group();
    g.position.set(px, 0, pz);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.1, 10), toon(0x565b70));
    column.position.y = 0.55;
    g.add(column);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.14, 10), toon(0x3a3d4d));
    cap.position.y = 1.15;
    g.add(cap);

    scene.add(g);
    block(px, pz, 0.65);

    const ped = { group: g, filled: false };
    pedestals.push(ped);
    register(g, 'Rune einsetzen', () => placeRune(ped));
  }
}

// --- Die versiegelte Tür ---
let doorPivot, sealRing, sealLight;
{
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, -ROOM_RADIUS + 0.1);

  // Rahmen
  for (const dx of [-1.25, 1.25]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.8, 0.7), toon(0x3a3d4d));
    post.position.set(dx, 1.9, 0);
    doorGroup.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.5, 0.7), toon(0x3a3d4d));
  lintel.position.y = 3.85;
  doorGroup.add(lintel);
  const filler = new THREE.Mesh(new THREE.BoxGeometry(2.95, WALL_HEIGHT - 4.1, 0.4), toon(0x565b70));
  filler.position.y = 4.1 + (WALL_HEIGHT - 4.1) / 2;
  doorGroup.add(filler);

  // Türflügel mit Angel links
  doorPivot = new THREE.Group();
  doorPivot.position.set(-1.0, 0, 0);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.18), toon(0x4a2e1a));
  panel.position.set(1.0, 1.8, 0);
  doorPivot.add(panel);
  for (const by of [0.9, 2.7]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.22), toon(0x2c2f3a));
    band.position.set(1.0, by, 0);
    doorPivot.add(band);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(0xc9a227));
  knob.position.set(1.75, 1.7, 0.14);
  doorPivot.add(knob);
  doorGroup.add(doorPivot);

  // Magisches Siegel
  sealRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.05, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xb05aff, transparent: true, opacity: 0.95 })
  );
  sealRing.position.set(0, 1.9, 0.25);
  doorGroup.add(sealRing);
  const sealInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.03, 8, 30),
    new THREE.MeshBasicMaterial({ color: 0xb05aff, transparent: true, opacity: 0.8 })
  );
  sealInner.position.copy(sealRing.position);
  sealInner.userData.counter = true;
  sealRing.userData.inner = sealInner;
  doorGroup.add(sealInner);
  sealLight = new THREE.PointLight(0xb05aff, 9, 8, 2);
  sealLight.position.set(0, 1.9, 1);
  doorGroup.add(sealLight);

  scene.add(doorGroup);

  register(doorPivot, 'Tür', () => {
    if (state.doorOpen) return;
    if (!state.sealBroken) {
      toast('Die Tür ist magisch versiegelt. Drei leere Sockel starren dich erwartungsvoll an.');
      sound.thud();
    } else if (!state.hasKey) {
      toast('Das Siegel ist gebrochen, doch das Schloss hält. Ein Schlüsselloch glimmt golden.');
      sound.thud();
    } else {
      openDoor();
    }
  });
}

// --- Der Gang zwischen den Räumen ---
{
  const hallway = new THREE.Group();
  hallway.position.set(0, 0, -ROOM_RADIUS);
  const hwFloor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 6.4), toon(0x3a3d4d));
  hwFloor.position.set(0, -0.05, -3.2);
  hallway.add(hwFloor);
  for (const dx of [-1.3, 1.3]) {
    const hwWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 6.0), toon(0x2c2f3a));
    hwWall.position.set(dx, 2, -3.0);
    hallway.add(hwWall);
  }
  const hwCeil = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 6.0), toon(0x22242e));
  hwCeil.position.set(0, 4, -3.0);
  hallway.add(hwCeil);
  // eine einsame Laterne im Gang
  const hallLight = new THREE.PointLight(0xffc878, 8, 8, 2);
  hallLight.position.set(0, 3.2, -3.0);
  hallway.add(hallLight);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8 }));
  lantern.position.set(0, 3.2, -3.0);
  hallway.add(lantern);
  scene.add(hallway);
}

// --- Die Eichentür zum Observatorium ---
let door2Pivot;
{
  const d2 = new THREE.Group();
  d2.position.set(0, 0, -14.9);

  for (const dx of [-1.15, 1.15]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.5), toon(0x3a3d4d));
    post.position.set(dx, 1.8, 0);
    d2.add(post);
  }
  const lintel2 = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.45, 0.5), toon(0x3a3d4d));
  lintel2.position.y = 3.6;
  d2.add(lintel2);

  door2Pivot = new THREE.Group();
  door2Pivot.position.set(-0.95, 0, 0);
  const panel2 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.4, 0.16), toon(0x5a3a22));
  panel2.position.set(0.95, 1.7, 0);
  door2Pivot.add(panel2);
  // eingeschnitztes Sternsymbol
  const starMark = new THREE.Mesh(new THREE.CircleGeometry(0.28, 5), new THREE.MeshBasicMaterial({ color: 0x8aa0ff }));
  starMark.position.set(0.95, 2.2, 0.09);
  door2Pivot.add(starMark);
  const knob2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), toon(0xc9a227));
  knob2.position.set(1.65, 1.6, 0.12);
  door2Pivot.add(knob2);
  d2.add(door2Pivot);

  scene.add(d2);

  register(door2Pivot, 'Eichentür öffnen', () => {
    if (state.door2Open) return;
    state.door2Open = true;
    sound.door();
    toast('Die Eichentür schwingt auf. Dahinter: ein Gewölbe voller gemalter Sterne.');
    animations.push({
      t: 0, dur: 1.6, fn: (k) => {
        const e = 1 - Math.pow(1 - k, 3);
        door2Pivot.rotation.y = -e * 1.9;
      }
    });
    setObjective(6);
  });
}

// ---------- Level 2: Das Observatorium ----------

const ORB_ORDER = ['violett', 'tuerkis', 'bernstein', 'smaragd'];
const ORB_DEFS = {
  violett: { color: 0xb05aff, name: 'Drachenauge' },
  tuerkis: { color: 0x5fd8d0, name: 'Nixenträne' },
  bernstein: { color: 0xf0a23c, name: 'Phönixherz' },
  smaragd: { color: 0x52d273, name: 'Waldkrone' },
};
const orbs = {};
let portalRing, portalDisc, portalLight, portalBeam;

function obsPos(theta, r) {
  return [Math.sin(theta) * r, C2Z + Math.cos(theta) * r];
}

{
  // Wand mit Eingangslücke Richtung Gang (+Z)
  const gap2 = 0.36;
  const wall2 = new THREE.Mesh(
    new THREE.CylinderGeometry(R2, R2, WALL2_H, 48, 1, true, gap2 / 2, Math.PI * 2 - gap2),
    toon(0x3d4258, { side: THREE.BackSide })
  );
  wall2.position.set(0, WALL2_H / 2, C2Z);
  scene.add(wall2);

  const floor2 = new THREE.Mesh(new THREE.CircleGeometry(R2, 48), toon(0x413a55));
  floor2.rotation.x = -Math.PI / 2;
  floor2.position.set(0, 0.012, C2Z);
  scene.add(floor2);

  const ceiling2 = new THREE.Mesh(new THREE.CircleGeometry(R2, 48), toon(0x100c20));
  ceiling2.rotation.x = Math.PI / 2;
  ceiling2.position.set(0, WALL2_H, C2Z);
  scene.add(ceiling2);

  // Okulus mit Mondlicht über dem Portal
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), new THREE.MeshBasicMaterial({ color: 0x1e2a55 }));
  oculus.rotation.x = Math.PI / 2;
  oculus.position.set(0, WALL2_H - 0.02, C2Z);
  scene.add(oculus);
  const oculusMoon = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshBasicMaterial({ color: 0xe8ecff }));
  oculusMoon.rotation.x = Math.PI / 2;
  oculusMoon.position.set(0.35, WALL2_H - 0.04, C2Z - 0.3);
  scene.add(oculusMoon);
  const oculusLight = new THREE.PointLight(0x8aa0ff, 12, 14, 2);
  oculusLight.position.set(0, WALL2_H - 1, C2Z);
  scene.add(oculusLight);

  // Sternenhimmel an der Decke
  const starCount = 180;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = 1.6 + Math.random() * (R2 - 2.1);
    starPos[i * 3] = Math.sin(a) * rr;
    starPos[i * 3 + 1] = WALL2_H - 0.1 - Math.random() * 0.4;
    starPos[i * 3 + 2] = C2Z + Math.cos(a) * rr;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xdde8ff, size: 0.05, transparent: true, opacity: 0.9, sizeAttenuation: true,
  }));
  scene.add(stars);

  // blaue Wandkristalle als Lichtquellen
  for (const theta of [Math.PI * 0.55, Math.PI * 1.45]) {
    const [sx, sz] = obsPos(theta, R2 - 0.4);
    const sconce = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0x9ab8ff }));
    sconce.position.set(sx, 2.8, sz);
    scene.add(sconce);
    const sl = new THREE.PointLight(0x6a86e8, 14, 12, 2);
    sl.position.set(sx, 2.9, sz);
    scene.add(sl);
  }

  // --- Der Portalkreis (Ausgang) ---
  portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.07, 10, 48),
    new THREE.MeshBasicMaterial({ color: 0x7de8e0, transparent: true, opacity: 0.25 })
  );
  portalRing.rotation.x = Math.PI / 2;
  portalRing.position.set(0, 0.06, C2Z);
  scene.add(portalRing);

  portalDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 32),
    new THREE.MeshBasicMaterial({ color: 0x7de8e0, transparent: true, opacity: 0 })
  );
  portalDisc.rotation.x = -Math.PI / 2;
  portalDisc.position.set(0, 0.04, C2Z);
  scene.add(portalDisc);

  portalBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.05, WALL2_H - 0.2, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x7de8e0, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  portalBeam.position.set(0, WALL2_H / 2, C2Z);
  scene.add(portalBeam);

  portalLight = new THREE.PointLight(0x7de8e0, 0, 12, 2);
  portalLight.position.set(0, 1.5, C2Z);
  scene.add(portalLight);

  register(portalRing, 'Portalkreis', () => {
    if (state.portalOpen) {
      toast('Das Portal summt einladend. Tritt einfach hinein!');
    } else {
      toast('Ein erloschener Portalkreis. Vier dunkle Kugeln stehen ringsum — sie schlafen noch.');
      sound.thud();
    }
  });

  // --- Vier Kristallkugeln auf Sockeln ---
  const orbThetas = { violett: 0.9, tuerkis: 2.2, bernstein: 4.08, smaragd: 5.38 };
  for (const key of Object.keys(orbThetas)) {
    const def = ORB_DEFS[key];
    const [ox, oz] = obsPos(orbThetas[key], 5.4);
    const g = new THREE.Group();
    g.position.set(ox, 0, oz);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 1.05, 10), toon(0x4a4560));
    column.position.y = 0.52;
    g.add(column);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.12, 10), toon(0x2f2b40));
    cap.position.y = 1.1;
    g.add(cap);

    const orbMat = new THREE.MeshBasicMaterial({ color: 0x39304a });
    const orbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), orbMat);
    orbMesh.position.y = 1.42;
    g.add(orbMesh);
    const orbLight = new THREE.PointLight(def.color, 0, 5, 2);
    orbLight.position.y = 1.5;
    g.add(orbLight);

    scene.add(g);
    block(ox, oz, 0.6);

    orbs[key] = { mesh: orbMesh, mat: orbMat, light: orbLight, on: false, def };
    register(g, `Kristallkugel berühren`, () => touchOrb(key));
  }

  // --- Lesepult mit Sternenkarte ---
  {
    const [lx, lz] = obsPos(0.5, 5.9);
    const lectern = new THREE.Group();
    lectern.position.set(lx, 0, lz);
    lectern.lookAt(0, 0, C2Z);

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.18, 1.1, 8), toon(0x4a2e1a));
    stand.position.y = 0.55;
    lectern.add(stand);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.5), toon(0x5a3a22));
    deskTop.position.y = 1.12;
    deskTop.rotation.x = -0.4;
    lectern.add(deskTop);
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4), new THREE.MeshBasicMaterial({ color: 0x1e2a55 }));
    chart.position.set(0, 1.16, 0.03);
    chart.rotation.x = -0.4;
    lectern.add(chart);

    scene.add(lectern);
    block(lx, lz, 0.7);

    register(lectern, 'Sternenkarte studieren', () => {
      openReading('Die vier Wächtersterne', `
        <p>»Wenn die Kugeln erwachen sollen, wecke sie, wie die Sterne aufgehen:</p>
        <p><i>Zuerst öffnet sich das violette <b>Drachenauge</b>,<br>
        dann fällt die türkise <b>Nixenträne</b>,<br>
        es glüht das bernsteinfarbene <b>Phönixherz</b>,<br>
        und zuletzt grünt die smaragdene <b>Waldkrone</b>.</i>«</p>
        <p>Eine Randnotiz: <i>Portal führt zur Weide hinterm Turm. NICHT zum Drachenhorst. Das war EINMAL.</i></p>
      `);
      if (state.objectivePhase < 6) setObjective(6);
    });
  }

  // --- Teleskop (Decoy) ---
  {
    const [tx, tz] = obsPos(Math.PI, 5.2);
    const tele = new THREE.Group();
    tele.position.set(tx, 0, tz);

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6), toon(0x4a3220));
      leg.position.set(Math.sin(a) * 0.4, 0.7, Math.cos(a) * 0.4);
      leg.rotation.z = Math.sin(a) * 0.3;
      leg.rotation.x = -Math.cos(a) * 0.3;
      tele.add(leg);
    }
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.5, 12), toon(0x8c6a2e));
    tube.position.y = 1.7;
    tube.rotation.x = -0.9;
    tube.rotation.y = 0.4;
    tele.add(tube);

    scene.add(tele);
    block(tx, tz, 0.8);

    let teleLooks = 0;
    register(tele, 'Durchs Teleskop spähen', () => {
      teleLooks++;
      const lines = [
        'Du siehst … den Schlafzimmerbalkon des Erzmagiers. Du schaust schnell weg.',
        'Ein Komet zieht vorbei. Er hat es auch eilig.',
        'Nur Sterne. Sehr viele Sterne. Keiner davon öffnet Türen.',
      ];
      toast(lines[(teleLooks - 1) % lines.length]);
      sound.thud();
    });
  }

  // --- Knurrende Truhe (Decoy) ---
  {
    const [mx, mz] = obsPos(1.6, 5.8);
    const mimic = new THREE.Group();
    mimic.position.set(mx, 0, mz);
    mimic.lookAt(0, 0, C2Z);

    const mBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.6), toon(0x5a3a22));
    mBase.position.y = 0.22;
    mimic.add(mBase);
    const mLid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.6), toon(0x6b4a2e));
    mLid.position.y = 0.55;
    mLid.rotation.x = -0.12;
    mimic.add(mLid);
    // verdächtig zahnartige Verzierung
    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 4), toon(0xd8cfb8));
      tooth.position.set(-0.35 + i * 0.17, 0.47, 0.31);
      tooth.rotation.x = Math.PI;
      mimic.add(tooth);
    }

    scene.add(mimic);
    block(mx, mz, 0.8);

    let growls = 0;
    register(mimic, 'Truhe öffnen', () => {
      growls++;
      if (growls === 1) toast('Die Truhe … knurrt. Und fletscht Holzzähne. Du entscheidest dich sehr schnell dagegen.');
      else if (growls === 2) toast('Sie knurrt lauter. Die Zähne sehen heute schärfer aus als eben.');
      else toast('Die Truhe schnappt nach dir! Du behältst alle Finger — diesmal.');
      sound.thud();
    });
  }

  // --- Skelett des letzten Lehrlings (Hinweis-Decoy) ---
  {
    const [kx, kz] = obsPos(4.6, 6.3);
    const skel = new THREE.Group();
    skel.position.set(kx, 0, kz);
    skel.lookAt(0, 0, C2Z);

    const skullM = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), toon(0xd8cfb8));
    skullM.position.set(0, 0.85, 0.1);
    skel.add(skullM);
    const ribs = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.5, 8), toon(0xc8bfa8));
    ribs.position.set(0, 0.5, 0.05);
    skel.add(ribs);
    for (const dx of [-0.18, 0.18]) {
      const legBone = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.6, 6), toon(0xc8bfa8));
      legBone.position.set(dx, 0.28, 0.35);
      legBone.rotation.x = 1.3;
      skel.add(legBone);
    }

    scene.add(skel);

    register(skel, 'Skelett untersuchen', () => {
      openReading('Der letzte Lehrling', `
        <p>Er lehnt an der Wand, als wäre er nur kurz eingenickt. Vor dreißig Jahren.</p>
        <p>In seiner Knochenhand ein vergilbter Zettel:</p>
        <p><i>»Drache … dann die Nixe … dann? DANN?? Ich hätte die Karte zu Ende lesen soll—«</i></p>
        <p>Der Rest ist nicht mehr zu entziffern.</p>
      `);
    });
  }

  // --- Trankregal (Decoy) ---
  {
    const [px, pz] = obsPos(5.9, 6.2);
    const shelf2 = new THREE.Group();
    shelf2.position.set(px, 0, pz);
    shelf2.lookAt(0, 0, C2Z);

    const sFrame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.4), toon(0x4a2e1a));
    sFrame.position.y = 0.9;
    shelf2.add(sFrame);
    const potionColors = [0xc23a3a, 0x52d273, 0x3a6bc2, 0xf0a23c, 0xb05aff];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 0.2 + Math.random() * 0.12, 8),
        new THREE.MeshBasicMaterial({ color: potionColors[i % potionColors.length] })
      );
      p.position.set(-0.45 + (i % 3) * 0.45, 0.62 + Math.floor(i / 3) * 0.6, 0.18);
      shelf2.add(p);
    }

    scene.add(shelf2);
    block(px, pz, 0.9);

    let sips = 0;
    const potionLines = [
      'Etikett: »Trank der Unsichtbarkeit«. Die Flasche ist leider gut sichtbar leer.',
      'Etikett: »Mut in Flaschen«. Riecht verdächtig nach gewöhnlichem Pflaumenschnaps.',
      'Etikett: »GEGENMITTEL (WOFÜR?)«. Besser nicht.',
      'Ein Fläschchen blubbert dich freundlich an. Du blubberst höflich zurück.',
    ];
    register(shelf2, 'Trankregal durchstöbern', () => {
      toast(potionLines[sips++ % potionLines.length]);
      sound.pickup();
    });
  }

  // --- Gemalte Tür (Decoy) ---
  {
    const theta = 2.9;
    const [dx, dz] = obsPos(theta, R2 - 0.15);
    const painted = new THREE.Group();
    painted.position.set(dx, 0, dz);
    painted.lookAt(0, 0, C2Z);

    const fakeFrame = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.0), new THREE.MeshBasicMaterial({ color: 0x2c2438 }));
    fakeFrame.position.y = 1.5;
    painted.add(fakeFrame);
    const fakePanel = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.7), new THREE.MeshBasicMaterial({ color: 0x4a2e1a }));
    fakePanel.position.set(0, 1.42, 0.01);
    painted.add(fakePanel);
    const fakeKnob = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), new THREE.MeshBasicMaterial({ color: 0xc9a227 }));
    fakeKnob.position.set(0.45, 1.4, 0.02);
    painted.add(fakeKnob);

    scene.add(painted);

    let knocks = 0;
    register(painted, 'Tür öffnen', (entry) => {
      knocks++;
      if (knocks === 1) {
        toast('Du greifst nach der Klinke — und fasst auf kalten Stein. Die Tür ist nur aufgemalt.');
        entry.label = 'Gemalte Tür';
      } else {
        toast('Immer noch gemalt. Der Erzmagier hat einen furchtbaren Humor.');
      }
      sound.thud();
    });
  }
}

// ---------- Spielzustand ----------

const state = {
  runes: [],          // eingesammelte, noch nicht gesetzte Runen
  runesPlaced: 0,
  sealBroken: false,
  candleProgress: 0,
  candlesSolved: false,
  chestOpened: false,
  hasKey: false,
  doorOpen: false,
  door2Open: false,
  orbProgress: 0,
  orbsSolved: false,
  portalOpen: false,
  escaped: false,
  objectivePhase: 0,
  startTime: null,
};

const animations = []; // { t, dur, fn(k), done? }

function collectRune(key, entry, mesh) {
  entry.enabled = false;
  mesh.removeFromParent();
  state.runes.push(key);
  fillSlot(key === 'feuer' ? 'feuer' : key);
  toast(`Die ${RUNES[key].name} summt leise in deiner Hand.`);
  sound.pickup();
  if (state.objectivePhase < 2) setObjective(2);
  updateObjective();
}

function placeRune(ped) {
  if (ped.filled) return;
  if (state.runes.length === 0) {
    toast('Der Sockel hat eine runde Mulde — hier fehlt eine Rune.');
    sound.thud();
    return;
  }
  const key = state.runes.shift();
  ped.filled = true;
  state.runesPlaced++;
  document.getElementById(`slot-${key === 'feuer' ? 'feuer' : key}`).classList.add('used');

  const stone = runeStone(key, 1.1);
  stone.position.set(0, 1.45, 0);
  ped.group.add(stone);
  sound.place();

  if (state.runesPlaced === 3) {
    state.sealBroken = true;
    toast('Die drei Runen flammen auf — das Siegel an der Tür zerbirst in violette Funken!');
    sound.success();
    animations.push({
      t: 0, dur: 1.6, fn: (k) => {
        sealRing.material.opacity = 0.95 * (1 - k);
        sealRing.userData.inner.material.opacity = 0.8 * (1 - k);
        sealRing.scale.setScalar(1 + k * 2.5);
        sealRing.userData.inner.scale.setScalar(1 + k * 3.5);
        sealLight.intensity = 9 * (1 - k);
      },
      onDone: () => { sealRing.visible = false; sealRing.userData.inner.visible = false; }
    });
  } else {
    toast(`Die Rune rastet ein. (${state.runesPlaced}/3)`);
  }
  updateObjective();
}

function lightCandle(key) {
  const c = candles[key];
  if (state.candlesSolved || c.lit) return;
  const expected = CANDLE_ORDER[state.candleProgress];
  c.lit = true;
  c.flame.visible = true;
  c.light.intensity = 5;
  sound.flame();

  if (key === expected) {
    state.candleProgress++;
    if (state.candleProgress === 4) {
      state.candlesSolved = true;
      toast('Vier Flammen tanzen im Takt. Irgendwo klickt zustimmend ein Schloss.');
      sound.success();
      updateObjective();
    }
  } else {
    // falsche Reihenfolge: kurz brennen lassen, dann alles löschen
    setTimeout(() => {
      for (const k of Object.keys(candles)) {
        candles[k].lit = false;
        candles[k].flame.visible = false;
        candles[k].light.intensity = 0;
      }
      state.candleProgress = 0;
      toast('Ein kalter Windhauch — alle Flammen erlöschen zischend. Die Reihenfolge war falsch.');
      sound.thud();
    }, 600);
  }
}

function openDoor() {
  state.doorOpen = true;
  toast('Der Schlüssel dreht sich dreimal. Die Tür schwingt knarrend auf — ein Gang!');
  sound.door();
  document.getElementById('slot-key').classList.add('used');
  animations.push({
    t: 0, dur: 2.2, fn: (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      doorPivot.rotation.y = -e * 1.9;
    }
  });
  setObjective(5);
}

function touchOrb(key) {
  if (state.orbsSolved) {
    toast('Die Kugeln leuchten zufrieden. Ihre Arbeit ist getan.');
    return;
  }
  const o = orbs[key];
  if (o.on) return;
  o.on = true;
  o.mat.color.set(o.def.color);
  o.light.intensity = 8;
  sound.orb();
  toast(`Die Kugel erwacht ${key === 'violett' ? 'violett' : key === 'tuerkis' ? 'türkis' : key === 'bernstein' ? 'bernsteinfarben' : 'smaragdgrün'} — das ${o.def.name}.`);

  const expected = ORB_ORDER[state.orbProgress];
  if (key === expected) {
    state.orbProgress++;
    if (state.orbProgress === 4) {
      state.orbsSolved = true;
      openPortal();
    }
  } else {
    setTimeout(() => {
      for (const k of Object.keys(orbs)) {
        orbs[k].on = false;
        orbs[k].mat.color.set(0x39304a);
        orbs[k].light.intensity = 0;
      }
      state.orbProgress = 0;
      toast('Die Kugeln verlöschen mit einem enttäuschten Seufzen. Die Sterne gehen anders auf.');
      sound.thud();
    }, 700);
  }
}

function openPortal() {
  toast('Die vier Wächtersterne stehen richtig — der Portalkreis erwacht mit einem tiefen Summen!');
  sound.portal();
  animations.push({
    t: 0, dur: 2.4, fn: (k) => {
      portalRing.material.opacity = 0.25 + k * 0.75;
      portalDisc.material.opacity = k * 0.85;
      portalBeam.material.opacity = k * 0.18;
      portalLight.intensity = k * 22;
    },
    onDone: () => { state.portalOpen = true; }
  });
  setObjective(7);
}

// ---------- Aufgaben-Text ----------

const OBJECTIVES = [
  'Sieh dich um. Irgendetwas hier verrät den Ausweg.',
  'Das Buch erwähnt Kerzen, Runen und eine Schatulle. Such die Kammer ab.',
  'Sammle die drei Runensteine und setze sie auf die Sockel.',
  'Entzünde die vier Kerzen in der Reihenfolge aus dem Zauberbuch.',
  'Nimm den Messingschlüssel und öffne die Tür.',
  'Durch den Gang! Am Ende wartet eine zweite Tür.',
  'Das Observatorium: Vier Kugeln schlafen. Die Sternenkarte kennt ihre Reihenfolge.',
  'Das Portal ist offen — spring hinein!',
];

function setObjective(phase) {
  state.objectivePhase = phase;
  document.getElementById('objective-text').textContent = OBJECTIVES[phase];
}

function updateObjective() {
  if (state.portalOpen || state.orbsSolved) return setObjective(7);
  if (state.door2Open) return setObjective(6);
  if (state.doorOpen) return setObjective(5);
  if (state.sealBroken && state.candlesSolved && !state.hasKey) return setObjective(4);
  if (state.sealBroken && !state.candlesSolved) return setObjective(3);
  if (state.hasKey && !state.sealBroken) return setObjective(2);
  if (state.objectivePhase === 1 && state.runes.length + state.runesPlaced > 0) return setObjective(2);
}

// ---------- HUD-Helfer ----------

let toastTimeout;
function toast(msg, ms = 4200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), ms);
}

function fillSlot(key) {
  document.getElementById(`slot-${key}`).classList.add('filled');
}

let readingOpen = false;
function openReading(title, html) {
  readingOpen = true;
  document.getElementById('reading-title').textContent = title;
  document.getElementById('reading-body').innerHTML = html;
  document.getElementById('reading').classList.remove('hidden');
}
function closeReading() {
  readingOpen = false;
  document.getElementById('reading').classList.add('hidden');
}
document.getElementById('reading').addEventListener('click', closeReading);

// ---------- Klang (WebAudio, rein synthetisch) ----------

const sound = (() => {
  let ctx;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
    const a = ac();
    const t0 = a.currentTime + when;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  return {
    unlock() { ac().resume(); },
    pickup() { tone(660, 0.15); tone(990, 0.25, 'sine', 0.1, 0.08); },
    place() { tone(440, 0.2, 'triangle'); tone(550, 0.3, 'triangle', 0.08, 0.1); },
    flame() { tone(330, 0.12, 'triangle', 0.08); },
    thud() { tone(110, 0.25, 'square', 0.06); },
    orb() { tone(520, 0.3, 'sine', 0.1); tone(780, 0.4, 'sine', 0.07, 0.1); },
    success() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, i * 0.12)); },
    door() { tone(80, 1.2, 'sawtooth', 0.05); tone(60, 1.5, 'square', 0.04, 0.2); [392, 523, 659].forEach((f, i) => tone(f, 0.5, 'sine', 0.08, 0.5 + i * 0.15)); },
    portal() { [220, 330, 440, 660, 880].forEach((f, i) => tone(f, 0.8, 'sine', 0.07, i * 0.15)); tone(110, 2.0, 'sawtooth', 0.03); },
  };
})();

// ---------- Steuerung ----------

const controls = new PointerLockControls(camera, document.body);
const keys = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

const titleScreen = document.getElementById('title-screen');
const pauseScreen = document.getElementById('pause-screen');
const winScreen = document.getElementById('win-screen');
const hud = document.getElementById('hud');
const touchUi = document.getElementById('touch-ui');

let touchPlaying = false;
function isPlaying() {
  return IS_TOUCH ? touchPlaying : controls.isLocked;
}

function startPlaying() {
  titleScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (IS_TOUCH) touchUi.classList.remove('hidden');
  if (!state.startTime) state.startTime = performance.now();
}

document.getElementById('start-btn').addEventListener('click', () => {
  sound.unlock();
  if (IS_TOUCH) {
    touchPlaying = true;
    startPlaying();
  } else {
    controls.lock();
  }
});
document.getElementById('resume-btn').addEventListener('click', () => {
  if (IS_TOUCH) {
    touchPlaying = true;
    pauseScreen.classList.add('hidden');
  } else {
    controls.lock();
  }
});
document.getElementById('again-btn').addEventListener('click', () => location.reload());
document.getElementById('pause-btn').addEventListener('click', () => {
  touchPlaying = false;
  closeReading();
  pauseScreen.classList.remove('hidden');
});
document.getElementById('interact-btn').addEventListener('click', () => interact());

controls.addEventListener('lock', () => {
  startPlaying();
});
controls.addEventListener('unlock', () => {
  if (state.escaped) return;
  closeReading();
  pauseScreen.classList.remove('hidden');
});

// ---------- Touch-Steuerung ----------

const joy = { x: 0, y: 0 };
if (IS_TOUCH) {
  const joyEl = document.getElementById('joystick');
  const knobEl = document.getElementById('joystick-knob');
  const JOY_RADIUS = 55;
  let moveTouch = null; // { id, x0, y0 }
  let lookTouch = null; // { id, x, y, t0, moved }
  let yaw = 0, pitch = 0;

  function showJoystick(x, y) {
    joyEl.style.left = `${x}px`;
    joyEl.style.top = `${y}px`;
    joyEl.classList.add('visible');
    knobEl.style.transform = 'translate(-50%, -50%)';
  }
  function hideJoystick() {
    joyEl.classList.remove('visible');
    joy.x = 0;
    joy.y = 0;
  }

  canvas.addEventListener('touchstart', (e) => {
    if (!isPlaying() || state.escaped) return;
    for (const t of e.changedTouches) {
      if (t.clientX < window.innerWidth * 0.45 && moveTouch === null) {
        moveTouch = { id: t.identifier, x0: t.clientX, y0: t.clientY };
        showJoystick(t.clientX, t.clientY);
      } else if (lookTouch === null) {
        lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY, t0: performance.now(), moved: 0 };
      }
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) {
        let dx = t.clientX - moveTouch.x0;
        let dy = t.clientY - moveTouch.y0;
        const len = Math.hypot(dx, dy);
        if (len > JOY_RADIUS) {
          dx = (dx / len) * JOY_RADIUS;
          dy = (dy / len) * JOY_RADIUS;
        }
        knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        joy.x = dx / JOY_RADIUS;
        joy.y = -dy / JOY_RADIUS;
      } else if (lookTouch && t.identifier === lookTouch.id) {
        const dx = t.clientX - lookTouch.x;
        const dy = t.clientY - lookTouch.y;
        lookTouch.x = t.clientX;
        lookTouch.y = t.clientY;
        lookTouch.moved += Math.abs(dx) + Math.abs(dy);
        yaw -= dx * 0.0045;
        pitch -= dy * 0.0045;
        pitch = THREE.MathUtils.clamp(pitch, -1.35, 1.35);
        camera.rotation.set(pitch, yaw, 0);
      }
    }
    e.preventDefault();
  }, { passive: false });

  function endTouch(e) {
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) {
        moveTouch = null;
        hideJoystick();
      } else if (lookTouch && t.identifier === lookTouch.id) {
        // kurzer Tipp ohne Bewegung = Benutzen
        if (performance.now() - lookTouch.t0 < 300 && lookTouch.moved < 14) interact();
        lookTouch = null;
      }
    }
    e.preventDefault();
  }
  canvas.addEventListener('touchend', endTouch, { passive: false });
  canvas.addEventListener('touchcancel', endTouch, { passive: false });
}

// ---------- Interaktion (Raycast) ----------

const raycaster = new THREE.Raycaster();
raycaster.far = 3.6;
const center = new THREE.Vector2(0, 0);
let hovered = null;

function updateHover() {
  raycaster.setFromCamera(center, camera);
  const meshes = [];
  for (const e of interactables) if (e.enabled) meshes.push(e.object);
  const hits = raycaster.intersectObjects(meshes, true);
  hovered = hits.length ? hits[0].object.userData.entry : null;
  document.getElementById('hover-label').textContent = hovered ? hovered.label : '';
  document.getElementById('crosshair').classList.toggle('active', !!hovered);
  document.getElementById('interact-btn').classList.toggle('ready', !!hovered);
}

function interact() {
  if (readingOpen) { closeReading(); return; }
  if (hovered && hovered.enabled) hovered.onUse(hovered);
}

document.addEventListener('mousedown', (e) => {
  if (controls.isLocked && e.button === 0) interact();
});
document.addEventListener('keydown', (e) => {
  if (controls.isLocked && e.code === 'KeyE') interact();
});

// ---------- Bewegung & Kollision ----------

// Begehbare Bereiche: Turmkammer, Gang (wenn Tür offen), Observatorium (wenn Eichentür offen)
function allowed(x, z) {
  if (Math.hypot(x, z) < ROOM_RADIUS - 0.55) return true;
  if (state.doorOpen && Math.abs(x) < 0.92 && z <= -7.6 && z >= (state.door2Open ? -15.7 : -14.35)) return true;
  if (state.door2Open && Math.hypot(x, z - C2Z) < R2 - 0.55) return true;
  return false;
}

const velocity = new THREE.Vector3();
const fwdVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();

function move(dt) {
  const speed = 4.2;
  let fwd = ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0);
  let side = ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
  fwd = THREE.MathUtils.clamp(fwd + joy.y, -1, 1);
  side = THREE.MathUtils.clamp(side + joy.x, -1, 1);
  velocity.x = THREE.MathUtils.damp(velocity.x, side * speed, 12, dt);
  velocity.z = THREE.MathUtils.damp(velocity.z, fwd * speed, 12, dt);

  camera.getWorldDirection(fwdVec);
  fwdVec.y = 0;
  fwdVec.normalize();
  rightVec.crossVectors(fwdVec, camera.up).normalize();

  const p = camera.position;
  const oldX = p.x, oldZ = p.z;
  const nx = p.x + (rightVec.x * velocity.x + fwdVec.x * velocity.z) * dt;
  const nz = p.z + (rightVec.z * velocity.x + fwdVec.z * velocity.z) * dt;

  // achsenweise prüfen, damit man an Wänden entlanggleiten kann
  if (allowed(nx, nz)) { p.x = nx; p.z = nz; }
  else if (allowed(nx, oldZ)) { p.x = nx; }
  else if (allowed(oldX, nz)) { p.z = nz; }
  p.y = EYE_HEIGHT;

  // Möbel
  const bx = p.x, bz = p.z;
  for (const c of colliders) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + 0.35;
    if (d < min && d > 0.0001) {
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }
  if (!allowed(p.x, p.z)) { p.x = bx; p.z = bz; }

  // Flucht geschafft?
  if (state.portalOpen && !state.escaped && Math.hypot(p.x, p.z - C2Z) < 1.0) {
    win();
  }
}

function win() {
  state.escaped = true;
  const secs = Math.floor((performance.now() - state.startTime) / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  document.getElementById('win-time').textContent = `${mm}:${ss}`;
  hud.classList.add('hidden');
  touchUi.classList.add('hidden');
  winScreen.classList.remove('hidden');
  touchPlaying = false;
  controls.unlock();
  sound.success();
}

// ---------- Hauptschleife ----------

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Fackelflackern
  for (const torch of torchLights) {
    const n = Math.sin(t * 11 + torch.seed) * 0.5 + Math.sin(t * 23 + torch.seed * 2) * 0.3;
    torch.light.intensity = 26 + n * 7;
    torch.flame.scale.setScalar(1 + n * 0.12);
  }

  // Kristall
  crystal.rotation.y = t * 0.6;
  crystal.rotation.x = Math.sin(t * 0.4) * 0.3;
  crystal.position.y = WALL_HEIGHT - 1.2 + Math.sin(t * 0.8) * 0.12;
  crystalLight.position.copy(crystal.position);

  // Siegel pulsiert
  if (!state.sealBroken) {
    sealRing.rotation.z = t * 0.5;
    sealRing.userData.inner.rotation.z = -t * 0.8;
    sealLight.intensity = 9 + Math.sin(t * 3) * 2.5;
  }

  // Portal rotiert und pulsiert
  if (state.portalOpen || state.orbsSolved) {
    portalRing.rotation.z = t * 0.8;
    if (state.portalOpen) {
      portalLight.intensity = 22 + Math.sin(t * 4) * 5;
      portalDisc.material.opacity = 0.75 + Math.sin(t * 3) * 0.1;
    }
  }

  // Schwebende Objekte (Runen, Schlüssel)
  scene.traverse((o) => {
    if (o.userData.spin) {
      o.rotation.y += dt * 1.5;
      o.position.y += Math.sin(t * 2 + o.id) * 0.0012;
    }
  });

  // Staub treibt
  const pos = dust.geometry.attributes.position;
  for (let i = 0; i < dustCount; i++) {
    let y = pos.getY(i) + dt * 0.06;
    if (y > WALL_HEIGHT) y = 0;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;

  // Animationen
  for (const a of animations) {
    if (a.done) continue;
    a.t += dt;
    const k = Math.min(a.t / a.dur, 1);
    a.fn(k);
    if (k >= 1) { a.done = true; if (a.onDone) a.onDone(); }
  }

  if (isPlaying() && !state.escaped) {
    move(dt);
    updateHover();
    if (state.startTime) {
      const secs = Math.floor((performance.now() - state.startTime) / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      document.getElementById('timer').textContent = `${mm}:${ss}`;
    }
  }

  renderer.render(scene, camera);
}

animate();
