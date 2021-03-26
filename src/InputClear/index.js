function run(options) {
	$.nette.ext('live').after(function($el) {
		$el.find('[data-adt-input-clear]').each(function() {
			const options = $(this).data('adt-input-clear') || {};
			const selector = options.selector;

			if (!selector) {
				console.error('You have to set the option.selector in JS component InputClear.');
				return;
			}

			const confirmMessage = options.confirmMessage;

			$(this).click(function () {
				if (confirmMessage) {
					if (!confirm(confirmMessage)) {
						return;
					}
				}

				$(selector).val('');
			});
		});
	});
}

export default { run }
