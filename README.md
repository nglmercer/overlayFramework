# 🚀 Overlay Framework (Bun + Lit + Vite)

A modern, high-performance OBS/Streaming Overlay framework built with **Bun**, **Lit (Web Components)**, and **Vite**.

## ✨ Key Features

- **Bun Native**: Leveraging Bun for ultra-fast serving, hot reloading, and binary compilation.
- **Lit Core**: Efficient, shadow-dom powered web components for overlays.
- **Standalone Runtime**: Compile your entire frontend + backend into a **single cross-platform executable**.
- **WebSocket Driven**: Real-time communication between the control dashboard and overlays.

---

## 🛠️ Development

### Prerequisites

- [Bun](https://bun.sh) (Recommended) or Node.js

### Setup

```bash
# Install dependencies
bun install

# Run Frontend (Vite) on port 3001
bun run dev

# Run Backend Server on port 3001
bun run start
```

---

## 🏗️ Building & Deployment

The framework includes a custom build system to overcome the current Bun limitation (Issue #5445) regarding embedding static directories.

### Create a Standalone Binary

To compile the entire project (Frontend assets + Backend logic) into a single executable file:

```bash
bun run build:standalone
```

This will:

1.  **Vite Build**: Compile the frontend into `/dist`.
2.  **Asset Embedding**: Convert all files in `/dist` into a binary TypeScript mapping.
3.  **Bun Compile**: Bundle the backend server with the embedded assets into a single binary named `overlay-server`.

### Running the Binary

You can move `overlay-server` to any machine and run it without installing Node/Bun or copying the `dist` folder:

```bash
./overlay-server
# Or with a custom port
PORT=4000 ./overlay-server
```

---

## 🏗️ Architecture

- **`/src`**: Frontend source code (Lit components).
- **`/public`**: Static assets for dev mode.
- **`/backend`**: Bun server logic and API routes.
- **`/scripts`**: Build and automation utilities.

---

## 📖 FAQ: Static Assets in Bun

Currently, Bun's `--compile` flag does not natively support including directories. We solve this using a custom "aggregator" script in `scripts/embed-assets.ts` that provides a Virtual File System layer within the compiled binary.
