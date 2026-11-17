function run(options) {
	$(document).on('click', '[data-adt-input-clear]', function () {
		const options = $(this).data('adt-input-clear') || {};
		const selector = options.selector;

		if (!selector) {
			console.error('You have to set the option.selector in JS component InputClear.');
			return;
		}

		if (options.confirmMessage && !confirm(options.confirmMessage)) {
			return;
		}

		$(selector).val('');
	});
}

export default { run }
