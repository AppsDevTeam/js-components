import 'select2/dist/js/select2.full';
import 'select2/dist/css/select2.min.css';
import 'select2-bootstrap-5-theme/dist/select2-bootstrap-5-theme.css'
import 'select2/dist/js/i18n/cs'

function run(options) {
	$.nette.ext('live').after(function($el) {

		$el.find('[data-adt-select2]').each(function () {
			let $select2 = $(this);
			$select2.select2(
				$.extend(
					{
						theme: 'bootstrap-5',
						language: "en", // musí zde být defaultní jazyk "en", pokud zde nebyl a byla importována čeština.. tak se i bez poslání json params nastavila čeština
						templateResult: function (data, container) {
							let options = select2Options($select2);
							$(container).attr('aria-setsize', options.length);
							$(container).attr('aria-posinset', getPositionOfData($(options), data.text));
							return data.text;
						},
					},
					$(this).data('adt-select2') || {}
				)
			);
		});

		$el.find('[data-adt-select2]').on('change', function(e) {
			Nette.toggleForm($(e.currentTarget).closest('form')[0], e.currentTarget);
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

function getPositionOfData($options, text) {
	let counter = 1;
	$options.each(function (key, el) {
		if (text === el.text) {
			return false;
		}
		counter = counter + 1;
	});
	return counter;
}

export default { run }
