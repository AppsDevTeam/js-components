import AutoNumeric from "autonumeric";
import observe from '../observe';

function run(options) {
	observe('[data-adt-currency-input]', function (el) {
		new AutoNumeric(el, JSON.parse(el.dataset.adtCurrencyInput));
	});
}

export default { run }
