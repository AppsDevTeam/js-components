# ADT JS Components

## Installation

```
yarn add adt-js-components
```

## Usage

Nothing to install besides the package: the libraries of the built-in components (Tom Select, flatpickr,
AutoNumeric, nette-forms, Leaflet...) are its dependencies, and no jQuery is needed. Each built-in component
starts by itself (its own chunk) once its element shows up in the document, a page without it loads nothing of it.

Components of the project are registered once (Vite `import.meta.glob()`, path relative to the file):

```
import AdtJsComponents from 'adt-js-components';

AdtJsComponents.registerModules({
	// components of the project: <Name>/index.js, started by data-adt-<name in kebab-case>
	app: import.meta.glob('../../../**/index.js'),
});
```

Built-ins start on `data-adt-<name>` (e.g. `data-adt-redraw-snippet`), `Form` on any `<form>`, `Select` on
`select[data-adt-select]` (or `data-adt-select2`). Options of a component go to `data-adt-js-components` of `<body>`
(JSON keyed by the name, e.g. `{"select": {"selector": "select:not(.select-default)"}}`), options of an element to its
attribute (JSON, e.g. `data-adt-date-input='{"format": "H:i"}'`).

Components sending AJAX requests (`Form`, `RedrawSnippet`, `Recaptcha`) use [Naja](https://naja.js.org) (peer
dependency - one instance for the project and the components), the project installs and initializes it:

```
yarn add naja
```

```
import naja from 'naja';
naja.initialize();
```

## Observing elements

Components are initialized for elements already in the page and for elements added later (snippet redraw, replicator, modal...).
The same helper can be used in the project:

```
import { observe } from 'adt-js-components';

observe('[data-my-component]', (el) => { ... });                 // once for each element
observe('[data-my-component]', (els) => { ... }, { batch: true }); // all elements added at once
observe('[data-my-component]', (el) => { ... }, { once: true });   // first element only
observe('[data-my-component]', (el) => { ... }, {
	attribute: 'data-my-component', // called again when the attribute changes
	onRemove: (el) => { ... },      // element left the document (a moved element is not removed)
});
```

Attributes are observed only when some watcher asks for them.

`observe()` returns a function which stops watching.

## Upgrading from 2.x

