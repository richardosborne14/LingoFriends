import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

const G = 12, TW = 1, TH = 0.1;
const wp = (gx, gz) => ({ x: (gx - G / 2 + 0.5) * TW, z: (gz - G / 2 + 0.5) * TW });

// ─── Trees ───────────────────────────────────────────────────────
function makeOak(gx, gz) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.13, 0.55, 7),
    new THREE.MeshLambertMaterial({ color: 0x6B4B2A }));
  trunk.position.y = TH / 2 + 0.275; trunk.castShadow = true; g.add(trunk);
  [[0, 0.8, 0, 0.42], [-0.2, 0.67, 0.12, 0.31], [0.18, 0.64, -0.12, 0.29]].forEach(([ox, oy, oz, r], i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8),
      new THREE.MeshLambertMaterial({ color: [0x2A7A2A, 0x1E6B1E, 0x185A18][i] }));
    s.position.set(ox, TH / 2 + oy, oz); s.castShadow = true; g.add(s);
  });
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makePine(gx, gz) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.44, 6),
    new THREE.MeshLambertMaterial({ color: 0x7C5533 }));
  trunk.position.y = TH / 2 + 0.22; trunk.castShadow = true; g.add(trunk);
  [[0.52, 0.42, 0.18], [0.38, 0.52, 0.42], [0.24, 0.36, 0.66]].forEach(([r, h, yOff], i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7),
      new THREE.MeshLambertMaterial({ color: i === 2 ? 0x0E3E0E : 0x145414 }));
    cone.position.y = TH / 2 + 0.42 + yOff * 0.42; cone.castShadow = true; g.add(cone);
  });
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makeCherry(gx, gz) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.1, 0.5, 7),
    new THREE.MeshLambertMaterial({ color: 0x6B3A2A }));
  trunk.position.y = TH / 2 + 0.25; trunk.castShadow = true; g.add(trunk);
  [[0, 0.78, 0, 0.38], [-0.19, 0.67, 0.13, 0.28], [0.17, 0.65, -0.13, 0.27]].forEach(([ox, oy, oz, r]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8),
      new THREE.MeshLambertMaterial({ color: ox === 0 ? 0xFF8EC4 : 0xFF6699 }));
    s.position.set(ox, TH / 2 + oy, oz); s.castShadow = true; g.add(s);
  });
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makeMaple(gx, gz) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.52, 7),
    new THREE.MeshLambertMaterial({ color: 0x7A4A2A }));
  trunk.position.y = TH / 2 + 0.26; trunk.castShadow = true; g.add(trunk);
  const pal = [0xE85D04, 0xFF9A00, 0xDC2F02];
  [[0.52, 0.52, 0], [0.4, 0.48, 0.28], [0.26, 0.38, 0.52]].forEach(([r, h, off], i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7),
      new THREE.MeshLambertMaterial({ color: pal[i] }));
    cone.position.y = TH / 2 + 0.52 + off * 0.44; cone.castShadow = true; g.add(cone);
  });
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makeWillow(gx, gz) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.11, 0.85, 7),
    new THREE.MeshLambertMaterial({ color: 0x6B4B2A }));
  trunk.position.y = TH / 2 + 0.425; trunk.castShadow = true; g.add(trunk);
  const main = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0x3A9B3A }));
  main.position.y = TH / 2 + 0.95; main.scale.y = 0.68; g.add(main);
  const strandMat = new THREE.MeshLambertMaterial({ color: 0x2A7A2A });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const strand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), strandMat);
    strand.position.set(Math.cos(angle) * 0.42, TH / 2 + 0.44, Math.sin(angle) * 0.42);
    strand.scale.set(0.55, 1.9, 0.55); strand.castShadow = true; g.add(strand);
  }
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makePalm(gx, gz) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.095, 1.15, 7),
    new THREE.MeshLambertMaterial({ color: 0xA08050 }));
  trunk.position.y = TH / 2 + 0.575; trunk.rotation.z = 0.09; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.14),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0x2A7A2A : 0x367836 }));
    frond.position.set(Math.cos(angle) * 0.3, TH / 2 + 1.1, Math.sin(angle) * 0.3);
    frond.rotation.y = angle; frond.rotation.z = 0.32; frond.castShadow = true; g.add(frond);
  }
  [[0.09, -0.11], [-0.11, -0.09]].forEach(([cx, cz]) => {
    const coc = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0x7A5523 }));
    coc.position.set(cx, TH / 2 + 0.99, cz); g.add(coc);
  });
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

// ─── Flowers with real petals ─────────────────────────────────────
function makeFlower(gx, gz, petalColor = 0xFF69B4, centerColor = 0xFFD700, numPetals = 6) {
  const g = new THREE.Group();
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x2A7A1A });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.26, 5), stemMat);
  stem.position.y = TH / 2 + 0.13; g.add(stem);
  // Leaf
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 5), stemMat);
  leaf.position.set(0.09, TH / 2 + 0.11, 0); leaf.scale.set(1.5, 0.33, 0.85); g.add(leaf);
  // Petals
  const petalMat = new THREE.MeshLambertMaterial({ color: petalColor });
  for (let i = 0; i < numPetals; i++) {
    const angle = (i / numPetals) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.078, 6, 6), petalMat);
    petal.position.set(Math.cos(angle) * 0.105, TH / 2 + 0.285, Math.sin(angle) * 0.105);
    petal.scale.set(0.82, 0.28, 1.38); petal.rotation.y = angle; g.add(petal);
  }
  // Center disc
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.072, 7, 7),
    new THREE.MeshLambertMaterial({ color: centerColor }));
  center.position.y = TH / 2 + 0.295; g.add(center);
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

