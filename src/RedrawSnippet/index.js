async function run(options) {
	function applyEventHandlers(el) {
		var $el= $(el);
		if ($el.is('button, input[type="button"], input[type="submit"]')) {
			$el.on('click', sendNetteAjax);
		} else if ($el.is('input:not([type="button"]):not([type="submit"]), select, textarea')) {
			$el.on('input', sendNetteAjax);
		}
	}

	function sendNetteAjax(e) {
		const $el = $(e.currentTarget);
		$el.closest('form').find('[name="' + $el.attr('data-adt-redraw-snippet') + '"]').netteAjax(e);
	}

	const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === 1) {
						if (node.hasAttribute("data-adt-redraw-snippet")) {
							applyEventHandlers(node);
						}

						node.querySelectorAll('[data-adt-redraw-snippet]').forEach(child => {
							applyEventHandlers(child);
						});
					}
				});
			}
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	document.querySelectorAll('[data-adt-redraw-snippet]').forEach(function(el) {
		applyEventHandlers(el);
	});
}

export default { run }
