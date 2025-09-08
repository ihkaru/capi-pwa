# Dynamic Form Engine Specification

## 1. Overview

This document specifies the functionality of the dynamic form engine for the Cerdas Mobile PWA. The engine's primary responsibility is to render an interactive survey form based on a JSON schema (`form_schema`). It must be flexible, support complex validation and conditional logic, and work seamlessly in an offline-first environment.

## 2. Schema Structure (`form_schema.json`)

The form is defined by a single JSON object.

### 2.1. Top-Level Properties

| Key                                | Type     | Description                                                                                             |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `form_name`                        | `string` | The display name of the form.                                                                           |
| `form_version`                     | `integer`| The version number of this schema. Incremented for every change.                                        |
| `masters_used`                     | `array`  | An array of master data keys (e.g., `[{ "type": "KBLI", "version": 1 }]`) required by the form.         |
| `level_definitions`                | `object` | Maps generic level codes (`level_1_code`) to human-readable names (`Provinsi`).                         |
| `assignment_table_grouping_levels` | `array`  | Defines the hierarchy for grouping assignments in the summary view.                                     |
| `assignment_table_columns`         | `array`  | Defines the columns to show in the assignment list view.                                              |
| `pages`                            | `array`  | An array of `Page` objects, defining the form's pagination and structure.                               |

### 2.2. Question Definition

Each question is an object with the following properties:

| Key                | Type      | Description                                                                                             |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------- |
| `id`               | `string`  | A unique identifier for the question within the form (e.g., `nama_krt`).                                |
| `type`             | `string`  | The input type. See Section 2.3 for a full list.                                                        |
| `label`            | `string`  | The question text displayed to the user.                                                                |
| `placeholder`      | `string`  | (Optional) Placeholder text for the input field.                                                        |
| `options`          | `array`   | (For `select`, `radio`) An array of `{ "label": string, "value": any }` objects.                        |
| `validation`       | `object`  | See Section 5.                                                                                          |
| `conditionalLogic` | `object`  | See Section 3.                                                                                          |
| `editableBy`       | `array`   | An array of user roles (e.g., `['PPL', 'PML']`) that can edit this field.                               |
| `...`              | `any`     | Other properties specific to the question type.                                                         |

### 2.3. Question Types

The engine must support the following types:

-   **`text`**: A standard single-line text input.
-   **`number`**: A text input with `type="number"`.
-   **`textarea`**: A multi-line text input.
-   **`select`**: A dropdown list.
-   **`radio`**: A list of radio buttons.
-   **`image`**: An image input.
    -   Must have a `source` property, an array containing one or both of `'camera'` and `'gallery'`.
-   **`geotag`**: A button that captures GPS coordinates.
    -   Can have a `min_accuracy` property (in meters) to enforce a minimum GPS accuracy.
-   **`prefilled_display`**: A read-only field to display data from the `prefilled_data` object of an assignment.
-   **`roster`**: A repeating group of questions.
    -   **Schema:** `{"type": "roster", "id": "anggota_rumah_tangga", "item_label": "Anggota Rumah Tangga", "questions": [ ...nested questions... ]}`
    -   The `questions` array contains a full set of question definitions for a single roster item.
    -   Rosters can be nested within other rosters.
-   **`dynamic_roster_add_button`**: A button that allows the PPL to add a new top-level roster item (e.g., a new family) to the current assignment. This is specifically for scenarios like Listing where new entities are discovered in the field.

## 3. Advanced Logic Engine

To provide maximum flexibility, conditional logic will be defined by a string containing a JavaScript function body. This function will be executed within a sandboxed environment with a controlled `context` object.

-   **Properties:** `showIf`, `requiredIf`, `validation.custom`, and `options.filter` will all accept a function string.
-   **Example:** `"showIf": "return context.get('ada_balita') === 'ya'"`

### 3.1. The `context` Object

The executed function will receive a single argument, `context`, which provides safe access to the form's state.

-   `context.get(questionId: string): any`: Gets the value of a question within the current scope (the current form or the current roster item).
-   `context.getRootValue(questionId: string): any`: Gets the value of a question from the top-level (non-roster) part of the form.
-   `context.getParent(): object | null`: Returns the `context` object for the parent roster item, allowing access to parent data from within a nested roster.
-   `context.getRoster(rosterId: string): object[]`: Gets an array of all data objects for a given roster, allowing for aggregate checks (e.g., counting items that meet a condition).

## 4. Dynamic Assignment Labels

To significantly improve user experience for PPLs creating new assignments in the field, the engine supports dynamically generating the `assignment_label` based on user input. This replaces generic labels like "Penugasan Baru" with meaningful, identifiable names in real-time.

### 4.1. Schema Configuration

The feature is controlled by the `assignment_label_template` property in the `form_schema` (see `spec/db.md`).

