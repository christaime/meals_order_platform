# Component selectors dictionary

Reference of every `data-testid` and `data-*` attribute used by the e2e tests,
grouped by component. This file is a **dictionary**, not a guide.

If you are adding a new testid, or changing an existing one, update the
component's section here in the same commit. The section format is fixed so
the change is a clean one-block diff.

- For the naming convention, see `e2e-charts.md`.
- For why an e2e test exists vs. a spec, see `e2e-charts.md`.

---

## Conventions at a glance

- `data-testid` — universal attribute for test targets.
- `data-*` — additional attributes that expose a raw value the display does
  not show (see the attribute table in `e2e-charts.md`).
- Values in `<angle-brackets>` are placeholders (an id, an index, a key).

---

## Components

Each section lists:

- **Selector** — the Angular element selector.
- **Description** — one line, what the component is.
- **Testids** — every `data-testid` the component renders.
- **Attributes** — every `data-*` the component renders.
- **Children** — the *direct* children this component hosts, with a one-line
  description. The dictionary is a tree: to find a grandchild, look up the
  child's section.

---

### `app-meal-catalog-view`

**Description:** Public meal catalog — search, chips, sort, pagination.

**Testids:**
| Testid | Element |
|---|---|
| `search-bar-input` | Search input |
| `search-bar-clear` | Clear-search button |
| `subcategory-chip-<KIND>-<id>` | Shortcut chip (KIND = `CUISINE` \| `DISH_TYPE`) |
| `sort-dropdown-trigger` | Sort dropdown button |
| `sort-dropdown-option-<id>` | Sort option |
| `pagination` | Paginator root |
| `pagination-page-<n>` | Page button |
| `active-filter-bar` | Active-filter badge row |
| `active-filter-<key>` | Single badge |
| `remove-active-filter-<key>` | Badge removal button |
| `clear-all-active-filter` | Clear-all button |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-key` | `active-filter-<key>` | Filter key |
| `data-value` | `active-filter-<key>` | Filter value |

**Children:**
- `app-meal-card` — one meal card in the grid.
- `app-meal-card-skeleton` — loading placeholder.
- `app-sub-category-filter-chips` — the shortcut chip row.
- `app-search-bar` — the search input.
- `app-sort-dropdown` — the sort control.
- `app-active-filter-badges` — the badge row.
- `app-pagination-controls` — the paginator.
- `app-advanced-filter-drawer` — the advanced filter trigger + drawer.

---

### `app-meal-card`

**Description:** One meal card in a listing.

**Testids:**
| Testid | Element |
|---|---|
| `meal-card-name` | Meal name |
| `meal-card-description` | Meal description |
| `meal-card-vendor` | Vendor business name |
| `meal-card-price` | Price wrapper |
| `price-tag` | Price element |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-amount` | `price-tag` | Numeric price |
| `data-vendor-id` | inner `<div>` | Vendor UUID |

**Children:**
- `app-icon`
- `app-rating-stars`
- `app-badge`
- `app-price-tag`

---

### `app-meal-card-skeleton`

**Description:** Loading placeholder for a meal card.

**Testids:** none (identified by the `app-meal-card-skeleton` selector).

**Attributes:** none.

**Children:** none.

---

### `app-sub-category-filter-chips`

**Description:** The shortcut chip row under the toolbar.

**Testids:**
| Testid | Element |
|---|---|
| `subcategory-chip-<KIND>-<id>` | One chip |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `aria-pressed` | `subcategory-chip-<KIND>-<id>` | `"true"` when selected |

**Children:**
- `app-icon` — optional chip icon.

---

### `app-search-bar`

**Description:** The search input and its clear button.

**Testids:**
| Testid | Element |
|---|---|
| `search-bar-input` | The `<input>` |
| `search-bar-clear` | Clear button (rendered when text is present) |

**Attributes:** none.

**Children:**
- `app-icon`

---

### `app-sort-dropdown`

**Description:** The sort dropdown.

**Testids:**
| Testid | Element |
|---|---|
| `sort-dropdown-trigger` | Trigger button |
| `sort-dropdown-option-<id>` | One option |

**Attributes:** none.

**Children:**
- `app-icon`

---

### `app-active-filter-badges`

**Description:** Row of active-filter chips, one per active filter.

