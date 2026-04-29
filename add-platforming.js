#!/usr/bin/env node
// Adds platforming, jumping, traps, and lives system to Ada's Math Quest
const fs = require('fs');
const file = '/tmp/adas-mq/docs/index.html';
let src = fs.readFileSync(file, 'utf8');

function replace(old, nw, label) {
  if (!src.includes(old)) { console.error('MISSING: ' + label); process.exit(1); }
  src = src.replace(old, nw);
  console.log('OK: ' + label);
}

function insertAfter(anchor, content, label) {
  const i = src.indexOf(anchor);
  if (i < 0) { console.error('MISSING ANCHOR: ' + label); process.exit(1); }
  src = src.slice(0, i + anchor.length) + content + src.slice(i + anchor.length);
  console.log('OK: ' + label);
}

function insertBefore(anchor, content, label) {
  const i = src.indexOf(anchor);
  if (i < 0) { console.error('MISSING ANCHOR: ' + label); process.exit(1); }
  src = src.slice(0, i) + content + src.slice(i);
  console.log('OK: ' + label);
}

// ========== 1. CSS: Add heartBlink animation + jump button styles ==========
insertBefore(
  '@media(min-width:768px){.dpad{display:none}}',
  `@keyframes heartBlink{0%,100%{opacity:1}50%{opacity:0.3}}
.hud-hearts{position:fixed;top:10px;left:10px;z-index:20;display:flex;gap:2px;font-size:1.3rem}
#jump-btn{position:fixed;bottom:25px;right:20px;width:60px;height:60px;border-radius:50%;background:rgba(76,175,80,0.55);color:#fff;font-size:1.6rem;border:2px solid rgba(255,255,255,0.3);backdrop-filter:blur(4px);z-index:20;display:none;align-items:center;justify-content:center;-webkit-user-select:none;user-select:none;cursor:pointer}
#jump-btn:active{background:rgba(100,200,100,0.7)}
#game-over-overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.7);display:none;align-items:center;justify-content:center;flex-direction:column;gap:16px}
#game-over-overlay .go-title{font-size:2.5rem;color:#f44336;font-weight:900;text-shadow:0 2px 8px #000}
#game-over-overlay .go-sub{font-size:1.1rem;color:#fff;opacity:0.8}
#game-over-overlay button{padding:12px 32px;border-radius:12px;font-size:1.1rem;font-weight:700;border:none;cursor:pointer;margin:4px}
#game-over-overlay .go-retry{background:#4CAF50;color:#fff}
#game-over-overlay .go-quit{background:#666;color:#fff}
`,
  'CSS additions'
);

// Also hide jump-btn on desktop
replace(
  '@media(min-width:768px){.dpad{display:none}}',
  '@media(min-width:768px){.dpad{display:none}#jump-btn{display:none!important}}',
  'hide jump-btn on desktop'
);

// ========== 2. HUD hearts HTML ==========
insertBefore(
  '<div class="hud-pill dogs">',
  '<div class="hud-hearts" id="hud-hearts"></div>\n      ',
  'HUD hearts HTML'
);

// ========== 3. Jump button + game over overlay HTML ==========
insertAfter(
  '<button class="dpad-btn dpad-down" data-dir="down">&#9660;</button>\n  </div>',
  '\n  <button id="jump-btn">⬆️</button>\n  <div id="game-over-overlay"><div class="go-title">💀 Game Over!</div><div class="go-sub" id="go-sub-text">You ran out of lives</div><button class="go-retry" id="go-retry">🔄 Try Again</button><button class="go-quit" id="go-quit">🏠 Quit</button></div>',
  'Jump button + game over overlay'
);

// ========== 4. New tile types ==========
replace(
  "ROAD:23,SIDEWALK:24,BUILDING:25,BLDG_WINDOW:26,BLDG_DOOR:27,PARK:28,LAMPPOST:29,TAXI:30,RIVER:31};",
  "ROAD:23,SIDEWALK:24,BUILDING:25,BLDG_WINDOW:26,BLDG_DOOR:27,PARK:28,LAMPPOST:29,TAXI:30,RIVER:31,\nPLATFORM:32,PLATFORM_HIGH:33,THORNS:34,BOUNCE_SHROOM:35,SPIDERWEB:36,MUD:37,HEART_PICKUP:38,SPRING_PAD:39};",
  'New tile types'
);

// ========== 5. Update WALKABLE set ==========
replace(
  "const WALKABLE=new Set([T.GRASS,T.PATH,T.FLOWER,T.DGRASS,T.TGRASS,T.MUSH,T.EXIT,T.START,T.BRIDGE,T.BUSH,T.SIDEWALK,T.PARK,T.BLDG_DOOR,T.ROAD]);",
  "const WALKABLE=new Set([T.GRASS,T.PATH,T.FLOWER,T.DGRASS,T.TGRASS,T.MUSH,T.EXIT,T.START,T.BRIDGE,T.BUSH,T.SIDEWALK,T.PARK,T.BLDG_DOOR,T.ROAD,T.PLATFORM,T.PLATFORM_HIGH,T.THORNS,T.BOUNCE_SHROOM,T.SPIDERWEB,T.MUD,T.HEART_PICKUP,T.SPRING_PAD]);",
  'Update WALKABLE'
);

