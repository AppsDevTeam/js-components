import 'select2';
import 'select2/dist/css/select2.min.css';
import 'select2-bootstrap-5-theme/dist/select2-bootstrap-5-theme.css'
import 'select2/dist/js/i18n/cs'

function run(options) {
	$.nette.ext('live').after(function($el) {

		$el.find('[data-adt-select2]').each(function () {
			// musí zde být defaultní jazyk "en", pokud zde nebyl a byla importována čeština.. tak se i bez poslání json params nastavila čeština
			$(this).select2($.extend({theme: 'bootstrap-5', language: "en"}, $(this).data('adt-select2') || {}));
		});
	});
}

export default { run }
