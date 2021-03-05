import AutoNumeric from "autonumeric";

function run(el, options) {
	$.nette.ext('live').after(function ($element) {
		$element.find('[data-adt-currency-input]').each(function () {
			new AutoNumeric(this, JSON.parse(this.dataset.adtCurrencyInput));
		});
	});
}

export default { run }