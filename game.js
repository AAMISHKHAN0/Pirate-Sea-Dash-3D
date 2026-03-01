/**
 * PIRATE SEA DASH 3D — Feature Expansion
 * Seasons, Weather, Island 223 (Fortified Islands), Towers, Barrels.
 */
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

/* ═══ CONSTANTS ═══ */
const LANE_W = 4.0, LANES = [-LANE_W, 0, LANE_W], SHIP_Y = 0.15;
const SHIP_LERP = 22, SPAWN_DIST = 90, DESPAWN_Z = 20;
const MAX_HP = 3, LVL_SCORE = 150, POOL = 30, P_MAX = 400;
const MAX_FIREBALLS = 5, FB_COOLDOWN = 1.0, FB_SPEED = 25, FB_LIFE = 4.0;
const MDL = './Models/GLB format/';
const MILESTONES = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000];
const COMBO_TIERS = [[0, 1], [3, 2], [6, 3], [10, 5]];

/* ═══ STAGES & WEATHER ═══ */
const STAGES = [
    { level: 1, name: "The Sunny Shallows", clear: 0x1a7ab5, fog: 0x4da8d4, fogDens: 0.009, sun: 1.8, hemi: 0.6, speedBase: 12.5 },
    { level: 4, name: "Overcast Waters", clear: 0x0c4a73, fog: 0x2d6c8f, fogDens: 0.012, sun: 1.0, hemi: 0.4, speedBase: 13.8 },
    { level: 7, name: "The Storm", clear: 0x072b45, fog: 0x1a455c, fogDens: 0.018, sun: 0.4, hemi: 0.2, speedBase: 15.5 },
    { level: 10, name: "Midnight Sea", clear: 0x011324, fog: 0x051b2e, fogDens: 0.024, sun: 0.1, hemi: 0.1, speedBase: 18.0 }
];

/* ═══ DOM ═══ */
const $ = id => document.getElementById(id);
const canvas = $('gameCanvas'), scoreEl = $('scoreValue'), bestEl = $('bestValue');
const healthEl = $('healthValue'), healthBar = $('healthBarFill');
const levelEl = $('levelValue'), levelBar = $('levelBarFill'), levelPct = $('levelPercent');
const distEl = $('distValue'), bestDistEl = $('bestDist');
const overlay = $('overlay'), oTitle = $('overlayTitle'), oText = $('overlayText');
const finalScore = $('finalScore'), startBtn = $('startBtn');
const muteBtn = $('muteBtn'), muteBtn2 = $('muteBtn2');
const dmgFlash = $('damageFlash'), popLayer = $('scorePopLayer');
const lvlToast = $('levelToast'), distMilestone = $('distMilestone'), stageToast = $('stageToast');
const vpWrap = $('viewportWrap'), loadScreen = $('loadScreen');
const loadBarFill = $('loadBarFill'), loadPct = $('loadPct');
const pauseBtn = $('pauseBtn'), pauseOverlay = $('pauseOverlay');
const resumeBtn = $('resumeBtn'), restartBtn = $('restartBtn');
const fsBtn = $('fsBtn'), qualityBtn = $('qualityBtn');
const cooldownRing = $('cooldownRing'), cooldownArc = $('cooldownArc');
const comboBadge = $('comboBadge'), comboValue = $('comboValue');
const lossSfx = new Audio('./soundeffects/fahhhhhhhhhhhhhhh.mp3');
lossSfx.preload = 'auto';

/* ═══ QUALITY ═══ */
let qualityLevel = 2;
const QP = [{ pr: 1, particles: 180, clouds: 8, waves: 40 }, { pr: 1.5, particles: 280, clouds: 14, waves: 60 }, { pr: Math.min(devicePixelRatio, 2), particles: 400, clouds: 20, waves: 100 }];

/* ═══ RENDERER ═══ */
const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
function applyQuality() { R.setPixelRatio(QP[qualityLevel].pr); }
applyQuality();
R.shadowMap.enabled = false; R.outputEncoding = THREE.sRGBEncoding;
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.background = new THREE.Color(STAGES[0].clear);
scene.fog = new THREE.FogExp2(STAGES[0].fog, STAGES[0].fogDens);

/* ═══ CAMERA ═══ */
const cam = new THREE.PerspectiveCamera(52, 16 / 9, 0.5, 350);
const CAM_BASE = new THREE.Vector3(0, 9, 14);
const CAM_LOOK = new THREE.Vector3(0, 0, -18);
cam.position.copy(CAM_BASE); cam.lookAt(CAM_LOOK);

const camSt = { offX: 0, sway: 0, shakeI: 0, shakeD: 0, cx: 0 };
function updateCam(dt) {
    const tx = st.shipX * 0.4; camSt.offX += (tx - camSt.offX) * 4 * dt;
    camSt.cx += (camSt.offX - camSt.cx) * 6 * dt; // Buttery smooth lagging follow
    
    camSt.sway += dt * 1.1;
    const sx = Math.sin(camSt.sway) * .1, sy = Math.cos(camSt.sway * .7) * .05;
    const spF = Math.min(st.scrollSpeed / 22, 1);
    const tFov = 52 + spF * 12; cam.fov += (tFov - cam.fov) * 2.5 * dt;
    
    let shX = 0, shY = 0;
    if (camSt.shakeI > 0) { shX = (Math.random() - .5) * camSt.shakeI; shY = (Math.random() - .5) * camSt.shakeI * .5; camSt.shakeI -= camSt.shakeD * dt; if (camSt.shakeI < 0) camSt.shakeI = 0; }
    
    cam.position.set(CAM_BASE.x + camSt.cx + sx + shX, CAM_BASE.y + sy + shY, CAM_BASE.z);
    cam.lookAt(camSt.cx * .5, 0, CAM_LOOK.z); cam.updateProjectionMatrix();
}
function shake(s, d) { camSt.shakeI = s; camSt.shakeD = s / d; }

/* ═══ LIGHTING ═══ */
scene.add(new THREE.AmbientLight(0x9ed8f0, .55));
const sun = new THREE.DirectionalLight(0xfff0d0, STAGES[0].sun); sun.position.set(15, 25, -20); scene.add(sun);
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x1a6090, STAGES[0].hemi); scene.add(hemi);
const shipLight = new THREE.PointLight(0xffeedd, .6, 25); shipLight.position.set(0, 3, 2); scene.add(shipLight);
const cannonFlash = new THREE.PointLight(0xff8833, 0, 12); cannonFlash.position.set(0, 1.5, -1); scene.add(cannonFlash);

