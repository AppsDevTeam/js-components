const loadedComponents = [];
let componentsConfig = {};

const init = (selector, path) => {
	if (
		Object.keys(componentsConfig).length === 0 &&
		typeof document.querySelector(`body`).dataset.componentsConfig !== 'undefined'
	) {
		componentsConfig = JSON.parse(document.querySelector(`body`).dataset.componentsConfig);
	}

	$.nette.ext('live').after(function($el) {
		// component is already loaded
		if (loadedComponents.includes(path)) return;

		// there is no element using this component
		if (!document.querySelector(`[data-adt-${componentName}]`)) continue;

		loadedComponents.push(path);

		if (path.includes('/')) {
			import('app/' + path + '/index.js').then(component => {
				component.default.run(componentsConfig[selector] || {});
			});

		} else {
			import('adt-js-components/src/' + path + '/index.js').then(component => {
				component.default.run(componentsConfig[selector] || {});
			});
		}
	});
};

const initCurrencyInput = () => {
	init('currency-input', 'CurrencyInput');
};

const initDateInput = () => {
	init('date-input', 'DateInput');
};

const initRecaptcha = () => {
	init('recaptcha', 'Recaptcha');
};

const initSelect2 = () => {
	init('select2', 'Select2');
};

const initSubmitForm = () => {
	init('submit-form', 'SubmitForm');
};

const getFirstDiffCharIndex = (a, b) => {
	const longerLength = Math.max(a.length, b.length);
	for (let i = 0; i < longerLength; i++) {
		if (a[i] !== b[i]) return i;
	}
	return -1;
}

export const loadScssModule = (styles) => {
	const newStyles = {};
	for (let [key, value] of Object.entries(styles)) {
		const firstDiffCharIndex = getFirstDiffCharIndex(key, value);
		let newKey = value.slice(0, value.slice.length - 16).slice(2 * firstDiffCharIndex);
		newStyles[newKey] = key;
	}
	return newStyles;
}

export default {
	init,
	initCurrencyInput,
	initDateInput,
	initRecaptcha,
	initSelect2,
	initSubmitForm,
	loadScssModule,
};
