import * as THREE from 'three';

export class City {
  constructor(scene, zoneType = 'LA_2049', position = new THREE.Vector3(0, 0, 0)) {
    this.scene = scene;
    this.zoneType = zoneType;
    this.position = position;
    this.meshes = [];
    this.loaded = false;
  }

  load() {
    if (this.loaded) return;
    
    switch (this.zoneType) {
      case 'LA_2049':
        this.generateCity(500, 150, { h: 0.7, s: 0.2 }, true);
        this.addZoneAmbient(0x0a0510, 0.5);
        break;
      case 'ORANGE_CITY':
        this.generateCity(300, 80, { h: 0.1, s: 0.8 }, false);
        this.generateTrashMountains();
        this.addOrangeLighting();
        break;
      case 'FARMS':
        this.generateFarms();
        this.addZoneAmbient(0x111111, 0.2);
        break;
      case 'SCRAPYARD':
        this.generateScrapyard();
        this.addScrapyardLighting();
        break;
      case 'WALLACE_HQ':
        this.generateWallaceHQ();
        this.addWallaceLighting();
        break;
    }
    
    this.loaded = true;
  }

  unload() {
    if (!this.loaded) return;
    
    this.meshes.forEach(m => {
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) {
          m.material.forEach(mat => mat.dispose());
        } else {
          m.material.dispose();
        }
      }
      this.scene.remove(m);
    });
    
    this.meshes = [];
    this.loaded = false;
  }

  update(time) {
    if (!this.loaded) return;

    // Flickering logic for Scrapyard
    if (this.zoneType === 'SCRAPYARD') {
      this.meshes.forEach(m => {
        if (m.isPointLight && Math.random() < 0.01) {
          m.visible = !m.visible;
        }
      });
    }
  }

  addZoneAmbient(color, intensity) {
    const light = new THREE.AmbientLight(color, intensity);
    this.addMesh(light);
  }

  addOrangeLighting() {
    const dirLight = new THREE.DirectionalLight(0xffaa00, 2);
    dirLight.position.set(100, 100, 50);
    this.addMesh(dirLight);
    
    // Dust particles (simulated with many small lights or just rely on fog)
    // We'll add a few large point lights for a 'smog' glow effect
    for(let i=0; i<5; i++) {
      const pLight = new THREE.PointLight(0xffaa00, 100, 2000);
      pLight.position.set(
        this.position.x + (Math.random()-0.5) * 1000,
        500,
        this.position.z + (Math.random()-0.5) * 1000
      );
      this.addMesh(pLight);
    }
  }

  addScrapyardLighting() {
    for (let i = 0; i < 50; i++) {
      const pLight = new THREE.PointLight(0xccff00, 50, 300);
      const radius = 100 + Math.random() * 800;
      const angle = Math.random() * Math.PI * 2;
      pLight.position.set(
        this.position.x + Math.cos(angle) * radius,
        -40 + Math.random() * 20,
        this.position.z + Math.sin(angle) * radius
      );
      pLight.isPointLight = true; // For flickering check
      this.addMesh(pLight);
    }
  }

  addWallaceLighting() {
    const spot = new THREE.SpotLight(0xffffff, 10, 2000, Math.PI / 8, 0.5);
    spot.position.set(this.position.x, 1000, this.position.z);
    spot.target.position.set(this.position.x, 0, this.position.z);
    this.scene.add(spot.target); // Need to track target too? Target is just an Object3D
    this.addMesh(spot);
  }

  addMesh(mesh) {
    this.meshes.push(mesh);
    this.scene.add(mesh);
  }

  generateCity(count, maxH, baseHSL, addNeon) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(baseHSL.h, baseHSL.s, 0.1),
      roughness: 0.8,
      metalness: 0.3,
      emissive: new THREE.Color(0x001122),
      emissiveIntensity: 0.5
    });

    const instancedMesh = new THREE.InstancedMesh(geo, mat, count);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const w = 10 + Math.random() * 20;
      const h = 20 + Math.random() * maxH;
      const d = 10 + Math.random() * 20;

      const radius = 50 + Math.random() * 800;
      const angle = Math.random() * Math.PI * 2;
      
      dummy.position.set(
        this.position.x + Math.cos(angle) * radius,
        h / 2 - 50,
        this.position.z + Math.sin(angle) * radius
      );
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      
      instancedMesh.setMatrixAt(i, dummy.matrix);

      const instanceColor = new THREE.Color().setHSL(baseHSL.h, baseHSL.s, Math.random() * 0.15 + 0.05);
      instancedMesh.setColorAt(i, instanceColor);

      if (addNeon && Math.random() > 0.8) {
        this.addNeonDetail(dummy.position, w, h, d);
      }
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor.needsUpdate = true;
    this.addMesh(instancedMesh);
  }

  generateTrashMountains() {
    const count = 20;
    const coneGeo = new THREE.ConeGeometry(50, 100, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 1 });
    
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(coneGeo, mat);
      const radius = 200 + Math.random() * 600;
      const angle = Math.random() * Math.PI * 2;
      mesh.position.set(
        this.position.x + Math.cos(angle) * radius,
        0,
        this.position.z + Math.sin(angle) * radius
      );
      mesh.castShadow = true;
      this.addMesh(mesh);
    }
  }

  generateFarms() {
    const count = 100;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const instancedMesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const w = 100 + Math.random() * 100;
      const h = 5;
      const d = 200 + Math.random() * 200;

      const radius = 100 + Math.random() * 1500;
      const angle = Math.random() * Math.PI * 2;
      
      dummy.position.set(
        this.position.x + Math.cos(angle) * radius,
        h / 2 - 50,
        this.position.z + Math.sin(angle) * radius
      );
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    this.addMesh(instancedMesh);
  }

  generateScrapyard() {
    const count = 1000;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 1 });
    const instancedMesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const scale = 2 + Math.random() * 5;
      const radius = 50 + Math.random() * 800;
      const angle = Math.random() * Math.PI * 2;
      
      dummy.position.set(
        this.position.x + Math.cos(angle) * radius,
        -48,
        this.position.z + Math.sin(angle) * radius
      );
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    this.addMesh(instancedMesh);
  }

  generateWallaceHQ() {
    const monolithGeo = new THREE.BoxGeometry(200, 800, 200);
    const monolithMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
    const monolith = new THREE.Mesh(monolithGeo, monolithMat);
    monolith.position.set(this.position.x, 350, this.position.z);
    monolith.castShadow = true;
    this.addMesh(monolith);

    const waterGeo = new THREE.PlaneGeometry(1000, 1000);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x001122, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.5 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(this.position.x, -49.5, this.position.z);
    this.addMesh(water);
  }

  addNeonDetail(pos, w, h, d) {
    const neonGeo = new THREE.BoxGeometry(w + 0.5, 2, d + 0.5);
    const neonMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? 0x00f3ff : 0xff0055,
      emissive: Math.random() > 0.5 ? 0x00f3ff : 0xff0055,
      emissiveIntensity: 10
    });

    const neonStrip = new THREE.Mesh(neonGeo, neonMat);
    neonStrip.position.copy(pos);
    neonStrip.position.y += (Math.random() - 0.5) * h;
    this.addMesh(neonStrip);

    if (Math.random() > 0.8) {
      const light = new THREE.PointLight(neonMat.color, 50, 100);
      light.position.copy(neonStrip.position);
      this.scene.add(light); // PointLights don't need geometry/material disposal the same way
      this.meshes.push(light); 
    }
  }
}