/* ═══ WATER ═══ */
const wSegs = QP[qualityLevel].waves;
const wGeo = new THREE.PlaneGeometry(400, 600, wSegs, wSegs);
const wMat = new THREE.MeshPhongMaterial({ color: 0x0e7ab8, emissive: 0x03304a, specular: 0x99ddff, shininess: 70, transparent: true, opacity: 0.92 });
const water = new THREE.Mesh(wGeo, wMat); water.rotation.x = -Math.PI / 2; water.position.set(0, -.3, -120); scene.add(water);
const wOrig = wGeo.attributes.position.array.slice();

/* ═══ SKY & CLOUDS ═══ */
const texLoader = new THREE.TextureLoader();
const skyTex = texLoader.load('./sky_bg.jpg');
skyTex.mapping = THREE.EquirectangularReflectionMapping;
const skyMat = new THREE.MeshBasicMaterial({ 
    map: skyTex, side: THREE.BackSide, fog: true, opacity: 1.0, transparent: true
});
const skySphere = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 24), skyMat);
scene.add(skySphere);

const clouds = [];
function mkCloud(x, y, z) {
    const g = new THREE.PlaneGeometry(20 + Math.random() * 25, 5 + Math.random() * 5);
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .15 + Math.random() * .15, depthWrite: false, side: THREE.DoubleSide });
    const c = new THREE.Mesh(g, m); c.position.set(x, y, z); c.rotation.x = -.1; c.userData.spd = .2 + Math.random() * .4; scene.add(c); clouds.push(c);
}
const nClouds = QP[qualityLevel].clouds;
for (let i = 0; i < nClouds; i++) mkCloud((Math.random() - .5) * 250, 35 + Math.random() * 30, -80 - Math.random() * 250);
function updateClouds(dt) { 
    skySphere.rotation.y += dt * 0.005; // slowly rotate sky asset
    for (const c of clouds) { c.position.x += c.userData.spd * dt; if (c.position.x > 140) c.position.x = -140; } 
}

/* ═══ MODEL LOADER ═══ */
const loader = new GLTFLoader(); const mdlC = {}; let loadTotal = 15, loadDone = 0;
function updateLoadBar() { const p = Math.round(loadDone / loadTotal * 100); loadBarFill.style.width = p + '%'; loadPct.textContent = p + '%'; }
function loadMdl(n) {
    if (mdlC[n]) return Promise.resolve(mdlC[n]);
    return new Promise(res => {
        loader.load(MDL + n, g => {
            g.scene.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; } });
            mdlC[n] = g.scene; loadDone++; updateLoadBar(); res(g.scene);
        }, undefined, () => {
            const fb = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 0x886644 }));
            mdlC[n] = fb; loadDone++; updateLoadBar(); res(fb);
        });
    });
}

/* ═══ AUDIO ═══ */
const Aud = (() => {
    let ctx, mg, muted = false;
    function init() { if (ctx) return; ctx = new (window.AudioContext || window.webkitAudioContext)(); mg = ctx.createGain(); mg.connect(ctx.destination); }
    function play(t) {
        if (muted || !ctx) return; try {
            const n = ctx.currentTime, g = ctx.createGain(); g.connect(mg);
            if (t === 'coin') {
                const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(880, n); o.frequency.exponentialRampToValueAtTime(1760, n + .08); g.gain.setValueAtTime(.18, n); g.gain.exponentialRampToValueAtTime(.001, n + .18); o.connect(g); o.start(n); o.stop(n + .2);
            } else if (t === 'crash') {
                const bs = ctx.sampleRate * .3, buf = ctx.createBuffer(1, bs, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bs); const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(800, n); f.frequency.exponentialRampToValueAtTime(100, n + .3); g.gain.setValueAtTime(.35, n); g.gain.exponentialRampToValueAtTime(.001, n + .35); s.connect(f); f.connect(g); s.start(n); s.stop(n + .4);
            } else if (t === 'levelup') {
                [523, 659, 784, 1047].forEach((fr, i) => { const o = ctx.createOscillator(); o.type = 'triangle'; const s = n + i * .1; o.frequency.setValueAtTime(fr, s); const gn = ctx.createGain(); gn.connect(mg); gn.gain.setValueAtTime(.15, s); gn.gain.exponentialRampToValueAtTime(.001, s + .25); o.connect(gn); o.start(s); o.stop(s + .28); });
            } else if (t === 'cannon') {
                const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, n); o.frequency.exponentialRampToValueAtTime(50, n + .2); g.gain.setValueAtTime(.2, n); g.gain.exponentialRampToValueAtTime(.001, n + .25); o.connect(g); o.start(n); o.stop(n + .28);
                const bs = ctx.sampleRate * .15, buf = ctx.createBuffer(1, bs, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bs) * .6; const s = ctx.createBufferSource(); s.buffer = buf; const g3 = ctx.createGain(); g3.connect(mg); g3.gain.setValueAtTime(.15, n); g3.gain.exponentialRampToValueAtTime(.001, n + .2); s.connect(g3); s.start(n); s.stop(n + .2);
            } else if (t === 'milestone') {
                const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(660, n); o.frequency.exponentialRampToValueAtTime(990, n + .2); g.gain.setValueAtTime(.25, n); g.gain.exponentialRampToValueAtTime(.001, n + .35); o.connect(g); o.start(n); o.stop(n + .4);
            } else if (t === 'wind') {
                const bs = ctx.sampleRate * 2, buf = ctx.createBuffer(1, bs, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * .1; const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 800; g.gain.setValueAtTime(.12, n); g.gain.exponentialRampToValueAtTime(.001, n + 1.5); s.connect(f); f.connect(g); s.start(n); s.stop(n + 2);
            } else if (t === 'explode') {
                const bs = ctx.sampleRate * .25, buf = ctx.createBuffer(1, bs, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bs, 2); const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(600, n); f.frequency.exponentialRampToValueAtTime(80, n + .2); g.gain.setValueAtTime(.25, n); g.gain.exponentialRampToValueAtTime(.001, n + .28); s.connect(f); f.connect(g); s.start(n); s.stop(n + .3);
            }
        } catch (e) { }
    }
    let ambN = null, ambG = null;
    function startAmb() { if (!ctx || ambN) return; const bs = ctx.sampleRate * 4, buf = ctx.createBuffer(1, bs, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1; ambN = ctx.createBufferSource(); ambN.buffer = buf; ambN.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 200; f.Q.value = .4; ambG = ctx.createGain(); ambG.gain.value = muted ? 0 : .08; ambG.connect(mg); ambN.connect(f); f.connect(ambG); ambN.start(); }
    function stopAmb() { if (ambN) { try { ambN.stop(); } catch (e) { } ambN = null; ambG = null; } }
    function setMute(m) { muted = m; if (mg) mg.gain.value = m ? 0 : 1; }
    return { init, play, startAmb, stopAmb, setMute, isMuted: () => muted };
})();
function playLossSfx() { if (Aud.isMuted()) return; try { lossSfx.pause(); lossSfx.currentTime = 0; lossSfx.play().catch(() => { }); } catch (e) { } }

/* ═══ PARTICLES ═══ */
const PSys = (() => {
    const ps = [], pos = new Float32Array(P_MAX * 3), col = new Float32Array(P_MAX * 3), sz = new Float32Array(P_MAX);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: .3, vertexColors: true, transparent: true, opacity: .9, depthWrite: false, sizeAttenuation: true })));
    function emit(x, y, z, n, color, spread, life, spd, downward = false) { const c = new THREE.Color(color); for (let i = 0; i < n && ps.length < P_MAX; i++) ps.push({ x, y, z, vx: (Math.random() - .5) * spread, vy: downward ? -Math.random() * spd : Math.random() * spd + spd * .5, vz: (Math.random() - .5) * spread, life, ml: life, r: c.r, g: c.g, b: c.b, s: .15 + Math.random() * .25, d: downward }); }
    function update(dt) {
        let a = 0; for (let i = 0; i < ps.length; i++) { const p = ps[i]; p.life -= dt; if (p.life <= 0) continue; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (!p.d) p.vy -= 4 * dt; const t = p.life / p.ml, i3 = a * 3; pos[i3] = p.x; pos[i3 + 1] = p.y; pos[i3 + 2] = p.z; col[i3] = p.r; col[i3 + 1] = p.g; col[i3 + 2] = p.b; sz[a] = p.s * t; if (a !== i) ps[a] = p; a++; }
        ps.length = a; for (let i = a; i < P_MAX; i++) { const i3 = i * 3; pos[i3] = pos[i3 + 1] = pos[i3 + 2] = 0; sz[i] = 0; } geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.attributes.size.needsUpdate = true; geo.setDrawRange(0, a);
    }
    return { emit, update, clear: () => { ps.length = 0; } };
})();