**Testids:**
| Testid | Element |
|---|---|
| `active-filter-bar` | The row wrapper |
| `active-filter-<key>` | One badge |
| `remove-active-filter-<key>` | Badge removal button |
| `clear-all-active-filter` | "Tout effacer" |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-key` | `active-filter-<key>` and `remove-active-filter-<key>` | Filter key |
| `data-value` | `active-filter-<key>` and `remove-active-filter-<key>` | Filter value |

**Children:**
- `app-icon`

---

### `app-pagination-controls`

**Description:** The paginator.

**Testids:**
| Testid | Element |
|---|---|
| `pagination` | Root |
| `pagination-page-<n>` | Page button |

**Attributes:** none.

**Children:**
- `app-icon`

---

### `app-advanced-filter-drawer`

**Description:** The advanced filter drawer and its trigger.

**Testids:**
| Testid | Element |
|---|---|
| `advanced-filter-trigger` | Trigger button |
| `advanced-filter-backdrop` | Backdrop |
| `advanced-filter-drawer` | Drawer |
| `advanced-filter-close` | Close button |
| `advanced-filter-min-price` | Min-price slider |
| `advanced-filter-max-price` | Max-price slider |
| `advanced-filter-max-prep-time` | Prep-time slider |
| `advanced-filter-rating-<value>` | Rating button (`0`, `3`, `4`, `4.5`) |
| `advanced-filter-apply` | Apply button |
| `clear-all-advanced-filter` | Clear-all button |

**Attributes:** none.

**Children:**
- `app-icon`
- `app-category-pills-selector` — the cuisine / dish-type pills.
- `app-ingredient-autocomplete` — the excluded-ingredients input.

---

### `app-category-pills-selector`

**Description:** Multi-select pill group for categories of a given type.

**Testids:**
| Testid | Element |
|---|---|
| `category-pill-<TYPE>-<id>` | One pill (TYPE = `CUISINE` \| `DISH_TYPE`) |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `aria-pressed` | `category-pill-<TYPE>-<id>` | `"true"` when selected |

**Children:**
- `app-icon`

---

### `app-ingredient-autocomplete`

**Description:** Multi-select ingredient autocomplete, used to build an
exclusion list.

**Testids:**
| Testid | Element |
|---|---|
| `ingredient-autocomplete-input` | Search input |
| `ingredient-autocomplete-dropdown` | Results dropdown |
| `ingredient-autocomplete-empty` | "No match" message |
| `ingredient-autocomplete-limit-hint` | Limit-reached hint |
| `ingredient-option-<id>` | One result |
| `ingredient-chip-<id>` | One selected chip |
| `ingredient-chip-remove-<id>` | Chip removal button |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-ingredient-id` | option and chip | Ingredient UUID |
| `data-ingredient-name` | option | Ingredient name |

**Children:**
- `app-icon`

---

### `app-meals-page`

**Description:** Vendor and admin meals management page (same component,
different scope via route data).

**Testids:**
| Testid | Element |
|---|---|
| `meals-page` | Root |
| `meals-page-title` | Page title |
| `meals-page-new-button` | "Nouveau plat" button (vendor only) |
| `meals-page-admin-left` | Left column (admin only) |
| `meals-page-admin-right` | Right column (admin only) |
| `meals-page-admin-no-vendor` | "Select a vendor" state (admin only) |
| `meals-page-admin-hint` | "Select a meal" hint (admin only) |

**Attributes:** none.

**Children:**
- `app-meal-filters` — the filter bar.
- `app-meal-table` — the meals table.
- `app-paginator` — pagination.
- `app-vendor-picker` — vendor selector (admin only).
- `app-meal-references-panel` — references of the selected meal (admin only).
- `app-moderation-panel` — moderation actions (admin only).

---

### `app-meal-filters`

**Description:** Filter bar for the meals management page.

**Testids:**
| Testid | Element |
|---|---|
| `meal-filters-name-input` | Name search input |
| `meal-filters-status-select` | Moderation-status select |
| `meal-filters-sort-select` | Sort select |

**Attributes:** none.

**Children:**
- `app-icon`
- `app-inline-location-selector` — city + location chips.
- `app-advanced-filter-drawer` — the advanced filter trigger.

---

### `app-inline-location-selector`

**Description:** City select plus a location chip selector, scoped by vendor.

