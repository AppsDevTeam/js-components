# ADT JS Components

## Installation

```
yarn add adt-js-components
```

## Usage

```
import AdtJsComponents from 'adt-js-components'
```

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

Own confirm function can be added on each submit.
Function is invoked before submit and form is not submitted if the function return false.

```html
<script>
	function myConfirm() {
		return confirm('Do you realy want to submit the form?');
	}
</script>

<button ... data-adt-submit-form-confirm-callback="myConfirm">Submit</button>
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
