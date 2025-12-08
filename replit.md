# LaunchFlow - Product Launch Management Platform

## Overview
LaunchFlow is a comprehensive SaaS platform designed to streamline product launch workflows. It offers multi-user collaboration, project stage management, file handling, and automated notifications. The platform aims to enhance team coordination, visualize launch timelines, manage deadlines, and centralize communication across all stages of a product launch.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18+ with TypeScript, Vite for build/dev, Wouter for routing.
- **UI/UX**: Radix UI for unstyled components, shadcn/ui (New York style), Tailwind CSS with custom design tokens, CVA for type-safe variants. Design inspired by Linear, Asana, and Notion.
- **State Management**: TanStack Query for server state, React Hook Form with Zod for form validation, React hooks for local state.
- **Internationalization**: i18next with react-i18next for multi-language support (English, Russian, Chinese), translation keys by feature, language persistence in localStorage.
- **File Uploads**: Uppy with AWS S3 integration, direct-to-cloud for efficiency.

### Backend
- **Framework**: Express.js with TypeScript for REST API endpoints.
- **API Design**: RESTful, resource-oriented URLs (e.g., `/api/projects/:id`), JSON format, request logging.
- **Authentication & Authorization**: Custom username/password system, bcryptjs for password hashing, session-based using PostgreSQL, rate limiting, secure cookies. Role-Based Access Control (superadmin, admin, user, guest).
- **Build & Deployment**: esbuild for server-side bundling, optimized for cold start times.

### Data Storage
- **Database**: PostgreSQL (Neon serverless) as primary, Drizzle ORM for type-safe queries.
- **Schema**: Multi-tenancy via Companies table, Users with roles, Projects, Products, Stage Templates, Stages, Tasks, Stage Files, Comments, Session storage.
- **Object Storage**: Google Cloud Storage via Replit's sidecar, custom ACL for fine-grained permissions, public/private object visibility.
- **Storage Service Pattern**: Repository pattern with `IStorage` interface for consistent data access.

### UI/UX Decisions & Features
- **Project Detail Page**: Redesigned header with cover image, progress bar, timeline summary. New stage card design with numbered badges, bilingual names, status dropdown, collapsible content.
- **Project List View**: Enhanced cards displaying cover image, project name, progress, responsible user, and deadline.
- **Stage Management**: Users can add/remove stages from existing projects, with confirmation dialogs for data deletion.
- **File Access Control**: Editable file permissions after upload for specific stages, server-side enforcement of `allowedUserIds`.
- **Template Builder**: Visual block-based builder for stage templates (`blocks` JSONB column). Supports 9 block types (comments, checklist, customFields, files, tasks, substages, gallery, divider, header) with multi-language titles and configurations.
- **Custom Fields**: Stage templates support custom fields (text, textarea, number) defined at the template level and stored in JSONB columns.
- **Admin Panel**: Template activation/deactivation, drag-and-drop reordering, custom field management with i18n support.
- **Checklist Improvements**: Per-checklist-item file uploads with type filtering, file previews, progress tracking.
- **User Settings**: Dedicated page for profile management, avatar upload/selection (preset cat avatars), editable personal info, and password management.

## External Dependencies

- **Cloud Services**: Google Cloud Storage, Replit infrastructure, Neon (PostgreSQL).
- **Authentication**: Custom authentication system (no external identity providers).
- **Third-party Libraries**:
    - **UI**: Radix UI, Lucide icons, shadcn/ui, Tailwind CSS.
    - **Forms**: React Hook Form, Hookform Resolvers, Zod.
    - **File Uploads**: Uppy (core, AWS S3 plugin, Dashboard plugin).
    - **Utilities**: date-fns, nanoid, clsx, tailwind-merge.
    - **Internationalization**: i18next, react-i18next.
    - **Password Hashing**: bcryptjs.
    - **Database ORM**: Drizzle ORM.
- **Fonts**: Inter font family (Google Fonts).
- **APIs**: DeepL API for translation.

## Recent Features

### Image Compression (December 2024)
- Automatic client-side image compression for uploads >2MB
- Uses Canvas API for quality reduction and dimension scaling
- Rejects images that cannot be compressed below 2MB limit with error notification
- Toast notification shows compression results (before/after size)
- Configurable via `compressImages` prop in ObjectUploader component (enabled by default)
- Implemented in: `client/src/lib/imageCompressor.ts`, `client/src/components/ObjectUploader.tsx`

### Password Reset via Email (December 2024)
- Complete password reset flow with email notifications via Resend API
- Reset tokens stored in database with 1-hour expiry
- Pages: `/forgot-password`, `/reset-password?token=...`
- Endpoints: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- Requires RESEND_API_KEY secret (configured)

### Translation with DeepL (December 2024)
- TranslateButton component for user-generated content
- Supports EN↔RU↔ZH language pairs
- Used in: comments, task descriptions, revision notes, custom fields
- Requires DEEPL_API_KEY secret (configured)