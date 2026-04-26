# 🛸 Blade Runner 2049 | Three.js Flight Simulator

A high-fidelity, atmospheric flight simulator built with **Three.js**, **Vite**, and **Howler.js**. Explore the dystopian landscapes of LA 2049, the Protein Farms, and the ruins of Vegas in your Spinner.

![Blade Runner Aesthetic](https://raw.githubusercontent.com/SOUMILCHANDRA/Blade-Runner-2049/main/src/assets/hero.png)

## 🌌 Features

- **High-Fidelity Rendering**: Uses `ACESFilmicToneMapping`, `UnrealBloomPass`, and deep `FogExp2` to capture the signature 2049 aesthetic.
- **Procedural World Map**: 5 distinct zones with unique geometry and lighting:
  - **LA 2049**: Neon towers and constant rain.
  - **Protein Farms**: Bleak, flat industrial plains.
  - **Orange City (SD)**: Amber smog and trash mountains.
  - **Scrapyard (Vegas)**: Yellow haze and debris fields.
  - **Wallace HQ**: Massive black monolith and water features.
- **Spinner Flight Physics**: Simple, arcade-style flight with momentum, drag, hover-bob, and banking.
- **Immersive HUD**: Real-time telemetry, location tracking, and a proximity mini-map.
- **Dynamic Atmosphere**: Seamless transitions between fog colors and sky gradients as you fly between sectors.

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Thrust** | `W` (Forward) / `S` (Reverse) |
| **Yaw (Turn)** | `A` (Left) / `D` (Right) |
| **Vertical Lift** | `Space` (Up) / `Shift` (Down) |
| **Audio** | `Mouse Click` (Initialize Ambient) |

## 🛠️ Tech Stack

- **Engine**: Three.js (WebGL)
- **Bundler**: Vite
- **Audio**: Howler.js
- **Post-Processing**: EffectComposer (Bloom, ToneMapping)
- **Math**: Custom flight physics and procedural generation logic.

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SOUMILCHANDRA/Blade-Runner-2049.git
   cd Blade-Runner-2049
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

---

*“I’ve seen things you people wouldn't believe...”*
Designed by Soumil Chandra.
