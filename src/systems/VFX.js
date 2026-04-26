import * as THREE from 'three';

export class VFX {
  constructor(scene) {
    this.scene = scene;
    this.intensity = 1.0; // 0 to 1
    this.initRain();
  }

  initRain() {
    const rainCount = 3000;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    
    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i+1] = Math.random() * 200;
      positions[i+2] = (Math.random() - 0.5) * 200;
    }
    
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const rainMat = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.5,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    
    this.rain = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rain);
  }

  update(playerPos) {
    if (!this.rain) return;

    // Adjust visibility based on intensity
    this.rain.visible = this.intensity > 0.01;
    this.rain.material.opacity = this.intensity * 0.5;

    const positions = this.rain.geometry.attributes.position.array;
    const playerX = playerPos.x;
    const playerY = playerPos.y;
    const playerZ = playerPos.z;

    for (let i = 0; i < positions.length; i += 3) {
      // Fall speed
      positions[i + 1] -= 8;

      // Reset to top if too low
      if (positions[i + 1] < playerY - 100) {
        positions[i + 1] = playerY + 100;
        
        // Randomize X and Z around player in a cylinder
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 100;
        positions[i] = playerX + Math.cos(angle) * radius;
        positions[i + 2] = playerZ + Math.sin(angle) * radius;
      }
    }

    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  setIntensity(val) {
    this.intensity = val;
  }
}
