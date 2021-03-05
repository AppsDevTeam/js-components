import flatpickr from "flatpickr";
import 'flatpickr/dist/flatpickr.min.css';

import 'script-loader!timepicker';
import 'timepicker/jquery.timepicker.min.css';

const locale = document.querySelector('html').getAttribute('lang');

function initTime(input, options) {
	$(input).timepicker({
		scrollDefault: 'now',
		timeFormat: options.format
	});
}

function initDate(input, options) {
	flatpickr(input, {
		dateFormat: options.format,				// default datetime-local
		enableTime: options.type === 'datetime' || options.type === 'datetime-local',
		time_24hr: true,
		locale: require(`flatpickr/dist/l10n/${locale}.js`).default[locale],
	});
}

function run(el, options) {
	$.nette.ext('live').after(function($el) {
		$el.find('[data-adt-date-input]').each(function() {
			var options = $(this).data('adt-date-input');
			options.type = $(this).attr('type');
			$(this).attr('type', 'text');
			if (options.type === 'time') {
				initTime(this, options);
			} else {
				initDate(this, options);
			}
		});
	});
}

export default { run }