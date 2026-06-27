const loadedComponents = [];
let componentsConfig = {};

// Component module resolution (Vite only).
//
// Rollup/Vite cannot statically analyse concatenated dynamic imports, so callers
// register `import.meta.glob()` maps that this loader resolves from. Maps are
// MERGED per scope, so multiple callers can contribute — e.g. FancyAdmin registers
// its own components ('fancyadmin'), while the consuming app registers its own
// ('app') and the built-ins it uses ('builtin'):
//   AdtJsComponents.registerModules({
//     app:     import.meta.glob('.../app/UI/**/index.js'),
//     builtin: import.meta.glob('.../node_modules/adt-js-components/src/{Select2,...}/index.js'),
//   });
const registeredModules = { fancyadmin: {}, app: {}, builtin: {} };

const registerModules = (maps) => {
	for (const scope of Object.keys(maps)) {
		registeredModules[scope] = Object.assign(registeredModules[scope] || {}, maps[scope]);
	}
};

// Find the loader in a glob map whose key resolves to the requested sub-path.
// Match on a leading-slash boundary so e.g. "Map" never matches "Sitemap".
const resolveFromMap = (map, subPath) => {
	if (!map) return null;
	const needle = subPath + '/index.js';
	const key = Object.keys(map).find((k) => k === needle || k.endsWith('/' + needle));
	return key ? map[key] : null;
};

// Returns a Promise<module> for the given component path, resolved from the
// registered import.meta.glob() maps.
const importComponent = (path) => {
	let loader;
	if (path.startsWith('~')) {
		loader = resolveFromMap(registeredModules.fancyadmin, path.slice(1));
	} else if (path.includes('/')) {
		loader = resolveFromMap(registeredModules.app, path);
	} else {
		loader = resolveFromMap(registeredModules.builtin, path);
	}

	if (!loader) {
		return Promise.reject(new Error(`adt-js-components: component "${path}" not found in registered modules.`));
	}
	return loader();
};

const init = (selector, path) => {
	let bodyDataset = document.querySelector(`body`).dataset.adtJsComponents;

	if (
		Object.keys(componentsConfig).length === 0 && typeof bodyDataset !== 'undefined'
	) {
		componentsConfig = JSON.parse(bodyDataset);
	}

	const runPath = (path, selector) => {
		importComponent(path)
			.then(component => {
				component.default.run(componentsConfig[selector] || {});
			})
			.catch(err => {
				// Don't let a single missing/optional component break page init.
				console.warn(`adt-js-components: failed to load component "${path}":`, err);
			});
	};

	const existingTarget = document.querySelector(`[data-adt-${selector}]`);
	if (existingTarget && !loadedComponents.includes(path)) {
		loadedComponents.push(path);
		typeof path === 'function'
			? path(componentsConfig[selector] || {})
			: runPath(path, selector);
	}

	const observer = new MutationObserver((mutationsList) => {
		// component is already loaded
		if (loadedComponents.includes(path)) return;

		for (const mutation of mutationsList) {
			if (mutation.type === 'childList') {
				const target = mutation.target.querySelector(`[data-adt-${selector}]`);

				if (target) {
					loadedComponents.push(path);

					if (typeof path === 'function') {
						path(componentsConfig[selector] || {});
					} else {
						runPath(path, selector);
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

const initRedrawSnippet = () => {
	init('redraw-snippet', 'RedrawSnippet');
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
	registerModules,
	initCurrencyInput,
	initDateInput,
	initGLightbox,
	initGoogleMaps,
	initRecaptcha,
	initRedrawSnippet,
	initSelect2,
	initSubmitForm,
	initTinyMCE,
	initAjaxSelect,
	initInputClear,
	initMap,
	initReplicator,
	loadScssModule,
};
