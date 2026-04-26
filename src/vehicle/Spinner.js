import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Spinner {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.mesh = new THREE.Group();
    this.model = null;

    // Physics/Movement properties
    this.velocity = new THREE.Vector3();
    this.boostAmount = 1.0; // 0 to 1
    this.time = 0;
    this.yaw = 0;
    this.pitch = 0;

    this.keys = {
      w: false, s: false, a: false, d: false, 
      space: false, shift: false, f: false
    };

    this.loadModel();
    this.initControls();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load('/spinner.glb', (gltf) => {
      this.model = gltf.scene;
      this.model.scale.set(0.5, 0.5, 0.5);
      this.model.rotation.y = Math.PI; // Face forward
      this.mesh.add(this.model);
      
      this.model.traverse(node => {
        if (node.isMesh && node.material) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material.emissiveIntensity !== undefined) {
            node.material.emissiveIntensity = 5;
          }
        }
      });
    }, undefined, (error) => {
      this.createFallbackModel();
    });

    this.scene.add(this.mesh);
  }

  createFallbackModel() {
    const bodyGeo = new THREE.BoxGeometry(2.8, 0.65, 5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x131620, roughness: 0.25, metalness: 0.95 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);
  }

  initControls() {
    window.addEventListener('keydown', e => this.keys[e.code] = true);
    window.addEventListener('keyup', e => this.keys[e.code] = false);

    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', () => {
      if (canvas.requestPointerLock) canvas.requestPointerLock();
    });

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * 0.0024;
        this.pitch -= e.movementY * 0.0024;
        this.pitch = Math.max(-0.52, Math.min(0.52, this.pitch));
      }
    });
  }

  update(dt) {
    if (!dt) return;
    this.time += dt;

    // Apply rotation from mouse
    this.mesh.rotation.y = this.yaw;
    this.mesh.rotation.x = this.pitch * 0.38;
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
    
    // Boost Logic
    const boosting = this.keys['KeyF'] && this.boostAmount > 0.01;
    const spdMultiplier = boosting ? 3.2 : 1.0;
    
    if (boosting) {
      this.boostAmount = Math.max(0, this.boostAmount - dt * 0.55);
    } else {
      this.boostAmount = Math.min(1, this.boostAmount + dt * 0.22);
    }
    
    const accel = 58 * spdMultiplier;
    
    // Applying Forces
    if (this.keys['KeyW']) this.velocity.addScaledVector(forward, accel * dt);
    if (this.keys['KeyS']) this.velocity.addScaledVector(forward, -accel * 0.35 * dt);
    if (this.keys['KeyKeyA']) this.velocity.addScaledVector(right, -accel * 0.6 * dt);
    if (this.keys['KeyKeyD']) this.velocity.addScaledVector(right, accel * 0.6 * dt);
    
    if (this.keys['Space']) this.velocity.y += 32 * dt;
    if (this.keys['ShiftLeft']) this.velocity.y -= 28 * dt;
    
    // Hover bob
    this.mesh.position.y += Math.sin(this.time * 1.9) * 0.07;
    
    // Drag
    this.velocity.multiplyScalar(boosting ? 0.965 : 0.905);
    
    // Move Mesh
    this.mesh.position.addScaledVector(this.velocity, dt);
    this.mesh.position.y = Math.max(2, this.mesh.position.y);
    
    // Bank on turn
    const bankTarget = -(this.keys['KeyA'] ? 0.38 : this.keys['KeyD'] ? -0.38 : 0);
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, bankTarget, 0.11);

    if (this.model) {
      this.model.rotation.x = THREE.MathUtils.lerp(this.model.rotation.x, this.pitch, 0.1);
    }

    // Camera follow logic
    const camOffset = new THREE.Vector3(0, 3.2, 11).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.yaw, 0)));
    const camTargetPos = this.mesh.position.clone().add(camOffset);
    this.camera.position.lerp(camTargetPos, 0.10);
    this.camera.lookAt(this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)));

    this.updateHUD();
  }

  updateHUD() {
    const spdValue = Math.round(this.velocity.length() * 9);
    const altValue = Math.round(Math.max(0, this.mesh.position.y));
    
    const spdEl = document.getElementById('spd');
    const altEl = document.getElementById('alt');
    const spdBar = document.getElementById('spd-bar');
    const altBar = document.getElementById('alt-bar');
    const boostFill = document.getElementById('boost-fill');
    
    if (spdEl) spdEl.innerText = spdValue;
    if (altEl) altEl.innerText = altValue + 'm';
    if (spdBar) spdBar.style.width = Math.min(100, spdValue * 0.75) + '%';
    if (altBar) altBar.style.width = Math.min(100, altValue * 0.18) + '%';
    
    if (boostFill) {
      boostFill.style.width = (this.boostAmount * 100) + '%';
      const bc = this.boostAmount > 0.5 ? '#ff9900' : this.boostAmount > 0.2 ? '#ff5500' : '#ff1100';
      boostFill.style.background = `linear-gradient(90deg, ${bc}, ${bc}cc)`;
      boostFill.style.boxShadow = `0 0 10px ${bc}`;
    }
  }
}
