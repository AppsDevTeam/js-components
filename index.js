import ComponentLoader from './src/ComponentLoader';

export default ComponentLoader;

$.fn.adtAjax = function (e, options) {
	return $.nette.ajax(options || {}, this[0], e);
};

$.observe = function(selector, callback) {
	const initedElements = [];
	const body = document.getElementsByTagName('body')[0];

	const applyCallback = function(element) {
		$(element).find(selector).each(function() {
			if (initedElements.includes(this)) return;

			callback(this);

			initedElements.push(this);
		});
	}

	const mutationObserver = new MutationObserver(function(entries) {
		entries.map((entry) => {
			entry.addedNodes.forEach(function(element) {
				if (!(element instanceof HTMLElement)) {
					return;
				}

				applyCallback(element);
			});
		});
	});

	applyCallback(body);
	mutationObserver.observe(body, { attributes: false, childList: true, characterData: false, subtree:true });
}