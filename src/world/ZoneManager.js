import * as THREE from 'three';
import { City } from './City.js';

export class ZoneManager {
  constructor(scene, renderer, hemiLight, sky) {
    this.scene = scene;
    this.renderer = renderer;
    this.hemiLight = hemiLight;
    this.sky = sky;
    
    this.zones = [
      { name: 'LA 2049', type: 'LA_2049', pos: new THREE.Vector3(0, 0, 0), fogColor: 0x0a0510, hemiColor: 0x1a0a00 },
      { name: 'PROTEIN FARMS', type: 'FARMS', pos: new THREE.Vector3(-3000, 0, 0), fogColor: 0x222222, hemiColor: 0x111111 },
      { name: 'ORANGE CITY', type: 'ORANGE_CITY', pos: new THREE.Vector3(3000, 0, 1000), fogColor: 0x442200, hemiColor: 0x884400 },
      { name: 'SCRAPYARD', type: 'SCRAPYARD', pos: new THREE.Vector3(-2000, 0, -2000), fogColor: 0x444400, hemiColor: 0x888800 },
      { name: 'WALLACE HQ', type: 'WALLACE_HQ', pos: new THREE.Vector3(500, 0, -500), fogColor: 0x000000, hemiColor: 0x050505 }
    ];
    
    this.cityInstances = [];
    this.currentZoneData = this.zones[0];
    
    this.LOAD_RADIUS = 2500;
    this.UNLOAD_RADIUS = 3500;

    this.init();
  }

  init() {
    // Initialize City instances but don't load them yet
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

  update(playerPos) {
    this.updateZones(playerPos);
    this.updateAtmosphere(playerPos);
    this.drawMinimap(playerPos);
  }

  updateZones(playerPos) {
    this.cityInstances.forEach(item => {
      const dist = playerPos.distanceTo(item.data.pos);
      
      if (dist < this.LOAD_RADIUS && !item.city.loaded) {
        console.log(`Loading zone: ${item.data.name}`);
        item.city.load();
      } else if (dist > this.UNLOAD_RADIUS && item.city.loaded) {
        console.log(`Unloading zone: ${item.data.name}`);
        item.city.unload();
      }
    });
  }

  updateAtmosphere(playerPos) {
    // Find closest zone for atmosphere settings
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

    const targetFog = new THREE.Color(closest.fogColor);
    const targetHemi = new THREE.Color(closest.hemiColor);

    this.scene.fog.color.lerp(targetFog, 0.02);
    this.renderer.setClearColor(this.scene.fog.color);

    if (this.hemiLight) {
      this.hemiLight.color.lerp(targetFog, 0.02);
      this.hemiLight.groundColor.lerp(targetHemi, 0.02);
    }

    if (this.sky && this.sky.material.uniforms) {
      this.sky.material.uniforms.topColor.value.lerp(targetFog, 0.01);
      this.sky.material.uniforms.bottomColor.value.lerp(targetHemi, 0.01);
    }
  }

  drawMinimap(playerPos) {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.1)';
    ctx.lineWidth = 1;
    for(let i=0; i<w; i+=40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    const scale = 0.02;
    const cx = w/2;
    const cy = h/2;

    // Draw Zones
    this.zones.forEach(z => {
      const dx = (z.pos.x - playerPos.x) * scale;
      const dz = (z.pos.z - playerPos.z) * scale;
      
      const isLoaded = this.cityInstances.find(ci => ci.data.name === z.name).city.loaded;
      
      ctx.fillStyle = isLoaded ? 'rgba(0, 255, 170, 1)' : 'rgba(0, 255, 170, 0.3)';
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dz, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Player
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
