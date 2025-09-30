const loadedComponents = [];
let componentsConfig = {};

const init = (selector, path) => {
	let bodyDataset = document.querySelector(`body`).dataset.adtJsComponents;

	if (
		Object.keys(componentsConfig).length === 0 && typeof bodyDataset !== 'undefined'
	) {
		componentsConfig = JSON.parse(bodyDataset);
	}

	const observer = new MutationObserver((mutationsList) => {
		// component is already loaded
		if (loadedComponents.includes(path)) return;

		for (const mutation of mutationsList) {
			if (mutation.type === 'childList') {
				const target = mutation.target.querySelector(`[data-adt-${selector}]`);

				if (target) {
					loadedComponents.push(path);

					if (path.startsWith('~')) {
						import('~/src/' + path.slice(1) + '/index.js').then(component => {
							component.default.run(componentsConfig[selector] || {});
						});

					} else if (path.includes('/')) {
						import('JsComponents/' + path + '/index.js').then(component => {
							component.default.run(componentsConfig[selector] || {});
						});

					} else {
						import('adt-js-components/src/' + path + '/index.js').then(component => {
							component.default.run(componentsConfig[selector] || {});
						});
					}
					break;
				}
			}
		}
	});

	// Sleduj celý dokument pro změny ve stromu DOM
	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
};

const initCurrencyInput = () => {
	init('currency-input', 'CurrencyInput');
};

const initDateInput = () => {
	init('date-input', 'DateInput');
};

const initGLightbox = () => {
	init('glightbox', 'GLightbox');
};

const initGoogleMaps = () => {
	init('google-maps', 'GoogleMaps');
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

const initTinyMCE = () => {
	init('tinymce', 'TinyMCE');
};

const initAjaxSelect = () => {
	init('ajax-select', 'AjaxSelect');
};

const initInputClear = () => {
	init('input-clear', 'InputClear');
};

const initMap = () => {
	init('map', 'Map');
};

const initReplicator = () => {
	init('replicator', 'Replicator');
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
	initGLightbox,
	initGoogleMaps,
	initRecaptcha,
	initSelect2,
	initSubmitForm,
	initTinyMCE,
	initAjaxSelect,
	initInputClear,
	initMap,
	initReplicator,
	loadScssModule,
};
