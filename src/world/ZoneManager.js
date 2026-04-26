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
    this.currentZone = this.zones[0];
    this.init();
  }

  init() {
    this.zones.forEach(z => {
      new City(this.scene, z.type, z.pos);
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
    let minDist = Infinity;
    let closestZone = this.currentZone;

    this.zones.forEach(z => {
      const d = playerPos.distanceTo(z.pos);
      if (d < minDist) {
        minDist = d;
        closestZone = z;
      }
    });

    if (closestZone.name !== this.currentZone.name) {
      this.currentZone = closestZone;
      document.getElementById('location-name').innerText = closestZone.name;
    }

    this.updateAtmosphere(this.currentZone);

    const mapScale = 5000 / 75;
    const mx = playerPos.x / mapScale;
    const mz = playerPos.z / mapScale;
    
    const playerDot = document.getElementById('minimap-player');
    if (playerDot) {
      playerDot.style.transform = `translate(${mx}px, ${mz}px)`;
    }
  }

  updateAtmosphere(zone) {
    const targetFog = new THREE.Color(zone.fogColor);
    const targetHemi = new THREE.Color(zone.hemiColor);

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
}
