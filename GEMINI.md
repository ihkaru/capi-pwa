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

## Learned Agent Directives

*As a result of our interaction, I have adopted the following core principles for working on this project. I will read and adhere to these rules at the start of every session.*

1.  **The "Read-Only First" Principle:** When asked to "check," "review," or "understand" code, I will *only* use non-modifying, observational tools in my initial analysis (`read_file`, `list_directory`, `glob`, `search_file_content`). I will not propose a modifying action (`write_file`, `replace`) until I have confirmed a clear and verifiable error.

2.  **The "Confirm Before Modify" Checkpoint:** For any file modification that is not a direct and unambiguous command from the user, I will first state my intention, my reasoning, and the exact change I intend to make. I will then ask for explicit confirmation before I proceed.

3.  **The "Working Code is Gospel" Mandate:** I will treat a functioning application as the highest authority. If my static analysis suggests a problem, but the application works, I will assume my analysis is flawed and investigate further rather than attempting to "fix" the working code.

## Project Status & Next Steps

*This section serves as a living document to track our progress. It will be updated at the end of each session.*

### **1. Project Goal**

We are building the **Platform Cerdas**, a full-stack statistical survey application. The frontend is a Progressive Web App (PWA) built with **Framework7-Vue**, designed for field officers (PPL and PML) to conduct surveys. A key requirement is robust **offline capability**, which is handled by Dexie.js for local database storage and a custom sync engine. The backend is a Laravel API that manages data, users, and survey logic.

### **2. Existing Features (Current Status)**

The application is stable and the core data pipeline is robust.

*   **Offline-First New Assignment with Photo (Fixed):** The workflow for creating a new assignment with a photo while offline is now fully functional. The system correctly saves the photo locally, queues a composite task in the sync engine, and processes the upload and creation dependently when online. The application state is now immediately consistent after a background sync, ensuring data integrity and a smooth user experience.
*   **Fully Reactive Assignment List:** The `AssignmentListPage` is now fully reactive and resilient. It correctly displays all data, including columns with nested data like `Jml. ART`, and updates in real-time when data is changed anywhere in the app. This was achieved by refactoring the component to use a `computed` property for the list, which is the idiomatic Vue approach for handling derived state, ensuring the UI is always a direct reflection of the central data store.
*   **Dynamic Form Engine (Functional Core):** The engine in `InterviewFormPage.vue` now correctly renders multiple question types based on a JSON schema, including `text`, `number`, `select`, `image`, and `geotag`.
*   **Rosters (Repeating Groups):** The form engine now supports repeating groups of questions (rosters), including nested rosters, allowing for complex household or entity lists.
*   **Advanced Logic Engine (Foundation):** A `logicEngine` service has been created to handle conditional logic. The `showIf` condition is now implemented and working, allowing questions to be dynamically shown or hidden.
*   **Validation & Summary (Robust):** The form now has a fully functional, real-time validation summary. It correctly counts and lists errors, warnings, and blank fields, and allows users to jump to the relevant question, even within nested rosters. The feature is resilient against UI library reactivity bugs.
*   **PWA Features Working:** PWA-specific functionalities like the device camera (using a robust file-input fallback), geolocation, and an integrated photo viewer are now correctly configured and operational.
*   **End-to-End Data Flow:** The full data pipeline from the backend (Laravel Seeder) -> API -> `dashboardStore` -> Dexie (local DB) -> `formStore` -> Vue Component is functioning correctly.
*   **PML Review Workflow (Functional):** The core workflow for a PML to download, view, and interact with a PPL's submitted assignment is now functional. This includes correctly loading and displaying the PPL's data and locking/unlocking fields based on the user's role. Rejection notes are now optional for PMLs.
*   **PPL Review of Submitted Assignments:** PPLs can now navigate through and review their submitted assignments in read-only mode, including data within rosters and nested structures. Form inputs and the submit button are correctly disabled/hidden for submitted assignments.
*   **Automatic Delta Sync:** The application now automatically triggers a delta synchronization in the background when the user returns to the Assignment List Page, *but only if a status-changing action (Submit, Approve, Reject, Revert Approval) was performed on the Interview Form Page*, ensuring up-to-date assignment statuses.
*   **Consistent Status Coloring:** Assignment statuses are now consistently colored across `AssignmentListPage.vue`, `ActivityDashboardPage.vue`, and `AssignmentGroupPage.vue` for improved visual clarity. The 'Assigned' status badge is now 'yellow' for better distinction.