/* ═══ STATE ═══ */
const st = {
    running: false, paused: false, score: 0, dScore: 0, best: +localStorage.getItem('pirateBest') || 0,
    hp: MAX_HP, level: 1, lvlProg: 0, lane: 1, tgtLane: 1, shipX: 0, shipTilt: 0, bob: 0,
    scrollSpeed: 0, tgtSpeed: STAGES[0].speedBase, accelT: 0,
    spawnT: 0, spawnI: 1.0, invT: 0, shootCD: 0, elapsed: 0,
    distance: 0, dDist: 0, bestDist: +localStorage.getItem('pirateDist') || 0, nextMilestone: 0,
    islandT: 0, islandI: 3.0,
    combo: 0, comboMult: 1, cannonFlashT: 0,

    // Stages & Weather
    stageIdx: 0, stageTransT: 0,
    curClear: new THREE.Color(STAGES[0].clear),
    curFog: new THREE.Color(STAGES[0].fog),
    curFogDens: STAGES[0].fogDens,
    curSun: STAGES[0].sun,
    curHemi: STAGES[0].hemi
};

/* ═══ POOLS ═══ */
const obs = [], tres = [], fireballs = [], enemies = [], islands = [], bgIslands = [];
function resetPools() { [obs, tres, fireballs, enemies].forEach(p => { p.forEach(o => { if (o.mesh) o.mesh.visible = false }); p.length = 0; }); islands.forEach(i => i.group.visible = false); islands.length = 0; }

let shipGrp = null, shipOk = false, mdlOk = false;
const CP = { rocks: [], ghost: [], chest: [], crate: [], fireball: [], enemy: [], barrel: [], tower: [], islandBase: [], islandFort: [] };

function createFireballPool() {
    for (let i = 0; i < MAX_FIREBALLS; i++) {
        const g = new THREE.Group();
        const core = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
        const glow = new THREE.Mesh(new THREE.SphereGeometry(.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: .35 }));
        const light = new THREE.PointLight(0xff6622, .6, 8);
        g.add(core, glow, light); g.visible = false; scene.add(g);
        CP.fireball.push(g);
    }
}

function getComboMult() { let m = 1; for (const [threshold, mult] of COMBO_TIERS) { if (st.combo >= threshold) m = mult; } return m; }
function addCombo() {
    st.combo++; const old = st.comboMult; st.comboMult = getComboMult();
    comboValue.textContent = `x${st.comboMult}`;
    if (st.combo >= 3) { comboBadge.classList.add('visible'); }
    if (st.comboMult > old) { comboBadge.classList.remove('pulse'); void comboBadge.offsetWidth; comboBadge.classList.add('pulse'); }
}
function resetCombo() { st.combo = 0; st.comboMult = 1; comboBadge.classList.remove('visible'); comboValue.textContent = 'x1'; }