// ========== 6. Add platforming zone generator for organic maps ==========
// Insert before the return in the organic map generator
// Find the return statement at end of organic map gen
const organicReturn = "    return {map, dogs, gates: gatePositions, npcs, start: {x: startX, y: startY}, exit: {x: exitX, y: exitY}};";
replace(
  organicReturn,
  `    // ===== PLATFORMING ZONES for forest/mountain =====
    const heightMap = Array.from({length: h}, () => new Float32Array(w));
    if (biome === 'forest' || biome === 'mountain') {
      const numZones = biome === 'mountain' ? 2 : 1;
      for (let zi = 0; zi < numZones; zi++) {
        // Find a good spot between gate positions
        const gateIdx = Math.min(zi + 1, gatePositions.length - 1);
        const prevGate = gatePositions[Math.max(0, gateIdx - 1)];
        const nextGate = gatePositions[gateIdx];
        if (!prevGate || !nextGate) continue;
        
        // Zone between two gates, offset to the side
        const zoneWidth = 8 + Math.floor(rng() * 4);
        const zoneHeight = 6 + Math.floor(rng() * 3);
        const zStartX = Math.max(3, Math.min(w - zoneWidth - 3, 
          Math.floor((prevGate.x + nextGate.x) / 2) - Math.floor(zoneWidth / 2)));
        const zStartY = Math.max(3, Math.min(h - zoneHeight - 3,
          Math.floor((prevGate.y + nextGate.y) / 2) - Math.floor(zoneHeight / 2) + (zi === 0 ? -4 : 4)));
        
        // Clear zone to water (the pit)
        for (let zy = zStartY; zy < zStartY + zoneHeight && zy < h - 1; zy++) {
          for (let zx = zStartX; zx < zStartX + zoneWidth && zx < w - 1; zx++) {
            if (map[zy][zx] === T.GATE || map[zy][zx] === T.DOG_GATE || map[zy][zx] === T.DOG ||
                map[zy][zx] === T.START || map[zy][zx] === T.EXIT) continue;
            const occupied = dogs.some(d => d.x === zx && d.y === zy) ||
                            gatePositions.some(g => g.x === zx && g.y === zy) ||
                            npcs.some(n => n.x === zx && n.y === zy);
            if (occupied) continue;
            map[zy][zx] = T.WATER;
            heightMap[zy][zx] = -0.3;
          }
        }
        
        // Create path of platforms through the zone
        let px = zStartX + 1;
        let py = zStartY + 1;
        let curH = 0.3;
        let platCount = 0;
        const maxPlats = 12;
        
        // Entry platform (connects to land)
        if (py > 0 && py < h && px > 0 && px < w) {
          map[py][px] = T.PLATFORM;
          heightMap[py][px] = curH;
          if (px + 1 < w) { map[py][px + 1] = T.PLATFORM; heightMap[py][px + 1] = curH; }
          platCount++;
        }
        
        while (platCount < maxPlats && py < zStartY + zoneHeight - 1 && px < zStartX + zoneWidth - 1) {
          // Next platform: 1-2 tiles away
          const goRight = rng() > 0.4;
          const gap = rng() > 0.6 ? 2 : 1;
          const heightUp = rng() > 0.65 ? 0.3 : 0;
          
          if (goRight && px + gap + 1 < zStartX + zoneWidth) {
            px += gap;
          } else if (py + gap + 1 < zStartY + zoneHeight) {
            py += gap;
          } else break;
          
          curH = Math.min(0.9, curH + heightUp);
          if (py >= 0 && py < h && px >= 0 && px < w) {
            // Place platform tile
            const trapRoll = rng();
            if (trapRoll < 0.12 && platCount > 2) {
              map[py][px] = T.THORNS;
              heightMap[py][px] = curH;
            } else if (trapRoll < 0.20 && platCount > 1) {
              map[py][px] = T.BOUNCE_SHROOM;
              heightMap[py][px] = curH;
            } else if (trapRoll < 0.26) {
              map[py][px] = T.SPIDERWEB;
              heightMap[py][px] = curH;
            } else {
              map[py][px] = T.PLATFORM;
              heightMap[py][px] = curH;
            }
            // Sometimes wider platform
            if (rng() > 0.5 && px + 1 < w) {
              map[py][px + 1] = T.PLATFORM;
              heightMap[py][px + 1] = curH;
            }
            platCount++;
          }
        }
        
        // Exit platform
        if (py >= 0 && py < h && px >= 0 && px < w) {
          map[py][px] = T.PLATFORM;
          heightMap[py][px] = Math.max(0, curH - 0.3);
          // Connect exit back to land
          for (let ex = px + 1; ex < Math.min(w - 1, px + 3); ex++) {
            if (map[py][ex] === T.WATER) {
              map[py][ex] = T.PATH;
              heightMap[py][ex] = 0;
            }
          }
        }
        
        // Connect entry to land
        for (let enx = zStartX - 1; enx >= Math.max(1, zStartX - 3); enx--) {
          if (py >= 0 && py < h && enx >= 0 && enx < w) {
            if (!WALKABLE.has(map[zStartY + 1][enx]) && map[zStartY + 1][enx] !== T.WATER) break;
            if (map[zStartY + 1][enx] === T.WATER) {
              map[zStartY + 1][enx] = T.PATH;
              heightMap[zStartY + 1][enx] = 0;
            }
          }
        }
        
        // Add heart pickup in the middle of tough sections
        if (platCount > 5) {
          const heartY = zStartY + Math.floor(zoneHeight / 2);
          const heartX = zStartX + Math.floor(zoneWidth / 2);
          if (heartY >= 0 && heartY < h && heartX >= 0 && heartX < w && 
              (map[heartY][heartX] === T.PLATFORM || map[heartY][heartX] === T.WATER)) {
            map[heartY][heartX] = T.HEART_PICKUP;
            heightMap[heartY][heartX] = 0.5;
          }
        }
        
        // Scatter a few mud tiles on the approach paths
        for (let mi = 0; mi < 3; mi++) {
          const mx = zStartX + Math.floor(rng() * zoneWidth);
          const my = zStartY + Math.floor(rng() * zoneHeight);
          if (my >= 0 && my < h && mx >= 0 && mx < w && map[my][mx] === T.PLATFORM) {
            if (rng() < 0.3) { map[my][mx] = T.MUD; heightMap[my][mx] = heightMap[my][mx]; }
          }
        }
      }
    }
    
    return {map, heightMap, dogs, gates: gatePositions, npcs, start: {x: startX, y: startY}, exit: {x: exitX, y: exitY}};`,
  'Platforming zone generator + heightMap in organic return'
);

// ========== 7. Add heightMap to city map return ==========
replace(
  "  return{map,dogs,gates:gatePositions,npcs,start:{x:startX,y:startY},exit:{x:exitX,y:exitY}};",
  "  const heightMap=Array.from({length:h},()=>new Float32Array(w));\n  return{map,heightMap,dogs,gates:gatePositions,npcs,start:{x:startX,y:startY},exit:{x:exitX,y:exitY}};",
  'HeightMap in city return'
);

