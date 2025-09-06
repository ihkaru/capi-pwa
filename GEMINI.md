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

*   **Dynamic Form Engine (Functional Core):** The engine in `InterviewFormPage.vue` now correctly renders multiple question types based on a JSON schema, including `text`, `number`, `select`, `image`, and `geotag`.
*   **Rosters (Repeating Groups):** The form engine now supports repeating groups of questions (rosters), including nested rosters, allowing for complex household or entity lists.
*   **Advanced Logic Engine (Foundation):** A `logicEngine` service has been created to handle conditional logic. The `showIf` condition is now implemented and working, allowing questions to be dynamically shown or hidden.
*   **Validation & Summary (Robust):** The form now has a fully functional, real-time validation summary. It correctly counts and lists errors, warnings, and blank fields, and allows users to jump to the relevant question, even within nested rosters. The feature is resilient against UI library reactivity bugs.
*   **PWA Features Working:** PWA-specific functionalities like the device camera (using a robust file-input fallback), geolocation, and an integrated photo viewer are now correctly configured and operational.
*   **End-to-End Data Flow:** The full data pipeline from the backend (Laravel Seeder) -> API -> `dashboardStore` -> Dexie (local DB) -> `formStore` -> Vue Component is functioning correctly.
*   **PML Review Workflow (Functional):** The core workflow for a PML to download, view, and interact with a PPL's submitted assignment is now functional. This includes correctly loading and displaying the PPL's data and locking/unlocking fields based on the user's role. Rejection notes are now optional for PMLs.
*   **Automatic Delta Sync:** The application now automatically triggers a delta synchronization in the background when the user returns to the Assignment List Page, *but only if a status-changing action (Submit, Approve, Reject, Revert Approval) was performed on the Interview Form Page*, ensuring up-to-date assignment statuses.
*   **Consistent Status Coloring:** Assignment statuses are now consistently colored across `AssignmentListPage.vue`, `ActivityDashboardPage.vue`, and `AssignmentGroupPage.vue` for improved visual clarity.

### **3. Overall Roadmap**

The high-level roadmap remains the same, with our focus still on the main CAPI functionality.

1.  **Implement the Home Page:** Connect `HomePage.vue` to `activityStore` to display the list of assigned activities.
2.  **Build the Activity Dashboard:** Build out `ActivityDashboardPage.vue` to show statistics and sync options.
3.  **Develop the Dynamic Form Engine:** Continue building out `InterviewFormPage.vue` to support all features in the spec.

### **4. Current Multi-Session Focus: The Dynamic Form Engine**

*   **Goal:** To build the `InterviewFormPage.vue` into a flexible engine capable of rendering complex surveys from a JSON schema.
*   **Current Action:** The PPL data entry and PML data review workflows are now functionally complete. The form correctly renders and protects data based on user role and status.
*   **Next Step:** Implement the PPL's repair cycle after an assignment is rejected by PML or Admin. This involves displaying rejection notes to the PPL and enabling them to edit and re-submit the assignment, as described in "Tahap 4: Siklus Perbaikan" of `alur-kerja.md`.

## Crucial Lessons Learned

During the development of the Dynamic Form Engine, several crucial lessons were learned that highlight the importance of adhering to architectural principles and thoroughly understanding framework specifics:

1.  **On Silent Failures, Suspect Security:**
    *   **Mistake:** The camera failed to open with no errors in the console.
    *   **Lesson:** When an interactive feature fails silently, it's often a browser security or permissions issue, not a logic bug. The `await` for a permission check was breaking the "user gesture" chain required by the browser. The fix was to use a more standard `<input type="file">` approach, which is more robust.

2.  **On Build Errors, Verify the Import First:**
    *   **Mistake:** When a build error `Failed to resolve import` occurred, I assumed the user's environment was broken.
    *   **Lesson:** The true cause was an incorrect import path and a missing dependency (`@ionic/pwa-elements`). **Lesson:** Always treat build-time import errors as a code/dependency issue first. A targeted web search for the exact error message is the most efficient first step.

3.  **On File Updates, Prefer Overwriting to Replacing:**
    *   **Mistake:** The `replace` tool failed repeatedly and sometimes corrupted files when updating large, complex components.
    *   **Lesson:** For wholesale updates, it is far more reliable for me to `read_file` to get the latest content and then `write_file` to overwrite the entire file with the desired changes. This avoids any possibility of a mismatch or corruption.

4.  **Trust the Spec, but Verify the Data Source:**
    *   **Mistake:** The initial form was blank. I assumed a frontend rendering bug.
    *   **Lesson:** The root cause was an empty `pages` array in the `form_schema` coming from the backend database seeder. **Lesson:** Always verify the actual data at its source early in the debugging process.

5.  **Understand the Full Data Lifecycle & Framework "Magic":**
    *   **Mistake:** A `TypeError` crashed the backend when trying to log schema details.
    *   **Lesson:** The seeder was saving a raw JSON string, which Laravel's model casting then re-encoded, creating a double-encoded and invalid JSON in the database. **Lesson:** Be acutely aware of implicit framework transformations (like model casting).

6.  **Ensure Data Consistency Across Local Storage Layers:**
    *   **Mistake:** The app crashed with a `JSON.parse` error after fixing the backend.
    *   **Lesson:** The `dashboardStore` saved the schema to the local DB as a JavaScript object, but the `formStore` tried to read it as a JSON string. **Lesson:** The "contract" for data formats between application components must be explicit and consistent.

7.  **On UI Bugs, Suspect the Library First:**
    *   **Mistake:** The validation summary counts refused to display in a `<f7-popup>`, even though debugging showed the data in the store was correct.
    *   **Lesson:** When data is correct but a specific UI component doesn't update, suspect a reactivity bug in the component library itself. The issue was not in my logic, but a subtle bug in how the Framework7 popup/list-item components handle reactive data. The fix was to bypass the buggy component (`<f7-list-item>`) with a custom `div`-based template and to make the `@click` handler read from the store directly, ignoring the component's stale state.

8.  **Roles are Contextual, Not Global:**
    *   **Mistake:** Assumed the user's role (`PPL` or `PML`) was a global property on the main user object.
    *   **Lesson:** The user's role is defined *per activity*. The application state must reflect this. The correct pattern is to have an `activeRole` in the `authStore` that is set when the user selects an activity from the dashboard. All role-based logic must then use this `activeRole` instead of `user.role`.

9.  **Verify Full API Payloads for All Roles:**
    *   **Mistake:** The form was empty for the PML because the API wasn't sending the PPL's answers.
    *   **Lesson:** When implementing features for a new role (e.g., PML), explicitly verify the full API payload for that role's context. The `/initial-data` endpoint needed to be modified on the backend to include the `assignmentResponses` array for PML users, which was a step missed during initial development.

10. **Defend Against Double-Encoded JSON:**
    *   **Mistake:** The form was still empty even after the API was sending the `assignmentResponses`.
    *   **Lesson:** The `responses` field inside the `assignmentResponses` object was being sent as a string instead of a JSON object. This is a common issue with Laravel API Resources. The frontend must be defensive; if a field that should be an object is a string, `JSON.parse()` it. Log this and flag it as a backend issue to be fixed permanently.

11. **UI Actions Must Be State-Aware:**
    *   **Mistake:** Clicking a synced image preview triggered the camera upload instead of a viewer.
    *   **Lesson:** The same UI element can have different behaviors based on context. The `handleImageClick` function should check the state (e.g., `isQuestionDisabled` or if the image `src` is a `data:` URL vs. an `http` URL) to decide whether to open the Photo Browser (for viewing) or the camera (for editing).