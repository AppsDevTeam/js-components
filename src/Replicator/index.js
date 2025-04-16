async function run(options) {
	function applyEventHandlers(el) {
		$(el).formReplicator({
			template: $.parseHTML($(el).attr('data-adt-replicator')),
			addStaticButton: $(el).find('[data-adt-replicator-add]'),
			addStaticButtonShowAlways: true,
		});
	}

	const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === 1) {
						if (node.hasAttribute("data-adt-replicator")) {
							applyEventHandlers(node);
						}

						node.querySelectorAll('[data-adt-replicator]').forEach(child => {
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

	document.querySelectorAll('[data-adt-replicator]').forEach(function(el) {
		applyEventHandlers(el);
	});
}

export default { run }