-   **`assignment_label_template`**: A string that defines the format of the label, using placeholders for field IDs from the `responses` object.
-   **Example**: `"{nama_krt_final} - (Blok {level_5_code} No. Urut {nomor_urut_listing})"`

### 4.2. Core Mechanism: Logic Engine Integration

This feature's power comes from its integration with the **Advanced Logic Engine** (Section 3), not from a complex new template-parsing language. The placeholders in the template (e.g., `{nama_krt_final}`) should correspond to simple, top-level field IDs in the `responses` object.

The complex work of deriving the values for these placeholders is the responsibility of the form's logic engine.

**Workflow:**

1.  **Data Extraction:** The survey designer uses the existing `logicEngine` capabilities to define rules that extract and compute data. This can include complex scenarios like finding a specific member in a roster.
2.  **Populate Placeholder Fields:** The logic engine's rules will populate the top-level fields that are used by the template. For example, a rule might be: "Find the person in the `anggota_rumah_tangga` roster where `hubungan_dengan_krt` is 'Kepala Keluarga', and copy their `nama_art` value into the top-level `nama_krt_final` field." Another rule could copy the second roster member's name into `nama_art_kedua`.
3.  **Template Composition:** The frontend UI layer (specifically `InterviewFormPage.vue` and its store) watches for any changes to the fields used in the `assignment_label_template` (e.g., `nama_krt_final`, `level_5_code`, etc.).
4.  **Reactive Update:** When any of these watched fields change, the PWA immediately re-evaluates the template string, substituting the placeholders with their current values.
5.  **Persistence:** The newly generated string is saved as the `assignment_label` property of the `Assignment` object in the local IndexedDB. This ensures the change is immediately reflected in the `AssignmentListPage` and persists across sessions.

### 4.3. Example Implementation

**Scenario:** The user wants the label to be `"{nama_kepala_rumah_tangga} / {the_second_art_in_roster}"`.

1.  **Schema Setup:**
    -   `assignment_label_template` is set to `"{krt_name} / {second_art_name}"`.
2.  **Logic Engine Rules (Conceptual):**
    -   A rule is defined that triggers when `anggota_rumah_tangga` changes. It finds the object where `hubungan_dengan_krt === 'Kepala Keluarga'` and copies its `nama_art` value to the top-level `responses.krt_name`.
    -   Another rule is defined that triggers when `anggota_rumah_tangga` changes. It takes the object at index `1` from the roster and copies its `nama_art` value to `responses.second_art_name`.
3.  **PWA Behavior:**
    -   PPL opens a new form. The label is initially " / ".
    -   PPL adds the first household member, "Budi", and marks him as "Kepala Keluarga". The logic engine runs, and `responses.krt_name` becomes "Budi". The assignment label reactively updates to "Budi / ".
    -   PPL adds the second household member, "Ani". The logic engine runs, and `responses.second_art_name` becomes "Ani". The assignment label updates to "Budi / Ani".

This architecture keeps the template mechanism simple while leveraging the already-specified power of the logic engine for complex data derivation, ensuring the system is both powerful and maintainable.

## 5. Schema Versioning

1.  **Detection:** Before displaying a list of assignments, the PWA will check if the `form_schema` version stored locally matches the version from the server.
2.  **Notification:** If a newer version exists, a blocking pop-up will be shown on the **Activity Dashboard Page**, informing the user that an update is required before they can proceed.
3.  **Data Migration:** When a user opens a form with a new schema, the PWA will attempt to map the old response data to the new schema. Data for questions whose `id` no longer exists in the new schema will be moved to a special `_archivedData` object within the `responses` JSON blob for audit purposes.

## 6. Validation & Summary Feature

### 6.1. Validation Rules

The `validation` object on a question will define its rules.

-   `"required": true`: The field cannot be empty.
-   `"requiredIf": string`: A JavaScript function string (see Section 3) that makes the field required only if the logic returns `true`.
-   `"minLength": number`, `"maxLength": number`: For text.
-   `"min": number`, `"max": number`: For numbers.
-   `"custom": string`: A JavaScript function string (see Section 3) that returns `true` if valid, or a `string` error message if invalid.
-   `"level": "error" | "warning"`: (Optional) Defaults to `"error"`. An `"error"` blocks submission. A `"warning"` does not.

### 6.2. Inline Validation

To provide a smooth user experience, inline validation messages (the error or warning text appearing below a field) **must** only be displayed after the user has interacted with and left the field. This is typically handled by triggering the validation check on the input's `blur` event.

### 6.3. Summary Feature

1.  **UI:** A floating action button will be present on the form page. Clicking this button opens a **Popup** or **Modal** dialog that displays the total counts for the three validation categories (e.g., `Errors: 2, Warnings: 1, Blank: 5`).
2.  **Logic:**
    -   **Error:** A field is an error if it fails a validation rule with `level: "error"`.
    -   **Warning:** A field is a warning if it fails a validation rule with `level: "warning"`.
    -   **Blank:** A field is blank if it is currently visible on the form, is not `required` (or `requiredIf` is not met), and is empty.