// ========== 8. New sound effects ==========
insertAfter(
  "function sfxZahlix(){playNote(150,0.2,'sawtooth',0.06);setTimeout(()=>playNote(120,0.3,'sawtooth',0.05),200)}",
  `
function sfxJump(){playNote(400,0.08,'square',0.12);setTimeout(()=>playNote(600,0.05,'square',0.08),50)}
function sfxLand(){playNote(150,0.06,'triangle',0.08)}
function sfxHurt(){playNote(200,0.15,'sawtooth',0.15);setTimeout(()=>playNote(150,0.1,'sawtooth',0.12),80)}
function sfxBounce(){playNote(300,0.1,'sine',0.12);setTimeout(()=>playNote(500,0.08,'sine',0.1),60);setTimeout(()=>playNote(700,0.06,'sine',0.08),120)}
function sfxWeb(){playNote(100,0.2,'triangle',0.06)}
function sfxMud(){playNote(80,0.15,'triangle',0.08)}
function sfxSpring(){playNote(300,0.05,'square',0.1);setTimeout(()=>playNote(500,0.05,'square',0.08),40);setTimeout(()=>playNote(800,0.08,'square',0.12),80)}
function sfxHeart(){playNote(523,0.1,'sine',0.12);setTimeout(()=>playNote(659,0.1,'sine',0.12),100);setTimeout(()=>playNote(784,0.15,'sine',0.15),200)}
function sfxGameOver(){playNote(400,0.15,'sawtooth',0.15);setTimeout(()=>playNote(300,0.15,'sawtooth',0.12),200);setTimeout(()=>playNote(200,0.3,'sawtooth',0.1),400)}
function sfxSplash(){playNote(200,0.1,'triangle',0.08);setTimeout(()=>playNote(100,0.15,'triangle',0.06),60)}`,
  'New sound effects'
);

// ========== 9. New materials for platforms, traps, etc. ==========
insertBefore(
  "  lampLight: new THREE.MeshStandardMaterial({color:0xffeb3b",
  `  platform: new THREE.MeshStandardMaterial({color:0x8B7355,flatShading:true}),
  platformTop: new THREE.MeshStandardMaterial({color:0xa08660,flatShading:true}),
  thorns: new THREE.MeshStandardMaterial({color:0x5c1a1a,flatShading:true}),
  thornSpike: new THREE.MeshStandardMaterial({color:0x8B0000,flatShading:true}),
  bounceMushCap: new THREE.MeshStandardMaterial({color:0xFF6B35,flatShading:true,emissive:0x331100,emissiveIntensity:0.2}),
  bounceMushStem: new THREE.MeshStandardMaterial({color:0xFFF8DC,flatShading:true}),
  webMat: new THREE.MeshStandardMaterial({color:0xdddddd,flatShading:true,transparent:true,opacity:0.6}),
  mudMat: new THREE.MeshStandardMaterial({color:0x5c4033,flatShading:true}),
  heartMat: new THREE.MeshStandardMaterial({color:0xff1744,flatShading:true,emissive:0xff1744,emissiveIntensity:0.4}),
  springPad: new THREE.MeshStandardMaterial({color:0x4CAF50,flatShading:true,emissive:0x2E7D32,emissiveIntensity:0.3}),
`,
  'New materials for platforms/traps'
);

