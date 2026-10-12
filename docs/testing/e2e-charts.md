# E2E testing guide

How to write end-to-end tests for MealMarket, how to name their selectors,
and how to keep `selectors.md` (the component dictionary) accurate.

The dictionary itself lives in `selectors.md`. This file is the *process*.

---

## 1. When to write an e2e test

E2E tests cover **journeys** — a user path that spans more than one
component and, usually, a route change.

Write an e2e when:

- The assertion needs two or more components to interact.
  (Dialog closes → chip updates; submit → redirect → list shows the row.)
- The assertion needs a real route change.
- The assertion needs a real HTTP round-trip through the app's service
  layer (in mock mode, the mock service).

Do **not** write an e2e when:

- The assertion is about one component's behaviour. (Disabled states,
  preselected values, validation, empty states, chips, formats.) Write a
  spec instead.
- The assertion is about a pure function or a service method. Write a
  unit test.
- A cheaper test already proves the same thing. Don't duplicate.

If a cheaper test can prove it, keep it out of e2e.

---

## 2. Naming rules

Every testable element has one `data-testid`. The name follows the kind
of element.

### Actions

Buttons, links that change state, and anything the user *does*.

Pattern: `<verb>-<component>-<identifier>`

| Example | Meaning |
|---|---|
| `edit-ingredient-chip-<id>` | Edit button on an ingredient chip |
| `remove-location-chip-<id>` | Remove button on a location chip |
| `submit-meal-editor` | Submit button on the meal editor |
| `next-composition-meal-editor` | "Continue to composition" button |
| `create-ingredient-chip` | "Create ingredient" button |
| `clear-all-advanced-filter` | "Clear all" button |

### Containers

Elements that hold other elements and are used to *scope* a query.

Pattern: `<component>[-<part>]`

| Example | Meaning |
|---|---|
| `meal-table` | The meals table |
| `meal-editor-content` | The editor's main container |
| `ingredient-dropdown` | The ingredient autocomplete dropdown |
| `active-filter-bar` | The badge row |

### Controls

Inputs, selects, or elements identified by *what they are*.

Pattern: `<component>-<element>[-<variant>]`

| Example | Meaning |
|---|---|
| `step-identity-name` | The name input in step 1 |
| `meal-filters-status-select` | The status select in the filter bar |
| `location-form-city` | The city select in the location form |
| `advanced-filter-min-price` | The min-price slider |

### Iterated elements

One testid per item in an `@for` loop.

Pattern: `<component>-<element>-<id>`

| Example | Meaning |
|---|---|
| `ingredient-chip-<id>` | One selected ingredient chip |
| `meal-table-row-<id>` | One row |
| `location-form-city-option-<id>` | One city option |

### Options inside a dropdown

Pattern: `<component>-option-<id>`

| Example | Meaning |
|---|---|
| `ingredient-option-<id>` | One ingredient result |
| `location-option-<id>` | One location result |
| `sort-dropdown-option-<id>` | One sort option |

### General rules

- **Kebab-case always.** No camelCase, no underscores.
- **Attribute is `data-testid`, always.** Never `id`, never a class.
- **Dynamic values use `[attr.data-testid]`.** Never
  `data-testid="prefix-{{var}}"` — Angular treats it as a property
  binding and it fails silently. Use
  `[attr.data-testid]="'prefix-' + var"`.
- **Iterated component roots get no testid.** Use the Angular selector
  (`app-meal-card`) and expose identity through `data-*` attributes on
  the element.
- **Existing testids stay until a deliberate rename pass.** New elements
  follow the convention; old ones migrate as a batch, not piecemeal.

---

## 3. When to add a `data-*` attribute

A testid identifies an element. An attribute exposes a raw value the
element's text does not show.

**Add a `data-*` attribute when the value the test needs is not the
displayed text.** That's the whole rule. The three cases below cover
everything in practice.

### Numbers that are rendered with formatting

A price displays `4 500 FCFA`. The test needs `4500`. Add `data-amount`.

```html
<span [attr.data-amount]="price" data-testid="price-tag">
  {{ price | appAmount }}
</span>
```

| Attribute | On | Holds |
|---|---|---|
| `data-amount` | `price-tag`, `meal-table-price` | Numeric price |
| `data-rating` | `vendor-card-rating` | Numeric rating |

### Identifiers the element does not show

A row shows a meal name. The test needs the meal's UUID to assert on a
later route. Add `data-meal-id`.

| Attribute | On | Holds |
|---|---|---|
| `data-meal-id` | `meal-table-row-<id>` | Meal UUID |
| `data-vendor-id` | `vendor-card-<id>`, `meal-card` | Vendor UUID |
| `data-ingredient-id` | `ingredient-chip-<id>`, `ingredient-option-<id>` | Ingredient UUID |
| `data-location-id` | `location-chip-<id>`, `location-option-<id>` | Location UUID |

### Values used to filter or branch in the test

The test reads a status, a key, or a value to decide what to assert.
Add the exact value the app uses.

| Attribute | On | Holds |
|---|---|---|
| `data-moderation-status` | chips, table rows | Moderation status enum |
| `data-key` | `active-filter-<key>` | Filter key |
| `data-value` | `active-filter-<key>` | Filter value |
| `data-ingredient-name` | `ingredient-chip-<id>` | Ingredient name |
| `data-location-name` | `location-chip-<id>` | Location name |
| `data-route` | `header-menu-child-<label>` | Route path |

### Rules

- **The attribute is in addition to the displayed text, never instead.**
  `{{ price | appAmount }}` stays. `[attr.data-amount]` is added.
- **Only add an attribute the test actually uses.** An attribute nobody
  reads is dead weight.
- **Never add an attribute to replace a testid.** Both have jobs; keep
  them separate.

---

## 4. The dictionary

Every testid and attribute is catalogued in `selectors.md`, grouped by
component, with each component's direct children listed.

- Before writing an e2e, look up the components of the page in the
  dictionary.
- Before adding a testid, follow the naming rules above and then add the
  entry to the dictionary.
- If the template and the dictionary disagree, the template wins and the
  dictionary gets fixed.

---

## 5. How to keep the dictionary in sync

The dictionary drifts if a template changes and nobody updates the file.
The AI prompt in `selectors.md` is the tool for fixing drift. It lives
in that file so it sits next to the thing it maintains.

When you change a component's template:

1. Add or rename testids following the rules in §2.
2. Copy the template and the current `selectors.md` into an AI.
3. Use the prompt at the bottom of `selectors.md`.
4. Paste the AI's output back into `selectors.md`.
5. Commit both the template change and the dictionary change together.

If both files are not in the same commit, the dictionary is stale.

### Optional check

A grep-based check catches drift at PR time. Add to CI:

```sh
# Extract every data-testid from every template.
grep -rhoE 'data-testid="[^"]+"' src/app --include="*.html" \
  | sed 's/data-testid="//;s/"$//' \
  | sort -u > /tmp/testids-in-code.txt

# Extract every testid from the dictionary (first column, backtick-quoted).
grep -oE '^\| `[^`]+`' docs/testing/selectors.md \
  | sed 's/^| `//;s/`$//' \
  | sort -u > /tmp/testids-in-docs.txt

# Diff. Anything in the code but not the docs is a missing entry.
comm -23 /tmp/testids-in-code.txt /tmp/testids-in-docs.txt
```

Any output means the dictionary is behind the code. This is a signal,
not a gate — some testids are intentionally absent (e.g. ones only used
by a spec).