import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import { Spinner } from './vehicle/Spinner.js';
import { ZoneManager } from './world/ZoneManager.js';
import { VFX } from './systems/VFX.js';
import { Howl } from 'howler';
import * as TWEEN from '@tweenjs/tween.js';

const QUALITY_PRESETS = {
  low:    { bloom: false, shadows: false, fog: true,  particles: 500,  label: 'LOW' },
  medium: { bloom: true,  shadows: false, fog: true,  particles: 2000, label: 'MEDIUM' },
  high:   { bloom: true,  shadows: true,  fog: true,  particles: 5000, label: 'HIGH' },
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 6000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.currentQuality = 'high';
    this.clock = new THREE.Clock();
    this.gameActive = false;
    this.elapsed = 0;
    
    this.autoDetectQuality();
    this.init();
    this.setupGlobals();
  }

  autoDetectQuality() {
    const maxSize = this.renderer.capabilities.maxTextureSize;
    if (maxSize < 8192) {
      this.currentQuality = 'medium';
      const msg = document.getElementById('auto-detect-msg');
      if (msg) msg.innerText = `HARDWARE LIMIT DETECTED (${maxSize}px). AUTO-SWITCHED TO MEDIUM.`;
    }
    this.applyQualityButtons();
  }

  setupGlobals() {
    window.setQuality = (q) => {
      this.currentQuality = q;
      this.applyQualityButtons();
      this.initPostProcessing();
      this.renderer.shadowMap.enabled = QUALITY_PRESETS[q].shadows;
      
      if (this.zoneManager) {
        this.zoneManager.cityInstances.forEach(ci => {
          ci.city.setQuality(QUALITY_PRESETS[q]);
        });
      }
    };

    window.startGame = () => {
      this.gameActive = true;
      if (this.spinner) {
        this.spinner.mesh.position.set(0, 80, 0);
        this.spinner.velocity.set(0, 0, 0);
        this.spinner.yaw = 0;
        this.spinner.pitch = 0;
      }
      
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'block';

      const ld = document.getElementById('loading');
      if (ld) {
        ld.style.opacity = '0';
        setTimeout(() => ld.style.display = 'none', 1200);
      }
      
      if (this.canvas.requestPointerLock) {
        this.canvas.requestPointerLock();
      }
    };
  }

  applyQualityButtons() {
    const buttons = document.querySelectorAll('.qbtn');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.innerText.toLowerCase() === this.currentQuality) {
        btn.classList.add('active');
      }
    });
  }

  init() {
    const q = QUALITY_PRESETS[this.currentQuality];

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;

    this.scene.fog = new THREE.FogExp2(0x0a0515, 0.0035);
    this.renderer.setClearColor(this.scene.fog.color);

    // Boosted ambient and hemi lighting for better building visibility
    this.hemiLight = new THREE.HemisphereLight(0x0a0520, 0x050208, 0.6);
    this.scene.add(this.hemiLight);

    const ambientLight = new THREE.AmbientLight(0x030310, 1.5);
    this.scene.add(ambientLight);

    // City center glow
    this.cityGlow = new THREE.PointLight(0xff1155, 5, 3000);
    this.cityGlow.position.set(0, -200, 0);
    this.scene.add(this.cityGlow);

    this.initSky();

    this.vfx = new VFX(this.scene);
    this.zoneManager = new ZoneManager(this.scene, this.renderer, this.hemiLight, this.sky, this.vfx);
    this.spinner = new Spinner(this.scene, this.camera);

    this.initAudio();
    this.initPostProcessing();

    this.animate();

    window.addEventListener('resize', () => this.onResize());

    // Update loading screen text
    const MSGS = ['INITIALIZING SPINNER SYSTEMS...', 'CALIBRATING THRUSTER ARRAY...', 'LOADING ZONE DATA...', 'SYNCING VOIGHT-KAMPFF INTERFACE...', 'READY — CLICK ENGAGE TO LAUNCH'];
    let mi = 0;
    const statusEl = document.getElementById('loading-status');
    const msgTmr = setInterval(() => {
      if (mi < MSGS.length - 1) {
        if (statusEl) statusEl.textContent = MSGS[++mi];
      } else {
        clearInterval(msgTmr);
      }
    }, 700);
  }

  initPostProcessing() {
    const q = QUALITY_PRESETS[this.currentQuality];
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    
    if (q.bloom) {
      // Stronger bloom for neon "pop"
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.2, 0.4, 0.85);
      this.composer.addPass(bloomPass);
    }
    
    const filmPass = new FilmPass(0.15, 0.025, 648, false);
    this.composer.addPass(filmPass);
    
    this.chromaticAberration = new ShaderPass(RGBShiftShader);
    this.chromaticAberration.uniforms['amount'].value = 0.0015;
    this.composer.addPass(this.chromaticAberration);
  }

  initSky() {
    const skyGeo = new THREE.SphereGeometry(4500, 16, 16);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x000003, side: THREE.BackSide });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);
  }

  initAudio() {
    this.engineSound = new Howl({
      src: ['https://assets.mixkit.co/sfx/preview/mixkit-small-plane-engine-loop-2511.mp3'],
      loop: true,
      volume: 0.3,
      autoplay: false
    });

    window.addEventListener('mousedown', () => {
      if (this.gameActive) {
        if (this.engineSound && !this.engineSound.playing()) this.engineSound.play();
        if (this.zoneManager) this.zoneManager.startInitialAudio();
      }
    }, { once: true });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    if (!this.gameActive) {
      this.camera.position.set(Math.sin(this.elapsed * 0.08) * 160, 55 + Math.sin(this.elapsed * 0.05) * 10, Math.cos(this.elapsed * 0.08) * 160);
      this.camera.lookAt(0, 40, 0);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.spinner) this.spinner.update(dt);
    if (this.zoneManager) this.zoneManager.update(this.spinner.mesh.position, this.spinner.yaw, dt);
    if (this.vfx) this.vfx.update(this.spinner.mesh.position);
    
    if (this.engineSound && this.engineSound.playing() && this.spinner) {
      const speed = this.spinner.velocity.length();
      this.engineSound.rate(1.0 + (speed / 100));
    }
    
    TWEEN.update(this.elapsed * 1000);
    this.composer.render();
  }
}

new Game();
