import observe from '../observe';
import dataOptions from '../data';
import createTomSelect from './tomSelect';

// Tom Select on <select data-adt-select> (data-adt-select2 of the PHP side works too), options as JSON
// in the attribute. options.selector of data-adt-js-components changes which selects get it (e.g.
// "select:not(.select-default)"); AJAX selects belong to the component AjaxSelect.
function run(options) {
	const selector = options.selector || 'select[data-adt-select], select[data-adt-select2]';

	observe(selector, function(el) {
		if (el.tomselect || el.closest('.select-default') || el.matches('[data-adt-ajax-select]')) {
			return;
		}

		const settings = dataOptions(el, el.hasAttribute('data-adt-select') ? 'data-adt-select' : 'data-adt-select2');
		// data-adt-select2="1" (true of the PHP side) = default options
		createTomSelect(el, typeof settings === 'object' ? settings : {});
	});
}

export default { run }
