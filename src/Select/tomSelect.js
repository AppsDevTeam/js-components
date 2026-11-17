import TomSelect from 'tom-select';
import 'tom-select/dist/css/tom-select.bootstrap5.css';

// Texts of the dropdown by <html lang>, English otherwise
const TEXTS = {
	cs: {
		noResults: 'Nic nenalezeno',
		loading: 'Načítání…',
		add: 'Přidat',
		minimumInput: (n) => `Zadejte alespoň ${n} ${n < 5 ? 'znaky' : 'znaků'}`,
	},
	en: {
		noResults: 'No results found',
		loading: 'Loading…',
		add: 'Add',
		minimumInput: (n) => `Please enter ${n} or more characters`,
	},
};
export const texts = TEXTS[document.documentElement.lang] || TEXTS.en;

// Options of the former Select2 (data-adt-select2 of the PHP side, e.g. datagrid-components) to Tom Select
function fromSelect2(el, options) {
	const { dropdownCssClass, minimumResultsForSearch, tags, language, theme, width, ...settings } = options;
	if (dropdownCssClass) {
		settings.dropdownClass = 'ts-dropdown ' + dropdownCssClass;
	}
	const minimum = minimumResultsForSearch ?? el.getAttribute('data-minimum-results-for-search');
	if (minimum !== null && (Number(minimum) < 0 || el.options.length < Number(minimum))) {
		settings.controlInput = null;
	}
	if (tags) {
		settings.create = true;
	}
	return settings;
}

// Tom Select with the Bootstrap 5 theme on a <select>; settings = Tom Select settings, the options of
// Select2 above, and allowClear (clear button)
export default function createTomSelect(el, options = {}) {
	const { allowClear, render, ...settings } = fromSelect2(el, options);
	const plugins = [];
	if (el.multiple) {
		plugins.push('remove_button');
	} else if (allowClear || (el.querySelector('option[value=""]') && !el.required)) {
		// the prompt of Nette (<option value="">) is the placeholder, the button returns to it
		plugins.push('clear_button');
	}

	return new TomSelect(el, {
		plugins,
		maxOptions: null,
		...settings,
		render: {
			no_results: () => `<div class="no-results">${texts.noResults}</div>`,
			option_create: (data, escape) => `<div class="create">${texts.add} <strong>${escape(data.input)}</strong>…</div>`,
			...render,
		},
	});
}
