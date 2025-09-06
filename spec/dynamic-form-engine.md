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

## 4. Schema Versioning

1.  **Detection:** Before displaying a list of assignments, the PWA will check if the `form_schema` version stored locally matches the version from the server.
2.  **Notification:** If a newer version exists, a blocking pop-up will be shown on the **Activity Dashboard Page**, informing the user that an update is required before they can proceed.
3.  **Data Migration:** When a user opens a form with a new schema, the PWA will attempt to map the old response data to the new schema. Data for questions whose `id` no longer exists in the new schema will be moved to a special `_archivedData` object within the `responses` JSON blob for audit purposes.

## 5. Validation & Summary Feature

### 5.1. Validation Rules

The `validation` object on a question will define its rules.

-   `"required": true`: The field cannot be empty.
-   `"requiredIf": string`: A JavaScript function string (see Section 3) that makes the field required only if the logic returns `true`.
-   `"minLength": number`, `"maxLength": number`: For text.
-   `"min": number`, `"max": number`: For numbers.
-   `"custom": string`: A JavaScript function string (see Section 3) that returns `true` if valid, or a `string` error message if invalid.
-   `"level": "error" | "warning"`: (Optional) Defaults to `"error"`. An `"error"` blocks submission. A `"warning"` does not.

### 5.2. Inline Validation

To provide a smooth user experience, inline validation messages (the error or warning text appearing below a field) **must** only be displayed after the user has interacted with and left the field. This is typically handled by triggering the validation check on the input's `blur` event.

### 5.3. Summary Feature

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

### 5.4. Roster Validation IDs

To uniquely identify each question within a repeating roster, the validation engine will use a dot-notation path for question IDs. This path is constructed as `rosterId.index.questionId`.

-   **Example:** For a roster with `id: "anggota_rumah_tangga"`, the `nama_art` question for the first person in the roster will have a validation ID of `anggota_rumah_tangga.0.nama_art`.
