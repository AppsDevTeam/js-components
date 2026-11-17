// Initializes $.fn.select2 against the global jQuery, then loads its i18n locale.
import './_init';
import 'select2/dist/css/select2.min.css';
import 'select2-bootstrap-5-theme/dist/select2-bootstrap-5-theme.css'
import './input-group.css';
import observe from '../observe';

function run(options) {
	const noSelect2Class = '.select-default';
	const selector = options.selector || 'select:not(' + noSelect2Class + ')';

	observe(selector, function(el) {
		// AJAX selects are initialized by the AjaxSelect component with their own options.
		// Initializing them here as well would build select2 twice and AjaxSelect would
		// rebuild it right away. Each initialization reads computed styles, which is the
		// most expensive part of rendering a form with many selects.
		if (el.closest(noSelect2Class) || el.matches('[data-adt-ajax-select]')) {
			return;
		}

		$(el)
			.select2($.extend({theme: 'bootstrap-5', language: "en"}, $(el).data('adt-select2') || {}))
			.on('change', function(e) {
				Nette.toggleForm($(e.currentTarget).closest('form')[0], e.currentTarget);
			});
	});
}

export default { run }
