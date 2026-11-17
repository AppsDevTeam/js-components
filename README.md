# ADT JS Components

## Installation

```
yarn add adt-js-components
```

## Usage

Register the modules once (Vite `import.meta.glob()`, paths relative to the file). Nothing else is called:
every registered component loads lazily (its own chunk) once its element shows up in the document.

```
import AdtJsComponents from 'adt-js-components';

AdtJsComponents.registerModules({
	// components of the project: <Name>/index.js, started by data-adt-<name in kebab-case>
	app: import.meta.glob('../../../**/index.js'),
	// built-in components the project uses (and has installed their packages)
	builtin: import.meta.glob('../../../../../node_modules/adt-js-components/src/{Form,RedrawSnippet,InputClear,Replicator}/index.js'),
});
```

Built-ins start on `data-adt-<name>` (e.g. `data-adt-redraw-snippet`), `Form` on any `<form>`. The `init*()`
functions (`initForm()`, `initSelect2()`...) still work, but registration alone is enough since 3.2.

Components sending AJAX requests (`Form`, `RedrawSnippet`, `Recaptcha`, `Notifications`) use [Naja](https://naja.js.org),
the project has to install and initialize it:

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

`observe()` returns a function which stops watching. `$.observe(selector, callback)` is kept as an alias.

## Upgrading from 2.x

- `nette.ajax.js` is replaced by Naja. `$.nette.ext(...)` extensions of the project have to be rewritten
  to [Naja events](https://naja.js.org/#/events), and forms and links with `class="ajax"` keep working.
- `$.fn.adtAjax()` is removed, use `naja.uiHandler.submitForm(submitter)` or `naja.uiHandler.clickElement(link)`.
- The after callback of `Form` (formerly `SubmitForm`) gets `(payload, detail)`, where `detail` is the detail of the Naja `success` event
  (`request`, `response`, `payload`, `options`), instead of `(payload, status, xhr, settings)`.
- `Form` (formerly `SubmitForm`) no longer aborts the previous request of the same element, Naja aborts the previous request itself
  (option `unique`). Redraws of `RedrawSnippet` abort only the previous redraw.
- `RedrawSnippet` redraws on `change` of a select as well, so it works with Select2.

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

Attribute `data-adt-currency-input` must be included in your HTML!

```
AdtJsComponents.initCurrencyInput();
```

### Date Input

Attribute `data-adt-date-input` must be included in your HTML!

```
AdtJsComponents.initDateInput();
```

### Recaptcha

Attribute `data-adt-recaptcha` must be included in your HTML!

```
AdtJsComponents.initRecaptcha();
```

### Select 2

Attribute `data-adt-select2` must be included in your HTML!

```
AdtJsComponents.initSelect2();
```

### Form

```
yarn add nette-forms
```

```
AdtJsComponents.initForm();
```

Loads once the page has any `<form>` (register `Form` among the builtin modules). It loads
[nette-forms](https://github.com/nette/forms) itself - client-side validation of all forms, `window.Nette` for Naja -
so the project does not import it. Forms with the attribute `data-adt-submit-form` additionally get the spinner
on the submit button, locking while submitting and errors rendered next to the inputs (`data-adt-errors-for`).

`initSubmitForm()` (component `SubmitForm` up to 3.0) is a deprecated alias of `initForm()`; a project registering
`SubmitForm` in `registerModules()` has to register `Form` instead.

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

Attribute `data-adt-ajax-select` must be included in your HTML!

```
AdtJsComponents.initAjaxSelect();
```

### Input Clear

Attribute `data-adt-input-clear` must be included in your HTML!

The option `selector` have to be set to select inputs to clear.

The option `confirmMessage` can be set to clear confirmation.

```
AdtJsComponents.initInputClear();
```

```html
<div data-adt-input-clear="{selector: '.input-clear-all', confirmMessage: 'Do you really want to clear all inputs?'}">Clear all</div>
<div data-adt-input-clear="{selector: '.input-clear-special'}">Clear special</div>

<input type="text" name="input1" class="input-clear-all input-clear-special">
<input type="text" name="input2" class="input-clear-all">
<input type="text" name="input3" class="input-clear-all input-clear-special">
```
