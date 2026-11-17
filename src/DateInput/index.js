import flatpickr from "flatpickr";
import 'flatpickr/dist/flatpickr.min.css';
import observe from '../observe';
import dataOptions from '../data';

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
		enableTime: ['time', 'datetime', 'datetime-local'].includes(options.type),
		// type=time: only the time picker (formerly the jQuery plugin timepicker), format e.g. H:i
		noCalendar: options.type === 'time',
		minTime: options.minTime || null,
		maxTime: options.maxTime || null,
		time_24hr: true,
		locale: localeData,
		// a time (14:30) is parsed by dateFormat, new Date() would make an Invalid Date of it
		defaultDate: options.value ? (options.type === 'time' ? options.value : new Date(options.value)) : null,
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
		const options = dataOptions(el, 'data-adt-date-input');
		options.type = el.getAttribute('type');

		el.setAttribute('type', 'text');
		initDate(el, options);
	});
}

export default { run }