// ========== 10. 3D rendering for platforms and traps in buildLevel3D ==========
// Find the end of the building section and add platform/trap rendering after it
insertBefore(
  '  // Build fences',
  `  // ===== PLATFORMS & TRAPS 3D =====
  const hm = levelData.heightMap;
  // Platforms
  const platTiles = [];
  const thornTiles = [];
  const bounceTiles = [];
  const webTiles = [];
  const mudTiles = [];
  const heartTiles = [];
  const springTiles = [];
  if (hm) {
    for (let r = 0; r < mh; r++) for (let c = 0; c < mw; c++) {
      const tile = map[r][c];
      if (tile === T.PLATFORM || tile === T.PLATFORM_HIGH) platTiles.push({r, c, h: hm[r][c]});
      else if (tile === T.THORNS) thornTiles.push({r, c, h: hm[r][c]});
      else if (tile === T.BOUNCE_SHROOM) bounceTiles.push({r, c, h: hm[r][c]});
      else if (tile === T.SPIDERWEB) webTiles.push({r, c, h: hm[r][c]});
      else if (tile === T.MUD) mudTiles.push({r, c, h: hm[r][c]});
      else if (tile === T.HEART_PICKUP) heartTiles.push({r, c, h: hm[r][c]});
      else if (tile === T.SPRING_PAD) springTiles.push({r, c, h: hm[r][c]});
    }
  }
  // Platform boxes
  if (platTiles.length > 0) {
    const pGeo = new THREE.BoxGeometry(0.95, 0.15, 0.95);
    const pIM = new THREE.InstancedMesh(pGeo, MAT.platform, platTiles.length);
    pIM.castShadow = true; pIM.receiveShadow = true;
    const pm = new THREE.Matrix4();
    platTiles.forEach((p, i) => {
      pm.makeTranslation(p.c + 0.5, p.h, p.r + 0.5);
      pIM.setMatrixAt(i, pm);
      const cv = new THREE.Color(0x8B7355).offsetHSL(0, 0, ((p.r*3+p.c*7)%11)/55 - 0.1);
      pIM.setColorAt(i, cv);
    });
    pIM.instanceMatrix.needsUpdate = true;
    if (pIM.instanceColor) pIM.instanceColor.needsUpdate = true;
    scene.add(pIM); sceneObjects.push(pIM);
    // Plank marks on top
    const topGeo = new THREE.BoxGeometry(0.85, 0.02, 0.85);
    const topIM = new THREE.InstancedMesh(topGeo, MAT.platformTop, platTiles.length);
    platTiles.forEach((p, i) => {
      pm.makeTranslation(p.c + 0.5, p.h + 0.08, p.r + 0.5);
      topIM.setMatrixAt(i, pm);
    });
    topIM.instanceMatrix.needsUpdate = true;
    scene.add(topIM); sceneObjects.push(topIM);
    // Support posts under platforms
    const postGeo = new THREE.CylinderGeometry(0.04, 0.06, 1, 4);
    const postCount = platTiles.filter(p => p.h > 0.15).length * 4;
    if (postCount > 0) {
      const postIM = new THREE.InstancedMesh(postGeo, MAT.platform, postCount);
      let pi2 = 0;
      platTiles.forEach(p => {
        if (p.h <= 0.15) return;
        for (const [ox, oz] of [[-0.35,-0.35],[0.35,-0.35],[-0.35,0.35],[0.35,0.35]]) {
          pm.makeScale(1, p.h, 1);
          pm.setPosition(p.c + 0.5 + ox, p.h/2, p.r + 0.5 + oz);
          postIM.setMatrixAt(pi2++, pm);
        }
      });
      postIM.count = pi2;
      postIM.instanceMatrix.needsUpdate = true;
      scene.add(postIM); sceneObjects.push(postIM);
    }
  }
  // Thorns
  if (thornTiles.length > 0) {
    // Base
    const tBase = new THREE.BoxGeometry(0.9, 0.08, 0.9);
    const tIM = new THREE.InstancedMesh(tBase, MAT.thorns, thornTiles.length);
    const tm = new THREE.Matrix4();
    thornTiles.forEach((t2, i) => {
      tm.makeTranslation(t2.c + 0.5, t2.h + 0.04, t2.r + 0.5);
      tIM.setMatrixAt(i, tm);
    });
    tIM.instanceMatrix.needsUpdate = true;
    scene.add(tIM); sceneObjects.push(tIM);
    // Spikes
    const sGeo = new THREE.ConeGeometry(0.04, 0.2, 4);
    const sIM = new THREE.InstancedMesh(sGeo, MAT.thornSpike, thornTiles.length * 5);
    let si = 0;
    thornTiles.forEach(t2 => {
      for (const [ox, oz] of [[0,0],[0.2,0.15],[-0.2,0.15],[0.15,-0.2],[-0.15,-0.2]]) {
        tm.makeTranslation(t2.c + 0.5 + ox, t2.h + 0.18, t2.r + 0.5 + oz);
        sIM.setMatrixAt(si++, tm);
      }
    });
    sIM.count = si;
    sIM.instanceMatrix.needsUpdate = true;
    scene.add(sIM); sceneObjects.push(sIM);
  }
  // Bouncy mushrooms
  if (bounceTiles.length > 0) {
    const stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 6);
    const capGeo = new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI*2, 0, Math.PI/2);
    const stemIM = new THREE.InstancedMesh(stemGeo, MAT.bounceMushStem, bounceTiles.length);
    const capIM = new THREE.InstancedMesh(capGeo, MAT.bounceMushCap, bounceTiles.length);
    const bm = new THREE.Matrix4();
    bounceTiles.forEach((b, i) => {
      bm.makeTranslation(b.c + 0.5, b.h + 0.125, b.r + 0.5);
      stemIM.setMatrixAt(i, bm);
      bm.makeTranslation(b.c + 0.5, b.h + 0.25, b.r + 0.5);
      capIM.setMatrixAt(i, bm);
      capIM.setColorAt(i, new THREE.Color(0xFF6B35).offsetHSL(((b.r+b.c)%5)*0.05, 0, 0));
    });
    stemIM.instanceMatrix.needsUpdate = true;
    capIM.instanceMatrix.needsUpdate = true;
    if (capIM.instanceColor) capIM.instanceColor.needsUpdate = true;
    scene.add(stemIM); scene.add(capIM);
    sceneObjects.push(stemIM, capIM);
    // Store refs for animation
    levelData._bounceMeshes = capIM;
    levelData._bounceTiles = bounceTiles;
  }
  // Spider webs
  if (webTiles.length > 0) {
    const wGeo = new THREE.CircleGeometry(0.4, 8);
    const wIM = new THREE.InstancedMesh(wGeo, MAT.webMat, webTiles.length);
    const wm = new THREE.Matrix4();
    const wq = new THREE.Quaternion();
    wq.setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
    webTiles.forEach((wb, i) => {
      wm.compose(new THREE.Vector3(wb.c + 0.5, wb.h + 0.02, wb.r + 0.5), wq, new THREE.Vector3(1,1,1));
      wIM.setMatrixAt(i, wm);
    });
    wIM.instanceMatrix.needsUpdate = true;
    scene.add(wIM); sceneObjects.push(wIM);
  }
  // Mud
  if (mudTiles.length > 0) {
    const mGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
    const mIM = new THREE.InstancedMesh(mGeo, MAT.mudMat, mudTiles.length);
    const mm = new THREE.Matrix4();
    mudTiles.forEach((md, i) => {
      mm.makeTranslation(md.c + 0.5, md.h + 0.02, md.r + 0.5);
      mIM.setMatrixAt(i, mm);
    });
    mIM.instanceMatrix.needsUpdate = true;
    scene.add(mIM); sceneObjects.push(mIM);
  }
  // Hearts
  if (heartTiles.length > 0) {
    // Simple heart = red sphere with glow
    const hGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const hIM = new THREE.InstancedMesh(hGeo, MAT.heartMat, heartTiles.length);
    const hmm = new THREE.Matrix4();
    heartTiles.forEach((ht, i) => {
      hmm.makeTranslation(ht.c + 0.5, ht.h + 0.3, ht.r + 0.5);
      hIM.setMatrixAt(i, hmm);
    });
    hIM.instanceMatrix.needsUpdate = true;
    scene.add(hIM); sceneObjects.push(hIM);
    levelData._heartMesh = hIM;
    levelData._heartTiles = heartTiles;
  }
  // Spring pads
  if (springTiles.length > 0) {
    const spGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 8);
    const spIM = new THREE.InstancedMesh(spGeo, MAT.springPad, springTiles.length);
    const spm = new THREE.Matrix4();
    springTiles.forEach((sp, i) => {
      spm.makeTranslation(sp.c + 0.5, sp.h + 0.05, sp.r + 0.5);
      spIM.setMatrixAt(i, spm);
    });
    spIM.instanceMatrix.needsUpdate = true;
    scene.add(spIM); sceneObjects.push(spIM);
  }

`,
  'Platform/trap 3D rendering'
);

