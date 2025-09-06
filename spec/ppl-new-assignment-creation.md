# Specification: PPL New Assignment Creation

## 1. Overview

This document details the full implementation of the "PPL New Assignment Creation" feature, allowing PPLs to create new top-level assignments directly from the PWA. This feature is designed with a strong emphasis on **offline-first capabilities** and **immediate local visibility** of newly created assignments. It aligns with "Scenario A: Penambahan Unit Observasi Baru di Lapangan (Saat Listing)" described in `studi-kasus-kegiatan.md`.

The revised flow involves navigating directly to the `InterviewFormPage.vue` in a "create mode" when a PPL initiates a new assignment. The initial data collection (respondent name, geotag, photo) occurs within `InterviewFormPage.vue` using the dynamic form engine. The photo handling follows a two-step process: photos are uploaded separately to a media endpoint, and only the photo ID (from the `assignment_attachments` table) is referenced in the assignment data. Crucially, newly created assignments are immediately saved to the local IndexedDB and should be visible in the `AssignmentListPage` within their correct geographical group, even before being submitted to the backend.

## 2. Functional Requirements

*   PPLs must be able to initiate the creation of a new assignment from the `AssignmentListPage.vue`.
*   A Floating Action Button (FAB) will be displayed on `AssignmentListPage.vue` if the `Kegiatan Statistik` allows new assignment creation (controlled by a new `allow_new_assignments_from_pwa` flag on the activity).
*   Clicking the FAB will navigate directly to `InterviewFormPage.vue` in a "create mode".
*   The `InterviewFormPage.vue` will initialize a new, empty assignment with a `PENDING` status locally.
*   Initial data for the new assignment (`nama_krt`, `geotag`, `photo`) will be collected within the `InterviewFormPage.vue` using the dynamic form engine, as part of the `form_schema` for "Listing" activities.
*   Geographical data (level codes and labels) for the new assignment will be pre-filled based on the `AssignmentGroup` context from which the FAB was clicked, ensuring the most granular available information is used.
*   The photo must be uploaded to a dedicated media endpoint first, returning a unique ID (the `id` from the `assignment_attachments` table).
*   The new assignment, including the photo ID, will then be created on the backend with a `Submitted by PPL` status.
*   The process must support offline operation, queuing both photo upload and assignment creation for later synchronization.
*   The newly created assignment should appear in the PPL's assignment list (in `AssignmentListPage.vue`) immediately after local creation, even before submission, and within the correct geographical group.
*   Only PPLs are allowed to create new assignments.

## 3. Technical Specification

### 3.1. Frontend Changes

#### 3.1.1. `backend-laravel/database/migrations/...` (New Migration)

*   **Purpose:** Add a new column to the `kegiatan_statistiks` table.
*   **Changes:**
    *   Add a new boolean column `allow_new_assignments_from_pwa` to the `kegiatan_statistiks` table, with a default value of `false`.

#### 3.1.2. `frontend-pwa/src/views/AssignmentListPage.vue`

*   **Purpose:** Display the FAB and navigate to `InterviewFormPage.vue`.
*   **Changes:**
    *   Replace the existing "Tambah Assignment Baru" button with a Floating Action Button (FAB).
    *   The FAB will be conditionally rendered based on `dashboardStore.activity?.allow_new_assignments_from_pwa` and `authStore.activeRole === 'PPL'`.
    *   The `handleAddNewAssignment` function will be modified to navigate to `InterviewFormPage.vue` with parameters indicating "create mode" and passing the pre-filled geographical data.
    *   Example navigation: `f7.views.main.router.navigate(`/assignment/new/${activityId}?groupName=${encodedGroupName}&prefilledGeoData=${encodedPrefilledGeoData}`);`

#### 3.1.3. `frontend-pwa/src/views/InterviewFormPage.vue`

*   **Purpose:** Handle the creation of new assignments and local data collection.
*   **Changes:**
    *   Detect "create mode" from route parameters (e.g., `assignmentId === 'new'`).
    *   If in "create mode":
        *   Call `formStore.initializeNewAssignment` to create a new `Assignment` object with a generated UUID, pre-filled geographical data (including labels looked up from `masterSls`), and an initial local `PENDING` status.
        *   The form will render based on the `form_schema` for the activity.
        *   Changes to form fields are debounced and automatically saved to the local IndexedDB.

#### 3.1.4. `frontend-pwa/src/js/stores/dashboardStore.ts`

*   **Purpose:** Provide activity data, manage grouped assignments, and facilitate immediate local visibility.
*   **Changes:**
    *   The `activity` object (fetched from the backend) includes the `allow_new_assignments_from_pwa` property.
    *   The `groupedAssignments` computed property now ensures that the `levelCodes` object within each group always contains all available `level_X_code` and `level_X_label` properties (looked up from `masterSls` if not present in the assignment itself), regardless of the grouping level. This ensures new assignments are grouped correctly.
    *   A new `addAssignment(assignment: Assignment)` action is introduced to immediately add a newly created local assignment to the store's `assignments` array, triggering reactivity for `AssignmentListPage`.

