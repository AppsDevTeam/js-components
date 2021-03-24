import 'select2';
import 'select2/dist/css/select2.min.css';
import '@ttskch/select2-bootstrap4-theme/dist/select2-bootstrap4.min.css'

function run(options) {
	$.nette.ext('live').after(function($el) {

		$el.find('[data-adt-select2]').each(function () {
			var selectOptions = $(this).data('adt-select2') || {};
			var minimumSearchResults = (selectOptions.minimumResultsForSearch !== undefined) ? selectOptions.minimumResultsForSearch : 0;

			$(this).select2({
				theme: 'bootstrap4',
				minimumResultsForSearch: minimumSearchResults,
			});
		})
	});
}

export default { run }