// ========== 11. Game constructor: add new state ==========
replace(
  "      tx:this.ld.start.x,ty:this.ld.start.y,px:this.ld.start.x,py:this.ld.start.y,\n      idleT:0,bobDir:1};",
  "      tx:this.ld.start.x,ty:this.ld.start.y,px:this.ld.start.x,py:this.ld.start.y,\n      idleT:0,bobDir:1,\n      elevation:0,targetElevation:0,jumping:false,jumpT:0,\n      jumpStartX:0,jumpStartZ:0,jumpStartY:0,jumpEndX:0,jumpEndZ:0,jumpEndY:0,jumpPeakY:0,\n      lastSafe:{x:this.ld.start.x,y:this.ld.start.y,elevation:0},webbed:0,blinking:false};",
  'Player state additions'
);

insertAfter(
  "    this.startTime=Date.now();this.mistakes=0;this.totalDogs=this.dogs.length;",
  "\n    // Lives system\n    this.lives=5;this.maxLives=5;this.invincible=0;this.deathAnim=0;this.gameOverShown=false;",
  'Lives state'
);

// Also store heightMap ref
insertAfter(
  "    this.map=this.ld.map.map(r=>[...r]);this.mh=this.map.length;this.mw=this.map[0].length;",
  "\n    this.heightMap=this.ld.heightMap||Array.from({length:this.mh},()=>new Float32Array(this.mw));",
  'HeightMap ref in Game'
);

// ========== 12. Add updateHeartsHUD function ==========
insertBefore(
  'function showFlash(msg,color',
  `function updateHeartsHUD(lives, maxLives, invincible) {
  const el = document.getElementById('hud-hearts');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < maxLives; i++) {
    const s = document.createElement('span');
    s.textContent = i < lives ? '❤️' : '🖤';
    if (i === lives - 1 && invincible > 0) s.style.animation = 'heartBlink 0.3s infinite';
    el.appendChild(s);
  }
}

`,
  'updateHeartsHUD function'
);

// ========== 13. Add tryJump, startJump, checkTrapAt, takeDamage, gameOver methods ==========
// Insert after doMove method (which ends with closing brace and then interactWith)
insertBefore(
  '  interactWith(x,y,tile){',
  `  // ===== JUMPING =====
  tryJump(dir){
    if(this.p.jumping||this.p.moving||this.activeQuest||this.gameOverShown)return;
    const dx=dir==='left'?-1:dir==='right'?1:0;
    const dy=dir==='up'?-1:dir==='down'?1:0;
    if(dx===0&&dy===0)return;
    this.p.dir=dir;
    const nx=this.p.x+dx,ny=this.p.y+dy;
    // Try 1-tile jump
    if(nx>=0&&ny>=0&&nx<this.mw&&ny<this.mh){
      const destTile=this.map[ny][nx];
      const destH=this.heightMap[ny][nx];
      const curH=this.p.elevation;
      if(WALKABLE.has(destTile)&&destH<=curH+0.55){
        this.startJump(nx,ny,destH);return;
      }
      // Try 2-tile jump (across gap)
      const fx=this.p.x+dx*2,fy=this.p.y+dy*2;
      if(fx>=0&&fy>=0&&fx<this.mw&&fy<this.mh){
        const farTile=this.map[fy][fx];
        const farH=this.heightMap[fy][fx];
        if(WALKABLE.has(farTile)&&farH<=curH+0.55&&!WALKABLE.has(destTile)){
          this.startJump(fx,fy,farH);return;
        }
      }
    }
  }
  startJump(tx,ty,destH){
    sfxJump();
    this.p.jumping=true;this.p.jumpT=0;
    this.p.jumpStartX=this.p.px;this.p.jumpStartZ=this.p.py;
    this.p.jumpStartY=this.p.elevation;
    this.p.jumpEndX=tx;this.p.jumpEndZ=ty;
    this.p.jumpEndY=destH;
    this.p.jumpPeakY=Math.max(this.p.elevation,destH)+0.7;
    this.p.tx=tx;this.p.ty=ty;
  }
  // ===== TRAPS =====
  checkTrapAt(x,y){
    if(x<0||y<0||x>=this.mw||y>=this.mh)return;
    const tile=this.map[y][x];
    if(tile===T.THORNS){
      this.takeDamage('thorns');
      this.addBurst(x+0.5,this.p.elevation+0.3,y+0.5,10,'#8B0000');
      return;
    }
    if(tile===T.BOUNCE_SHROOM){
      sfxBounce();
      const backDx=this.p.dir==='left'?1:this.p.dir==='right'?-1:0;
      const backDy=this.p.dir==='up'?1:this.p.dir==='down'?-1:0;
      // Try bounce back 2 tiles
      for(let dist=2;dist>=1;dist--){
        const bx=x+backDx*dist,by=y+backDy*dist;
        if(bx>=0&&by>=0&&bx<this.mw&&by<this.mh&&WALKABLE.has(this.map[by][bx])){
          this.startJump(bx,by,this.heightMap[by][bx]);
          this.p.jumpPeakY=Math.max(this.p.elevation,this.heightMap[by][bx])+1.2;
          break;
        }
      }
      this.addBurst(x+0.5,this.p.elevation+0.5,y+0.5,8,'#FF6B35');
      showFlash('🍄 Boing!','#FF6B35');
      return;
    }
    if(tile===T.SPIDERWEB){
      this.p.webbed=180;
      sfxWeb();
      this.addBurst(x+0.5,this.p.elevation+0.2,y+0.5,6,'#CCCCCC');
      showFlash('🕸️ Stuck in web!','#999');
      return;
    }
    if(tile===T.MUD){
      sfxMud();
      const dx2=this.p.dir==='left'?-1:this.p.dir==='right'?1:0;
      const dy2=this.p.dir==='up'?-1:this.p.dir==='down'?1:0;
      const sx=x+dx2,sy=y+dy2;
      if(sx>=0&&sy>=0&&sx<this.mw&&sy<this.mh&&WALKABLE.has(this.map[sy][sx])){
        this.doMove(sx,sy);
        showFlash('💦 Slippery!','#8B7355');
      }
      return;
    }
    if(tile===T.HEART_PICKUP){
      if(this.lives<this.maxLives){
        this.lives++;
        updateHeartsHUD(this.lives,this.maxLives,this.invincible);
        sfxHeart();
        showFlash('❤️ +1 Life!','#e91e63');
        this.addBurst(x+0.5,this.p.elevation+0.5,y+0.5,12,'#FF1493');
        this.map[y][x]=T.GRASS;
        // Hide heart mesh
        if(this.ld._heartMesh&&this.ld._heartTiles){
          const hi=this.ld._heartTiles.findIndex(h=>h.c===x&&h.r===y);
          if(hi>=0){
            const m=new THREE.Matrix4();m.makeScale(0,0,0);m.setPosition(0,-10,0);
            this.ld._heartMesh.setMatrixAt(hi,m);
            this.ld._heartMesh.instanceMatrix.needsUpdate=true;
          }
        }
      }
      return;
    }
    if(tile===T.SPRING_PAD){
      sfxSpring();
      const sdx=this.p.dir==='left'?-1:this.p.dir==='right'?1:0;
      const sdy=this.p.dir==='up'?-1:this.p.dir==='down'?1:0;
      for(let dist=3;dist>=1;dist--){
        const fx=x+sdx*dist,fy=y+sdy*dist;
        if(fx>=0&&fy>=0&&fx<this.mw&&fy<this.mh&&WALKABLE.has(this.map[fy][fx])){
          this.startJump(fx,fy,this.heightMap[fy][fx]);
          this.p.jumpPeakY=Math.max(this.p.elevation,this.heightMap[fy][fx])+1.5;
          showFlash('🚀 Spring!','#4CAF50');
          break;
        }
      }
      return;
    }
    // Check water/fall
    if(tile===T.WATER||tile===T.RIVER){
      sfxSplash();
      this.takeDamage('fall');
      this.addBurst(this.p.px+0.5,0,this.p.py+0.5,15,'#2196F3');
      showFlash('💦 Splash!','#2196F3');
    }
  }
  // ===== LIVES SYSTEM =====
  takeDamage(source){
    if(this.invincible>0||this.gameOverShown)return;
    this.lives--;
    this.invincible=90;
    updateHeartsHUD(this.lives,this.maxLives,this.invincible);
    sfxHurt();
    showFlash('💔 -1 Life!','#f44336');
    // Knockback to last safe
    if(source==='thorns'||source==='fall'||source==='bees'){
      this.p.px=this.p.lastSafe.x;this.p.py=this.p.lastSafe.y;
      this.p.x=this.p.lastSafe.x;this.p.y=this.p.lastSafe.y;
      this.p.tx=this.p.x;this.p.ty=this.p.y;
      this.p.elevation=this.p.lastSafe.elevation;
      this.p.targetElevation=this.p.lastSafe.elevation;
      this.p.moving=false;this.p.jumping=false;
    }
    if(this.lives<=0)this.showGameOver();
  }
  showGameOver(){
    this.gameOverShown=true;
    sfxGameOver();
    const overlay=document.getElementById('game-over-overlay');
    if(overlay){
      overlay.style.display='flex';
      document.getElementById('go-sub-text').textContent='You ran out of lives on Level '+(this.li+1);
    }
  }
`,
  'Jump/trap/damage methods'
);

