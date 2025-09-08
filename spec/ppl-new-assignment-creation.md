# Specification: PPL New Assignment Creation

## 1. Overview

This document details the full implementation of the "PPL New Assignment Creation" feature, allowing PPLs to create new top-level assignments directly from the PWA. This feature is designed with a strong emphasis on **offline-first capabilities** and **immediate local visibility** of newly created assignments. It aligns with "Scenario A: Penambahan Unit Observasi Baru di Lapangan (Saat Listing)" described in `studi-kasus-kegiatan.md`.

The revised flow involves navigating directly to the `InterviewFormPage.vue` in a "create mode". As the PPL enters data, the **assignment's label is dynamically generated** based on a pre-defined template in the form's schema, replacing generic names with meaningful identifiers in real-time. The photo handling follows a two-step process: photos are uploaded separately to a media endpoint, and only the photo ID is referenced in the assignment data. Crucially, newly created assignments—with their dynamically generated labels—are immediately saved to the local IndexedDB and are visible in the `AssignmentListPage`.

## 2. Functional Requirements

*   PPLs must be able to initiate the creation of a new assignment from the `AssignmentListPage.vue`.
*   A Floating Action Button (FAB) will be displayed on `AssignmentListPage.vue` if the `Kegiatan Statistik` allows new assignment creation.
*   Clicking the FAB will navigate directly to `InterviewFormPage.vue` in a "create mode".
*   The `InterviewFormPage.vue` will initialize a new, empty assignment with a `PENDING` status and a default label (e.g., "Penugasan Baru").
*   **Dynamic Labeling:** As the PPL enters data, the `assignment_label` must be automatically and reactively updated based on the `assignment_label_template` defined in the `form_schema`. (See `spec/dynamic-form-engine.md` for details).
*   Geographical data for the new assignment will be pre-filled based on the context from which it was created.
*   The process must support full offline operation.
*   The newly created assignment, with its dynamically updated label, should appear in the PPL's assignment list immediately after local creation.
*   Only PPLs are allowed to create new assignments.

## 3. Technical Specification

### 3.1. Frontend Changes

#### 3.1.1. `frontend-pwa/src/views/InterviewFormPage.vue`

*   **Purpose:** Handle the creation of new assignments, data collection, and dynamic label generation.
*   **Changes:**
    *   Detect "create mode" from route parameters.
    *   If in "create mode", call `formStore.initializeNewAssignment`.
    *   **Watch for changes** in any of the fields used as variables in the `form_schema.assignment_label_template`.
    *   On change, call a new action in the `formStore` (e.g., `updateAssignmentLabel`) to trigger the re-computation and saving of the new label.

#### 3.1.2. `frontend-pwa/src/js/stores/formStore.ts`

*   **Purpose:** Handle the business logic for initializing, saving, and submitting new assignments, including their dynamic labels.
*   **Changes:**
    *   The `initializeNewAssignment` action will create a new assignment object with a default `assignment_label` (e.g., "Penugasan Baru"), save it to Dexie.js, and add it to the `dashboardStore` for UI reactivity.
    *   A new **`updateAssignmentLabel`** action will be created. This action will:
        1.  Get the current `assignment_label_template` from the active `form_schema`.
        2.  Get the current `responses` object for the form.
        3.  Use the `logicEngine` to resolve any complex/derived placeholder values (e.g., finding the KRT's name from a roster and putting it in a top-level `krt_name` field).
        4.  Substitute the placeholders in the template with their corresponding values from the `responses`.
        5.  Update the `assignment_label` on the `Assignment` object in the store.
        6.  Debounce the save operation to Dexie.js to persist the new label efficiently.

#### 3.1.3. `frontend-pwa/src/js/stores/dashboardStore.ts`

*   **Purpose:** Provide activity data and facilitate immediate local visibility.
*   **Changes:**
    *   No major changes are required for the dynamic label feature itself, as the reactivity is handled through the `Assignment` object which is already in its `assignments` array. When the `assignment_label` is updated by the `formStore`, the change will be reflected automatically in `AssignmentListPage.vue`.

(Other sections of the technical specification remain largely the same, as the dynamic label is primarily a frontend logic enhancement before data submission.)

## 4. Offline Support and Synchronization

*   The entire dynamic labeling process is designed to work **offline by default**, as it only involves the `form_schema` and data already present on the client.
*   The `SyncEngine` will simply submit the final, generated `assignment_label` to the backend as part of the `createAssignment` payload. No changes to the sync process are required.

## 5. Testing Considerations

*   **Unit Tests:**
    *   `formStore.ts`: Test the `updateAssignmentLabel` action thoroughly. Verify that it correctly parses templates, handles missing values gracefully, and correctly derives complex values from rosters via the logic engine.
*   **Integration Tests:**
    *   Verify that as a user types into a field that is part of the label template, the label in the `AssignmentListPage` updates in real-time.
    *   Test with complex templates that involve both simple fields and fields derived from roster logic.
*   **Manual Testing:**
    *   End-to-end flow: Create a new assignment and ensure its name changes as expected while filling out the form.
    *   Verify the updated label persists after closing and reopening the app before submission.