**Testids:**
| Testid | Element |
|---|---|
| `inline-location-selector-city` | City select |
| `inline-location-selector-input` | Location search input |
| `inline-location-selector-dropdown` | Results dropdown |
| `inline-location-selector-empty` | "No match" message |
| `inline-location-selector-option-<id>` | One result |
| `inline-location-selector-chip-<id>` | One selected chip |
| `inline-location-selector-remove-<id>` | Chip removal button |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-location-id` | option and chip | Location UUID |

**Children:**
- `app-icon`

---

### `app-meal-table`

**Description:** The meals table (vendor and admin scopes).

**Testids:**
| Testid | Element |
|---|---|
| `meal-table` | Root |
| `meal-table-row-<id>` | One row |
| `meal-table-name` | Meal name cell |
| `meal-table-price` | Price cell |
| `meal-table-ingredient-count` | Ingredient-count cell |
| `meal-table-location-count` | Location-count cell |
| `meal-table-status-<id>` | Status cell |
| `meal-table-edit-<id>` | Edit button (vendor) |
| `meal-table-delete-<id>` | Delete button (vendor) |
| `meal-table-select-<id>` | Select button (admin) |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-meal-id` | `meal-table-row-<id>` | Meal UUID |
| `data-amount` | `meal-table-price` | Numeric price |
| `data-ingredient-count` | `meal-table-ingredient-count` | Ingredient count |
| `data-allergen-count` | `meal-table-ingredient-count` | Allergen count |
| `data-location-count` | `meal-table-location-count` | Location count |

**Children:**
- `app-icon`
- `app-badge`

---

### `app-vendor-picker`

**Description:** Searchable vendor selector with chips.

**Testids:**
| Testid | Element |
|---|---|
| `vendor-picker-search` | Search input |
| `vendor-picker-list` | Results list |
| `vendor-picker-option-<id>` | One result |
| `vendor-picker-chip-<id>` | One selected chip |
| `vendor-picker-empty` | "No vendor" message |
| `vendor-picker-hint` | "Type at least 2 chars" hint |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-vendor-id` | option and chip | Vendor UUID |

**Children:**
- `app-icon`

---

### `app-moderation-panel`

**Description:** Moderation actions for a category, ingredient, meal or
location, depending on the current status.

**Testids:**
| Testid | Element |
|---|---|
| `moderation-panel` | Root |
| `moderation-panel-status` | Status badge wrapper |
| `moderation-panel-reason` | Reason textarea |
| `moderation-panel-decision-<DECISION>` | One decision button (DECISION = `APPROVE` \| `REJECT` \| `DISABLE` \| `REVOKE` \| `REACTIVATE`) |
| `moderation-panel-error` | Error message |
| `moderation-panel-no-decision` | "No action available" state |
| `moderation-panel-latest` | Latest-action recap |
| `moderation-panel-latest-reason` | Latest-action reason |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-status` | `moderation-panel-status` | Current `ModerationStatus` |
| `data-decision` | `moderation-panel-decision-<DECISION>` | The decision value |

**Children:**
- `app-icon`
- `app-badge`

---

### `app-meal-references-panel`

**Description:** Lists an ingredient's or location's references to meals,
used in the admin moderation view.

**Testids:**
| Testid | Element |
|---|---|
| `meal-references-panel` | Root |
| `meal-references-loading` | Loading state |
| `meal-references-error` | Error state |
| `meal-references-no-selection` | "Select a meal" state |
| `meal-references-ingredient-<id>` | One ingredient row |
| `meal-references-location-<id>` | One location row |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-ingredient-id` | `meal-references-ingredient-<id>` | Ingredient UUID |
| `data-location-id` | `meal-references-location-<id>` | Location UUID |

**Children:**
- `app-icon`
- `app-badge`

---

### `app-delete-entity-dialog`

**Description:** Confirmation dialog for deleting a moderable entity.

**Testids:**
| Testid | Element |
|---|---|
| `delete-entity-dialog` | Root |
| `delete-entity-dialog-title` | Title |
| `delete-entity-dialog-body` | Body |
| `delete-entity-dialog-reason` | Reason textarea |
| `delete-entity-dialog-cancel` | Cancel button |
| `delete-entity-dialog-confirm` | Confirm button |

**Attributes:** none.

**Children:**
- `app-icon`

---

### `app-meal-editor-page`

**Description:** The meal editor, three steps plus a live preview.

**Testids:**
| Testid | Element |
|---|---|
| `meal-editor-content` | The page grid (form + preview) |
| `meal-editor-preview` | The preview card |
| `meal-editor-preview-skeleton` | Preview skeleton |
| `meal-editor-next-composition` | "Continue" to step 2 |
| `meal-editor-next-pricing` | "Continue" to step 3 |
| `meal-editor-submit` | Submit button |

**Attributes:** none.

**Children:**
- `app-step-identity` — step 1.
- `app-step-composition` — step 2.
- `app-step-pricing` — step 3.
- `app-meal-card` — the preview.

---

### `app-step-identity`

**Description:** Step 1 of the meal editor — name, cuisine, dish type,
description, image.

**Testids:**
| Testid | Element |
|---|---|
| `step-identity-name` | Name input |
| `step-identity-description` | Description textarea |
| `step-identity-cuisines` | Cuisine pills group |
| `step-identity-dish-types` | Dish-type pills group |

**Attributes:** none.

**Children:**
- `app-category-pills-selector` — the cuisine / dish-type pills.
- `app-image-uploader` — the meal image uploader.

---

### `app-step-composition`

**Description:** Step 2 of the meal editor — prep time and ingredients.

**Testids:**
| Testid | Element |
|---|---|
| `step-composition-prep-time` | The prep-time slider |
| `step-composition-prep-time-value` | The formatted value |
| `ingredient-input` | Ingredient chip input |
| `ingredient-dropdown` | Results dropdown |
| `ingredient-option-<id>` | One result |
| `ingredient-chip-<id>` | One selected chip |
| `create-ingredient-chip` | "Create" button |
| `edit-ingredient-chip-<id>` | Chip edit button |
| `remove-ingredient-chip-<id>` | Chip removal button |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-ingredient-id` | option and chip | Ingredient UUID |
| `data-ingredient-name` | chip | Ingredient name |
| `data-moderation-status` | chip | Moderation status |