### **3. Overall Roadmap**

The high-level roadmap remains the same, with our focus still on the main CAPI functionality.

1.  **Implement the Home Page:** Connect `HomePage.vue` to `activityStore` to display the list of assigned activities.
2.  **Build the Activity Dashboard:** Build out `ActivityDashboardPage.vue` to show statistics and sync options.
3.  **Develop the Dynamic Form Engine:** Continue building out `InterviewFormPage.vue` to support all features in the spec.

### **4. Current Multi-Session Focus: The Dynamic Form Engine**

*   **Goal:** To build the `InterviewFormPage.vue` into a flexible engine capable of rendering complex surveys from a JSON schema.
*   **Current Action:** Added a real-time search feature to the `AssignmentListPage`. The dynamic list is now considered feature-complete and stable.

## Crucial Lessons Learned

20. **Background Sync Must Update All State Layers:**
    *   **Mistake:** A background sync process (`SyncEngine`) successfully sent a submission to the server but only updated the local database (Dexie.js). It failed to update the live, in-memory state within the Pinia store.
    *   **Lesson:** In an offline-first architecture, it is not enough for a background process to simply update the persistent storage. The background process **must also be responsible for updating the live, in-memory state** (e.g., the Pinia store). The fix was to have the `SyncEngine`, upon a successful sync, call a dedicated action (`upsertAssignment`) in the relevant Pinia store (`dashboardStore`) to push the new, server-confirmed state directly into the UI's reactive data source. This eliminates state inconsistencies and ensures the UI is always a correct reflection of the underlying data without requiring a manual refresh.

19. **Embrace Idiomatic Reactivity (Computed Properties):**
    *   **Mistake:** A list view (`AssignmentListPage`) was not updating consistently when its underlying data changed in the store. The component was manually copying the list data into a local `ref` only when the page loaded, causing it to become stale.
    *   **Lesson:** For displaying derived state (e.g., a filtered or sorted list), always prefer a `computed` property. A computed property automatically tracks its dependencies (like the master list in the store, search queries, and sort settings) and re-evaluates itself whenever any of them change. This is the correct, idiomatic Vue approach. It is far more robust and less error-prone than manually managing state with `watch` effects or lifecycle hooks like `onPageAfterIn`.

18. **Idempotent Seeders (`updateOrCreate` vs. `firstOrCreate`):**
    *   **Mistake:** A configuration-heavy `form_schema` in the database was not being updated when the seeder was re-run, even after the source JSON file was changed. This caused a frustrating, hard-to-diagnose bug where the frontend received a stale schema from the API.
    *   **Lesson:** The `firstOrCreate` method in Laravel is not suitable for seeders that need to refresh data. It finds the first record and then does nothing. The correct method is `updateOrCreate`, which guarantees that the data in the database is always synchronized with the source code on every seed, making the seeding process idempotent and reliable.

17. **Laravel Array Cast & JSON Serialization of Empty Objects:**
    *   **Mistake:** The `responses` attribute (cast as `array`) was being serialized as an empty JSON array (`"[]"`) instead of an empty JSON object (`"{}"`) when empty, causing frontend data binding issues.
    *   **Lesson:** When an `array` cast attribute is empty, Laravel's default JSON serialization converts it to `[]`. To ensure it serializes as `{}`, a custom accessor (`getResponsesAttribute`) was implemented in the `AssignmentResponse` model to always return an object, even if the underlying database value is `null` or `[]`.

16. **Photo Upload Strategy for New Assignments:**
    *   **Mistake:** Initial implementation passed the photo as a base64 string directly within the `createAssignment` payload, deviating from the specification.
    *   **Lesson:** The specification (`studi-kasus-kegiatan.md`) requires a two-step process: first, upload the photo to a dedicated media endpoint to obtain a unique ID, and then include this ID in the `assignmentResponse` when creating the new assignment. This ensures efficient storage and proper referencing of media assets.

