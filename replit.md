# LaunchFlow - Product Launch Management Platform

## Overview

LaunchFlow is a comprehensive SaaS platform for managing product launch workflows with multi-user collaboration, project stages, file management, and automated notifications. The application enables teams to streamline product launches through visual timeline tracking, deadline management, and centralized communication across all launch stages.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18+ with TypeScript for type safety and modern component patterns
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing

**UI Component Strategy:**
- Radix UI primitives for accessible, unstyled components (dialogs, dropdowns, popovers, etc.)
- shadcn/ui component system following the "New York" style variant
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for type-safe component variants
- Design system inspired by Linear, Asana, and Notion focusing on clarity and information density

**State Management:**
- TanStack Query (React Query) for server state management, caching, and synchronization
- React Hook Form with Zod for form state and validation
- Local component state via React hooks for UI-specific concerns

**Internationalization:**
- i18next with react-i18next for multi-language support (English, Russian, Chinese)
- Translation keys organized by feature domain (nav, dashboard, auth, etc.)
- Language persistence in localStorage

**File Upload Strategy:**
- Uppy with AWS S3 integration for file uploads
- Dashboard modal UI for user-friendly upload experience
- Direct-to-cloud upload pattern reducing server load

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and REST API endpoints
- TypeScript throughout for type consistency with frontend
- Session-based authentication using express-session

**API Design Pattern:**
- RESTful endpoints under `/api` namespace
- Resource-oriented URL structure (e.g., `/api/projects/:id`)
- JSON request/response format
- Request logging middleware for debugging and monitoring

**Authentication & Authorization:**
- Replit OIDC (OpenID Connect) for authentication
- Passport.js with OpenID Client strategy
- Session storage in PostgreSQL for distributed deployment support
- User claims stored in session for quick access
- Role-based access control (guest, user, admin)

**Build & Deployment:**
- esbuild for fast server-side bundling
- Selective dependency bundling to reduce cold start times
- Separate client and server builds with optimized output

### Data Storage

**Database:**
- PostgreSQL as the primary relational database
- Neon serverless PostgreSQL with WebSocket connection pooling
- Drizzle ORM for type-safe database queries and schema management
- Schema-first approach with TypeScript inference

**Database Schema Design:**
- Companies table as the multi-tenancy root
- Users with company association and role-based permissions
- Projects as the main workflow container
- Products linked to projects for inventory tracking
- Stage templates for reusable workflow definitions
- Stages as project-specific instances of templates
- Tasks with user assignment and completion tracking
- Stage files for document management
- Comments for collaboration
- Deadline and status history for audit trail
- Session storage table for authentication state

**Object Storage:**
- Google Cloud Storage integration via Replit's sidecar service
- External account authentication using workload identity
- Custom ACL (Access Control List) system for fine-grained permissions
- Public vs. private object visibility controls
- Object metadata for policy enforcement

**Storage Service Pattern:**
- Repository pattern with `IStorage` interface defining all data operations
- Single storage implementation providing consistent data access
- Type-safe entity definitions shared between client and server
- Complex queries return denormalized data structures (e.g., `ProjectWithRelations`)

### External Dependencies

**Cloud Services:**
- Google Cloud Storage for file and object storage
- Replit infrastructure for deployment, authentication, and service mesh
- Neon for managed PostgreSQL hosting

**Authentication Provider:**
- Replit OIDC for SSO and user identity
- Token refresh and session management
- Profile information (email, name, profile image) from identity provider

**Development Tools:**
- Replit-specific Vite plugins (runtime error overlay, cartographer, dev banner)
- Drizzle Kit for database migrations and schema updates
- PostCSS with Tailwind and Autoprefixer

**Third-party Libraries:**
- UI: Radix UI primitives, Lucide icons
- Forms: React Hook Form, Hookform Resolvers, Zod validation
- File uploads: Uppy core, AWS S3 plugin, Dashboard plugin
- Utilities: date-fns, nanoid, clsx, tailwind-merge

**Design System:**
- Inter font family from Google Fonts
- Custom CSS variables for theming (light/dark mode support)
- Consistent spacing scale (2, 4, 6, 8, 12, 16)
- Border radius tokens (sm: 3px, md: 6px, lg: 9px)
- Elevation system using subtle shadows and overlays

## Recent Changes

### Custom Fields for Stage Templates
- Stage templates now support custom fields (text, textarea, number types)
- Custom fields are defined at the template level and stored in customFields JSONB column
- Stage instances store field values in customFieldsData JSONB column
- Admin panel supports adding, editing, reordering, and removing custom fields

### Admin Panel Enhancements
- Template activation/deactivation with isActive toggle
- Drag-and-drop style reordering of stage templates with position controls
- Custom field management with multi-language labels (EN, RU, ZH)
- Visual indicators for inactive templates and field counts

### Checklist Improvements
- Per-checklist-item file uploads with accepted file type filtering
- File preview icons based on MIME type (image, video, PDF, CAD files)
- Progress tracking for checklist completion
- Conditional certification substages with toggle control

### File Management
- Checklist-item association for uploaded files via checklistItemKey
- Stage-specific file type restrictions (images for Render, STEP for 3D Model)
- Mini preview icons in file listings