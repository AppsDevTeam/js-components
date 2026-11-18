import observe from './observe';
import { registerCallbacks } from './callbacks';

const loadedComponents = new Set();
let componentsConfig = null;

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

// Built-in components: key of the options in data-adt-js-components and the element that starts them.
const BUILTINS = {
	AjaxSelect: ['ajax-select'],
	CurrencyInput: ['currency-input'],
	DateInput: ['date-input'],
	// any <form>: nette-forms validation, spinner/locking/errors of forms with data-adt-submit-form
	Form: ['submit-form', 'form'],
	GLightbox: ['glightbox'],
	GoogleMaps: ['google-maps'],
	InputClear: ['input-clear'],
	Map: ['map'],
	Messaging: ['messaging'],
	Notifications: ['notifications', '[data-adt-notifications-enable], [data-adt-notifications-disable]'],
	Recaptcha: ['recaptcha'],
	RedrawSnippet: ['redraw-snippet'],
	Replicator: ['replicator'],
	Select2: ['select2'],
	TinyMCE: ['tinymce'],
	Translate: ['translate'],
};

// ExampleForm -> example-form
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// Directory of the component from a glob key (".../Components/Forms/ExampleForm/index.js" -> "ExampleForm")
const componentName = (key) => key.split('/').slice(-2, -1)[0];

// Registers the import.meta.glob() maps and starts watching for every registered component, so the
// project calls no init*(): a component loads (its own chunk) once its element shows up in the
// document. Built-ins by BUILTINS, project components (scope app) by `data-adt-<kebab of the
// directory name>`; init() with an own selector is still possible.
const registerModules = (maps) => {
	for (const scope of Object.keys(maps)) {
		registeredModules[scope] = Object.assign(registeredModules[scope] || {}, maps[scope]);
		for (const key of Object.keys(maps[scope])) {
			const name = componentName(key);
			if (scope === 'builtin') {
				const [selector, cssSelector] = BUILTINS[name] || [kebab(name)];
				init(selector, name, cssSelector);
			} else if (scope === 'app') {
				// the glob key without /index.js is a path importComponent() finds in the app map
				init(kebab(name), key.slice(0, -'/index.js'.length));
			}
		}
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

const getComponentsConfig = () => {
	if (componentsConfig === null) {
		const bodyDataset = document.body.dataset.adtJsComponents;
		componentsConfig = typeof bodyDataset !== 'undefined' ? JSON.parse(bodyDataset) : {};
	}
	return componentsConfig;
};

// Runs the component once the first `[data-adt-<selector>]` element (or `cssSelector`) shows up in the document.
const init = (selector, path, cssSelector = `[data-adt-${selector}]`) => {
	observe(cssSelector, () => {
		if (loadedComponents.has(path)) return;
		loadedComponents.add(path);

		const options = getComponentsConfig()[selector] || {};

		if (typeof path === 'function') {
			path(options);
			return;
		}

		importComponent(path)
			.then(component => component.default.run(options))
			.catch(err => {
				// Don't let a single missing/optional component break page init.
				console.warn(`adt-js-components: failed to load component "${path}":`, err);
			});
	}, { once: true });
};

const initCurrencyInput = () => init('currency-input', 'CurrencyInput');
const initDateInput = () => init('date-input', 'DateInput');
const initGLightbox = () => init('glightbox', 'GLightbox');
const initGoogleMaps = () => init('google-maps', 'GoogleMaps');
const initRecaptcha = () => init('recaptcha', 'Recaptcha');
const initRedrawSnippet = () => init('redraw-snippet', 'RedrawSnippet');
const initSelect2 = () => init('select2', 'Select2');
// Any <form>: nette-forms validation, plus spinner, locking and errors of forms with data-adt-submit-form
const initForm = () => init('submit-form', 'Form', 'form');
const initSubmitForm = () => {
	console.warn('adt-js-components: initSubmitForm() is deprecated, use initForm() (component Form)');
	initForm();
};
const initTinyMCE = () => init('tinymce', 'TinyMCE');
const initAjaxSelect = () => init('ajax-select', 'AjaxSelect');
const initInputClear = () => init('input-clear', 'InputClear');
const initMap = () => init('map', 'Map');
const initReplicator = () => init('replicator', 'Replicator');

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
	registerCallbacks,
	init,
	registerModules,
	initCurrencyInput,
	initDateInput,
	initGLightbox,
	initGoogleMaps,
	initRecaptcha,
	initRedrawSnippet,
	initSelect2,
	initForm,
	initSubmitForm,
	initTinyMCE,
	initAjaxSelect,
	initInputClear,
	initMap,
	initReplicator,
	loadScssModule,
};
