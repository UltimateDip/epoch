# Performant Timetable - Architecture V3

A high-performance, local-first timetable application built with **React**, **Vite**, and a **Hardened Zero-Dependency Node.js** backend.

## ✨ Features
- **Modern UI**: Dark-mode glassmorphism with Inter, Outfit, and Roboto Mono typography.
- **Dual View**: High-fidelity Table schedule + Card-based Admin management list.
- **Resilient Backend**: Zero-dependency `server.js` with atomic file operations and HTML sanitization.
- **SSE Heartbeat**: Real-time server lifecycle management using Server-Sent Events.
- **macOS Integration**: Silently launched via AppleScript with dynamic port allocation.

## 🚀 Getting Started

### Local Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   cd timetable-ui && npm install
   ```
3. Start the backend:
   ```bash
   node server.js
   ```
4. Start the Vite dev server:
   ```bash
   cd timetable-ui && npm run dev
   ```

### Production Build
To update the project assets:
```bash
cd timetable-ui && npm run build
```

## 🔒 Security & Persistence
- Data is stored in `timetable.json`.
- All writes are atomic: `timetable.tmp.json` -> `timetable.json` (via native `fs.rename`).
- Directives are sanitized to prevent scripting injection.

## 📁 Repository Structure
- `server.js`: The hardened Node orchestrator.
- `timetable-ui/`: Source code for the React frontend.
- `timetable.json`: The local persistent database (Git ignored by default).
- `Timetable.app`: macOS AppleScript launcher bundle.

---
*Created for the Architecture of Performance.*