#### 3.1.5. `frontend-pwa/src/js/stores/formStore.ts`

*   **Purpose:** Handle the initialization, saving, and submission of new assignments.
*   **Changes:**
    *   The `initializeNewAssignment` action creates a new assignment object, saves it to Dexie.js, and then calls `dashboardStore.addAssignment` to update the main store's `assignments` array for immediate UI reactivity.
    *   The `submit` function is modified to differentiate between updating an existing assignment and submitting a newly created one. For new assignments, it explicitly sets the `assignment.status` and `assignmentResponse.status` to `Submitted by PPL` in the payload sent to the backend, while the local status remains `PENDING` until sync confirmation.

#### 3.1.6. `frontend-pwa/src/js/services/ApiClient.ts`

*   **Purpose:** Handle API communication.
*   **Changes:**
    *   **`getInitialData`:** Ensures the `InitialActivityPayload` includes the `allow_new_assignments_from_pwa` property on the `activity` object.
    *   **`createAssignment`:** This function is called by `formStore` (or similar) when a new assignment is submitted. Its signature and payload expect `assignment` and `assignmentResponse` objects, with `photo_id` in `prefilled_data`. The backend will receive `Submitted by PPL` as the status.
    *   **`uploadAssignmentPhoto`:** This function is called by `formStore` (or similar) when a photo is captured within `InterviewFormPage.vue` for a new assignment.

#### 3.1.7. `frontend-pwa/src/components/AddNewAssignmentModal.vue`

*   **Purpose:** This component will be removed as its functionality is absorbed by `InterviewFormPage.vue`.

### 3.2. Backend Changes (Laravel)

#### 3.2.1. Database Migrations (`backend-laravel/database/migrations/...`)

*   **New Migration:**
    *   Add a new boolean column `allow_new_assignments_from_pwa` to the `kegiatan_statistiks` table, with a default value of `false`.
*   **New Migration:**
    *   Make the `assignment_id` column in the `assignment_attachments` table nullable.

#### 3.2.2. Model (`backend-laravel/app/Models/KegiatanStatistik.php`)

*   **Changes:**
    *   Add `allow_new_assignments_from_pwa` to the `$fillable` array.
    *   Add a cast for this attribute (`'allow_new_assignments_from_pwa' => 'boolean'`).

#### 3.2.3. API Resources (`backend-laravel/app/Http/Resources/ActivityResource.php`)

*   **Changes:**
    *   Include `allow_new_assignments_from_pwa` in the `ActivityResource` to ensure it's exposed in the API response.

#### 3.2.4. API Routes (`backend-laravel/routes/api.php`)

*   **Photo Upload Route:**
    *   **Existing:** `POST /assignments/{assignmentId}/photos` handled by `AssignmentPhotoController::class, 'upload'`. This route is for photos related to *existing* assignments.
    *   **Existing (Newly Added):** `POST /activities/{activityId}/interviews/{interviewId}/photos` handled by `AssignmentPhotoController::class, 'uploadActivityPhoto'`. This route is for photos related to *new* assignments (where `interviewId` is a temporary ID for the photo before the assignment is created).
    *   **Decision:** Both routes will be kept. `uploadActivityPhoto` will be used by the frontend for new assignment photos.
#### 3.2.4. API Routes (`backend-laravel/routes/api.php`)

*   **Photo Upload Route:**
    *   `POST /assignments/{assignmentId}/photos` handled by `AssignmentPhotoController::class, 'upload'`. This route is for photos related to *existing* assignments.
    *   `POST /activities/{activityId}/interviews/{interviewId}/photos` handled by `AssignmentPhotoController::class, 'uploadActivityPhoto'`. This route is for photos related to *new* assignments (where `interviewId` is a temporary ID for the photo before the assignment is created).
*   **Assignment Creation Route:** `POST /activities/{activityId}/assignments/create` handled by `ActivityController::class, 'createAssignment'`.

#### 3.2.5. Controller (`backend-laravel/app/Http/Controllers/AssignmentPhotoController.php`)

*   **Purpose:** Handle photo uploads.
*   **Changes:**
    *   Implement the `uploadActivityPhoto` method:
        *   Receive the uploaded photo file (multipart/form-data).
        *   Store the photo in a designated storage (e.g., S3, local disk).
        *   Generate a unique ID (UUID) for the stored photo.
        *   Create a record in the `assignment_attachments` table, storing metadata (original filename, stored path, mime type, file size). The `assignment_id` will be `null` initially.
        *   Return the `id` of this `assignment_attachment` record.

