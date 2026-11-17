import flatpickr from "flatpickr";
import 'flatpickr/dist/flatpickr.min.css';

// timepicker is a jQuery plugin attaching to the global $ (provided by the bundler).
// Plain side-effect import works in both webpack and Vite; the "script-loader!" prefix
// was webpack-only and unresolvable in Vite/Rollup.
import 'timepicker';
import 'timepicker/jquery.timepicker.min.css';
import observe from '../observe';

const locale = document.querySelector('html').getAttribute('lang');

// flatpickr locale modules, resolved lazily (Vite). Replaces the webpack-only
// dynamic require('flatpickr/dist/l10n/' + locale + '.js').
const flatpickrLocales = import.meta.glob('../../../flatpickr/dist/l10n/*.js');

async function loadFlatpickrLocale(loc) {
	const key = Object.keys(flatpickrLocales).find((k) => k.endsWith(`/l10n/${loc}.js`));
	if (!key) return null;
	const mod = await flatpickrLocales[key]();
	return mod.default[loc];
}

function initTime(input, options) {
	$(input).timepicker({
		scrollDefault: 'now',
		timeFormat: options.format,
		minTime: options.minTime,
		maxTime: options.maxTime
	});
}

async function initDate(input, options) {
	if (locale === 'en') {
		options.locale = null;
	} else if (locale === 'el') {
		options.locale = 'gr';
	} else {
		options.locale = locale;
	}

	const localeData = options.locale ? await loadFlatpickrLocale(options.locale) : null;

	flatpickr(input, {
		dateFormat: options.format, // default datetime-local
		enableTime: options.type === 'datetime' || options.type === 'datetime-local',
		time_24hr: true,
		locale: localeData,
		defaultDate: options.value ? new Date(options.value) : null,
		minDate: options.minDate ? new Date(options.minDate) : null,
		maxDate: options.maxDate ? new Date(options.maxDate) : null,
		allowInput: options.allowInput ? options.allowInput : null,
		altInput: options.altInput ? options.altInput : null,
		altFormat: options.altFormat ? options.altFormat: null,
		altInputClass: options.altInputClass ? options.altInputClass : null,
	});
}

function run(options) {
	observe('[data-adt-date-input]', function(el) {
		const options = $(el).data('adt-date-input');
		options.type = el.getAttribute('type');

		el.setAttribute('type', 'text');
		if (options.type === 'time') {
			initTime(el, options);
		} else {
			initDate(el, options);
		}
	});
}

export default { run }
