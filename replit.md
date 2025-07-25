# SecureChat - Disposable E2EE Chat Application

## Overview

SecureChat is a fully functional, WhatsApp-style secure chat application with real-time messaging and end-to-end encryption. Users can create disposable chat links and communicate securely without any registration or persistent data storage. The application features a beautiful dark theme, responsive design, and complete E2EE implementation using libsodium.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 25, 2025)

✓ Successfully migrated project from Replit Agent to standard Replit environment
✓ Implemented Vercel-inspired black and white theme design
✓ Updated UI components to use minimal, clean design system
✓ Converted to pure black background with white text for enhanced contrast
✓ Replaced colorful gradients with sophisticated monochrome styling
✓ Updated navigation, hero section, and feature cards with Vercel aesthetic
✓ Maintained full functionality while improving visual design
✓ All security features and E2EE implementation preserved
✓ Project runs cleanly with proper client/server separation
✓ Verified compatibility with Replit deployment system

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and dark theme
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **PWA Support**: Service worker and manifest for progressive web app capabilities

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL-based session storage
- **API Design**: RESTful endpoints with JSON communication
- **Real-time Communication**: Socket.IO for WebSocket connections
- **WebRTC Signaling**: Peer-to-peer connection establishment for video calls

## Key Components

### Database Layer
- **Schema**: Single `chat_links` table with auto-incrementing ID, unique chat ID, and timestamp
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Automated schema management with Drizzle Kit
- **Validation**: Zod schemas for runtime type checking and validation

### Authentication & Security
- **No User Authentication**: Designed for anonymous, disposable conversations
- **Secure Chat IDs**: Cryptographically secure random identifiers (32-character hex)
- **Session Management**: Express sessions with PostgreSQL storage

### Frontend Components
- **Design System**: Comprehensive UI component library with consistent styling
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Toast Notifications**: User feedback system for actions and errors
- **Loading States**: Proper loading indicators and error handling

### API Endpoints
- `POST /api/chat-links`: Create new chat link with secure random ID
- `GET /api/chat-links/:chatId`: Retrieve chat link information

## Data Flow

1. **Chat Link Creation**: User requests new chat → Generate secure random ID → Store in database → Return shareable link
2. **Chat Access**: User visits chat link → Validate chat ID → Load chat interface or show error
3. **Link Sharing**: Native Web Share API on mobile devices, clipboard fallback for desktop

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Router (Wouter)
- **Build Tools**: Vite, TypeScript, ESBuild for production builds
- **UI Framework**: Radix UI primitives, Tailwind CSS, shadcn/ui components

### Backend Dependencies
- **Server**: Express.js with TypeScript support via tsx
- **Database**: Drizzle ORM, Neon Database serverless driver, PostgreSQL session store
- **Utilities**: Zod for validation, crypto for secure random generation

### Development Tools
- **Replit Integration**: Specialized plugins for Replit development environment
- **Error Handling**: Runtime error overlay for development
- **Code Analysis**: Cartographer plugin for code exploration

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite dev server with HMR for frontend
- **Server**: tsx for TypeScript execution with automatic restarts
- **Database**: Environment-based configuration with fallback error handling

### Production Build
- **Frontend**: Vite production build with optimizations
- **Backend**: ESBuild bundling for Node.js deployment
- **Assets**: Static file serving integrated with Express
- **Environment**: Production-specific configurations and optimizations

### Database Management
- **Schema Deployment**: `db:push` command for schema synchronization
- **Migrations**: Automated migration generation and application
- **Connection**: Environment variable-based database URL configuration

### Key Architectural Decisions

1. **Disposable Design**: No user accounts or persistent chat history to prioritize privacy
2. **Serverless Database**: Neon Database chosen for scalability and reduced infrastructure management
3. **Type Safety**: Full TypeScript implementation with shared schemas between client and server
4. **Mobile-First**: PWA capabilities and native sharing for optimal mobile experience
5. **Security Focus**: Cryptographically secure chat IDs and minimal data collection