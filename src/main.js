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

const QUALITY_PRESETS = {
  low:    { bloom: false, shadows: false, fog: true,  particles: 500,  label: 'LOW' },
  medium: { bloom: true,  shadows: false, fog: true,  particles: 2000, label: 'MEDIUM' },
  high:   { bloom: true,  shadows: true,  fog: true,  particles: 5000, label: 'HIGH' },
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.currentQuality = 'high';
    this.clock = new THREE.Clock();
    
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
      this.initPostProcessing(); // Rebuild stack
      this.renderer.shadowMap.enabled = QUALITY_PRESETS[q].shadows;
      
      // Update existing cities if they exist
      if (this.zoneManager) {
        this.zoneManager.cityInstances.forEach(ci => {
          ci.city.setQuality(QUALITY_PRESETS[q]);
        });
      }
    };
  }

  applyQualityButtons() {
    const buttons = document.querySelectorAll('.setting-buttons button');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.innerText.toLowerCase() === this.currentQuality) {
        btn.classList.add('active');
      }
    });
  }

  init() {
    const q = QUALITY_PRESETS[this.currentQuality];

    // Renderer setup
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;

    // Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(0x0a0510, 0.003);
    this.renderer.setClearColor(this.scene.fog.color);

    // Lights
    this.hemiLight = new THREE.HemisphereLight(0x0a0510, 0x1a0a00, 0.3);
    this.scene.add(this.hemiLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    this.scene.add(ambientLight);

    // Procedural Sky
    this.initSky();

    // Systems
    this.zoneManager = new ZoneManager(this.scene, this.renderer, this.hemiLight, this.sky, this.vfx);
    this.spinner = new Spinner(this.scene, this.camera);
    this.vfx = new VFX(this.scene);

    // Audio
    this.initAudio();

    // Post-processing
    this.initPostProcessing();

    // Start loop
    this.animate();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Fade out loading screen
    setTimeout(() => {
      document.getElementById('loading-screen').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
      }, 1000);
    }, 4000); // Slightly longer for selection
  }

  initPostProcessing() {
    const q = QUALITY_PRESETS[this.currentQuality];
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    
    if (q.bloom) {
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.8, 0.3, 0.85);
      this.composer.addPass(bloomPass);
    }
    
    const filmPass = new FilmPass(0.15, 0.025, 648, false);
    this.composer.addPass(filmPass);
    
    this.chromaticAberration = new ShaderPass(RGBShiftShader);
    this.chromaticAberration.uniforms['amount'].value = 0.0015;
    this.composer.addPass(this.chromaticAberration);
  }

  initSky() {
    const skyGeo = new THREE.SphereGeometry(2500, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0510) },
        bottomColor: { value: new THREE.Color(0x1a0a00) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });

    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);
  }

  initAudio() {
    this.ambientDrone = new Howl({
      src: ['https://assets.mixkit.co/sfx/preview/mixkit-deep-sci-fi-drone-1632.mp3'],
      loop: true,
      volume: 0.5,
      autoplay: false
    });

    window.addEventListener('mousedown', () => {
      if (!this.ambientDrone.playing()) {
        this.ambientDrone.play();
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

    const dt = this.clock.getDelta();

    if (this.spinner) this.spinner.update(dt);
    if (this.vfx) this.vfx.update(this.spinner.mesh.position);
    if (this.zoneManager) this.zoneManager.update(this.spinner.mesh.position, dt);
    
    if (this.sky) {
      this.sky.position.copy(this.camera.position);
    }
    
    this.composer.render();
  }
}

new Game();
