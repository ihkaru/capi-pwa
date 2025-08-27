# Project Overview: Cerdas Platform

This is a full-stack application named "Platform Cerdas" (Cerdas Platform), designed as a CAPI (Computer-Assisted Personal Interviewing) statistical survey system. It facilitates multi-role workflows for statistical data collection, from initial preparation to final data approval, with support for offline capabilities.

## Architecture

- **Backend (Cerdas-SM - Survey Management):** Built with Laravel (v11+), utilizing Filament (v4) for the administrative panel, Filament Tenancy for multi-tenancy based on `Satker` (Satuan Kerja), and Spatie/Permission for robust role and permission management.
- **Frontend (Cerdas Mobile - PWA):** A Progressive Web App developed with Framework7-Vue, Pinia for state management, Axios for HTTP requests, and Dexie.js for IndexedDB interactions to support offline functionality.

## Building and Running

### Backend (Laravel)

- **Dependencies:** Managed by Composer. Ensure Composer is installed.
  ```bash
  cd backend-laravel
  composer install
  ```
- **Environment Setup:** Copy `.env.example` to `.env` and configure your database connection.
  ```bash
  cd backend-laravel
  cp .env.example .env
  php artisan key:generate
  ```
- **Database Setup:** Run migrations and seeders to set up the database schema and populate initial data. This command will **delete all existing data** and re-run migrations and seeders.
  ```bash
  cd backend-laravel
  php artisan migrate:fresh --seed
  ```
- **Serving the API:**
  ```bash
  cd backend-laravel
  php artisan serve
  ```
  The API will typically be available at `http://127.0.0.1:8000/api`.

### Frontend (PWA)

- **Dependencies:** Managed by npm. Ensure Node.js and npm are installed.
  ```bash
  cd frontend-pwa
  npm install
  ```
- **Environment Setup:** Configure the backend API URL in `frontend-pwa/.env`.
  ```bash
  cd frontend-pwa
  # Example .env content
  VITE_API_URL="http://127.0.0.1:8000/api" # Adjust to your backend API URL
  ```
- **Development Server:**
  ```bash
  cd frontend-pwa
  npm run dev
  ```
  The PWA will typically be available at `http://localhost:5173`.
- **Build for Production:**
  ```bash
  cd frontend-pwa
  npm run build
  ```

## Development Conventions

### Frontend

- **Framework:** Framework7-Vue with Composition API (`<script setup>` syntax) for new Vue components.
- **Styling:** Uses `scss` and `css` with Framework7's bundle.
- **State Management:** Pinia is used for centralized state management.
- **API Communication:** A centralized `ApiClient.ts` (TypeScript) handles all backend communication, including Axios interceptors for authentication token injection and refresh logic.
- **Offline Data:** Dexie.js is used for IndexedDB interactions to manage local data for offline capabilities _This is key requirements_.
- **Iconography:** Prefers component-based imports from `framework7-icons/vue` for consistent icon display.

### Backend

- **Framework:** Laravel (v11+).
- **Code Structure:** Complex business logic is extracted into Service Classes or Action Classes to keep controllers lean.
- **API Responses:** Eloquent API Resources are used for standardizing and transforming data in API responses.
- **Validation:** Strict and explicit validation is enforced using Form Requests for all incoming API inputs.
- **Authentication/Authorization:** Laravel Sanctum for API authentication and Spatie/Permission for role-based access control.
- **Multi-Tenancy:** Implemented with Filament Tenancy, where `Satker` acts as the primary tenant.

### General

- **Identifiers:** Extensive use of UUIDs for primary keys across models.
- **Constants:** Centralized constants for roles and statuses are defined in `App\Constants.php`.
- **Documentation:** Detailed functional and technical specifications are provided in the `spec/` directory, covering workflow, database schema, and specific case studies.

### CLI Tools & Context

- **Gemini CLI Commands:** Custom commands for the Gemini CLI are defined in `frontend-pwa/.gemini/commands/`. These TOML files provide context and shortcuts for common frontend development tasks.
