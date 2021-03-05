import 'select2';
import 'select2/dist/css/select2.min.css';
import '@ttskch/select2-bootstrap4-theme/dist/select2-bootstrap4.min.css'

function run(el, options) {
	$.nette.ext('live').after(function($el) {
		// Only selects inside forms
		($el.closest('form').length ? $el : $el.find('form')).find('select').not('.select2--no-auto-init').select2({
			theme: 'bootstrap4',
		});
	});
}

export default { run }