- `nette.ajax.js` is replaced by Naja. `$.nette.ext(...)` extensions of the project have to be rewritten
  to [Naja events](https://naja.js.org/#/events), and forms and links with `class="ajax"` keep working.
- `$.fn.adtAjax()` is removed, use `naja.uiHandler.submitForm(submitter)` or `naja.uiHandler.clickElement(link)`.
- The after callback of `Form` (formerly `SubmitForm`) gets `(payload, detail)`, where `detail` is the detail of the Naja `success` event
  (`request`, `response`, `payload`, `options`), instead of `(payload, status, xhr, settings)`.
- `Form` (formerly `SubmitForm`) no longer aborts the previous request of the same element, Naja aborts the previous request itself
  (option `unique`). Redraws of `RedrawSnippet` abort only the previous redraw.
- `RedrawSnippet` redraws on `change` of a select as well (Tom Select dispatches only `change` on the hidden select).
- **No jQuery.** The package neither needs nor provides it (`$.observe()` is gone, use `observe`). A project that
  still uses jQuery itself keeps installing it.
- **Select2 is replaced by [Tom Select](https://tom-select.js.org)** (Bootstrap 5 theme). Component `Select2` is now
  `Select` and starts only on `select[data-adt-select]` / `select[data-adt-select2]`, not on every select - the old
  behaviour is `{"select": {"selector": "select:not(.select-default)"}}` in `data-adt-js-components`. The attribute
  takes Tom Select settings; the Select2 options `placeholder`, `dropdownParent`, `dropdownCssClass`, `tags`,
  `allowClear`, `minimumResultsForSearch` (also `data-minimum-results-for-search`) are converted. Code calling
  `$(el).select2(...)` or listening to `select2:*` events has to use the Tom Select API (`el.tomselect`) and its events;
  the native `change` of the select is dispatched as before.
- `AjaxSelect` uses Tom Select too, the attributes (`data-adt-ajax-select`, `data-ajax-select-options`,
  `data-allow-new-value`) and the request (`entityName`, `entityOptions[...]`) stay.
- `DateInput` with `type="time"` uses flatpickr (time only) instead of the jQuery plugin timepicker; `format`,
  `minTime`, `maxTime` stay.
- `Replicator` no longer needs the jQuery plugin forms-replicator. Code calling `$(el).formReplicator(...)` with own
  callbacks has to keep that plugin (and jQuery) or listen to the changes of the DOM (`observe`).
- Components `TinyMCE`, `Messaging` and `Notifications` are removed (push notifications: Web Push of FancyAdmin).
- Built-ins need no registration: the `builtin` scope of `registerModules()` and the `init*()` functions
  (`initForm()`, `initSelect2()`...) are removed. `init(selector, path, cssSelector)` stays for own selectors.
- Options in data attributes must be valid JSON (jQuery `.data()` silently passed anything else as a string).

## Configuration

JsComponentsConfig.php and in config.neon `services.jsComponents`

## Generic component

For example, there's an ExampleForm located in /app/Components/Forms/ExampleForm

1. Attribute `data-adt-example-form` (directory name in kebab-case) must be included in your HTML.
2. In `/app/Components/Forms/ExampleForm` create `index.js` with

```
const run = (options) => {
    ... your code ...
};

export default { run };
```

3. It loads by itself when the `app` glob of `registerModules()` covers it. A different selector:
   `AdtJsComponents.init('my-selector', 'Components/Forms/ExampleForm')`.


## Predefined components

### Currency Input

`data-adt-currency-input` (AutoNumeric).

### Date Input

`data-adt-date-input` with JSON options (`format`, `value`, `minDate`, `maxDate`, `minTime`, `maxTime`, `altInput`...) -
flatpickr, `type="time"` only the time, the language from `<html lang>`.

### Recaptcha

`data-adt-recaptcha` on the form.

### Select

`select[data-adt-select]` (or `data-adt-select2`) with optional JSON settings of [Tom Select](https://tom-select.js.org/docs/).
A select with the Nette prompt (`<option value="">`) that is not required gets a clear button, a multiple select
remove buttons. `.select-default` around a select keeps the native one.

### Form

Loads once the page has any `<form>`. It loads [nette-forms](https://github.com/nette/forms) itself - client-side
validation of all forms, `window.Nette` for Naja - so the project does not import it. Forms with the attribute
`data-adt-submit-form` additionally get the spinner on the submit button, locking while submitting and errors
rendered next to the inputs (`data-adt-errors-for`).

On each submit before and after callback can be added.
Before callback is invoked before submit and form is not submitted if the function return false.
After callback is invoked after successed submit.

```html
<script>
	function myConfirm() {
		return confirm('Do you realy want to submit the form?');
	}
	function myAlert() {
		alert('Data was saved.');
	}
</script>

<button ... data-adt-submit-form-before-callback="myConfirm" data-adt-submit-form-after-callback="myAlert">Submit</button>
```

### Ajax Select

`data-adt-ajax-select` (adt/ajax-select) - Tom Select loading the items from the server. Selects out of the viewport
are built only when they get close to it or get focus.

### Replicator

`data-adt-replicator="<html of a new row>"` (kdyby/replicator) with rows `[data-adt-replicator-item]`, buttons
`[data-adt-replicator-add]` and `[data-adt-replicator-remove]`. A new row gets `_new_<n>` instead of `_new_` in ids,
names, labels and Nette rules (toggles included). `data-adt-replicator-add-before-callback="fn"` on the add button
can cancel adding (`window.fn(button)` returns false), `data-adt-replicator-depth` = depth of a nested replicator.

### Input Clear

`data-adt-input-clear` with JSON options: `selector` (inputs to clear, required) and `confirmMessage`.

```html
<div data-adt-input-clear='{"selector": ".input-clear-all", "confirmMessage": "Do you really want to clear all inputs?"}'>Clear all</div>
<div data-adt-input-clear='{"selector": ".input-clear-special"}'>Clear special</div>

<input type="text" name="input1" class="input-clear-all input-clear-special">
<input type="text" name="input2" class="input-clear-all">
<input type="text" name="input3" class="input-clear-all input-clear-special">
```