// ─── Other objects ───────────────────────────────────────────────
function makeBush(gx, gz) {
  const g = new THREE.Group();
  [[0, 0.26, 0, 0.27, 0x1E5C1E], [-0.17, 0.21, 0.14, 0.19, 0x267326],
   [0.17, 0.21, -0.14, 0.19, 0x1A5219]].forEach(([ox, oy, oz, r, c]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8),
      new THREE.MeshLambertMaterial({ color: c }));
    b.position.set(ox, TH / 2 + oy, oz); b.castShadow = true; g.add(b);
  });
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makeBench(gx, gz) {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x8B6040 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.22), wood);
  seat.position.y = TH / 2 + 0.21; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.04), wood);
  back.position.set(0, TH / 2 + 0.36, -0.09); g.add(back);
  [[-0.21, 0.08], [0.21, 0.08], [-0.21, -0.08], [0.21, -0.08]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), metal);
    leg.position.set(lx, TH / 2 + 0.11, lz); g.add(leg);
  });
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makeLantern(gx, gz) {
  const g = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.58, 5), dark);
  pole.position.y = TH / 2 + 0.29; g.add(pole);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.13),
    new THREE.MeshLambertMaterial({ color: 0xFFCC44, emissive: 0xFFAA00, emissiveIntensity: 1.4 }));
  box.position.y = TH / 2 + 0.62; g.add(box);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.09, 4), dark);
  cap.position.y = TH / 2 + 0.71; g.add(cap);
  // Glow halo
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xFFDD88, transparent: true, opacity: 0.3 }));
  halo.position.y = TH / 2 + 0.62; g.add(halo);
  // Point light inside lantern
  const light = new THREE.PointLight(0xFFAA33, 3.0, 3.4);
  light.position.y = TH / 2 + 0.62;
  light.userData.isLanternLight = true;
  g.add(light);
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makeFountain(gx, gz) {
  const g = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const water = new THREE.MeshLambertMaterial({ color: 0x3A9FD6 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.33, 0.16, 13), stone);
  basin.position.y = TH / 2 + 0.08; g.add(basin);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(0.32, 13), water);
  surf.rotation.x = -Math.PI / 2; surf.position.y = TH / 2 + 0.155; g.add(surf);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.34, 8), stone);
  col.position.y = TH / 2 + 0.245; g.add(col);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.09, 11), stone);
  bowl.position.y = TH / 2 + 0.41; g.add(bowl);
  // Arc water particles
  const dropMat = new THREE.MeshLambertMaterial({ color: 0xAADDFF, transparent: true });
  const drops = [];
  for (let i = 0; i < 18; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.028, 4, 4), dropMat.clone());
    drop.userData = { angle: (i / 18) * Math.PI * 2, phase: i / 18 };
    drops.push(drop); g.add(drop);
  }
  g.userData.fountainDrops = drops;
  g.userData.isFountain = true;
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makePond(gx, gz) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.44, 0.08, 14),
    new THREE.MeshLambertMaterial({ color: 0x777777 }));
  rim.position.y = TH / 2 + 0.04; g.add(rim);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.04, 14),
    new THREE.MeshLambertMaterial({ color: 0x0E4A8A }));
  water.position.y = TH / 2 + 0.02; g.add(water);
  // Lily pads
  [[0.15, 0.12], [-0.18, -0.08]].forEach(([lx, lz]) => {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 8),
      new THREE.MeshLambertMaterial({ color: 0x2A7A1A }));
    pad.position.set(lx, TH / 2 + 0.042, lz); g.add(pad);
  });
  // Ripple rings
  for (let i = 0; i < 3; i++) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x5599BB, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.095, 18), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = TH / 2 + 0.046;
    ring.userData = { phase: i / 3, isRipple: true };
    g.add(ring);
  }
  g.userData.isPond = true;
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makeMushroom(gx, gz) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.19, 6),
    new THREE.MeshLambertMaterial({ color: 0xF0E0CC }));
  stem.position.y = TH / 2 + 0.095; g.add(stem);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xCC2222 }));
  cap.position.y = TH / 2 + 0.175; g.add(cap);
  [[-0.07, 0.065], [0.07, 0.042], [0, 0.1]].forEach(([dx, dy]) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 5),
      new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
    d.position.set(dx, TH / 2 + 0.175 + dy, 0.12); g.add(d);
  });
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makeSign(gx, gz) {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x9B7B50 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.52, 5), wood);
  pole.position.y = TH / 2 + 0.26; g.add(pole);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.19, 0.04), wood);
  board.position.y = TH / 2 + 0.47; g.add(board);
  const { x, z } = wp(gx, gz); g.position.set(x, 0, z); return g;
}

function makeCloud(cx, cy, cz, sc = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xBBCCDD });
  [[0, 0], [-0.72, 0.14], [0.72, 0.1], [-0.36, 0.36], [0.36, 0.3]].forEach(([bx, by]) => {
    const r = (0.38 + Math.abs(bx) * 0.08) * sc;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 6), mat);
    s.position.set(bx * sc, by * sc, 0); g.add(s);
  });
  g.position.set(cx, cy, cz); return g;
}