/* ═══ ISLAND BUILDERS ═══ */
function buildIslands(palm, rks, barrel, wall, tower) {
    // Basic palm islands
    for (let i = 0; i < 10; i++) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(2.5 + Math.random() * 3.5, 3 + Math.random() * 3.5, .6 + Math.random() * .4, 8), new THREE.MeshPhongMaterial({ color: 0xc4a35a, emissive: 0x3a2a10 })));
        const top = new THREE.Mesh(new THREE.CylinderGeometry(2 + Math.random() * 2.5, 2.5 + Math.random() * 3, .15, 8), new THREE.MeshPhongMaterial({ color: 0x4a8c3f, emissive: 0x1a3a10 })); top.position.y = .35; g.add(top);
        for (let p = 0; p < 1 + Math.floor(Math.random() * 3); p++) { const pm = palm.clone(); pm.scale.set(.5, .5, .5); const a = (p / 3) * Math.PI * 2 + Math.random() * .5; pm.position.set(Math.cos(a) * (1 + Math.random()), .3, Math.sin(a) * (1 + Math.random())); pm.rotation.y = Math.random() * Math.PI * 2; g.add(pm); }
        if (Math.random() > .4) { const r = rks[Math.floor(Math.random() * 3)].clone(); r.scale.set(.4, .4, .4); r.position.set((Math.random() - .5) * 2, .2, (Math.random() - .5) * 2); g.add(r); }
        if (Math.random() > .5 && barrel) { const b = barrel.clone(); b.scale.set(.4, .4, .4); b.position.set((Math.random() - .5) * 1.5, .3, (Math.random() - .5) * 1.5); g.add(b); }
        g.visible = false; scene.add(g); CP.islandBase.push(g);
    }
    // Fortified Island 223
    for (let i = 0; i < 10; i++) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(4 + Math.random() * 2, 4.5 + Math.random() * 2, .7 + Math.random() * .5, 8), new THREE.MeshPhongMaterial({ color: 0xaaaaaa, emissive: 0x222222 })));
        const t = tower.clone(); t.scale.set(.8, .8, .8); t.position.set(0, .4, 0); g.add(t);
        for (let w = 0; w < 4; w++) { const wl = wall.clone(); wl.scale.set(.6, .6, .6); const a = (w / 4) * Math.PI * 2 + Math.PI / 4; wl.position.set(Math.cos(a) * 2.8, .4, Math.sin(a) * 2.8); wl.lookAt(0, .4, 0); wl.rotation.y += Math.PI / 2; g.add(wl); }
        if (Math.random() > .5) { const pm = palm.clone(); pm.scale.set(.5, .5, .5); pm.position.set(2.5, .4, 0); g.add(pm); }
        g.visible = false; scene.add(g); CP.islandFort.push(g);
    }
}
function createBgIslands() {
    for (let i = 0; i < 10; i++) {
        const g = new THREE.Group(); const s = 5 + Math.random() * 10;
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(s * .8, s, 1.2, 6), new THREE.MeshPhongMaterial({ color: 0x6a8a5a, emissive: 0x1a2a10 })));
        for (let t = 0; t < 2 + Math.floor(Math.random() * 3); t++) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, 2, 4), new THREE.MeshPhongMaterial({ color: 0x5a4030 })); const lv = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshPhongMaterial({ color: 0x3a7a30 })); tr.position.set((Math.random() - .5) * s * .6, 1.2, (Math.random() - .5) * s * .6); lv.position.copy(tr.position); lv.position.y += 1.8; g.add(tr, lv); }
        const side = i % 2 === 0 ? -1 : 1; g.position.set(side * (25 + Math.random() * 35), -.5, -40 - i * 35); scene.add(g); bgIslands.push(g);
    }
}

/* ═══ LOAD ALL ═══ */
async function loadAll() {
    try {
        const [ship, rA, rB, rC, ghost, chest, crate, ball, enemy, palm, palmB, barrel, twr, wl] = await Promise.all([
            loadMdl('ship-pirate-large.glb'), loadMdl('rocks-a.glb'), loadMdl('rocks-b.glb'), loadMdl('rocks-c.glb'),
            loadMdl('ship-ghost.glb'), loadMdl('chest.glb'), loadMdl('crate.glb'), loadMdl('cannon-ball.glb'),
            loadMdl('ship-large.glb'), loadMdl('palm-bend.glb'), loadMdl('palm-detailed-bend.glb'), loadMdl('barrel.glb'),
            loadMdl('tower-watch.glb'), loadMdl('castle-wall.glb')]);
        shipGrp = new THREE.Group(); const s = ship.clone(); s.scale.set(.6, .6, .6); s.rotation.y = Math.PI; shipGrp.add(s); shipGrp.position.set(0, SHIP_Y, 0); scene.add(shipGrp); shipOk = true;
        const rks = [rA, rB, rC]; for (let i = 0; i < POOL; i++) { const m = rks[i % 3].clone(); m.scale.set(.7, .7, .7); m.visible = false; scene.add(m); CP.rocks.push(m); }
        for (let i = 0; i < 8; i++) { const m = ghost.clone(); m.scale.set(.5, .5, .5); m.rotation.y = Math.PI; m.visible = false; scene.add(m); CP.ghost.push(m); }
        for (let i = 0; i < 12; i++) { const m = chest.clone(); m.scale.set(.8, .8, .8); m.visible = false; scene.add(m); CP.chest.push(m); }
        for (let i = 0; i < 12; i++) { const m = crate.clone(); m.scale.set(.7, .7, .7); m.visible = false; scene.add(m); CP.crate.push(m); }
        for (let i = 0; i < 8; i++) { const m = enemy.clone(); m.scale.set(.45, .45, .45); m.rotation.y = Math.PI; m.visible = false; scene.add(m); CP.enemy.push(m); }
        for (let i = 0; i < 12; i++) { const m = barrel.clone(); m.scale.set(.5, .5, .5); m.visible = false; scene.add(m); CP.barrel.push(m); }
        for (let i = 0; i < 6; i++) { const m = twr.clone(); m.scale.set(.7, .7, .7); m.visible = false; scene.add(m); CP.tower.push(m); }
        createFireballPool();
        buildIslands(palmB, rks, barrel, wl, twr); createBgIslands(); mdlOk = true;
    } catch (e) { console.error('Load:', e); }
}

/* ═══ STAGE TRANSITION ═══ */
function updateStage(dt) {
    if (st.stageTransT > 0) {
        st.stageTransT -= dt;
        const tg = STAGES[st.stageIdx];
        const sF = dt * 1.5;
        st.curClear.lerp(new THREE.Color(tg.clear), sF);
        st.curFog.lerp(new THREE.Color(tg.fog), sF);
        st.curFogDens += (tg.fogDens - st.curFogDens) * sF;
        st.curSun += (tg.sun - st.curSun) * sF;
        st.curHemi += (tg.hemi - st.curHemi) * sF;

        scene.background = st.curClear;
        scene.fog.color = st.curFog;
        scene.fog.density = st.curFogDens;
        sun.intensity = st.curSun;
        hemi.intensity = st.curHemi;
        skyMat.uniforms.cBot.value = st.curFog;
        skyMat.uniforms.cSky.value = st.curClear;
    }
}
function setStage(idx) {
    if (idx === st.stageIdx || idx >= STAGES.length) return;
    st.stageIdx = idx;
    st.stageTransT = 4.0;
    st.tgtSpeed = STAGES[idx].speedBase + (st.level - STAGES[idx].level) * 0.8;

    // Cinematic Toast
    stageToast.textContent = STAGES[idx].name;
    stageToast.classList.remove('show');
    void stageToast.offsetWidth;
    stageToast.classList.add('show');

    // Sound effect depending on stage
    if (idx >= 2) Aud.play('wind');
}