**Children:**
- `app-icon`

---

### `app-step-pricing`

**Description:** Step 3 of the meal editor — price, promo price,
distribution locations.

**Testids:**
| Testid | Element |
|---|---|
| `step-pricing-price` | Price input |
| `step-pricing-location-input` | Location chip input |
| `location-option-<id>` | One location result |
| `location-chip-<id>` | One selected location chip |
| `create-location-chip` | "Create" button |
| `edit-location-chip-<id>` | Chip edit button |
| `remove-location-chip-<id>` | Chip removal button |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-location-id` | option and chip | Location UUID |
| `data-location-name` | chip | Location name |
| `data-moderation-status` | chip | Moderation status |

**Children:**
- `app-icon`

---

### `app-ingredient-form`

**Description:** Create / edit form for an ingredient, hosted in
`app-new-ingredient-dialog`.

**Testids:**
| Testid | Element |
|---|---|
| `ingredient-form-name` | Name input |
| `ingredient-form-submit` | Submit button |
| `ingredient-form-reset` | Reset / cancel button |

**Attributes:** none.

**Children:**
- `app-icon`

---

### `app-location-form`

**Description:** Create / edit form for a distribution location, hosted in
`app-new-location-dialog`.

**Testids:**
| Testid | Element |
|---|---|
| `location-form-city` | City `mat-select` |
| `location-form-city-option-<id>` | One city option |
| `location-form-name` | Name input |
| `location-form-address` | Address input |
| `location-form-submit` | Submit button |
| `location-form-cancel` | Cancel button |

**Attributes:** none.

**Children:**
- `mat-form-field`
- `mat-select`, `mat-option`
- `mat-icon`
- `mat-spinner`
- `google-map`, `map-marker`

---

### `app-new-ingredient-dialog`

**Description:** The dialog that hosts `app-ingredient-form`.

**Testids:**
| Testid | Element |
|---|---|
| `new-ingredient-dialog` | The dialog (on the title element) |

**Attributes:** none.

**Children:**
- `app-ingredient-form`

---

### `app-new-location-dialog`

**Description:** The dialog that hosts `app-location-form`.

**Testids:**
| Testid | Element |
|---|---|
| `new-location-dialog` | The dialog (on the title element) |

**Attributes:** none.

**Children:**
- `app-location-form`

---

### `app-vendor-directory-view`

**Description:** The vendor directory page — search, filters, grid of
vendors.

**Testids:**
| Testid | Element |
|---|---|
| `vendor-directory-empty` | Empty state |
| `vendor-directory-reset` | Reset button |

**Attributes:** none.

**Children:**
- `app-search-bar` — the search input.
- `app-sort-dropdown` — the sort control.
- `app-sub-category-filter-chips` — the cuisine chips.
- `app-vendor-card` — one vendor card.
- `app-pagination-controls` — the paginator.

---

### `app-vendor-card`

**Description:** One vendor card in the directory.

**Testids:**
| Testid | Element |
|---|---|
| `vendor-card-<id>` | Root |
| `vendor-card-name` | Business name |
| `vendor-card-rating` | Rating |
| `vendor-card-city` | City |
| `vendor-card-status` | Open / closed badge |
| `vendor-card-verified-tag` | Verified icon (for PRO / ENTERPRISE) |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-vendor-id` | `vendor-card-<id>` | Vendor UUID |
| `data-rating` | `vendor-card-rating` | Numeric rating |
| `data-city-id` | `vendor-card-city` | City UUID |