function makeObj(id, gx, gz) {
  switch (id) {
    case "oak":      return makeOak(gx, gz);
    case "pine":     return makePine(gx, gz);
    case "cherry":   return makeCherry(gx, gz);
    case "maple":    return makeMaple(gx, gz);
    case "willow":   return makeWillow(gx, gz);
    case "palm":     return makePalm(gx, gz);
    case "rose":     return makeFlower(gx, gz, 0xFF1744, 0xFFD700, 6);
    case "sunflwr":  return makeFlower(gx, gz, 0xFFD600, 0x5C2E00, 12);
    case "tulip":    return makeFlower(gx, gz, 0xFF69B4, 0xFFFF99, 4);
    case "lavender": return makeFlower(gx, gz, 0x9966CC, 0x7B52AB, 8);
    case "daisy":    return makeFlower(gx, gz, 0xFFFFFF, 0xFFD700, 12);
    case "poppy":    return makeFlower(gx, gz, 0xFF3300, 0x111111, 5);
    case "hedge":    return makeBush(gx, gz);
    case "mushroom": return makeMushroom(gx, gz);
    case "bench":    return makeBench(gx, gz);
    case "lantern":  return makeLantern(gx, gz);
    case "fountain": return makeFountain(gx, gz);
    case "pond":     return makePond(gx, gz);
    case "sign":     return makeSign(gx, gz);
    default:         return makeFlower(gx, gz, 0xFF69B4, 0xFFD700);
  }
}

// ─── Avatar builder ──────────────────────────────────────────────
function buildCharacter(opts) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: opts.shirtColor });
  const headMat = new THREE.MeshLambertMaterial({ color: opts.skinTone });
  const pantsMat = new THREE.MeshLambertMaterial({ color: opts.pantsColor });
  const hairMat = new THREE.MeshLambertMaterial({ color: opts.hairColor });
  // Legs
  [[-0.065, 0], [0.065, 0]].forEach(([lx]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.1), pantsMat);
    leg.position.set(lx, TH / 2 + 0.11, 0); g.add(leg);
  });
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, opts.gender === 'girl' ? 0.28 : 0.24, 0.16), bodyMat);
  body.position.y = TH / 2 + 0.28; body.castShadow = true; g.add(body);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), headMat);
  head.position.y = TH / 2 + 0.52; head.castShadow = true; g.add(head);
  // Eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  [[-0.05, 0.055], [0.05, 0.055]].forEach(([ex, ey]) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 5), eyeMat);
    eye.position.set(ex, TH / 2 + 0.52 + ey, 0.12); g.add(eye);
  });
  // Smile
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.01, 5, 8, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0xCC4444 }));
  smile.position.set(0, TH / 2 + 0.495, 0.126); smile.rotation.x = Math.PI / 2; g.add(smile);
  // Hair
  if (opts.gender === 'girl') {
    [[-0.12, 0.055], [0.12, 0.055]].forEach(([hx, hy]) => {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), hairMat);
      bun.position.set(hx, TH / 2 + 0.52 + hy, 0); g.add(bun);
    });
    const topH = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    topH.position.y = TH / 2 + 0.585; g.add(topH);
  } else {
    const topH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.24), hairMat);
    topH.position.y = TH / 2 + 0.63; g.add(topH);
    const sideH = new THREE.Mesh(new THREE.BoxGeometry(0.245, 0.085, 0.18), hairMat);
    sideH.position.y = TH / 2 + 0.595; g.add(sideH);
  }
  // Hat
  const hatMat = new THREE.MeshLambertMaterial({ color: opts.hatColor });
  if (opts.hat === 'cap') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.04, 8), hatMat);
    brim.position.y = TH / 2 + 0.645; g.add(brim);
    const brimF = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.13), hatMat);
    brimF.position.set(0, TH / 2 + 0.64, 0.165); g.add(brimF);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
    dome.position.y = TH / 2 + 0.645; g.add(dome);
  } else if (opts.hat === 'wizard') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 10), hatMat);
    brim.position.y = TH / 2 + 0.642; g.add(brim);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.38, 8), hatMat);
    cone.position.y = TH / 2 + 0.86; g.add(cone);
    // Star on wizard hat
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.04),
      new THREE.MeshLambertMaterial({ color: 0xFFFF00, emissive: 0xFFAA00, emissiveIntensity: 0.8 }));
    star.position.y = TH / 2 + 1.03; g.add(star);
  } else if (opts.hat === 'crown') {
    const crownMat = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xAA8800, emissiveIntensity: 0.4 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.065, 8, 1, true), crownMat);
    base.position.y = TH / 2 + 0.643; g.add(base);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.11, 5), crownMat);
      spike.position.set(Math.cos(angle) * 0.135, TH / 2 + 0.715, Math.sin(angle) * 0.135);
      g.add(spike);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025),
        new THREE.MeshLambertMaterial({ color: 0xFF2277, emissive: 0xFF0055, emissiveIntensity: 0.6 }));
      gem.position.set(Math.cos(angle) * 0.135, TH / 2 + 0.69, Math.sin(angle) * 0.135);
      g.add(gem);
    }
  } else if (opts.hat === 'flower') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4),
      new THREE.MeshLambertMaterial({ color: 0x2A7A1A }));
    stem.position.set(0.05, TH / 2 + 0.67, 0); g.add(stem);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.052, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0xFF69B4 }));
    bloom.position.set(0.05, TH / 2 + 0.73, 0); g.add(bloom);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 5),
        new THREE.MeshLambertMaterial({ color: 0xFF88CC }));
      p.position.set(0.05 + Math.cos(a) * 0.065, TH / 2 + 0.73, Math.sin(a) * 0.065);
      g.add(p);
    }
  }
  return g;
}

