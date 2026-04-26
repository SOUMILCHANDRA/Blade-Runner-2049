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
    this.boostAmount = 100;
    this.time = 0;

    this.keys = {
      w: false, s: false, a: false, d: false, 
      space: false, shift: false
    };

    this.loadModel();
    this.initControls();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load('/spinner.glb', (gltf) => {
      this.model = gltf.scene;
      
      // Auto-scale and rotate if necessary
      this.model.scale.set(0.5, 0.5, 0.5);
      this.model.rotation.y = Math.PI; // Face forward
      
      this.mesh.add(this.model);
      
      // Add glowing lights to the model if they exist in materials
      this.model.traverse(node => {
        if (node.isMesh && node.material) {
          node.castShadow = true;
          node.receiveShadow = true;
          // Enhancing emissive materials for bloom
          if (node.material.emissiveIntensity !== undefined) {
            node.material.emissiveIntensity = 5;
          }
        }
      });
    }, undefined, (error) => {
      console.error('Error loading spinner model:', error);
      this.createFallbackModel();
    });

    this.scene.add(this.mesh);
  }

  createFallbackModel() {
    const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);
  }

  initControls() {
    window.addEventListener('keydown', e => this.keys[e.code] = true);
    window.addEventListener('keyup', e => this.keys[e.code] = false);

    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', () => canvas.requestPointerLock());

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * 0.002;
        this.pitch -= e.movementY * 0.002;
        this.pitch = Math.max(-0.4, Math.min(0.4, this.pitch));
      }
    });
  }

  update(dt) {
    if (!dt) return;
    this.time += dt;

    // Apply rotation from mouse
    this.mesh.rotation.y = this.yaw;
    
    // Forward direction based on current yaw
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.mesh.quaternion);
    
    // Forces from input
    const thrust = this.keys['KeyW'] ? 1 : this.keys['KeyS'] ? -0.3 : 0;
    const lift = this.keys['Space'] ? 1 : this.keys['ShiftLeft'] ? -1 : 0;
    
    // Apply Forces
    // Speed constant 40 as requested
    this.velocity.add(forward.multiplyScalar(thrust * 40 * dt));
    this.velocity.y += lift * 20 * dt;
    
    // Hover bob (always present)
    this.mesh.position.y += Math.sin(this.time * 2) * 0.05;
    
    // Drag (air resistance feel)
    this.velocity.multiplyScalar(0.92);
    
    // Move Mesh
    this.mesh.position.addScaledVector(this.velocity, dt);
    
    // Bank on turn (based on mouse movement speed)
    const bankTarget = -this.velocity.clone().applyQuaternion(this.mesh.quaternion.clone().invert()).x * 0.05;
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, bankTarget, 0.1);

    // Apply Pitch to model
    if (this.model) {
      this.model.rotation.x = THREE.MathUtils.lerp(this.model.rotation.x, this.pitch, 0.1);
    }

    // Camera follow logic
    const camOffset = new THREE.Vector3(0, 2, 8);
    camOffset.applyQuaternion(this.mesh.quaternion);
    const camTargetPos = this.mesh.position.clone().add(camOffset);
    this.camera.position.lerp(camTargetPos, 0.1);
    this.camera.lookAt(this.mesh.position);

    // Update HUD
    const speedKmH = Math.round(this.velocity.length() * 100);
    const altM = Math.round(this.mesh.position.y + 100);
    if (document.getElementById('speed')) document.getElementById('speed').innerText = `SPD: ${speedKmH}`;
    if (document.getElementById('altitude')) document.getElementById('altitude').innerText = `ALT: ${altM}m`;
    if (document.getElementById('boost-bar')) document.getElementById('boost-bar').style.width = `${this.boostAmount}%`;
  }
}
