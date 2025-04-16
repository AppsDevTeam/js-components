async function run(options) {
	console.log('xxx');
	function applyEventHandlers(el) {
		console.log('yyy');
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
					if (node.nodeType === 1 && node.hasAttribute("data-adt-form-replicator")) {
						applyEventHandlers(node);
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