// ─── Data ────────────────────────────────────────────────────────
const SHOP = [
  { id:"oak",      name:"Oak Tree",       cost:30, icon:"🌳", cat:"Trees"    },
  { id:"pine",     name:"Pine Tree",      cost:25, icon:"🌲", cat:"Trees"    },
  { id:"cherry",   name:"Cherry",         cost:40, icon:"🌸", cat:"Trees"    },
  { id:"maple",    name:"Autumn Maple",   cost:35, icon:"🍁", cat:"Trees"    },
  { id:"willow",   name:"Weeping Willow", cost:45, icon:"🌿", cat:"Trees"    },
  { id:"palm",     name:"Palm Tree",      cost:38, icon:"🌴", cat:"Trees"    },
  { id:"rose",     name:"Rose",           cost:15, icon:"🌹", cat:"Flowers"  },
  { id:"sunflwr",  name:"Sunflower",      cost:12, icon:"🌻", cat:"Flowers"  },
  { id:"tulip",    name:"Tulip",          cost:10, icon:"🌷", cat:"Flowers"  },
  { id:"lavender", name:"Lavender",       cost:10, icon:"💜", cat:"Flowers"  },
  { id:"daisy",    name:"Daisy",          cost:8,  icon:"🌼", cat:"Flowers"  },
  { id:"poppy",    name:"Poppy",          cost:10, icon:"🌺", cat:"Flowers"  },
  { id:"hedge",    name:"Hedge Bush",     cost:18, icon:"🌿", cat:"Plants"   },
  { id:"mushroom", name:"Mushroom",       cost:8,  icon:"🍄", cat:"Plants"   },
  { id:"bench",    name:"Bench",          cost:45, icon:"🪑", cat:"Furniture"},
  { id:"lantern",  name:"Lantern",        cost:35, icon:"🏮", cat:"Furniture"},
  { id:"sign",     name:"Sign Post",      cost:20, icon:"🪧", cat:"Furniture"},
  { id:"fountain", name:"Fountain",       cost:80, icon:"⛲", cat:"Features" },
  { id:"pond",     name:"Pond",           cost:55, icon:"💧", cat:"Features" },
];

function buildTilemap() {
  const m = {};
  const c = Math.floor(G / 2);
  for (let i = 0; i < G; i++) { m[`${c},${i}`] = "path"; m[`${i},${c}`] = "path"; }
  return m;
}

const INIT_OBJS = [
  { id:"oak",      gx:1,  gz:1  }, { id:"pine",     gx:11, gz:1  },
  { id:"cherry",   gx:1,  gz:11 }, { id:"willow",   gx:11, gz:11 },
  { id:"palm",     gx:2,  gz:4  }, { id:"maple",    gx:9,  gz:8  },
  { id:"cherry",   gx:3,  gz:9  }, { id:"oak",      gx:10, gz:2  },
  { id:"rose",     gx:2,  gz:6  }, { id:"tulip",    gx:3,  gz:7  },
  { id:"sunflwr",  gx:2,  gz:8  }, { id:"lavender", gx:3,  gz:5  },
  { id:"daisy",    gx:1,  gz:7  }, { id:"poppy",    gx:1,  gz:9  },
  { id:"rose",     gx:9,  gz:4  }, { id:"sunflwr",  gx:8,  gz:5  },
  { id:"tulip",    gx:10, gz:5  }, { id:"daisy",    gx:10, gz:4  },
  { id:"daisy",    gx:4,  gz:2  }, { id:"lavender", gx:5,  gz:2  },
  { id:"poppy",    gx:7,  gz:2  },
  { id:"hedge",    gx:2,  gz:10 }, { id:"hedge",    gx:3,  gz:10 },
  { id:"hedge",    gx:4,  gz:10 }, { id:"hedge",    gx:9,  gz:10 },
  { id:"hedge",    gx:10, gz:10 }, { id:"hedge",    gx:11, gz:9  },
  { id:"mushroom", gx:4,  gz:9  }, { id:"mushroom", gx:5,  gz:10 },
  { id:"fountain", gx:8,  gz:2  }, { id:"pond",     gx:2,  gz:2  },
  { id:"lantern",  gx:5,  gz:5  }, { id:"lantern",  gx:8,  gz:8  },
  { id:"lantern",  gx:1,  gz:5  }, { id:"lantern",  gx:10, gz:3  },
  { id:"lantern",  gx:4,  gz:11 }, { id:"lantern",  gx:9,  gz:11 },
  { id:"bench",    gx:4,  gz:3  }, { id:"bench",    gx:8,  gz:9  },
  { id:"sign",     gx:1,  gz:3  },
];

const DEFAULT_AVATAR = {
  gender: "boy", shirtColor: 0x4ECDC4, pantsColor: 0x3355AA,
  hairColor: 0x3D2B1A, skinTone: 0xFFD1A4, hat: "none", hatColor: 0x8B0000,
};