// ========== 14. Hearts HUD init in constructor ==========
insertAfter(
  "    this.build3DButterflies();",
  "\n    // Init hearts HUD\n    updateHeartsHUD(this.lives,this.maxLives,0);\n    document.getElementById('game-over-overlay').style.display='none';",
  'Init hearts HUD'
);

// ========== 15. Modify tryMove for elevation check ==========
replace(
  "    if(!WALKABLE.has(tile))return;\n\n    if(tile===T.EXIT){",
  "    if(!WALKABLE.has(tile))return;\n\n    // Elevation check: can only walk up small steps, need to jump for bigger ones\n    const destH=this.heightMap[ny]?this.heightMap[ny][nx]:0;\n    const curH=this.p.elevation;\n    if(destH>curH+0.15){return;} // too high — must jump\n\n    if(tile===T.EXIT){",
  'Elevation check in tryMove'
);

// ========== 16. Update doMove for elevation + trap check + lastSafe ==========
replace(
  "    this.p.tx=nx;this.p.ty=ny;this.p.moving=true;this.p.frame++;\n    this.p.idleT=0;sfxStep();",
  "    this.p.tx=nx;this.p.ty=ny;this.p.moving=true;this.p.frame++;\n    this.p.idleT=0;sfxStep();\n    // Elevation transition\n    const destH2=this.heightMap[ny]?this.heightMap[ny][nx]:0;\n    this.p.targetElevation=destH2;\n    // Track last safe\n    const lt=this.map[ny][nx];\n    if(lt!==T.THORNS&&lt!==T.MUD&&lt!==T.WATER&&lt!==T.RIVER&&lt!==T.SPIDERWEB)\n      this.p.lastSafe={x:nx,y:ny,elevation:destH2};",
  'Elevation + lastSafe in doMove'
);

// Add trap check at end of movement completion in update
// The movement complete is:  this.p.px=tx;this.p.py=ty;this.p.x=this.p.tx;this.p.y=this.p.ty;this.p.moving=false
replace(
  "      if(dist<spd){this.p.px=tx;this.p.py=ty;this.p.x=this.p.tx;this.p.y=this.p.ty;this.p.moving=false}",
  "      if(dist<spd){this.p.px=tx;this.p.py=ty;this.p.x=this.p.tx;this.p.y=this.p.ty;this.p.moving=false;this.checkTrapAt(this.p.x,this.p.y)}",
  'Trap check on move complete'
);