3.  **Interaction Flow:**
    -   Clicking a category in the summary popup (e.g., "Errors") that has a count greater than zero will close the popup.
    -   Immediately after, a **Sheet** will slide up from the bottom of the screen.
    -   This sheet will contain a list of all the specific questions belonging to the selected category.
    -   Clicking on a question in the sheet will smoothly scroll the main form to that specific question, focusing it if possible. This includes scrolling to questions within a nested roster.

### 6.4. Roster Validation IDs

To uniquely identify each question within a repeating roster, the validation engine will use a dot-notation path for question IDs. This path is constructed as `rosterId.index.questionId`.

-   **Example:** For a roster with `id: "anggota_rumah_tangga"`, the `nama_art` question for the first person in the roster will have a validation ID of `anggota_rumah_tangga.0.nama_art`.

### 6.5. PPL Final Visit Status
(This feature is implemented as a question type within the form schema, typically a 'select' or 'radio' input.)

The form must provide a mechanism for PPLs to record the final outcome of a visit, distinct from submission. This will typically be a select input or a set of radio buttons with predefined options (e.g., 'Selesai Dicacah', 'Responden Menolak', 'Keluarga Pindah', 'Rumah Kosong', 'Tidak Ditemukan').
If a status other than 'Selesai Dicacah' is selected, the remaining questions in the form should be disabled, and an optional notes field may be required.

### 6.6. PPL New Assignment Creation

For details on the PPL New Assignment Creation feature, including its functional and technical specifications, please refer to the dedicated document: **`ppl-new-assignment-creation.md`**.

## 7. Dynamic Assignment List Rendering

This section specifies the functionality for rendering a dynamic, interactive table on the `AssignmentListPage.vue`, driven by the `assignment_table_columns` property of the `form_schema`.

### 6.1. Column Configuration

The behavior and appearance of the assignment list are controlled by the array of column objects in `assignment_table_columns`. For the detailed structure of a column object, refer to the `kegiatan_statistiks` table definition in `spec/db.md`. The key properties are:

-   `key`: A dot-notation path to the data within the assignment or its response (e.g., `prefilled.nama_krt`, `responses.B1.R4`).
-   `label`: The column header text.
-   `type`: The data type (`string`, `number`, `date`, `boolean`, `status_lookup`) used for formatting, sorting, and filtering.
-   `default`: A boolean indicating if the column should be visible in the default, collapsed row view.
-   `sortable`: A boolean indicating if the list can be sorted by this column.
-   `filterable`: A boolean indicating if the column can be used for filtering.

**Column Order:** The display order of columns in the table is determined by the order of objects in the `assignment_table_columns` array.

### 6.2. UI Layout: Accordion Table

The assignment list will be rendered as an "accordion table" to accommodate a large number of columns on a mobile screen.

-   **Default (Collapsed) View:** Each assignment is a single row displaying only the columns marked with `"default": true`.
-   **Expanded View:** Clicking anywhere on a row expands that row to reveal a vertical list of all other available columns for that assignment, displayed as "Label: Value" pairs.

### 6.3. Sorting

-   If a column is marked as `"sortable": true`, its header in the table will be interactive.
-   Tapping a header will sort the entire list of assignments by that column's value.
-   Tapping the same header again will reverse the sort order (ascending/descending).
-   All sorting will be performed client-side on the data available in the `dashboardStore` for instant feedback.

### 6.4. Filtering

-   A "Filter" button will be present on the `AssignmentListPage`.
-   Tapping this button will open a modal dialog for building a filter query.
-   The user can add one or more filter conditions.
-   For each condition, the user selects a field from a list of all columns marked `"filterable": true`.
-   The UI for entering the filter value will adapt based on the column's `type`:
    -   `string`: A text input for "contains" filtering.
    -   `number`, `date`: Inputs for a numeric or date range.
    -   `boolean`, `status_lookup`: A dropdown list for selecting one or more predefined values.
-   All filtering will be performed client-side.

### 6.5. User Preferences

-   To enhance usability, user preferences for the assignment list will be stored locally.
-   This includes which columns are toggled for the default view and the current sort order.
-   These preferences will be saved in the `app_metadata` table in IndexedDB, keyed by the activity ID, ensuring they persist between sessions for each specific activity.

### 6.6. Search

-   To provide quick access, a real-time search functionality is implemented directly on the `AssignmentListPage`.
-   **UI:** A search icon in the navbar enables an expandable search bar.
-   **Logic:** The search is performed client-side as the user types. It is case-insensitive and matches the search term against the values of all columns marked as `"filterable": true` in the `form_schema`.
-   This allows users to rapidly find assignments by typing any relevant information, such as a family name, status, or any other data point made filterable in the schema.