const SHIRT_COLORS = [
  { label:"Teal",   v: 0x4ECDC4 }, { label:"Red",    v: 0xE84040 },
  { label:"Purple", v: 0x8B5CF6 }, { label:"Orange", v: 0xFF8C00 },
  { label:"Navy",   v: 0x2C3E8B }, { label:"Pink",   v: 0xFF69B4 },
  { label:"Mint",   v: 0x4DBD74 }, { label:"Gold",   v: 0xCC9900 },
];
const PANTS_COLORS = [
  { label:"Blue",  v: 0x3355AA }, { label:"Brown", v: 0x7A5533 },
  { label:"Black", v: 0x222222 }, { label:"Green", v: 0x2E6B2E },
];
const HAIR_COLORS = [
  { label:"Brown",  v: 0x3D2B1A }, { label:"Blonde", v: 0xDDB800 },
  { label:"Black",  v: 0x111111 }, { label:"Auburn", v: 0xBB3311 },
  { label:"Silver", v: 0xCCCCCC }, { label:"Purple", v: 0x8B2FC9 },
];
const SKIN_TONES = [
  { label:"Light",  v: 0xFFD1A4 }, { label:"Warm",   v: 0xF5C27A },
  { label:"Medium", v: 0xD4956A }, { label:"Deep",   v: 0x8D5524 },
];
const HAT_COLORS = [
  { label:"Red",    v: 0xAA1111 }, { label:"Blue",   v: 0x113399 },
  { label:"Purple", v: 0x6622AA }, { label:"Black",  v: 0x222222 },
  { label:"Forest", v: 0x115511 }, { label:"Midnight",v:0x050530 },
];

