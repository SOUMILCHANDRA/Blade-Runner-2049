import * as THREE from 'three';

export class Spinner {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.mesh = new THREE.Group();

    // Physics/Movement properties
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.friction = 0.98;
    this.speed = 0.5;
    this.maxSpeed = 2.0;
    this.turnSpeed = 0.02;
    this.banking = 0;
    this.maxBanking = 0.5;
    this.boostAmount = 100;

    this.keys = {
      w: false, s: false, a: false, d: false, 
      q: false, e: false, shift: false
    };

    this.createModel();
    this.initControls();
  }

  createModel() {
    // Brutalist Spinner Body
    const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);

    // Cockpit / Glass
    const glassGeo = new THREE.BoxGeometry(1.6, 0.4, 1.5);
    const glassMat = new THREE.MeshStandardMaterial({ 
      color: 0x003344,
      emissive: 0x001122,
      transparent: true,
      opacity: 0.7
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 0.4, 0.5);
    this.mesh.add(glass);

    // Engines / Thrusters (Glowing)
    const thrusterGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 5
    });

    const tLeft = new THREE.Mesh(thrusterGeo, thrusterMat);
    tLeft.position.set(-0.8, -0.2, -2);
    this.mesh.add(tLeft);

    const tRight = new THREE.Mesh(thrusterGeo, thrusterMat);
    tRight.position.set(0.8, -0.2, -2);
    this.mesh.add(tRight);

    // Bottom Hover Lights
    const hoverLightGeo = new THREE.CircleGeometry(0.3, 16);
    const hoverLightMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    
    const h1 = new THREE.Mesh(hoverLightGeo, hoverLightMat);
    h1.rotation.x = Math.PI / 2;
    h1.position.set(0.8, -0.41, 1.5);
    this.mesh.add(h1);

    const h2 = h1.clone();
    h2.position.set(-0.8, -0.41, 1.5);
    this.mesh.add(h2);

    this.scene.add(this.mesh);
  }

  initControls() {
    window.addEventListener('keydown', (e) => this.onKey(e.key.toLowerCase(), true));
    window.addEventListener('keyup', (e) => this.onKey(e.key.toLowerCase(), false));
  }

  onKey(key, pressed) {
    if (key === 'w') this.keys.w = pressed;
    if (key === 's') this.keys.s = pressed;
    if (key === 'a') this.keys.a = pressed;
    if (key === 'd') this.keys.d = pressed;
    if (key === 'q') this.keys.q = pressed;
    if (key === 'e') this.keys.e = pressed;
    if (key === 'shift') this.keys.shift = pressed;
  }

  update() {
    // Apply Acceleration
    const moveDir = new THREE.Vector3();
    this.mesh.getWorldDirection(moveDir);

    if (this.keys.w) this.velocity.addScaledVector(moveDir, this.speed);
    if (this.keys.s) this.velocity.addScaledVector(moveDir, -this.speed);

    // Turning & Banking
    if (this.keys.a) {
      this.mesh.rotation.y += this.turnSpeed;
      this.banking = Math.min(this.banking + 0.05, this.maxBanking);
    } else if (this.keys.d) {
      this.mesh.rotation.y -= this.turnSpeed;
      this.banking = Math.max(this.banking - 0.05, -this.maxBanking);
    } else {
      this.banking *= 0.9;
    }

    // Vertical movement
    if (this.keys.q) this.velocity.y += this.speed * 0.5;
    if (this.keys.e) this.velocity.y -= this.speed * 0.5;

    // Boost Logic
    let currentMaxSpeed = this.maxSpeed;
    if (this.keys.shift && this.boostAmount > 0) {
      currentMaxSpeed *= 2.5;
      this.velocity.addScaledVector(moveDir, this.speed * 1.5);
      this.boostAmount -= 1.0;
    } else {
      this.boostAmount = Math.min(this.boostAmount + 0.2, 100);
    }

    // Cap speed
    if (this.velocity.length() > currentMaxSpeed) {
      this.velocity.setLength(currentMaxSpeed);
    }

    // Apply friction & velocity
    this.velocity.multiplyScalar(this.friction);
    this.mesh.position.add(this.velocity);

    // Apply banking tilt
    this.mesh.rotation.z = this.banking;

    // Hover Bob Effect
    this.mesh.position.y += Math.sin(Date.now() * 0.002) * 0.02;

    // Camera follow logic
    const camOffset = new THREE.Vector3(0, 2, 8);
    camOffset.applyQuaternion(this.mesh.quaternion);
    const camTargetPos = this.mesh.position.clone().add(camOffset);
    this.camera.position.lerp(camTargetPos, 0.1);
    this.camera.lookAt(this.mesh.position);

    // Update HUD
    const speedKmH = Math.round(this.velocity.length() * 100);
    const altM = Math.round(this.mesh.position.y + 100);
    document.getElementById('speed-value').innerText = speedKmH;
    document.getElementById('alt-value').innerText = altM;
    document.getElementById('boost-bar').style.width = `${this.boostAmount}%`;
  }
}
