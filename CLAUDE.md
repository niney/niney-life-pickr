# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Niney Life Pickr is a life decision-making application being built as a multi-platform solution. Currently implementing the web application with React + Vite + TypeScript, with plans for React Native mobile app and dual backend services (Node.js "friendly" and Python "smart" servers).

## Architecture

### Current Structure
```
niney-life-pickr/
├── apps/
│   └── web/                    # React + Vite PWA application
│       ├── src/
│       │   ├── components/     # Reusable UI components
│       │   ├── pages/          # Page components (Home.tsx)
│       │   ├── hooks/          # Custom React hooks
│       │   ├── services/       # API services
│       │   ├── utils/          # Utility functions
│       │   └── types/          # TypeScript type definitions
│       └── public/             # Static assets
```

### Planned Architecture
- **apps/mobile**: React Native CLI project (not Expo)
- **servers/friendly**: Node.js backend service
- **servers/smart**: Python backend with ML/AI capabilities
- **packages/**: Shared code between applications

## Key Commands

### Web Application Development
```bash
cd apps/web
npm run dev        # Start development server (currently on port 5174)
npm run build      # Build for production with TypeScript checking
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

## Technology Stack

### Web Application
- **React 19.1.1** with TypeScript 5.8.3
- **Vite 7.1.2** for fast development and building
- **Tailwind CSS v4.1.13** with @tailwindcss/postcss for styling
- **PWA Support** via vite-plugin-pwa with auto-update and offline capabilities
- **PostCSS** configuration using @tailwindcss/postcss plugin

## Configuration Details

### Tailwind CSS v4 Setup
- Uses `@import "tailwindcss";` syntax (v4 requirement)
- PostCSS configured with `@tailwindcss/postcss` plugin
- Content paths configured for all TypeScript/TSX files

### PWA Configuration
- Auto-update registration type
- Service worker with Workbox for offline support
- Manifest configured with app name "Niney Life Pickr"
- Caching strategies for static assets and Google Fonts

## Development Notes

### Current Implementation
- Home page with counter demo and navigation placeholders
- Tailwind CSS with gradient backgrounds and responsive design
- Folder structure prepared for scalable development

### Communication Pattern (Planned)
- Node.js "friendly" server will act as API gateway
- Python "smart" server will handle ML/AI processing
- Inter-service communication via HTTP/REST or gRPC