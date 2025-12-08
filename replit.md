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
- Custom username/password authentication system (replaced Replit OIDC)
- bcryptjs for secure password hashing (cost factor 10)
- Session storage in PostgreSQL for distributed deployment support
- Rate limiting: 5 failed login attempts triggers 15-minute lockout
- Secure cookies with httpOnly, sameSite: 'lax', and secure flag in production
- API Routes:
  - POST /api/auth/register - User registration
  - POST /api/auth/login - User login
  - POST /api/auth/logout - Logout (JSON response)
  - GET /api/logout - Logout with redirect
  - GET /api/auth/user - Get current user
  - POST /api/auth/set-password - Change password (requires current password)
- Hierarchical role-based access control:
  - **superadmin**: Global admin with access to all users across all companies, can permanently delete users
  - **admin**: Company-level admin, can manage users within their company (add/remove from company)
  - **user**: Standard user with project access
  - **guest**: Users without company association (new registrations start as guest)

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

**Authentication:**
- Custom username/password authentication (server/auth.ts)
- bcryptjs for password hashing
- Session-based with PostgreSQL session storage
- No external authentication provider dependencies

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

### Stage Removal from Existing Projects (Latest)
- Users can now remove stages from existing projects by unchecking them in the edit form
- New DELETE /api/stages/:id endpoint with authorization (admin, project creator, or responsible user)
- Confirmation dialog warns about permanent deletion of stage data (files, comments, tasks)
- Visual feedback: Red styling and "To remove" badge for stages marked for removal
- Summary shows count of stages to add/remove with color-coded indicators
- Database cascade deletes automatically clean up related records
- Full multi-language support (EN/RU/ZH) for all new UI elements

### Editable File Access Control
- Users can now edit file access permissions after upload for Factory Proposal stage files
- New PATCH /api/stage-files/:id endpoint to update allowedUserIds
- Authorization: Only file uploader or admin/superadmin can edit/delete files
- Edit Access button (Users icon) appears on hover for authorized users
- Delete button also now restricted to file uploader or admin/superadmin
- Access dialog shows different title/description when editing vs creating
- uploadedById always set from authenticated user, preventing forgery
- Full multi-language support (EN/RU/ZH) for all new UI elements

### Project Edit Stage Selection
- Project edit form now includes stage template selection similar to create form
- Existing stages can be unchecked to mark for removal (with confirmation dialog)
- Available templates not yet added show with blue styling and "To add" badge when selected
- New API endpoint POST /api/projects/:id/add-stages to add stages to existing projects
- Server-side duplicate prevention using Set-based filtering
- Full multi-language support (EN/RU/ZH) for all new UI elements
- Count displays show existing stages, stages to add, and stages to remove

### Custom Authentication System
- Complete migration from Replit OIDC to custom username/password authentication
- New database fields: passwordHash, emailVerified, resetToken, resetTokenExpiry
- bcryptjs for secure password hashing with cost factor 10
- Rate limiting: 5 failed login attempts triggers 15-minute lockout per email
- Secure session cookies with httpOnly, sameSite: 'lax', secure (production)
- New frontend pages: /login, /register with form validation
- Password change requires current password verification (CSRF protection)
- Full multi-language support (EN/RU/ZH) for all auth UI
- Existing Replit users can set password after logging in

### File Access Control Security
- Complete server-side enforcement of file access control for Factory Proposal stage
- /objects/* endpoint now requires database record to exist (deny-by-default security)
- allowedUserIds field on stageFiles table controls which users can access specific files
- Factory Proposal uploads require selecting users with access before upload
- Auto-includes uploader in allowedUserIds when access control is specified
- Project detail API filters files by allowedUserIds for unauthorized users
- Multi-layer protection: API filtering + download endpoint enforcement
- Full multi-language support (EN/RU/ZH) for access control UI elements

### Preset Avatar Selection
- 8 cute cat avatar presets available in Settings page
- Users can choose from generated cat avatars instead of uploading photos
- Preset avatars stored as static assets in attached_assets/generated_images/
- Avatar types: Orange, Gray, Black, White, Calico, Siamese, Cool (with sunglasses), Tuxedo
- Selection shows checkmark overlay on currently selected avatar
- Full multi-language support (EN/RU/ZH) for preset avatar UI

### User Settings Page
- New Settings page at `/settings` for user profile management
- Profile Photo section with avatar upload to object storage
- Preset avatar selection grid for quick avatar choice
- Personal Information section with editable fields:
  - First name and last name
  - Job title (new field added to users database schema)
  - Email display (read-only, managed by authentication provider)
- Password section with note explaining Replit OIDC authentication
- API endpoint `PATCH /api/users/me` for self-profile updates
- Full multi-language support (EN/RU/ZH) for all settings UI elements
- Dashboard now shows user-specific statistics (active/completed/overdue projects)
- Admin user list displays all users globally across all companies

### Project Detail Page UI Redesign
- Completely redesigned project header with:
  - Cover image from first "Render" stage (clickable to select from available render images)
  - Project name and description
  - Progress bar showing completion percentage
  - Timeline Summary card (Start Date, Est. Launch, Days Remaining)
- New stage card design:
  - Numbered position badges (1, 2, 3...)
  - Bilingual stage names (Russian primary, English secondary)
  - Checkmark icon for completed stages
  - Date range display (e.g., "Dec 4 - Dec 7")
  - Comments and attachments count icons
  - Status dropdown in card header
  - Parent-controlled Collapsible for expand/collapse
- Collapse All / Expand All buttons for bulk stage management
- Two-column layout in expanded stage: Comments (left), Attachments (right)
- Full multi-language support for new UI elements (EN/RU/ZH)
- File URL normalization: server converts GCS URLs to /objects/ format

### Project List View Enhancement
- Project cards now display:
  - Cover image thumbnail (from Render stage or coverImageId)
  - Project name next to image
  - Progress bar below name showing completion percentage
  - Responsible user name and deadline date at bottom
- API returns enhanced data including coverImage and responsibleUserName
- Skeleton loading state matches new card layout

### Visual Block-Based Template Builder
- New `blocks` JSONB column in stage_templates for storing block configurations
- TemplateBuilder component with three-column layout: palette, canvas, and preview
- 9 block types: comments, checklist, customFields, files, tasks, substages, gallery, divider, header
- Each block has: id, type, title (multi-language), config, required flag, collapsed option
- Per-block configuration forms for customizing block behavior
- Multi-language title support (EN, RU, ZH) for all block types
- Block reordering with up/down controls
- Live preview of block structure
- Admin panel uses tabs to switch between "Basic Settings" and "Block Builder"
- Full i18n translations for builder interface

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