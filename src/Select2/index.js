import 'select2/dist/js/select2.full';
import 'select2/dist/css/select2.min.css';
import 'select2-bootstrap-5-theme/dist/select2-bootstrap-5-theme.css'
import 'select2/dist/js/i18n/cs'

function run(options) {
	function applyEventHandlers(el) {
		$(el)
			.select2($.extend({theme: 'bootstrap-5', language: "en"}, $(this).data('adt-select2') || {}))
			.on('change', function(e) {
				Nette.toggleForm($(e.currentTarget).closest('form')[0], e.currentTarget);
			});
	}

	const observer = new MutationObserver(function(mutationsList) {
		mutationsList.forEach(function(mutation) {
			if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
				$(mutation.addedNodes).each(function() {
					if (this.nodeType === Node.ELEMENT_NODE) {
						console.log(this);
						if (this.hasAttribute('data-adt-select2')) {
							applyEventHandlers(this);
						}

						this.querySelectorAll('[data-adt-select2]').forEach(function(innerNode) {
							applyEventHandlers(innerNode);
						});
					}
				});
			}
		});
	});

	observer.observe(document.body, { childList: true, subtree: true });

	document.querySelectorAll('[data-adt-select2]').forEach(function(innerNode) {
		applyEventHandlers(innerNode);
	});
}

export default { run }