## Mitigation Strategy for Duplication

To prevent duplication of effort and ensure a cohesive, maintainable codebase, the following strategies will be rigorously applied:

1.  **"Read-Only First" Principle (Reinforced):** Before proposing any new code or modifications, I will always start by thoroughly reading existing code, documentation (`spec/` directory), and relevant configuration files. This ensures a deep understanding of current implementations and avoids re-solving already solved problems.

2.  **"Confirm Before Modify" Checkpoint (Reinforced):** For any non-trivial changes, I will explicitly state my intention, my reasoning, and the exact proposed modifications. I will then ask for explicit confirmation before I proceed.

3.  **"Working Code is Gospel" Mandate (Reinforced):** If my analysis suggests a problem but the application is functioning correctly, I will prioritize understanding *why* it works over immediately "fix" it. This prevents unnecessary refactoring of stable code and encourages a deeper investigation into the existing patterns.

4.  **Explicit Feature Specifications:** For every new feature, a detailed, written specification will be created. This spec will clearly outline:
    *   **Frontend Requirements:** UI components, state management (Pinia), and interaction logic.
    *   **Backend Requirements:** API endpoints, data models, validation, and business logic.
    *   **Synchronization Logic:** How data flows between frontend (Dexie.js), `SyncEngine`, and backend, especially for offline capabilities.
    *   **Cross-cutting Concerns:** How the feature interacts with authentication, authorization, and error handling.
    This comprehensive approach ensures all parts of the system are considered and designed in concert.

5.  **Cross-referencing and Leveraging Existing Documentation:** I will continuously refer to and leverage the existing `spec/` documents (`alur-kerja.md`, `db.md`, `dynamic-form-engine.md`, `studi-kasus-kegiatan.md`). This ensures that new features align with the established architecture, data models, and workflows, preventing the introduction of conflicting patterns or redundant logic.

6.  **Modular Design and Reusability:** I will prioritize creating small, focused, and reusable functions, components, and services. Before writing new code, I will actively search for existing modules that can be extended or composed to achieve the desired functionality.

7.  **Unit and Integration Tests:** Where applicable, I will propose and assist in writing unit and integration tests for new features. This not only validates the correctness of the new implementation but also acts as a safeguard against accidental duplication or regression of existing functionality.

## Backend Controller Overview

To prevent the creation of redundant controllers and ensure a clear understanding of the backend's responsibilities, this section outlines the purpose of each existing API controller.

### `App\Http\Controllers\Auth\LoginController`
- **Purpose**: Handles traditional email/password authentication. Its primary function is to validate user credentials and issue API tokens upon successful login.

### `App\Http\Controllers\Auth\GoogleLoginController`
- **Purpose**: Manages user authentication via Google Single Sign-On (SSO). It handles the redirection to Google, processes the authentication callback, and either logs in an existing user (linking their Google ID if not already linked) or creates a new "floating" user account if they don't exist in the system.

### `App\Http\Controllers\ActivityController`
- **Purpose**: A comprehensive controller for managing statistical activities and their associated assignments. It provides a range of functionalities including:
    - Listing activities a user is involved in (`index`).
    - Fetching initial data for a specific activity, which includes assignments, their responses, the form schema, and relevant master data (`getInitialData`).
    - Handling the submission of completed assignments by PPLs (Petugas Pencacah Lapangan), incorporating optimistic locking to prevent data conflicts (`submitAssignments`).
    - Retrieving a list of allowed actions for a given assignment based on its current status and the user's role (`getAllowedActions`).
    - Facilitating the creation of new assignments directly from the PWA, including data validation and initial setup (`createAssignment`).
    - Includes a placeholder for future delta synchronization logic (`getUpdates`).

### `App\Http\Controllers\AssignmentPhotoController`
- **Purpose**: Dedicated to handling photo uploads related to assignments. It provides an endpoint to upload photos for existing assignments (`upload`).

### `App\Http\Controllers\AssignmentStatusController`
- **Purpose**: Manages the updating of assignment statuses. This controller is primarily used by PMLs (Petugas Pemeriksa Lapangan) to approve, reject, or revert the approval of assignments. It includes robust authorization checks to ensure that only authorized PMLs can perform these status updates.