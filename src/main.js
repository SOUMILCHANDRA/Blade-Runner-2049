import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Spinner } from './vehicle/Spinner.js';
import { ZoneManager } from './world/ZoneManager.js';
import { VFX } from './systems/VFX.js';
import { Howl } from 'howler';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.init();
  }

  init() {
    // Renderer setup
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 1.5;

    // Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(0x050508, 0.001);
    this.renderer.setClearColor(this.scene.fog.color);

    // Systems
    this.zoneManager = new ZoneManager(this.scene, this.renderer);
    this.spinner = new Spinner(this.scene, this.camera);
    this.vfx = new VFX(this.scene);

    // Audio
    this.initAudio();

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, // Strength
      0.4, // Radius
      0.85 // Threshold
    );
    this.composer.addPass(bloomPass);

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
    }, 3000);
  }

  initAudio() {
    // Placeholder for ambient drone
    this.ambientDrone = new Howl({
      src: ['https://assets.mixkit.co/sfx/preview/mixkit-deep-sci-fi-drone-1632.mp3'], // Placeholder
      loop: true,
      volume: 0.5,
      autoplay: false // Browser policies require user interaction
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

    if (this.spinner) this.spinner.update();
    if (this.vfx) this.vfx.update(this.spinner.mesh.position);
    if (this.zoneManager) this.zoneManager.update(this.spinner.mesh.position);
    
    this.composer.render();
  }
}

new Game();
