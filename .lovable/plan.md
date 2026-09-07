# Plan: Activities Management — remove Available controls from grid, add Published/Unpublished to edit form

## Scope
File: `src/pages/admin/ActivitiesManagement.tsx` only. No database changes.

## 1. Card grid view — remove Available controls
In the card (grid) view, remove from each activity card:
- The **availability_status Badge** (the "Available"/"Not Available" tag) in the header badge stack. Keep only the Published/Unpublished badge.
- The **"Available"/"Unavailable" text button** (`toggleAvailability` button) in the card-footer action row. Keep the Published/Unpublished toggle (`ToggleRight`/`ToggleLeft`) button.

So a card shows: image, title, description, Published/Unpublished badge, and the Edit / Delete / published-toggle actions.

The `toggleAvailability` function stays (still used by the list/table view and the form), so no dead-code removal.

## 2. Edit / Update form — add Published/Unpublished status field
Add a new form field under the "Basic Information" section (or a small "Status" section) that controls `is_active`:

- Label: **Status**
- Options: **Published** (`is_active = true`) and **Unpublished** (`is_active = false`)
- Implemented as a `Select` (consistent with the existing Availability Status select).
- Prefilled when editing from `activity.is_active`.
- Included in `handleSubmit` payload so saving sets `is_active` (currently only set to `true` on create and toggled via the grid button).
- New activities default to **Published**.

This lets admins change published/unpublished from the edit page instead of only via the grid toggle.

## 3. No other changes
- List/table view unchanged (keeps its Status and Availability columns and toggles).
- Availability Status (Available/Unavailable) field in the form unchanged.
- Frontend Activities page behavior unchanged.
- No database/migration changes.

## Verification
- Build passes (typecheck).
- Grid view cards no longer show Available tag or Available button.
- Edit form shows a Status select with Published/Unpublished, prefilled correctly, and saving updates `is_active`.
