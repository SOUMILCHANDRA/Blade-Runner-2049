import * as THREE from 'three';
import { City } from './City.js';
import { Howl } from 'howler';

export class ZoneManager {
  constructor(scene, renderer, hemiLight, sky, vfx) {
    this.scene = scene;
    this.renderer = renderer;
    this.hemiLight = hemiLight;
    this.sky = sky;
    this.vfx = vfx;
    
    this.zones = [
      { 
        name: 'LOS ANGELES · 2049', id: 'city', type: 'LA_2049', pos: new THREE.Vector3(0, 0, 0), 
        sub: 'SECTOR 7 · NEON DISTRICT',
        fogColor: 0x0a0510, hemiColor: 0x1a0a00, rain: 1.0,
        ambientUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-sci-fi-city-ambience-loop-1104.mp3'
      },
      { 
        name: 'PROTEIN FARMS · CA', id: 'farms', type: 'FARMS', pos: new THREE.Vector3(-3000, 0, 0), 
        sub: 'RESTRICTED AGRICULTURAL ZONE',
        fogColor: 0x222222, hemiColor: 0x111111, rain: 0.0,
        ambientUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-wind-loop-1139.mp3'
      },
      { 
        name: 'ORANGE CITY · SD', id: 'orange', type: 'ORANGE_CITY', pos: new THREE.Vector3(3000, 0, 1000), 
        sub: 'CONTAMINATED — ENTRY HAZARD',
        fogColor: 0xff8c00, hemiColor: 0xff6600, groundColor: 0x331100, fogType: 'linear', rain: 0.3,
        ambientUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-wind-loop-1139.mp3'
      },
      { 
        name: 'SCRAPYARD · NEVADA', id: 'scrap', type: 'SCRAPYARD', pos: new THREE.Vector3(-2000, 0, -2000), 
        sub: 'ZONE DELTA · RADIATION WARNING',
        fogColor: 0x444400, hemiColor: 0x888800, rain: 0.0,
        ambientUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-deep-sci-fi-drone-1632.mp3'
      },
      { 
        name: 'WALLACE HQ · BR', id: 'wallace', type: 'WALLACE_HQ', pos: new THREE.Vector3(500, 0, -500), 
        sub: 'AUTHORIZED PERSONNEL ONLY',
        fogColor: 0x000000, hemiColor: 0x050505, rain: 0.0,
        ambientUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-deep-sci-fi-drone-1632.mp3'
      }
    ];
    
    this.cityInstances = [];
    this.currentZoneData = this.zones[0];
    this.ambientSounds = {};
    this.zoneCols = { city: '#00ffcc', farms: '#aaaaaa', orange: '#ff8800', scrap: '#ccff00', wallace: '#4488ff' };
    
    this.LOAD_RADIUS = 2500;
    this.UNLOAD_RADIUS = 3500;
    this.time = 0;

    this.init();
  }