/* ═══ SPAWNING ═══ */
function gf(p) { return p.find(m => !m.visible) || null; }
function spawnObs() {
    const l = Math.floor(Math.random() * 3), x = LANES[l], z = -SPAWN_DIST;
    let p, type, r, yOff = -.1;
    const rnd = Math.random();

    if (st.stageIdx >= 2 && rnd < 0.15) { p = CP.tower; type = 'tower'; r = 1.6; yOff = 0; }
    else if (st.stageIdx >= 1 && rnd < 0.45) { p = CP.barrel; type = 'barrel'; r = 0.8; yOff = 0.2; }
    else if (rnd < Math.min(.35, st.level * .06)) { p = CP.ghost; type = 'ghost'; r = 1.3; yOff = .1; }
    else { p = CP.rocks; type = 'rock'; r = 1.0; }

    const m = gf(p); if (!m) return;
    m.position.set(x, yOff, z); m.visible = true;
    if (type === 'rock' || type === 'barrel') m.rotation.y = Math.random() * Math.PI * 2;
    obs.push({ mesh: m, lane: l, type, r });
}
function spawnTre() { const l = Math.floor(Math.random() * 3), x = LANES[l], z = -SPAWN_DIST - 5; const iC = Math.random() < .4; const m = gf(iC ? CP.chest : CP.crate); if (!m) return; m.position.set(x, .2, z); m.visible = true; tres.push({ mesh: m, lane: l, r: .9, pts: iC ? 30 : 10 }); }
function spawnEnemy() { if (st.level < 3) return; const m = gf(CP.enemy); if (!m) return; const l = Math.floor(Math.random() * 3); m.position.set(LANES[l], .1, -SPAWN_DIST - 10); m.visible = true; const hp = Math.min(5, 2 + Math.floor((st.level - 3) / 3)); enemies.push({ mesh: m, lane: l, r: 1.3, hp, maxHp: hp }); }
function spawnIsland() {
    const p = (st.stageIdx >= 2 && Math.random() > 0.4) ? CP.islandFort : CP.islandBase;
    const g = p.find(i => !i.visible); if (!g) return;
    const side = Math.random() > .5 ? 1 : -1; g.position.set(side * (9 + Math.random() * 14), -.2, -SPAWN_DIST - 15 - Math.random() * 20);
    g.rotation.y = Math.random() * Math.PI * 2; const sc = .7 + Math.random() * .6; g.scale.set(sc, sc, sc); g.visible = true; islands.push({ group: g });
}

/* ═══ SHOOTING ═══ */
function shoot() {
    if (st.shootCD > 0 || !st.running || st.paused) return;
    if (fireballs.length >= MAX_FIREBALLS) return;
    const m = gf(CP.fireball); if (!m) return;
    m.position.set(st.shipX, 1.2, -1.5); m.visible = true;
    st.shootCD = FB_COOLDOWN; fireballs.push({ mesh: m, speed: FB_SPEED, life: FB_LIFE });
    Aud.play('cannon'); st.cannonFlashT = 0.15; cannonFlash.position.set(st.shipX, 1.5, -1); cannonFlash.intensity = 2;
    PSys.emit(st.shipX, 1.2, -1.5, 8, 0xff8833, 1.5, .3, 2); PSys.emit(st.shipX, 1.2, -1.5, 4, 0xffcc44, 1, .2, 1.5);
}

/* ═══ COLLISIONS ═══ */
function checkCol() {
    const sx = st.shipX, sr = .9;
    for (let i = obs.length - 1; i >= 0; i--) { const o = obs[i]; if (!o.mesh.visible) continue; const dx = sx - o.mesh.position.x, dz = -o.mesh.position.z, d = Math.sqrt(dx * dx + dz * dz); if (d < sr + o.r && st.invT <= 0) { hitShip(); o.mesh.visible = false; obs.splice(i, 1); PSys.emit(o.mesh.position.x, 1, o.mesh.position.z, 20, 0xff6633, 3, .7, 4); PSys.emit(o.mesh.position.x, .5, o.mesh.position.z, 12, 0xffaa44, 2, .5, 3); break; } }
    for (let i = tres.length - 1; i >= 0; i--) { const t = tres[i]; if (!t.mesh.visible) continue; const dx = sx - t.mesh.position.x, dz = -t.mesh.position.z, d = Math.sqrt(dx * dx + dz * dz); if (d < sr + t.r) { collectTre(t); t.mesh.visible = false; tres.splice(i, 1); } }
    for (let i = enemies.length - 1; i >= 0; i--) { const e = enemies[i]; if (!e.mesh.visible) continue; const dx = sx - e.mesh.position.x, dz = -e.mesh.position.z, d = Math.sqrt(dx * dx + dz * dz); if (d < sr + e.r && st.invT <= 0) { hitShip(); e.mesh.visible = false; enemies.splice(i, 1); PSys.emit(e.mesh.position.x, 1, e.mesh.position.z, 25, 0x88ffbb, 4, .8, 5); break; } }
    for (let ci = fireballs.length - 1; ci >= 0; ci--) {
        const cb = fireballs[ci]; if (!cb.mesh.visible) continue;
        for (let oi = obs.length - 1; oi >= 0; oi--) { const o = obs[oi]; if (!o.mesh.visible) continue; const dx = cb.mesh.position.x - o.mesh.position.x, dz = cb.mesh.position.z - o.mesh.position.z; if (Math.sqrt(dx * dx + dz * dz) < 1.4) { o.mesh.visible = false; obs.splice(oi, 1); cb.mesh.visible = false; fireballs.splice(ci, 1); PSys.emit(o.mesh.position.x, 1, o.mesh.position.z, 18, 0xff6622, 3.5, .6, 4); PSys.emit(o.mesh.position.x, 1.5, o.mesh.position.z, 10, 0xffcc00, 2, .4, 3); Aud.play('explode'); const pts = 5 * st.comboMult; addScore(pts); addCombo(); showPop(pts, o.mesh); break; } }
        if (!cb.mesh.visible) continue;
        for (let ei = enemies.length - 1; ei >= 0; ei--) { const e = enemies[ei]; if (!e.mesh.visible) continue; const dx = cb.mesh.position.x - e.mesh.position.x, dz = cb.mesh.position.z - e.mesh.position.z; if (Math.sqrt(dx * dx + dz * dz) < 1.5) { e.hp--; cb.mesh.visible = false; fireballs.splice(ci, 1); PSys.emit(e.mesh.position.x, 1, e.mesh.position.z, 12, 0xffcc00, 2.5, .4, 3); if (e.hp <= 0) { e.mesh.visible = false; enemies.splice(ei, 1); PSys.emit(e.mesh.position.x, 1, e.mesh.position.z, 25, 0x66ff99, 4, .8, 5); PSys.emit(e.mesh.position.x, 2, e.mesh.position.z, 15, 0xff8844, 3, .6, 4); Aud.play('explode'); const pts = 50 * st.comboMult; addScore(pts); addCombo(); showPop(pts, e.mesh); } else { const pts = 10 * st.comboMult; addScore(pts); addCombo(); showPop(pts, e.mesh); } break; } }
    }
}

