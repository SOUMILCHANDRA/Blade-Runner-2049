import * as THREE from 'three';
import { City } from './City.js';

export class ZoneManager {
  constructor(scene, renderer, hemiLight, sky, vfx) {
    this.scene = scene;
    this.renderer = renderer;
    this.hemiLight = hemiLight;
    this.sky = sky;
    this.vfx = vfx;
    
    this.zones = [
      { name: 'LA 2049', type: 'LA_2049', pos: new THREE.Vector3(0, 0, 0), fogColor: 0x0a0510, hemiColor: 0x1a0a00, rain: 1.0 },
      { name: 'PROTEIN FARMS', type: 'FARMS', pos: new THREE.Vector3(-3000, 0, 0), fogColor: 0x222222, hemiColor: 0x111111, rain: 0.0 },
      { name: 'ORANGE_CITY', type: 'ORANGE_CITY', pos: new THREE.Vector3(3000, 0, 1000), fogColor: 0xff8c00, hemiColor: 0xff6600, groundColor: 0x331100, fogType: 'linear', rain: 0.3 },
      { name: 'SCRAPYARD', type: 'SCRAPYARD', pos: new THREE.Vector3(-2000, 0, -2000), fogColor: 0x444400, hemiColor: 0x888800, rain: 0.0 },
      { name: 'WALLACE HQ', type: 'WALLACE_HQ', pos: new THREE.Vector3(500, 0, -500), fogColor: 0x000000, hemiColor: 0x050505, rain: 0.0 }
    ];
    
    this.cityInstances = [];
    this.currentZoneData = this.zones[0];
    
    this.LOAD_RADIUS = 2500;
    this.UNLOAD_RADIUS = 3500;
    this.time = 0;

    this.init();
  }

  init() {
    this.zones.forEach(z => {
      const city = new City(this.scene, z.type, z.pos);
      this.cityInstances.push({ data: z, city: city });
    });

    const groundGeo = new THREE.PlaneGeometry(20000, 20000);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x020202,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -50;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  update(playerPos, dt) {
    this.time += dt;
    this.updateZones(playerPos);
    this.updateAtmosphere(playerPos);
    this.drawMinimap(playerPos);
  }

  updateZones(playerPos) {
    this.cityInstances.forEach(item => {
      const dist = playerPos.distanceTo(item.data.pos);
      
      if (dist < this.LOAD_RADIUS && !item.city.loaded) {
        item.city.load();
      } else if (dist > this.UNLOAD_RADIUS && item.city.loaded) {
        item.city.unload();
      }

      if (item.city.loaded) {
        item.city.update(this.time);
      }
    });
  }

  updateAtmosphere(playerPos) {
    let minDist = Infinity;
    let closest = this.zones[0];

    this.zones.forEach(z => {
      const d = playerPos.distanceTo(z.pos);
      if (d < minDist) {
        minDist = d;
        closest = z;
      }
    });

    if (closest.name !== this.currentZoneData.name) {
      this.currentZoneData = closest;
      const zoneLabel = document.getElementById('zone-name');
      if (zoneLabel) zoneLabel.innerText = closest.name;
    }

    const zone = this.currentZoneData;
    const targetFog = new THREE.Color(zone.fogColor);
    const targetHemi = new THREE.Color(zone.hemiColor);
    const targetGround = new THREE.Color(zone.groundColor || zone.hemiColor);

    // Dynamic Fog Switching
    if (zone.fogType === 'linear' && this.scene.fog.isFogExp2) {
      this.scene.fog = new THREE.Fog(this.scene.fog.color, 200, 1200);
    } else if (!zone.fogType && !this.scene.fog.isFogExp2) {
      this.scene.fog = new THREE.FogExp2(this.scene.fog.color, 0.003);
    }

    this.scene.fog.color.lerp(targetFog, 0.02);
    this.renderer.setClearColor(this.scene.fog.color);

    if (this.hemiLight) {
      this.hemiLight.color.lerp(targetHemi, 0.02);
      this.hemiLight.groundColor.lerp(targetGround, 0.02);
    }

    if (this.sky && this.sky.material.uniforms) {
      this.sky.material.uniforms.topColor.value.lerp(targetFog, 0.01);
      this.sky.material.uniforms.bottomColor.value.lerp(targetGround, 0.01);
    }

    // Rain intensity lerp
    if (this.vfx) {
      const currentIntensity = this.vfx.intensity;
      this.vfx.setIntensity(THREE.MathUtils.lerp(currentIntensity, zone.rain, 0.02));
    }
  }

  drawMinimap(playerPos) {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.15)';
    ctx.lineWidth = 1;
    for(let i=0; i<=w; i+=40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    const scale = 0.02;

    this.zones.forEach(z => {
      const dx = (z.pos.x - playerPos.x) * scale;
      const dz = (z.pos.z - playerPos.z) * scale;
      
      if (Math.abs(dx) < cx && Math.abs(dz) < cy) {
        const isLoaded = this.cityInstances.find(ci => ci.data.name === z.name).city.loaded;
        ctx.fillStyle = isLoaded ? '#00ffaa' : 'rgba(0, 255, 170, 0.3)';
        ctx.shadowBlur = isLoaded ? 10 : 0;
        ctx.shadowColor = '#00ffaa';
        
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dz, 4, 0, Math.PI * 2);
        ctx.fill();
        
        if (isLoaded) {
          ctx.font = '8px "Share Tech Mono"';
          ctx.fillText(z.name, cx + dx + 6, cy + dz + 3);
        }
      }
    });

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < h; i += 2) {
      ctx.fillRect(0, i, w, 1);
    }
  }
}
