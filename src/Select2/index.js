import 'select2';
import 'select2/dist/css/select2.min.css';
import '@ttskch/select2-bootstrap4-theme/dist/select2-bootstrap4.min.css'
import 'select2/dist/js/i18n/cs'

function run(options) {
	$.nette.ext('live').after(function($el) {

		$el.find('[data-adt-select2]').each(function () {
			let $select2 = $(this);
			$select2.attr('data-options-counter', 0);
			$select2.select2(
				$.extend(
					{
						theme: 'bootstrap4',
						language: "en", // musí zde být defaultní jazyk "en", pokud zde nebyl a byla importována čeština.. tak se i bez poslání json params nastavila čeština
						templateResult: function (data, container) {
							let counter = $select2.attr('data-options-counter');
							let $options = select2Options($select2);
							$(container).attr('aria-setsize', $options.length);
							$(container).attr('aria-posinset', counter);
							counter = parseInt(counter) + 1;
							$select2.attr('data-options-counter', counter)

							return data.text;
						},
					},
					$(this).data('adt-select2') || {}
				)
			);
		});
	});
}

// Get all options in a Select2 dropdown - https://stackoverflow.com/a/41365100
function select2Options($elementSelect2) {
	let data = [];
	let	adapter = $elementSelect2.data().select2.dataAdapter;
	$elementSelect2.children().each(function () {
		if (!$(this).is('option') && !$(this).is('optgroup')) {
			return true;
		}
		data.push(adapter.item($(this)));
	});
	return data;
}

export default { run }