/* ═══ ACTIONS ═══ */
function hitShip() { st.hp--; st.invT = 1.2; Aud.play('crash'); shake(1.0, .4); dmgFlash.style.opacity = '1'; setTimeout(() => dmgFlash.style.opacity = '0', 150); resetCombo(); updateHUD(); if (st.hp <= 0) gameOver(); }
function collectTre(t) { const pts = t.pts * st.comboMult; addScore(pts); addCombo(); Aud.play('coin'); PSys.emit(t.mesh.position.x, 1.2, t.mesh.position.z, 14, 0xffd700, 2, .6, 3); PSys.emit(t.mesh.position.x, .8, t.mesh.position.z, 8, 0xffffff, 1.5, .4, 2); showPop(pts, t.mesh); }
function addScore(p) {
    st.score += p; const old = st.level; st.level = Math.floor(st.score / LVL_SCORE) + 1; st.lvlProg = (st.score % LVL_SCORE) / LVL_SCORE;
    if (st.level > old) levelUp(); updateHUD();
}
function levelUp() {
    Aud.play('levelup'); st.tgtSpeed = STAGES[st.stageIdx].speedBase + (st.level - STAGES[st.stageIdx].level) * 0.8;
    st.spawnI = Math.max(.35, 1.0 - (st.level - 1) * .07); st.islandI = Math.max(1.8, 3.0 - (st.level - 1) * .15);
    lvlToast.textContent = `⚓ Level ${st.level}!`; lvlToast.classList.remove('show'); void lvlToast.offsetWidth; lvlToast.classList.add('show');
    for (let i = 0; i < 30; i++) PSys.emit(st.shipX + (Math.random() - .5) * 3, 1 + Math.random() * 2, (Math.random() - .5) * 3, 1, 0xffd700, 3, .8, 4);

    // Check Stage Progression
    for (let i = STAGES.length - 1; i >= 0; i--) {
        if (st.level >= STAGES[i].level && st.stageIdx < i) { setStage(i); break; }
    }
}
function showPop(pts, ref) { const p = document.createElement('div'); p.className = 'score-pop'; p.textContent = `+${pts}`; const r = canvas.getBoundingClientRect(); const v = new THREE.Vector3(ref.position.x, 2, ref.position.z); v.project(cam); p.style.left = `${(v.x * .5 + .5) * r.width}px`; p.style.top = `${(-v.y * .5 + .5) * r.height}px`; if (st.comboMult > 1) p.style.color = '#ffcc33'; popLayer.appendChild(p); setTimeout(() => p.remove(), 700); }

/* ═══ DISTANCE ═══ */
function updateDistance(dt) {
    st.distance += st.scrollSpeed * dt;
    if (st.nextMilestone < MILESTONES.length) { const m = MILESTONES[st.nextMilestone]; if (st.distance >= m) { st.nextMilestone++; Aud.play('milestone'); distMilestone.textContent = `🏴‍☠️ ${m}m Survived!`; distMilestone.classList.remove('show'); void distMilestone.offsetWidth; distMilestone.classList.add('show'); for (let i = 0; i < 20; i++) PSys.emit(st.shipX + (Math.random() - .5) * 4, 3 + Math.random() * 2, (Math.random() - .5) * 4, 1, 0x5edba8, 3, .6, 3); } }
    st.dDist += (st.distance - st.dDist) * 8 * dt; if (st.dDist > st.distance) st.dDist = st.distance;
    distEl.textContent = Math.floor(st.dDist) + 'm';
}

/* ═══ WEATHER PARTICLES ═══ */
function updateWeather(dt) {
    if (st.stageIdx >= 2) {
        if (Math.random() < 0.3) {
            PSys.emit((Math.random() - .5) * 40, 15 + Math.random() * 5, st.shipX - 10, 1, 0x99bbcc, 1, .6, 20, true);
        }
    }
}

/* ═══ HUD ═══ */
function updateHUD() { healthEl.textContent = `${st.hp}/${MAX_HP}`; healthBar.style.transform = `scaleX(${st.hp / MAX_HP})`; levelEl.textContent = st.level; levelPct.textContent = `${Math.round(st.lvlProg * 100)}%`; levelBar.style.transform = `scaleX(${st.lvlProg})`; bestEl.textContent = st.best; bestDistEl.textContent = st.bestDist + 'm'; }
function animScore(dt) { if (st.dScore < st.score) { st.dScore += Math.ceil((st.score - st.dScore) * 10 * dt); if (st.dScore > st.score) st.dScore = st.score; scoreEl.textContent = st.dScore; } }
function updateCooldownUI() {
    const pct = Math.min(st.shootCD / FB_COOLDOWN, 1);
    if (pct > 0) {
        cooldownRing.classList.add('active'); cooldownRing.classList.remove('ready'); cooldownArc.classList.remove('ready'); cooldownArc.style.strokeDashoffset = (1 - pct) * 97.4;
    } else { cooldownRing.classList.remove('active'); cooldownRing.classList.add('ready'); cooldownArc.classList.add('ready'); cooldownArc.style.strokeDashoffset = '0'; }
}

/* ═══ WATER ═══ */
function animWater(t) { 
    const p = wGeo.attributes.position, a = p.array; 
    for (let i = 0; i < a.length; i += 3) { 
        const ox = wOrig[i], oy = wOrig[i + 1]; 
        // Smoother, lower frequency wave swells
        a[i + 2] = Math.sin(ox * .08 + t * 1.2) * .45 + Math.cos(oy * .06 + t * .6) * .35 + Math.sin((ox + oy) * .05 + t * .8) * .25; 
    } 
    p.needsUpdate = true; 
}

