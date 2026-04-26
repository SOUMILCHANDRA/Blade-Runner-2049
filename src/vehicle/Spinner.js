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
    window.addEventListener('keydown', (e) => this.onKey(e.code.toLowerCase(), true));
    window.addEventListener('keyup', (e) => this.onKey(e.code.toLowerCase(), false));
  }

  onKey(code, pressed) {
    if (code === 'keyw') this.keys.w = pressed;
    if (code === 'keys') this.keys.s = pressed;
    if (code === 'keya') this.keys.a = pressed;
    if (code === 'keyd') this.keys.d = pressed;
    if (code === 'space') this.keys.space = pressed;
    if (code === 'shiftleft') this.keys.shift = pressed;
  }

  update(dt) {
    if (!dt) return;
    this.time += dt;

    // Movement directions
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.mesh.quaternion);
    
    // Forces from input
    const thrust = this.keys.w ? 1 : this.keys.s ? -0.3 : 0;
    const lift = this.keys.space ? 1 : this.keys.shift ? -1 : 0;
    
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
    
    // Turn logic
    if (this.keys.a) this.mesh.rotation.y += 2 * dt;
    if (this.keys.d) this.mesh.rotation.y -= 2 * dt;

    // Bank on turn (based on horizontal velocity in local space or just turn input)
    // Using velocity.x relative to forward direction is complex, 
    // let's stick to the requested logic: -this.velocity.x * 0.04
    // But velocity is world-space. Let's convert a bit or use turn input for banking.
    const localVelocity = this.velocity.clone().applyQuaternion(this.mesh.quaternion.clone().invert());
    this.mesh.rotation.z = -localVelocity.x * 0.05;

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