// ========== 17. Jump animation + invincibility in update ==========
// Add right after the speed line
replace(
  "    const spd = this.boostActive ? 0.6 : 0.35;\n\n    // Player movement (lerp toward target tile)",
  `    let spd = this.boostActive ? 0.6 : 0.35;
    if(this.p.webbed>0){spd*=0.4;this.p.webbed--;}

    // Invincibility timer
    if(this.invincible>0){
      this.invincible--;
      if(playerGroup)playerGroup.visible=(this.invincible%8)<5;
      if(this.invincible===0&&playerGroup)playerGroup.visible=true;
    }

    // Jump animation
    if(this.p.jumping){
      this.p.jumpT+=0.05;
      if(this.p.jumpT>=1){
        this.p.jumpT=1;this.p.jumping=false;
        this.p.px=this.p.jumpEndX;this.p.py=this.p.jumpEndZ;
        this.p.x=this.p.jumpEndX;this.p.y=this.p.jumpEndZ;
        this.p.elevation=this.p.jumpEndY;this.p.targetElevation=this.p.jumpEndY;
        sfxLand();
        this.addBurst(this.p.px+0.5,this.p.elevation+0.1,this.p.py+0.5,4,'#C8B080');
        // Update fog
        for(let ddy=-3;ddy<=3;ddy++)for(let ddx=-3;ddx<=3;ddx++){
          const vx2=this.p.x+ddx,vy2=this.p.y+ddy;
          if(vx2>=0&&vy2>=0&&vx2<this.mw&&vy2<this.mh)this.visited.add(vx2+','+vy2);
        }
        // Check trap at landing
        this.checkTrapAt(this.p.x,this.p.y);
        // Check coin/boost pickup at landing
        const ci2=this.coins.findIndex(c2=>c2.x===this.p.x&&c2.y===this.p.y&&!c2.collected);
        if(ci2>=0){
          this.coins[ci2].collected=true;this.coinsCollected++;sfxCoin();
          if(this.coinMeshes[ci2]){scene.remove(this.coinMeshes[ci2]);this.coinMeshes[ci2].visible=false;}
          this.addBurst(this.p.x+0.5,this.p.elevation+0.4,this.p.y+0.5,6,'#FFD700');
          const coinEl2=document.getElementById('hud-coins');
          if(coinEl2){coinEl2.textContent=this.coinsCollected;coinEl2.parentElement.classList.add('coin-pop');
            setTimeout(()=>coinEl2.parentElement.classList.remove('coin-pop'),300);}
          showFlash('🪙 +1','#FFD700');
        }
        // Safe position
        const landTile=this.map[this.p.y]?this.map[this.p.y][this.p.x]:T.GRASS;
        if(landTile!==T.THORNS&&landTile!==T.MUD&&landTile!==T.WATER)
          this.p.lastSafe={x:this.p.x,y:this.p.y,elevation:this.p.elevation};
      }else{
        const jt=this.p.jumpT;
        this.p.px=this.p.jumpStartX+(this.p.jumpEndX-this.p.jumpStartX)*jt;
        this.p.py=this.p.jumpStartZ+(this.p.jumpEndZ-this.p.jumpStartZ)*jt;
        const yS=this.p.jumpStartY,yP=this.p.jumpPeakY,yE=this.p.jumpEndY;
        this.p.elevation=yS*(1-jt)*(1-jt)+yP*2*jt*(1-jt)+yE*jt*jt;
      }
    }
    // Smooth elevation for walking
    if(!this.p.jumping&&Math.abs(this.p.elevation-this.p.targetElevation)>0.01){
      this.p.elevation+=(this.p.targetElevation-this.p.elevation)*0.15;
    }

    // Player movement (lerp toward target tile)`,
  'Jump animation + invincibility in update'
);

// ========== 18. Player 3D position includes elevation ==========
replace(
  "      playerGroup.position.x = targetX;\n      playerGroup.position.z = targetZ;\n\n      // Face direction",
  "      playerGroup.position.x = targetX;\n      playerGroup.position.z = targetZ;\n\n      // Elevation\n      const baseY = game.p.elevation || 0;\n\n      // Face direction",
  'Player elevation var'
);

// Now update the walk animation y position
replace(
  "      if (this.p.moving) {\n        const walk = Math.sin(this.fc * 0.25) * 0.35;\n        playerGroup.position.y = Math.abs(Math.sin(this.fc * 0.25)) * 0.03;",
  "      // Jump rotation\n      if (this.p.jumping) {\n        playerGroup.rotation.x = Math.sin(this.p.jumpT * Math.PI) * 0.4;\n      } else if (Math.abs(playerGroup.rotation.x) > 0.01) {\n        playerGroup.rotation.x *= 0.85;\n      }\n\n      if (this.p.moving) {\n        const walk = Math.sin(this.fc * 0.25) * 0.35;\n        playerGroup.position.y = baseY + Math.abs(Math.sin(this.fc * 0.25)) * 0.03;",
  'Walk animation with elevation'
);

replace(
  "      } else {\n        // Idle bob\n        playerGroup.position.y = Math.sin(this.fc * 0.04) * 0.01;",
  "      } else if (this.p.jumping) {\n        playerGroup.position.y = baseY;\n      } else {\n        // Idle bob\n        playerGroup.position.y = baseY + Math.sin(this.fc * 0.04) * 0.01;",
  'Idle bob with elevation'
);

// ========== 19. Bouncy mushroom + heart animation in update ==========
// Add after the "ButterflIES" or sparkle animation section — let's find a good spot
insertBefore(
  '    // Dog following',
  `    // Bouncy mushroom wobble
    if(this.ld._bounceMeshes&&this.ld._bounceTiles){
      const bim=this.ld._bounceMeshes;
      const btl=this.ld._bounceTiles;
      const bm2=new THREE.Matrix4();
      btl.forEach((b,i)=>{
        const wobble=Math.sin(this.fc*0.08+i*2)*0.03;
        bm2.makeTranslation(b.c+0.5,b.h+0.25+wobble,b.r+0.5);
        bim.setMatrixAt(i,bm2);
      });
      bim.instanceMatrix.needsUpdate=true;
    }
    // Heart float animation
    if(this.ld._heartMesh&&this.ld._heartTiles){
      const him=this.ld._heartMesh;
      const htl=this.ld._heartTiles;
      const hm2=new THREE.Matrix4();
      htl.forEach((h,i)=>{
        if(this.map[h.r]&&this.map[h.r][h.c]===T.HEART_PICKUP){
          const bob=Math.sin(this.fc*0.06+i*3)*0.1;
          const rot=this.fc*0.03;
          hm2.makeRotationY(rot);
          hm2.setPosition(h.c+0.5,h.h+0.3+bob,h.r+0.5);
          him.setMatrixAt(i,hm2);
        }
      });
      him.instanceMatrix.needsUpdate=true;
    }

`,
  'Trap animations'
);

