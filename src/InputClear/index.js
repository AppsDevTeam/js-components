function run(options) {
	document.addEventListener('click', (e) => {
		const button = e.target.closest('[data-adt-input-clear]');
		if (!button) {
			return;
		}

		const options = JSON.parse(button.getAttribute('data-adt-input-clear') || '{}');
		if (!options.selector) {
			console.error('You have to set the option.selector in JS component InputClear.');
			return;
		}

		if (options.confirmMessage && !confirm(options.confirmMessage)) {
			return;
		}

		document.querySelectorAll(options.selector).forEach(input => {
			input.value = '';
			input.dispatchEvent(new Event('change', { bubbles: true }));
		});
	});
}

export default { run }