  init() {
    this.zones.forEach(z => {
      const city = new City(this.scene, z.type, z.pos);
      this.cityInstances.push({ data: z, city: city });
      
      this.ambientSounds[z.name] = new Howl({
        src: [z.ambientUrl],
        loop: true,
        volume: 0,
        autoplay: false
      });
    });

    const groundGeo = new THREE.PlaneGeometry(30000, 30000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x040408, roughness: 0.05, metalness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -6;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  update(playerPos, playerYaw, dt) {
    this.time += dt;
    this.updateZones(playerPos);
    this.updateAtmosphere(playerPos);
    this.drawRadar(playerPos, playerYaw);
  }

  updateZones(playerPos) {
    this.cityInstances.forEach(item => {
      const dist = playerPos.distanceTo(item.data.pos);
      if (dist < this.LOAD_RADIUS && !item.city.loaded) item.city.load();
      else if (dist > this.UNLOAD_RADIUS && item.city.loaded) item.city.unload();
      if (item.city.loaded) item.city.update(this.time);
    });
  }

  updateAtmosphere(playerPos) {
    let minDist = Infinity;
    let closest = this.zones[0];

    this.zones.forEach(z => {
      const d = playerPos.distanceTo(z.pos);
      if (d < minDist) { minDist = d; closest = z; }
    });

    if (closest.name !== this.currentZoneData.name) {
      this.transitionToZone(closest);
    }

    const zone = this.currentZoneData;
    const targetFog = new THREE.Color(zone.fogColor);
    const targetHemi = new THREE.Color(zone.hemiColor);
    const targetGround = new THREE.Color(zone.groundColor || zone.hemiColor);

    if (zone.fogType === 'linear' && this.scene.fog.isFogExp2) {
      this.scene.fog = new THREE.Fog(this.scene.fog.color, 200, 1200);
    } else if (!zone.fogType && !this.scene.fog.isFogExp2) {
      this.scene.fog = new THREE.FogExp2(this.scene.fog.color, 0.0035);
    }

    this.scene.fog.color.lerp(targetFog, 0.025);
    this.renderer.setClearColor(this.scene.fog.color);
    if (this.hemiLight) {
      this.hemiLight.color.lerp(targetHemi, 0.025);
      this.hemiLight.groundColor.lerp(targetGround, 0.025);
    }
    if (this.sky && this.sky.material.uniforms) {
      this.sky.material.uniforms.topColor.value.lerp(targetFog, 0.01);
      this.sky.material.uniforms.bottomColor.value.lerp(targetGround, 0.01);
    }
    if (this.vfx) {
      const currentIntensity = this.vfx.intensity;
      this.vfx.setIntensity(THREE.MathUtils.lerp(currentIntensity, zone.rain, 0.02));
    }
  }

  transitionToZone(newZone) {
    this.crossfadeAmbient(this.currentZoneData.name, newZone.name);
    
    const flash = document.getElementById('flash');
    if (flash) {
      flash.style.opacity = '0.35';
      setTimeout(() => flash.style.opacity = '0', 180);
    }

    this.typewriteHUD(newZone.name);
    const subLabel = document.getElementById('zone-sub');
    if (subLabel) subLabel.textContent = newZone.sub;

    this.currentZoneData = newZone;
  }

  typewriteHUD(text) {
    const label = document.getElementById('zone-name');
    if (!label) return;
    label.textContent = '';
    let i = 0;
    const iv = setInterval(() => {
      label.textContent += text[i++];
      if (i >= text.length) clearInterval(iv);
    }, 45);
  }

  crossfadeAmbient(oldZone, newZone) {
    const oldSound = this.ambientSounds[oldZone];
    const newSound = this.ambientSounds[newZone];
    if (oldSound) oldSound.fade(oldSound.volume(), 0, 3000);
    if (newSound) {
      if (!newSound.playing()) newSound.play();
      newSound.fade(0, 0.5, 3000);
    }
  }

  startInitialAudio() {
    this.typewriteHUD(this.currentZoneData.name);
    const sound = this.ambientSounds[this.currentZoneData.name];
    if (sound && !sound.playing()) {
      sound.play();
      sound.fade(0, 0.5, 1000);
    }
  }

  drawRadar(playerPos, playerYaw) {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 120, CX = 60, CY = 60;
    
    ctx.clearRect(0, 0, W, W);
    
    // Grid
    ctx.strokeStyle = 'rgba(0, 180, 60, 0.12)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const v = (i / 4) * W;
      ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, W); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(W, v); ctx.stroke();
    }
    
    // Rings
    [20, 38, 58].forEach(r => {
      ctx.strokeStyle = 'rgba(0, 180, 60, 0.18)';
      ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke();
    });

    const scale = 0.022;
    this.zones.forEach(z => {
      const dx = (z.pos.x - playerPos.x) * scale;
      const dz = (z.pos.z - playerPos.z) * scale;
      
      // Rotate radar relative to player yaw
      const rx = dx * Math.cos(-playerYaw) - dz * Math.sin(-playerYaw);
      const ry = dx * Math.sin(-playerYaw) + dz * Math.cos(-playerYaw);
      
      const mx = CX + rx;
      const my = CY + ry;
      
      if (mx < 4 || mx > 116 || my < 4 || my > 116) return;
      
      const active = z.name === this.currentZoneData.name;
      const col = this.zoneCols[z.id] || '#00ff88';
      
      ctx.fillStyle = active ? col : col + '44';
      if (active) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = col;
      }
      
      ctx.beginPath();
      ctx.arc(mx, my, active ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      if (active) {
        ctx.fillStyle = col;
        ctx.font = '7px "Share Tech Mono"';
        ctx.fillText(z.id.toUpperCase(), mx + 5, my + 3);
      }
    });

    // Player Center
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath(); ctx.arc(CX, CY, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    
    // Direction Indicator
    ctx.strokeStyle = '#00ffff88';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX, CY - 10); ctx.stroke();
  }
}