// ─── Component ───────────────────────────────────────────────────
export default function Garden() {
  const canvasRef = useRef(null);
  const three = useRef({});
  const selRef = useRef(null);
  const timerRef = useRef(null);

  const [coins, setCoins] = useState(200);
  const [showShop, setShowShop] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [selItem, setSelItem] = useState(null);
  const [shopCat, setShopCat] = useState("All");
  const [msg, setMsg] = useState("🌙 Evening garden — scroll to zoom · click to walk · 🎨 customise your avatar");
  const [avatarOpts, setAvatarOpts] = useState(DEFAULT_AVATAR);

  function flash(text, dur = 3500) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMsg(text);
    timerRef.current = setTimeout(() => setMsg(null), dur);
  }

  function selectItem(item) {
    const s = three.current;
    if (!s.scene) return;
    if (s.ghost) { s.scene.remove(s.ghost); s.ghost = null; }
    const g = makeObj(item.id, 0, 0);
    g.traverse(c => {
      if (c.isMesh) { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = 0.5; }
    });
    g.visible = false; s.scene.add(g); s.ghost = g;
    selRef.current = item; setSelItem(item); setShowShop(false);
    flash(`🎯 Hover a tile then click to place ${item.icon} ${item.name}`);
  }

  function cancelSelect() {
    const s = three.current;
    if (s.ghost) { s.scene.remove(s.ghost); s.ghost = null; }
    selRef.current = null; setSelItem(null);
  }

  // Rebuild character when avatar options change
  useEffect(() => {
    const s = three.current;
    if (!s.scene || !s.char) return;
    const pos = s.char.position.clone();
    const rotY = s.char.rotation.y;
    s.scene.remove(s.char);
    const nc = buildCharacter(avatarOpts);
    nc.position.copy(pos); nc.rotation.y = rotY;
    s.scene.add(nc); s.char = nc;
  }, [avatarOpts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    let W = container.clientWidth, H = container.clientHeight;
    let fr = 7.5; // frustum half-height

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080F1C);
    scene.fog = new THREE.Fog(0x080F1C, 20, 38);

    const camera = new THREE.OrthographicCamera(
      -(fr * W) / H, (fr * W) / H, fr, -fr, 0.1, 200
    );
    camera.position.set(12, 12, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;

    // Very dim ambient — evening
    scene.add(new THREE.AmbientLight(0x5566AA, 0.16));
    // Low golden-hour sun
    const sun = new THREE.DirectionalLight(0xFF9944, 0.32);
    sun.position.set(5, 10, 3); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -14; sc.right = sc.top = 14;
    scene.add(sun);
    const fillLight = new THREE.DirectionalLight(0x223355, 0.1);
    fillLight.position.set(-5, 6, -5);
    scene.add(fillLight);

    // Stars
    for (let i = 0; i < 55; i++) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 3, 3),
        new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
      );
      star.position.set((Math.random() - 0.5) * 34, 11 + Math.random() * 7, -10 + Math.random() * -12);
      scene.add(star);
    }
    // Moon
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xEEEECC }));
    moon.position.set(-8, 14, -12); scene.add(moon);
    const moonGlow = new THREE.PointLight(0xBBCCFF, 0.18, 30);
    moonGlow.position.set(-8, 14, -12); scene.add(moonGlow);

    // Dark clouds
    [[-4, 9, -10, 1.0], [1, 10, -12, 1.2], [6, 8.5, -9, 0.9],
     [9, 9, -8, 1.1], [-7, 8.5, -7, 0.85]].forEach(([x, y, z, s]) => scene.add(makeCloud(x, y, z, s)));

    // Ground border
    const border = new THREE.Mesh(new THREE.BoxGeometry(G * TW + 0.6, TH * 0.5, G * TW + 0.6),
      new THREE.MeshLambertMaterial({ color: 0x0F2E0A }));
    border.position.set(0, -TH * 0.3, 0); scene.add(border);

    // Fence
    const postMat = new THREE.MeshLambertMaterial({ color: 0x5A3A1A });
    const railMat = new THREE.MeshLambertMaterial({ color: 0x7A5530 });
    const halfG = G / 2;
    for (let i = 0; i <= G; i++) {
      const pos = (i - halfG) * TW;
      [[-halfG * TW, pos], [halfG * TW, pos]].forEach(([px, pz]) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 0.07), postMat);
        p.position.set(px, TH / 2 + 0.2, pz); scene.add(p);
      });
      [[-halfG * TW, pos], [halfG * TW, pos]].forEach(([pz, px]) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 0.07), postMat);
        p.position.set(px, TH / 2 + 0.2, pz); scene.add(p);
      });
    }
    [-0.05, 0.15].forEach(ry => {
      [-halfG * TW, halfG * TW].forEach(side => {
        const r = new THREE.Mesh(new THREE.BoxGeometry(G * TW + 0.1, 0.04, 0.04), railMat);
        r.position.set(0, TH / 2 + ry + 0.2, side); scene.add(r);
        const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, G * TW + 0.1), railMat);
        r2.position.set(side, TH / 2 + ry + 0.2, 0); scene.add(r2);
      });
    });

    // Tiles — full TW, no gaps
    const tilemap = buildTilemap();
    const tiles = [];
    for (let gx = 0; gx < G; gx++) {
      for (let gz = 0; gz < G; gz++) {
        const type = tilemap[`${gx},${gz}`] || "grass";
        const color = type === "path"
          ? ((gx + gz) % 2 ? 0x4A3C26 : 0x574830)
          : ((gx + gz) % 2 ? 0x143C14 : 0x103510);
        const t = new THREE.Mesh(new THREE.BoxGeometry(TW, TH, TW),
          new THREE.MeshLambertMaterial({ color }));
        const { x, z } = wp(gx, gz);
        t.position.set(x, 0, z); t.receiveShadow = true;
        t.userData = { gx, gz, isTile: true };
        scene.add(t); tiles.push(t);
      }
    }

    const objGroup = new THREE.Group();
    scene.add(objGroup);
    const occ = new Set();
    const fountainEffects = [], pondEffects = [];

    INIT_OBJS.forEach(({ id, gx, gz }) => {
      const key = `${gx},${gz}`;
      if (!occ.has(key) && !tilemap[key]) {
        const obj = makeObj(id, gx, gz);
        objGroup.add(obj); occ.add(key);
        if (obj.userData.isFountain) fountainEffects.push(obj);
        if (obj.userData.isPond) pondEffects.push(obj);
      }
    });

    const char = buildCharacter(DEFAULT_AVATAR);
    char.position.set(0, 0, 0); scene.add(char);

    const hv = new THREE.Mesh(
      new THREE.BoxGeometry(TW, TH + 0.012, TW),
      new THREE.MeshLambertMaterial({ color: 0xFFFFAA, transparent: true, opacity: 0.2, depthWrite: false }));
    hv.visible = false; scene.add(hv);

    const rc = new THREE.Raycaster(), mp = new THREE.Vector2();

    three.current = {
      scene, camera, renderer, tiles, tilemap, objGroup, occ,
      char, hv, rc, mp, charTarget: null,
      clock: new THREE.Clock(), ghost: null,
      fountainEffects, pondEffects,
    };

    function hitTile(e) {
      const s = three.current;
      const r = canvas.getBoundingClientRect();
      s.mp.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      s.rc.setFromCamera(s.mp, s.camera);
      return s.rc.intersectObjects(s.tiles)[0]?.object ?? null;
    }

    function onMove(e) {
      const s = three.current;
      const t = hitTile(e);
      if (t) {
        s.hv.position.set(t.position.x, t.position.y + 0.008, t.position.z);
        s.hv.visible = true;
        if (s.ghost) {
          const { gx, gz } = t.userData;
          const { x, z } = wp(gx, gz);
          s.ghost.position.set(x, 0, z); s.ghost.visible = true;
        }
      } else {
        s.hv.visible = false;
        if (s.ghost) s.ghost.visible = false;
      }
    }

    function onClick(e) {
      const s = three.current;
      const t = hitTile(e);
      if (!t) return;
      const { gx, gz } = t.userData;
      const key = `${gx},${gz}`;
      const sel = selRef.current;
      if (sel) {
        if (s.occ.has(key) || s.tilemap[key]) {
          flash("❌ That tile is taken — pick an empty grass tile."); return;
        }
        const obj = makeObj(sel.id, gx, gz);
        s.objGroup.add(obj); s.occ.add(key);
        if (obj.userData.isFountain) s.fountainEffects.push(obj);
        if (obj.userData.isPond) s.pondEffects.push(obj);
        setCoins(prev => prev - sel.cost);
        flash(`✨ ${sel.icon} ${sel.name} placed beautifully!`);
        if (s.ghost) { s.scene.remove(s.ghost); s.ghost = null; }
        selRef.current = null; setSelItem(null);
      } else {
        s.charTarget = { gx, gz };
      }
    }

    function onWheel(e) {
      e.preventDefault();
      fr = Math.max(3.5, Math.min(13, fr + e.deltaY * 0.012));
      const s = three.current;
      s.camera.left = -(fr * W) / H; s.camera.right = (fr * W) / H;
      s.camera.top = fr; s.camera.bottom = -fr;
      s.camera.updateProjectionMatrix();
    }

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      const s = three.current;
      const dt = s.clock.getDelta();
      const t = s.clock.elapsedTime;

      // Character movement
      if (s.charTarget) {
        const { x: tx, z: tz } = wp(s.charTarget.gx, s.charTarget.gz);
        const dx = tx - s.char.position.x, dz = tz - s.char.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.06) {
          s.char.position.set(tx, 0, tz); s.charTarget = null;
        } else {
          s.char.position.x += (dx / dist) * 3.2 * dt;
          s.char.position.z += (dz / dist) * 3.2 * dt;
          s.char.rotation.y = Math.atan2(dx, dz);
          s.char.position.y = Math.abs(Math.sin(t * 14)) * 0.032;
        }
      } else {
        s.char.position.y = Math.sin(t * 2.2) * 0.008;
      }

      // Lantern flicker
      s.objGroup.traverse(node => {
        if (node.isPointLight && node.userData.isLanternLight) {
          node.intensity = 2.9 + Math.sin(t * 5.3 + node.id * 0.7) * 0.42 + Math.sin(t * 11.1 + node.id) * 0.18;
        }
      });

      // Fountain arc particles
      s.fountainEffects.forEach(eff => {
        if (!eff.userData.fountainDrops) return;
        eff.userData.fountainDrops.forEach(drop => {
          const phase = (drop.userData.phase + t * 0.5) % 1;
          const arc = Math.sin(phase * Math.PI);
          const r = arc * 0.26;
          drop.position.set(Math.cos(drop.userData.angle) * r, TH / 2 + 0.43 + arc * 0.48, Math.sin(drop.userData.angle) * r);
          drop.material.opacity = Math.min(1, arc * 2);
          drop.visible = phase < 0.94;
        });
      });

      // Pond ripples
      s.pondEffects.forEach(eff => {
        eff.children.forEach(child => {
          if (!child.userData.isRipple) return;
          const phase = (child.userData.phase + t * 0.26) % 1;
          const scale = 0.4 + phase * 4.2;
          child.scale.set(scale, scale, scale);
          child.material.opacity = (1 - phase) * 0.48;
        });
      });

      s.renderer.render(s.scene, s.camera);
    }
    animate();

    const onResize = () => {
      W = container.clientWidth; H = container.clientHeight;
      const s = three.current;
      s.camera.left = -(fr * W) / H; s.camera.right = (fr * W) / H;
      s.camera.updateProjectionMatrix(); s.renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  // ─── UI ──────────────────────────────────────────────────────────
  const cats = ["All", ...Array.from(new Set(SHOP.map(i => i.cat)))];
  const filtered = shopCat === "All" ? SHOP : SHOP.filter(i => i.cat === shopCat);

  function Swatches({ options, field }) {
    return (
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
        {options.map(opt => (
          <div key={opt.label} onClick={() => setAvatarOpts(p => ({ ...p, [field]: opt.v }))} title={opt.label}
            style={{
              width: 22, height: 22, borderRadius: "50%",
              background: `#${opt.v.toString(16).padStart(6, "0")}`,
              cursor: "pointer",
              border: avatarOpts[field] === opt.v ? "2.5px solid white" : "2px solid rgba(255,255,255,0.2)",
              boxShadow: avatarOpts[field] === opt.v ? "0 0 0 2px #5AB844" : "none",
            }} />
        ))}
      </div>
    );
  }

  const label = (t) => (
    <div style={{ fontSize: 10, color: "#667788", marginBottom: 3, marginTop: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>{t}</div>
  );

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", fontFamily: "system-ui,sans-serif" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 18px",
        background: "rgba(5,10,20,0.9)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#B8DDAA" }}>🌙 Mon Jardin</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 15, color: "#FFD97D" }}>
          <span>💛</span><span style={{ fontSize: 17 }}>{coins}</span>
          <span style={{ fontSize: 11, color: "#556", fontWeight: 400 }}>Sun Drops</span>
        </div>
      </div>

      {msg && (
        <div style={{
          position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)",
          background: "rgba(5,10,20,0.9)", color: "#BCD",
          padding: "7px 20px", borderRadius: 18, fontSize: 12, fontWeight: 500,
          pointerEvents: "none", whiteSpace: "nowrap", zIndex: 30,
          border: "1px solid rgba(255,255,255,0.08)",
        }}>{msg}</div>
      )}

      {/* Zoom hint */}
      <div style={{
        position: "absolute", top: 58, left: 14,
        background: "rgba(5,10,20,0.7)", borderRadius: 9,
        padding: "5px 11px", fontSize: 10, color: "#667",
        border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none",
      }}>🔍 Scroll to zoom</div>

      {selItem && (
        <div style={{
          position: "absolute", top: 58, right: 14,
          background: "rgba(5,10,20,0.93)", borderRadius: 14,
          padding: "10px 13px", boxShadow: "0 4px 22px rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", gap: 9, zIndex: 20,
          border: "1.5px solid #3A7A2A",
        }}>
          <span style={{ fontSize: 28 }}>{selItem.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#CDE" }}>{selItem.name}</div>
            <div style={{ fontSize: 10, color: "#669", marginTop: 1 }}>Click a grass tile</div>
          </div>
          <button onClick={cancelSelect} style={{
            border: "none", background: "rgba(255,255,255,0.08)", borderRadius: 7,
            width: 26, height: 26, cursor: "pointer", fontSize: 13, color: "#99A",
          }}>✕</button>
        </div>
      )}

      {/* Avatar customiser */}
      {showAvatar && (
        <div style={{
          position: "absolute", left: 12, top: 55,
          background: "rgba(5,10,20,0.97)", borderRadius: 18,
          padding: "16px 15px", boxShadow: "0 8px 44px rgba(0,0,0,0.7)",
          width: 218, zIndex: 26, border: "1px solid rgba(255,255,255,0.08)",
          maxHeight: "calc(100vh - 120px)", overflowY: "auto",
        }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#B8DDAA", marginBottom: 12 }}>🎨 My Avatar</div>

          {label("Gender")}
          <div style={{ display: "flex", gap: 7 }}>
            {["boy", "girl"].map(gend => (
              <button key={gend} onClick={() => setAvatarOpts(p => ({ ...p, gender: gend }))}
                style={{
                  flex: 1, padding: "6px 0", borderRadius: 9, border: "none",
                  background: avatarOpts.gender === gend ? "#3A7A2A" : "rgba(255,255,255,0.07)",
                  color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700,
                }}>
                {gend === "boy" ? "👦 Boy" : "👧 Girl"}
              </button>
            ))}
          </div>

          {label("Shirt colour")}
          <Swatches options={SHIRT_COLORS} field="shirtColor" />
          {label("Trousers")}
          <Swatches options={PANTS_COLORS} field="pantsColor" />
          {label("Hair")}
          <Swatches options={HAIR_COLORS} field="hairColor" />
          {label("Skin tone")}
          <Swatches options={SKIN_TONES} field="skinTone" />

          {label("Hat")}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[["none","🚫"],["cap","🧢"],["wizard","🎩"],["crown","👑"],["flower","🌸"]].map(([h, ic]) => (
              <button key={h} onClick={() => setAvatarOpts(p => ({ ...p, hat: h }))}
                style={{
                  padding: "5px 8px", borderRadius: 8, border: "none",
                  background: avatarOpts.hat === h ? "#3A7A2A" : "rgba(255,255,255,0.08)",
                  color: "#fff", cursor: "pointer", fontSize: 13,
                }}>{ic}</button>
            ))}
          </div>
          {avatarOpts.hat !== "none" && avatarOpts.hat !== "flower" && (
            <>
              {label("Hat colour")}
              <Swatches options={HAT_COLORS} field="hatColor" />
            </>
          )}
        </div>
      )}

      {/* Shop */}
      {showShop && (
        <div style={{
          position: "absolute", bottom: 75, left: "50%", transform: "translateX(-50%)",
          background: "rgba(5,10,20,0.97)", borderRadius: 20,
          padding: "18px", boxShadow: "0 12px 55px rgba(0,0,0,0.75)",
          width: "min(620px,95vw)", zIndex: 25,
          backdropFilter: "blur(18px)",
          maxHeight: "58vh", display: "flex", flexDirection: "column",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#B8DDAA" }}>🌿 Garden Shop</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#FFD97D" }}>💛 {coins} Sun Drops</div>
          </div>
          <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
            {cats.map(cat => (
              <button key={cat} onClick={() => setShopCat(cat)} style={{
                background: shopCat === cat ? "#3A7A2A" : "rgba(255,255,255,0.07)",
                border: "none", borderRadius: 18, padding: "4px 11px",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                color: shopCat === cat ? "#fff" : "#778",
              }}>{cat}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7, overflowY: "auto" }}>
            {filtered.map(item => {
              const can = coins >= item.cost;
              return (
                <button key={item.id}
                  onClick={() => can ? selectItem(item) : flash("💸 Earn more Sun Drops by completing lessons!")}
                  style={{
                    background: can ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${can ? "rgba(90,184,68,0.3)" : "rgba(255,255,255,0.05)"}`,
                    borderRadius: 13, padding: "10px 4px",
                    cursor: can ? "pointer" : "not-allowed",
                    opacity: can ? 1 : 0.4, textAlign: "center",
                  }}>
                  <div style={{ fontSize: 24 }}>{item.icon}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#B8DDAA", marginTop: 4, lineHeight: 1.2 }}>{item.name}</div>
                  <div style={{ fontSize: 9, color: "#FFD97D", marginTop: 3 }}>💛 {item.cost}</div>
                </button>
              );
            })}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 10, color: "#445", textAlign: "center" }}>
            Complete lessons to earn more Sun Drops ✨
          </p>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        display: "flex", justifyContent: "center", alignItems: "center",
        padding: "11px 18px", gap: 9,
        background: "rgba(5,10,20,0.93)", backdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button onClick={() => { setShowShop(!showShop); setShowAvatar(false); }} style={{
          background: showShop ? "#3A7A2A" : "linear-gradient(135deg, #5AB844, #3A7A2A)",
          border: "none", borderRadius: 13, padding: "11px 26px",
          fontSize: 14, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 4px 18px rgba(80,180,60,0.3)", color: "#fff",
        }}>🏪 Garden Shop</button>

        <button onClick={() => { setShowAvatar(!showAvatar); setShowShop(false); }} style={{
          background: showAvatar ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 13,
          padding: "11px 20px", fontSize: 14, fontWeight: 700,
          cursor: "pointer", color: "#B8DDAA",
        }}>🎨 My Avatar</button>

        <button onClick={() => flash("🌳 Complete skill paths to grow trees here — keep them healthy by reviewing lessons!", 5000)}
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 13, padding: "11px 16px", fontSize: 14,
            fontWeight: 700, cursor: "pointer", color: "#B8DDAA",
          }}>🌱 Trees</button>
      </div>
    </div>
  );
}
