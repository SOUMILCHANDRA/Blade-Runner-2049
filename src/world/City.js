import * as THREE from 'three';

export class City {
  constructor(scene, zoneType = 'LA_2049') {
    this.scene = scene;
    this.zoneType = zoneType;
    this.buildings = [];
    this.generate();
  }

  generate() {
    if (this.zoneType === 'FARMS') {
      this.generateFarms();
    } else {
      this.generateCity();
    }
  }

  generateCity() {
    const buildingCount = this.zoneType === 'LA_2049' ? 500 : 300;
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    
    const colorBase = this.zoneType === 'LA_2049' ? 0x151515 : 0x2a1a0a; // Darker vs Rusty

    for (let i = 0; i < buildingCount; i++) {
      const w = 10 + Math.random() * 20;
      const h = 20 + Math.random() * (this.zoneType === 'LA_2049' ? 150 : 80);
      const d = 10 + Math.random() * 20;

      const mesh = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({
        color: colorBase,
        roughness: 0.2,
        metalness: 0.5
      }));
      mesh.scale.set(w, h, d);
      
      const radius = this.zoneType === 'LA_2049' ? (100 + Math.random() * 1000) : (1200 + Math.random() * 800);
      const angle = Math.random() * Math.PI * 2;
      mesh.position.set(
        Math.cos(angle) * radius,
        h / 2 - 50,
        Math.sin(angle) * radius
      );

      this.scene.add(mesh);

      if (this.zoneType === 'LA_2049' && Math.random() > 0.7) {
        this.addNeonDetail(mesh, w, h, d);
      }
    }
  }

  generateFarms() {
    // Large flat structures
    const farmCount = 50;
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    for (let i = 0; i < farmCount; i++) {
      const w = 100 + Math.random() * 100;
      const h = 5;
      const d = 200 + Math.random() * 200;

      const mesh = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
      }));
      mesh.scale.set(w, h, d);
      
      const radius = 2500 + Math.random() * 1000;
      const angle = Math.random() * Math.PI * 2;
      mesh.position.set(
        Math.cos(angle) * radius,
        h / 2 - 50,
        Math.sin(angle) * radius
      );

      this.scene.add(mesh);
    }
  }

  addNeonDetail(building, w, h, d) {
    const neonGeo = new THREE.BoxGeometry(w + 0.5, 2, d + 0.5);
    const neonMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? 0x00f3ff : 0xff0055,
      emissive: Math.random() > 0.5 ? 0x00f3ff : 0xff0055,
      emissiveIntensity: 10
    });

    const neonStrip = new THREE.Mesh(neonGeo, neonMat);
    neonStrip.position.copy(building.position);
    neonStrip.position.y += (Math.random() - 0.5) * h;
    this.scene.add(neonStrip);

    if (Math.random() > 0.8) {
      const light = new THREE.PointLight(neonMat.color, 50, 100);
      light.position.copy(neonStrip.position);
      this.scene.add(light);
    }
  }

  update() {}
}
