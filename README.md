# Pirate Sea Dash 3D — Feature Expansion v4

A high-performance, polished 3D browser game built with Three.js. This version features significant gameplay expansions including bosses, power-ups, and a wider movement area.

## New in v4 (Expansion Pack)
- 🗺️ **Expanded Movement**: Playable area increased from 3 to 5 lanes for a "massive" movement feel.
- ☠️ **Boss System**: Encounter powerful bosses every 500m. Features boss health bars and AI movement.
- ⚡ **Power-up System**:
    - `⚡ Rapid Fire`: Increases shooting speed.
    - `🛡️ Shield`: Absorbs one hit.
    - `🧲 Magnet`: Pulls treasure automatically.
    - `🚀 Giant Ship`: Massively increases ship scale and grant extra health.
- 🎵 **Background Music**: Original pirate-themed soundtrack by Alec Koff.
- 🛠️ **Optimized HUD**: New power-up timers, boss health bars, and premium parchment-themed UI.

## How to run

1. Open PowerShell in the project folder.
2. Start the local server:
   `node server.js`
3. Open your browser and go to:
   `http://localhost:5500/`

If port `5500` is busy, the server now auto-tries `5501`, `5502`, etc.

## Controls

- **Move**: `Arrow Keys` or `WASD` (supports 5 lanes)
- **Shoot**: `Space`
- **Pause/Resume**: `Esc`
- **Mobile**: On-screen touch move + fire buttons

## Project Structure
- `assets/`: Textures and preview images.
- `info/`: Licenses and documentation.
- `Models/`: 3D GLB models.
- `soundeffects/`: SFX and background music.
- `vendor/`: Core engine libraries.
