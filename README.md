# ADT JS Components

## Installation

```
yarn add adt-js-components
```

## Usage

```
import AdtJsComponents from 'adt-js-components'
```

Components sending AJAX requests (`SubmitForm`, `RedrawSnippet`, `Recaptcha`, `Notifications`) use [Naja](https://naja.js.org),
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
```

`observe()` returns a function which stops watching. `$.observe(selector, callback)` is kept as an alias.

## Upgrading from 2.x

- `nette.ajax.js` is replaced by Naja. `$.nette.ext(...)` extensions of the project have to be rewritten
  to [Naja events](https://naja.js.org/#/events), and forms and links with `class="ajax"` keep working.
- `$.fn.adtAjax()` is removed, use `naja.uiHandler.submitForm(submitter)` or `naja.uiHandler.clickElement(link)`.
- The after callback of `SubmitForm` gets `(payload, detail)`, where `detail` is the detail of the Naja `success` event
  (`request`, `response`, `payload`, `options`), instead of `(payload, status, xhr, settings)`.
- `SubmitForm` no longer aborts the previous request of the same element, Naja aborts the previous request itself
  (option `unique`). Redraws of `RedrawSnippet` abort only the previous redraw.
- `RedrawSnippet` redraws on `change` of a select as well, so it works with Select2.

## Configuration

JsComponentsConfig.php and in config.neon `services.jsComponents`

## Generic component

For example, there's an ExampleForm located in /app/Components/Forms/ExampleForm

1. Create your own data selector, for example `example-form`.
2. Attribute `data-adt-example-form` must be included in your HTML.
3. `path` starts at /app but excludes it, so it will be `Components/Forms/ExampleForm`
4. In `/app/Components/Forms/ExampleForm` create `index.js` with

```
const run = (options) => {
    ... your code ...
};

export default { run };
```

5. In your project JS (`app.js`) add

```
AdtJsComponents.init('example-form', 'Components/Forms/ExampleForm');
```

6. Example of `resolve` in your project `webpack.config.js`, if all applications js modules are relatively to `app`.

```
resolve: {
	modules: ['node_modules'],
	alias: {
		JsComponents: path.resolve(__dirname, 'app')
	}
}
```


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

### Submit Form

Attribute `data-adt-submit-form` must be included in your HTML!

```
AdtJsComponents.initSubmitForm();
```

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
