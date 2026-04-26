import * as THREE from 'three';

export class VFX {
  constructor(scene) {
    this.scene = scene;
    this.rain = null;
    this.rainCount = 10000;
    this.createRain();
  }

  createRain() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    const velocities = new Float32Array(this.rainCount);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1000;
      positions[i * 3 + 1] = Math.random() * 500;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;
      velocities[i] = 2 + Math.random() * 3;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.1,
      transparent: true,
      opacity: 0.4
    });

    this.rain = new THREE.Points(geo, mat);
    this.scene.add(this.rain);
  }

  update(playerPos) {
    // Keep rain centered around player
    this.rain.position.set(playerPos.x, 0, playerPos.z);

    const positions = this.rain.geometry.attributes.position.array;
    const velocities = this.rain.geometry.attributes.velocity.array;

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3 + 1] -= velocities[i];
      
      if (positions[i * 3 + 1] < -100) {
        positions[i * 3 + 1] = 500;
      }
    }

    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}