#### 3.2.6. Controller (`backend-laravel/app/Http/Controllers/ActivityController.php`)

*   **Purpose:** Handle assignment creation.
*   **Changes:**
    *   The `createAssignment` method now expects the `assignment.status` and `assignment_response.status` in the payload to be `Submitted by PPL` (or `Assigned` for initial backend-generated assignments). The backend will *not* accept `PENDING` status.
    *   **Remove all photo handling logic** from this method.
    *   Modify validation to *not* expect a `photo` field.
    *   Update the logic to expect a `photo_id` (which is the `assignment_attachment` ID) within `assignment.prefilled_data`.
    *   If `photo_id` is present in `prefilled_data`, update the corresponding `assignment_attachment` record to set its `assignment_id` to the newly created assignment's ID.
    *   Create a new `Assignment` record in the database.
    *   Create a new `AssignmentResponse` record, linking it to the `Assignment`. The `status` of this record will be explicitly set to `Submitted by PPL` in the backend.
    *   Ensure `ppl_id` and `pml_id` are correctly assigned based on the authenticated user and activity configuration.
    *   Return a success response.

#### 3.2.5. Controller (`backend-laravel/app/Http/Controllers/AssignmentPhotoController.php`)

*   **Purpose:** Handle photo uploads.
*   **Changes:**
    *   Implement the `uploadActivityPhoto` method:
        *   Receive the uploaded photo file (multipart/form-data).
        *   Store the photo in a designated storage (e.g., S3, local disk).
        *   Generate a unique ID (UUID) for the stored photo.
        *   Create a record in the `assignment_attachments` table, storing metadata (original filename, stored path, mime type, file size). The `assignment_id` will be `null` initially.
        *   Return the `id` of this `assignment_attachment` record.

#### 3.2.6. Controller (`backend-laravel/app/Http/Controllers/ActivityController.php`)

*   **Purpose:** Handle assignment creation.
*   **Changes:**
    *   Modify the `createAssignment` method:
        *   **Remove all photo handling logic** from this method.
        *   Modify validation to *not* expect a `photo` field.
        *   Update the logic to expect a `photo_id` (which is the `assignment_attachment` ID) within `assignment.prefilled_data`.
        *   If `photo_id` is present in `prefilled_data`, update the corresponding `assignment_attachment` record to set its `assignment_id` to the newly created assignment's ID.
        *   Create a new `Assignment` record in the database.
        *   Create a new `AssignmentResponse` record, linking it to the `Assignment`.
        *   Ensure `ppl_id` and `pml_id` are correctly assigned based on the authenticated user and activity configuration.
        *   Set the initial `status` to `Assigned`.
        *   Return a success response.

## 4. Offline Support and Synchronization

*   The `SyncEngine` will manage the queuing and processing of both `uploadPhoto` and `createAssignment` actions.
*   When offline, the `uploadPhoto` action will be queued. Upon going online, it will be processed first.
*   Once the photo is successfully uploaded and its ID is obtained, the `createAssignment` action (which was also queued, or will be queued after photo upload success) will be processed.
*   Error handling for network issues and conflicts (e.g., 409 Conflict) will be managed by the `SyncEngine` as per existing patterns.
*   **Local Status:** Newly created assignments will have a `PENDING` status locally until successfully synchronized with the backend.

## 5. Testing Considerations

*   **Unit Tests:**
    *   `AssignmentListPage.vue`: Test FAB rendering and navigation.
    *   `InterviewFormPage.vue`: Test "create mode" initialization, data collection, and submission logic.
    *   `dashboardStore.ts`: Test `groupedAssignments` logic with `masterSls` and the `addAssignment` action.
    *   `formStore.ts`: Test new assignment creation logic, including photo upload orchestration and local storage.
    *   `SyncEngine.ts`: Test `createAssignment` and `uploadPhoto` processing, retry mechanisms, and conflict resolution.
    *   `ApiClient.ts`: Test `createAssignment` and `uploadAssignmentPhoto` API calls.
    *   Backend: Unit tests for `AssignmentPhotoController` (`uploadActivityPhoto`) and `ActivityController` (`createAssignment`).
*   **Integration Tests:**
    *   End-to-end flow: Create a new assignment from the PWA, including photo, and verify its presence on the backend after synchronization.
    *   Offline scenario: Create a new assignment while offline, go online, and verify synchronization.
    *   **Immediate Local Visibility:** Verify that newly created assignments appear in the `AssignmentListPage` within the correct group *before* submission.
*   **Manual Testing:**
    *   Verify UI/UX of the FAB and `InterviewFormPage` in create mode.
    *   Test photo capture and geotagging on a real device.
    *   Test various network conditions (online, offline, intermittent).
    *   Verify data integrity on both frontend and backend.