// ========== 20. Input handling: Space = interact then jump ==========
// The current space handler
replace(
  `  if((e.key===' '||e.key==='Enter')&&game&&!game.activeQuest){
    const bb=document.getElementById('speech-bubble');
    if(bb.style.display==='block'){bb.style.display='none'}
    else{const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
      const d=dirs[game.p.dir]||[0,1];const fx=game.p.x+d[0],fy=game.p.y+d[1];
      if(fx>=0&&fy>=0&&fx<game.mw&&fy<game.mh){
        const tile=game.map[fy][fx];
        if(tile===T.GATE){const g=game.gates.find(g=>g.x===fx&&g.y===fy);if(g&&!g.open)game.openGateQuest(g)}
        else if(tile===T.DOG_GATE){const nd=game.dogs.find(d=>!d.rescued&&d.cageGate&&d.cageGate.x===fx&&d.cageGate.y===fy);if(nd&&!nd.cageOpen){if(!nd.quests)nd.quests=genQuests(1,game.ld.diff);const story=CAGE_STORIES[Math.floor(Math.random()*CAGE_STORIES.length)];game.activeQuest={type:'dogCage',dog:nd,x:fx,y:fy};game.questList=nd.quests;game.questIdx=0;game.addBurst(fx+0.5,0.5,fy+0.5,8,'#FF9800');showQuestBubble(game.questList[0],story,fx+0.5,fy+0.5)}}
        else if(INTERACT.has(tile))game.interactWith(fx,fy,tile)
      }
    }
  }`,
  `  if((e.key===' '||e.key==='Enter')&&game&&!game.activeQuest){
    const bb=document.getElementById('speech-bubble');
    if(bb.style.display==='block'){bb.style.display='none';return}
    // Try interaction first
    const dirs2={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    const d2=dirs2[game.p.dir]||[0,1];const fx2=game.p.x+d2[0],fy2=game.p.y+d2[1];
    let interacted=false;
    if(fx2>=0&&fy2>=0&&fx2<game.mw&&fy2<game.mh){
      const tile2=game.map[fy2][fx2];
      if(tile2===T.GATE){const g2=game.gates.find(g=>g.x===fx2&&g.y===fy2);if(g2&&!g2.open){game.openGateQuest(g2);interacted=true}}
      else if(tile2===T.DOG_GATE){const nd2=game.dogs.find(d=>!d.rescued&&d.cageGate&&d.cageGate.x===fx2&&d.cageGate.y===fy2);if(nd2&&!nd2.cageOpen){if(!nd2.quests)nd2.quests=genQuests(1,game.ld.diff);const story2=CAGE_STORIES[Math.floor(Math.random()*CAGE_STORIES.length)];game.activeQuest={type:'dogCage',dog:nd2,x:fx2,y:fy2};game.questList=nd2.quests;game.questIdx=0;game.addBurst(fx2+0.5,0.5,fy2+0.5,8,'#FF9800');showQuestBubble(game.questList[0],story2,fx2+0.5,fy2+0.5);interacted=true}}
      else if(INTERACT.has(tile2)){game.interactWith(fx2,fy2,tile2);interacted=true}
    }
    // If Space (not Enter) and no interaction: JUMP
    if(!interacted&&e.key===' '&&game.moveDir){game.tryJump(game.moveDir)}
    else if(!interacted&&e.key===' '){game.tryJump(game.p.dir)}
  }`,
  'Space = interact then jump'
);

// ========== 21. Mobile jump button wiring ==========
insertAfter(
  `btn.addEventListener('touchend',stop,{passive:false});btn.addEventListener('mouseup',stop);btn.addEventListener('mouseleave',stop)});`,
  `

// Jump button (mobile)
const jumpBtn=document.getElementById('jump-btn');
if(jumpBtn){
  jumpBtn.addEventListener('touchstart',e=>{e.preventDefault();initAudio();
    if(game&&game.moveDir)game.tryJump(game.moveDir);
    else if(game)game.tryJump(game.p.dir);
  },{passive:false});
  jumpBtn.addEventListener('mousedown',e=>{e.preventDefault();initAudio();
    if(game&&game.moveDir)game.tryJump(game.moveDir);
    else if(game)game.tryJump(game.p.dir);
  });
}`,
  'Mobile jump button wiring'
);

// ========== 22. Show/hide jump button on mobile ==========
// After d-pad show on mobile, also show jump button
// Find the actualStartLevel function and make sure jump button shows
insertAfter(
  "document.getElementById('game-over-overlay').style.display='none';",
  "\n    // Show jump button on mobile\n    const jb=document.getElementById('jump-btn');\n    if(jb&&window.innerWidth<768)jb.style.display='flex';",
  'Show jump button'
);

// ========== 23. Game over button wiring ==========
insertAfter(
  `if(jumpBtn){
  jumpBtn.addEventListener('touchstart',e=>{e.preventDefault();initAudio();
    if(game&&game.moveDir)game.tryJump(game.moveDir);
    else if(game)game.tryJump(game.p.dir);
  },{passive:false});
  jumpBtn.addEventListener('mousedown',e=>{e.preventDefault();initAudio();
    if(game&&game.moveDir)game.tryJump(game.moveDir);
    else if(game)game.tryJump(game.p.dir);
  });
}`,
  `

// Game over buttons
document.getElementById('go-retry').addEventListener('click',()=>{
  document.getElementById('game-over-overlay').style.display='none';
  if(game){const li=game.li;game=null;if(rafId)cancelAnimationFrame(rafId);actualStartLevel(li);}
});
document.getElementById('go-quit').addEventListener('click',()=>{
  document.getElementById('game-over-overlay').style.display='none';
  if(game){game=null;if(rafId)cancelAnimationFrame(rafId);}showLevelSelect();
});`,
  'Game over button wiring'
);

// ========== 24. Hide jump button and hearts when leaving game ==========
// When pressing Escape to quit
replace(
  "    else if(game){game=null;if(rafId)cancelAnimationFrame(rafId);showLevelSelect()}}",
  "    else if(game){game=null;if(rafId)cancelAnimationFrame(rafId);const jb2=document.getElementById('jump-btn');if(jb2)jb2.style.display='none';document.getElementById('game-over-overlay').style.display='none';showLevelSelect()}}",
  'Hide jump btn on escape'
);

// Write result
fs.writeFileSync(file, src);
console.log('\n✅ All changes applied successfully!');
console.log('Total file size: ' + src.length + ' chars, ' + src.split('\n').length + ' lines');