/* ═══ SHIP ═══ */
function updateShip(dt) {
    if (!shipGrp || !shipOk) return;
    st.accelT = Math.min(st.accelT + dt, 1.0); // Reach top speed in 1 second instead of 2
    const accelFactor = Math.min(st.accelT, 1);
    
    // Smooth velocity logic
    st.scrollSpeed += (st.tgtSpeed * accelFactor - st.scrollSpeed) * 4 * dt;
    
    const tgtX = LANES[st.tgtLane];
    const dx = tgtX - st.shipX;
    
    // Buttery smooth ship steering (spring lerp)
    st.shipX += dx * 16 * dt; // constant ease-out
    
    // Smooth tilt
    const tilt = THREE.MathUtils.clamp(-dx * .45, -.45, .45); 
    st.shipTilt += (tilt - st.shipTilt) * 12 * dt;
    
    st.bob += dt * 2.8; 
    const bob = Math.sin(st.bob) * .1 + Math.cos(st.bob * 1.7) * .05;
    
    shipGrp.position.x = st.shipX; 
    shipGrp.position.y = SHIP_Y + bob; 
    shipGrp.rotation.z = st.shipTilt; 
    shipGrp.rotation.x = Math.sin(st.bob * .8) * .03 + st.shipTilt * .15;
    
    shipLight.position.set(st.shipX, 3, 2);
    if (st.invT > 0) { st.invT -= dt; shipGrp.visible = Math.floor(st.invT * 10) % 2 === 0; } else shipGrp.visible = true;
    
    const spdF = st.scrollSpeed / 16;
    if (Math.abs(dx) > .2) PSys.emit(st.shipX, .15, .8, 2, 0x88ccff, 1.2, .35, 1.8);
    if (st.elapsed % .06 < dt) { 
        PSys.emit(st.shipX + (Math.random() - .5) * .5, .05, 1.5, 1, 0xaaddff, .5, .5, .6); 
        if (spdF > .8) PSys.emit(st.shipX + (Math.random() - .5) * .8, .02, 1.8, 1, 0xbbddff, .8, .4, .8); 
    }
    if (st.cannonFlashT > 0) { st.cannonFlashT -= dt; cannonFlash.intensity = st.cannonFlashT / .15 * 2; if (st.cannonFlashT <= 0) cannonFlash.intensity = 0; }
}

/* ═══ WORLD ═══ */
function updateWorld(dt) {
    const sd = st.scrollSpeed * dt;
    for (let i = obs.length - 1; i >= 0; i--) { const o = obs[i]; o.mesh.position.z += sd; if (o.mesh.position.z > DESPAWN_Z) { o.mesh.visible = false; obs.splice(i, 1); addScore(1); } }
    for (let i = tres.length - 1; i >= 0; i--) { const t = tres[i]; t.mesh.position.z += sd; t.mesh.rotation.y += dt * 2; if (t.mesh.position.z > DESPAWN_Z) { t.mesh.visible = false; tres.splice(i, 1); } }
    for (let i = enemies.length - 1; i >= 0; i--) { const e = enemies[i]; e.mesh.position.z += sd * .7; if (e.mesh.position.z > DESPAWN_Z) { e.mesh.visible = false; enemies.splice(i, 1); } }
    for (let i = fireballs.length - 1; i >= 0; i--) { const c = fireballs[i]; c.life -= dt; c.mesh.position.z -= c.speed * dt; c.mesh.rotation.x += dt * 8; if (c.life <= 0 || c.mesh.position.z < -SPAWN_DIST - 5) { c.mesh.visible = false; fireballs.splice(i, 1); } }
    for (let i = islands.length - 1; i >= 0; i--) { const il = islands[i]; il.group.position.z += sd; if (il.group.position.z > DESPAWN_Z + 10) { il.group.visible = false; islands.splice(i, 1); } }
    for (const bg of bgIslands) { bg.position.z += sd * .12; if (bg.position.z > 40) bg.position.z -= 360; }
    st.spawnT -= dt; if (st.spawnT <= 0) { st.spawnT = st.spawnI * (.6 + Math.random() * .7); spawnObs(); if (Math.random() < .5) spawnTre(); if (st.level >= 3 && Math.random() < Math.min(.2, (st.level - 2) * .05)) spawnEnemy(); }
    st.islandT -= dt; if (st.islandT <= 0) { st.islandT = st.islandI * (.8 + Math.random() * .5); spawnIsland(); }
    if (st.shootCD > 0) st.shootCD -= dt;
    updateCooldownUI();
    updateStage(dt);
    updateWeather(dt);
}

/* ═══ GAME FLOW ═══ */
function startGame() {
    Aud.init(); Object.assign(st, { running: true, paused: false, score: 0, dScore: 0, hp: MAX_HP, level: 1, lvlProg: 0, lane: 1, tgtLane: 1, shipX: 0, shipTilt: 0, bob: 0, scrollSpeed: 0, tgtSpeed: STAGES[0].speedBase, accelT: 0, spawnT: 1.5, spawnI: 1.0, invT: 0, shootCD: 0, elapsed: 0, distance: 0, dDist: 0, nextMilestone: 0, islandT: 2, islandI: 3.0, combo: 0, comboMult: 1, cannonFlashT: 0, stageIdx: 0, stageTransT: 0 });

    st.curClear.set(STAGES[0].clear); st.curFog.set(STAGES[0].fog); st.curFogDens = STAGES[0].fogDens; st.curSun = STAGES[0].sun; st.curHemi = STAGES[0].hemi;
    scene.background = st.curClear; scene.fog.color = st.curFog; scene.fog.density = st.curFogDens; sun.intensity = st.curSun; hemi.intensity = st.curHemi;
    skyMat.uniforms.cBot.value = st.curFog; skyMat.uniforms.cSky.value = st.curClear;

    resetPools(); Object.values(CP).forEach(p => p.forEach(m => { if (m.visible !== undefined) m.visible = false; })); PSys.clear(); camSt.shakeI = 0; cam.position.copy(CAM_BASE); cam.fov = 52;
    lossSfx.pause(); lossSfx.currentTime = 0; resetCombo();
    overlay.classList.remove('show'); pauseOverlay.classList.remove('show'); scoreEl.textContent = '0'; distEl.textContent = '0m'; updateHUD(); Aud.startAmb();
    cooldownRing.classList.add('ready'); cooldownArc.classList.add('ready');
    stageToast.textContent = STAGES[0].name; stageToast.classList.add('show');
}

