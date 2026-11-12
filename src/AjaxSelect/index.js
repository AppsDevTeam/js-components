import 'select2';
import 'select2/dist/css/select2.min.css';
import 'select2-bootstrap-5-theme/dist/select2-bootstrap-5-theme.css'
import '../Select2/input-group.css';
import 'select2/dist/js/i18n/cs'

function run(options) {
	/**
	 * AJAX select
	 */
	function AjaxSelect($element) {
		this.$originalElement = $element;
		this.options = this.$originalElement.data('adt-ajax-select');
		this.customOptions = $.extend({minimumInputLength: 2, language: "en"}, this.$originalElement.data('ajax-select-options') || {});
		this.init();
	}

	AjaxSelect.prototype.init = function () {
		var self = this;

		// posbírat listy stromu
		var walk = function (items) {
			var result = [ ];

			for (var key in items) {
				if (!items.hasOwnProperty(key)) {
					continue;
				}

				var item = items[key];

				if (item.children) {
					Array.prototype.push.apply(result, walk(item.children));
				} else {
					result.push(item);
				}
			}

			return result;
		};

		var items = walk(self.options.initialItems);

		var itemsIds = [];
		for (var key in items) {
			this.$originalElement.find('option[value="'+items[key].id+'"]').text(items[key].text);
			itemsIds.push(items[key].id);
		}

		this.$originalElement.select2({
			tags: !!this.$originalElement.data('allow-new-value'),
			insertTag: function (data, tag) {
				// Insert the tag at the end of the results
				data.push(tag);
			},
			createTag: function (params) {
				if (params.term === '') {
					return null;
				}
				return {
					id: 'tag*'+params.term,
					text: params.term
				};
			},
			language: this.customOptions.language,
			dropdownParent: this.customOptions.dropdownParent ? $(this.customOptions.dropdownParent) : document.body,
			placeholder: this.options.prompt || undefined,
			allowClear: this.options.prompt ? true : false,
			minimumInputLength: this.customOptions.minimumInputLength,
			multiple: this.options.multiple || false,
			formatResultCssClass: function (object) {
				if (object.inactive == true) {
					return 'inactive';
				}
			},
			ajax: {
				url: this.options.url,
				dataType: 'json',
				delay: 250,
				data: function (term, page) {
					var options = $.extend({ }, self.options.entityOptions);
					options[self.options.queryParam] = term.term;

					$.extend(options, self.customOptions);

					return {
						entityName: self.options.entityName,
						entityOptions: options,
					};
				},
				processResults: function (data, page, s2) {
					if (data.redirect !== undefined) {
						beforeunload_enable = false;
						window.location.href = data.redirect;
						return false;
					}
					return { results: data };
				},
				cache: true
			},
			theme: 'bootstrap-5',
			width: '100%',
		});

	};

	AjaxSelect.prototype.destroy = function () {
		this.$originalElement.select2('destroy');
	};

	/**
	 * Lazy initialization.
	 *
	 * Building select2 reads computed styles and layout (e.g. the mousewheel plugin bundled
	 * in select2.full measures the line height of every results list). Right after the
	 * previous select2 was inserted, each such read forces the browser to lay out the whole
	 * page again, so initializing many selects at once gets quadratically slower - a form
	 * with 300 rows took tens of seconds.
	 *
	 * Selects that are visible (or close to the viewport) are therefore initialized right
	 * away and the rest only when they are about to scroll into view. Visibility of all newly
	 * added selects is read in one pass before any of them is initialized, so the page is laid
	 * out once, not once per select. A select that is not initialized yet is initialized on
	 * focus as well (e.g. when the user tabs into it).
	 *
	 * A few selects added at once (a row added by a replicator) are always initialized right
	 * away - that is cheap, and the code that added the row may call select2('open') on it,
	 * even when the row ended up at the end of a long list out of the viewport.
	 */
	const VISIBILITY_MARGIN = 200;
	const EAGER_LIMIT = 10;

	function initialize(el) {
		if (el.adtAjaxSelect) {
			return;
		}
		el.adtAjaxSelect = new AjaxSelect($(el));
	}

	const visibilityObserver = 'IntersectionObserver' in window
		? new IntersectionObserver(entries => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					visibilityObserver.unobserve(entry.target);
					entry.target.removeEventListener('focus', initializeOnFocus);
					initialize(entry.target);
				}
			});
		}, { rootMargin: VISIBILITY_MARGIN + 'px' })
		: null;

	function initializeOnFocus(e) {
		const el = e.currentTarget;
		el.removeEventListener('focus', initializeOnFocus);
		visibilityObserver.unobserve(el);
		initialize(el);
		$(el).data('select2')?.$selection.trigger('focus');
	}

	function isNearViewport(rect) {
		// zero size = not rendered (display: none), it will be initialized once it shows up
		return (rect.width > 0 || rect.height > 0)
			&& rect.bottom >= -VISIBILITY_MARGIN
			&& rect.top <= window.innerHeight + VISIBILITY_MARGIN
			&& rect.right >= -VISIBILITY_MARGIN
			&& rect.left <= window.innerWidth + VISIBILITY_MARGIN;
	}

	function applyEventHandlers(elements) {
		elements = elements.filter(el => !el.adtAjaxSelect);

		if (!visibilityObserver || elements.length <= EAGER_LIMIT) {
			elements.forEach(initialize);
			return;
		}

		// read all rects first (one layout), only then start building select2
		const rects = elements.map(el => el.getBoundingClientRect());

		elements.forEach((el, i) => {
			if (isNearViewport(rects[i])) {
				initialize(el);
			} else {
				visibilityObserver.observe(el);
				el.addEventListener('focus', initializeOnFocus);
			}
		});
	}

	const observer = new MutationObserver(mutations => {
		const elements = [];

		mutations.forEach(mutation => {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === 1) {
						if (node.hasAttribute("data-adt-ajax-select")) {
							elements.push(node);
						}

						elements.push(...node.querySelectorAll('[data-adt-ajax-select]'));
					}
				});
			}
		});

		if (elements.length) {
			applyEventHandlers(elements);
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	applyEventHandlers([...document.querySelectorAll('[data-adt-ajax-select]')]);
}

export default { run }
