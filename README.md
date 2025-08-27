# ComfyUI-GPU-Monitor

A super-slim GPU monitor for ComfyUI that blends into the top-right toolbar.  
Shows **GPU**, **VRAM**, **°C**, and **W** using tiny vertical bars with fixed-width values (panel never jumps).

https://github.com/HakanAdil/ComfyUI-GPU-Monitor

## Features
- Toolbar-style UI (chip label + tiny bar + value)
- Dynamic bars with threshold colors
- Draggable from a small right-side grip **⋮** (position persists via localStorage)
- No keyboard shortcuts; lightweight (one frontend file + one `/gpu` endpoint)

## Installation

### A) Via ComfyUI-Manager (recommended)
1. Open **ComfyUI-Manager** → **Custom Nodes** → **Install from URL**  
2. Paste: `https://github.com/<your-user>/ComfyUI-GPU-Monitor.git`  
3. Restart ComfyUI

### B) Manual
```bash
cd <Your ComfyUI folder>/custom_nodes
git clone https://github.com/<your-user>/ComfyUI-GPU-Monitor.git
# Optional:
# <path-to-comfyui-venv>/python -m pip install -r ComfyUI-GPU-Monitor/requirements.txt
# Restart ComfyUI
