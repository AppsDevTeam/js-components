import observe from './observe';
import { registerChartPlugins } from './Chart/plugins';

const loadedComponents = new Set();
let componentsConfig = null;

// Component module resolution (Vite only).
//
// Rollup/Vite cannot statically analyse concatenated dynamic imports, so callers
// register `import.meta.glob()` maps that this loader resolves from. Maps are
// MERGED per scope, so multiple callers can contribute — e.g. FancyAdmin registers
// its own components ('fancyadmin'), while the consuming app registers its own ('app'):
//   AdtJsComponents.registerModules({
//     app: import.meta.glob('.../app/UI/**/index.js'),
//   });
// Built-in components need no registration, see BUILTINS.
const registeredModules = { fancyadmin: {}, app: {} };

// Built-in components: [key of the options in data-adt-js-components, element that starts them (default
// [data-adt-<key>]), loader]. Each one is its own chunk loaded once its element shows up in the document.
const BUILTINS = {
	AjaxSelect: ['ajax-select', null, () => import('./AjaxSelect/index.js')],
	Chart: ['chart', 'canvas[data-adt-chart]', () => import('./Chart/index.js')],
	CurrencyInput: ['currency-input', null, () => import('./CurrencyInput/index.js')],
	DateInput: ['date-input', null, () => import('./DateInput/index.js')],
	// any <form>: nette-forms validation, spinner/locking/errors of forms with data-adt-submit-form
	Form: ['submit-form', 'form', () => import('./Form/index.js')],
	GLightbox: ['glightbox', null, () => import('./GLightbox/index.js')],
	GoogleMaps: ['google-maps', null, () => import('./GoogleMaps/index.js')],
	InputClear: ['input-clear', null, () => import('./InputClear/index.js')],
	Map: ['map', null, () => import('./Map/index.js')],
	Recaptcha: ['recaptcha', null, () => import('./Recaptcha/index.js')],
	RedrawSnippet: ['redraw-snippet', null, () => import('./RedrawSnippet/index.js')],
	Replicator: ['replicator', null, () => import('./Replicator/index.js')],
	// data-adt-select2 = the attribute of the PHP side from the times of Select2
	Select: ['select', 'select[data-adt-select], select[data-adt-select2]', () => import('./Select/index.js')],
	Translate: ['translate', null, () => import('./Translate/index.js')],
};

// ExampleForm -> example-form
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// Directory of the component from a glob key (".../Components/Forms/ExampleForm/index.js" -> "ExampleForm")
const componentName = (key) => key.split('/').slice(-2, -1)[0];

// Registers the import.meta.glob() maps and starts watching for every registered component, so the
// project calls no init*(): a component loads (its own chunk) once its element shows up in the
// document - project components (scope app) by `data-adt-<kebab of the directory name>`. init() with
// an own selector is still possible.
const registerModules = (maps) => {
	startBuiltins();
	for (const scope of Object.keys(maps)) {
		registeredModules[scope] = Object.assign(registeredModules[scope] || {}, maps[scope]);
		if (scope === 'app') {
			for (const key of Object.keys(maps[scope])) {
				// the glob key without /index.js is a path importComponent() finds in the app map
				init(kebab(componentName(key)), key.slice(0, -'/index.js'.length));
			}
		}
	}
};

let builtinsStarted = false;
const startBuiltins = () => {
	if (builtinsStarted) return;
	builtinsStarted = true;
	for (const [name, [selector, cssSelector]] of Object.entries(BUILTINS)) {
		// options.selector of a component (Select) changes the elements it handles, so also the one starting it
		init(selector, name, getComponentsConfig()[selector]?.selector || cssSelector || undefined);
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
		loader = BUILTINS[path]?.[2];
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
	registerChartPlugins,
	loadScssModule,
};