**Children:**
- `app-icon`
- `app-badge`
- `app-rating-stars`

---

### `app-vendor-detail-view`

**Description:** The vendor detail page — header plus that vendor's meals.

**Testids:**
| Testid | Element |
|---|---|
| `vendor-detail-view-name` | Business name |
| `vendor-detail-view-address` | Address |
| `vendor-detail-view-status` | Open / closed badge |
| `vendor-detail-view-banner` | Banner |
| `vendor-detail-view-banner-img` | Banner image |
| `vendor-detail-view-profile-img` | Profile image |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-isVendorOpen` | `vendor-detail-view-status` | `"true"` / `"false"` |

**Children:**
- `app-icon`
- `app-rating-stars`
- `app-meal-catalog-view`
- `app-floating-cart-summary`
- `app-meal-card-skeleton`

---

### `app-auth-header`

**Description:** The authenticated header, workspace-aware.

**Testids:**
| Testid | Element |
|---|---|
| `header-portal-label` | Workspace badge |
| `header-menu-container` | Primary nav |
| `header-menu-item-<i>` | Menu item |
| `header-menu-item-label` | Menu item label |
| `header-menu-dropdown-<i>` | Menu group dropdown |
| `header-menu-child-<label>` | Child link |
| `header-vendor-status` | Vendor status pill |
| `header-profile-trigger` | Profile button |
| `header-profile-initials` | Initials avatar |
| `header-profile-name-compact` | Name (wide screens) |
| `header-profile-name` | Name in the dropdown |
| `header-profile-vendor-profile` | "Mon restaurant" link |
| `header-profile-account` | "Mon compte" link |
| `header-profile-admin-settings` | "Paramètres admin" link |
| `header-profile-logout` | Logout button |

**Attributes:**
| Attribute | On | Holds |
|---|---|---|
| `data-label` | `header-menu-item-<i>` and `header-menu-child-<label>` | Item label |
| `data-route` | `header-menu-child-<label>` | Route path |

**Children:**
- `app-logo`
- `app-icon`

---

## How to keep this file up to date

Paste the component's template and this file into an AI, with the
following prompt:

> You maintain `docs/testing/selectors.md`, a dictionary of `data-testid`
> and `data-*` attributes grouped by component.
>
> **Inputs**
> - The template(s) of the component(s) that changed.
> - The current `docs/testing/selectors.md`.
>
> **Task**
> For each component whose template is provided:
> 1. Read every `data-testid` and `data-*` in the template.
> 2. Read the component's existing section in this file (if any).
> 3. Replace that section with one that exactly matches the template.
     >    Do not keep stale entries. Do not invent entries.
> 4. Update the **Children** list to match the direct children the
     >    template renders. A "direct child" is a component whose selector
     >    appears in the template — not one rendered by a child.
> 5. Leave every other section untouched.
>
> **Rules**
> - Keep the section format identical (heading, tables, Children list).
> - Keep alphabetical or logical ordering as it is; do not reshuffle.
> - Do not add commentary, dates, or "used by" lines.
> - Do not include a testid that isn't in the template.
> - If a template has no testids, write "Testids: none" instead of an
    >   empty table.
>
> **Output**
> The full updated `selectors.md`, ready to paste.

When a component is new, the AI adds a new section after the last one.
When a component is deleted, the AI removes its section. When a testid
is renamed, the AI replaces it.

---

## Verification (optional, recommended)

`selectors.md` drifts if a template changes and nobody updates the file.
A grep-based check catches it at PR time:

```sh
# scripts/verify-selectors.sh

# 1. Extract every data-testid from every template.
grep -rhoE "data-testid=\"[^\"]+\"" src/app --include="*.html" \
  | sed 's/data-testid="//;s/"$//' \
  | sort -u > /tmp/testids-in-code.txt

# 2. Extract every testid from the dictionary (backtick-quoted, first column).
grep -oE "^\| \`[^\`]+\`" docs/testing/selectors.md \
  | sed 's/^| `//;s/`$//' \
  | sort -u > /tmp/testids-in-docs.txt

# 3. Diff. Anything in the code but not the docs is a missing entry.
comm -23 /tmp/testids-in-code.txt /tmp/testids-in-docs.txt