function gameOver() {
    st.running = false; if (st.score > st.best) { st.best = st.score; localStorage.setItem('pirateBest', String(st.best)); }
    const dist = Math.floor(st.distance); if (dist > st.bestDist) { st.bestDist = dist; localStorage.setItem('pirateDist', String(dist)); }
    Aud.stopAmb(); oTitle.textContent = '💀 Ship Destroyed!'; oText.textContent = 'The cursed sea claims another ship.';
    playLossSfx();
    finalScore.innerHTML = `<div style="font-size:.85em;color:#bfe5f7;margin-bottom:4px">Final Score</div><div style="font-size:1.6em">${st.score}</div><div style="font-size:.78em;color:#5edba8;margin:4px 0">${dist}m sailed</div><div style="font-size:.75em;color:#89dcff">Best: ${st.best} · ${st.bestDist}m · Level ${st.level} - Stage ${st.stageIdx + 1}</div>${st.combo > 2 ? `<div style="font-size:.7em;color:#f2ca7a;margin-top:4px">Max combo: x${st.comboMult}</div>` : ''}`;
    startBtn.textContent = '⚓ Set Sail Again'; overlay.classList.add('show');
    cooldownRing.classList.remove('active', 'ready'); comboBadge.classList.remove('visible');
}

function togglePause() { if (!st.running) return; st.paused = !st.paused; if (st.paused) pauseOverlay.classList.add('show'); else pauseOverlay.classList.remove('show'); }

/* ═══ INPUT ═══ */
window.addEventListener('keydown', e => {
    if (e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
    if (st.paused || !st.running) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { if (st.tgtLane > 0) st.tgtLane--; }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { if (st.tgtLane < 2) st.tgtLane++; }
    if (e.code === 'Space') { e.preventDefault(); shoot(); }
});
startBtn.addEventListener('click', () => { Aud.init(); if (mdlOk) startGame(); });
resumeBtn.addEventListener('click', () => togglePause());
restartBtn.addEventListener('click', () => { pauseOverlay.classList.remove('show'); st.paused = false; if (mdlOk) startGame(); });
pauseBtn.addEventListener('click', () => { if (st.running) togglePause(); });
fsBtn.addEventListener('click', () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.().catch(() => { }); } else { document.exitFullscreen?.(); } });
function syncMuteUI() { const m = Aud.isMuted(); muteBtn.textContent = m ? '🔇' : '🔊'; if (muteBtn2) muteBtn2.textContent = m ? '🔇 Off' : '🔊 On'; }
muteBtn.addEventListener('click', () => { Aud.init(); Aud.setMute(!Aud.isMuted()); syncMuteUI(); });
if (muteBtn2) muteBtn2.addEventListener('click', () => { Aud.init(); Aud.setMute(!Aud.isMuted()); syncMuteUI(); });
if (qualityBtn) qualityBtn.addEventListener('click', () => { qualityLevel = (qualityLevel + 1) % 3; applyQuality(); qualityBtn.textContent = ['Low', 'Med', 'High'][qualityLevel]; });

// Touch
let tSX = 0, tSY = 0;
vpWrap.addEventListener('touchstart', e => { tSX = e.touches[0].clientX; tSY = e.touches[0].clientY; }, { passive: true });
vpWrap.addEventListener('touchend', e => { if (!st.running || st.paused) return; const dx = e.changedTouches[0].clientX - tSX, dy = e.changedTouches[0].clientY - tSY; if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0 && st.tgtLane > 0) st.tgtLane--; if (dx > 0 && st.tgtLane < 2) st.tgtLane++; } else if (Math.abs(dx) < 15 && Math.abs(dy) < 15) shoot(); }, { passive: true });
const tL = $('touchLeftBtn'), tR = $('touchRightBtn'), fB = $('fireBtn');
function addTB(b, a) { if (!b) return; const h = e => { e.preventDefault(); if (st.running && !st.paused) a(); b.classList.add('active'); }; b.addEventListener('touchstart', h, { passive: false }); b.addEventListener('mousedown', h); const r2 = () => b.classList.remove('active'); b.addEventListener('touchend', r2, { passive: true }); b.addEventListener('mouseup', r2); b.addEventListener('mouseleave', r2); }
addTB(tL, () => { if (st.tgtLane > 0) st.tgtLane--; }); addTB(tR, () => { if (st.tgtLane < 2) st.tgtLane++; }); addTB(fB, () => shoot());

/* ═══ RESIZE ═══ */
function onResize() { const r = vpWrap.getBoundingClientRect(); R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }
window.addEventListener('resize', onResize); setTimeout(onResize, 60);

/* ═══ LOOP ═══ */
let lt = 0;
function loop(time) {
    requestAnimationFrame(loop); const t = time * .001, dt = Math.min(t - lt, .05); lt = t; skyMat.uniforms.uTime.value = t;
    if (st.running && mdlOk && !st.paused) {
        st.elapsed += dt; updateShip(dt); updateWorld(dt); checkCol(); animScore(dt); updateDistance(dt); updateCam(dt);
        if (st.scrollSpeed > 14 && Math.random() < .005) Aud.play('wind');
    } else { camSt.sway += dt * .8; cam.position.x = Math.sin(camSt.sway) * .3; cam.position.y = CAM_BASE.y + Math.cos(camSt.sway * .5) * .1; }
    animWater(t); updateClouds(dt); PSys.update(dt); R.render(scene, cam);
}

/* ═══ BOOT ═══ */
bestEl.textContent = st.best; bestDistEl.textContent = st.bestDist + 'm';
loadAll().then(() => {
    loadScreen.classList.add('done'); setTimeout(() => loadScreen.style.display = 'none', 600);
    oTitle.textContent = '⚓ Pirate Sea Dash 3D'; oText.textContent = 'Arrow Keys / WASD to move · Space to fire cannons · Collect treasure, dodge rocks, destroy enemies!';
    startBtn.textContent = '⚓ Start Voyage'; console.log('Pirate Sea Dash Expansion Ready!');
}).catch(err => { oText.textContent = 'Failed to load. Please refresh.'; console.error(err); });
requestAnimationFrame(loop);
