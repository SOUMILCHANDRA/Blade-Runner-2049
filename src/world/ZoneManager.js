import * as THREE from 'three';
import { City } from './City.js';

export class ZoneManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.zones = [
      { name: 'LA 2049', type: 'LA_2049', range: [0, 1500], fogColor: 0x050508 },
      { name: 'ORANGE CITY', type: 'ORANGE_CITY', range: [1501, 3000], fogColor: 0x442200 },
      { name: 'PROTEIN FARMS', type: 'FARMS', range: [3001, 5000], fogColor: 0x111111 }
    ];
    this.currentZone = this.zones[0];
    this.init();
  }

  init() {
    // Instantiate all cities
    this.zones.forEach(z => {
      new City(this.scene, z.type);
    });

    // Add ground for the entire world
    const groundGeo = new THREE.PlaneGeometry(10000, 10000);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x020202,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -50;
    this.scene.add(ground);
  }

  update(playerPos) {
    const dist = playerPos.length();
    const zone = this.zones.find(z => dist >= z.range[0] && dist <= z.range[1]) || this.zones[0];

    if (zone.name !== this.currentZone.name) {
      this.currentZone = zone;
      this.updateAtmosphere(zone);
      document.getElementById('location-name').innerText = zone.name;
    }

    // Update Minimap
    const mapScale = 5000 / 75; // 5000 units = 75px radius
    const mx = playerPos.x / mapScale;
    const mz = playerPos.z / mapScale;
    
    const playerDot = document.getElementById('minimap-player');
    if (playerDot) {
      playerDot.style.transform = `translate(${mx}px, ${mz}px)`;
    }
  }

  updateAtmosphere(zone) {
    // Smooth transition for fog color
    const targetColor = new THREE.Color(zone.fogColor);
    this.scene.fog.color.lerp(targetColor, 0.05);
    this.renderer.setClearColor(this.scene.fog.color);
  }
}
