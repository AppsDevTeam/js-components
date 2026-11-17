import observe from '../observe';
import dataOptions from '../data';
import createTomSelect, { texts } from '../Select/tomSelect';

// query string like jQuery.param(): entityOptions[key]=value, arrays as key[]
function appendParams(params, prefix, value) {
	if (Array.isArray(value)) {
		value.forEach((item, i) => appendParams(params, prefix + (item !== null && typeof item === 'object' ? `[${i}]` : '[]'), item));
	} else if (value !== null && typeof value === 'object') {
		Object.entries(value).forEach(([key, item]) => appendParams(params, `${prefix}[${key}]`, item));
	} else if (value !== undefined) {
		params.append(prefix, value === null ? '' : value);
	}
}

// leaves of the tree of items (initialItems)
function leaves(items) {
	return Object.values(items || {}).flatMap(item => item.children ? leaves(item.children) : [item]);
}

// AJAX select (adt/ajax-select): data-adt-ajax-select = {url, entityName, entityOptions, queryParam,
// initialItems, prompt, multiple}, data-ajax-select-options = {minimumInputLength, dropdownParent},
// data-allow-new-value = the user can add a value (sent as "tag*<text>")
class AjaxSelect {
	constructor(el) {
		this.options = dataOptions(el, 'data-adt-ajax-select');
		this.customOptions = { minimumInputLength: 2, ...dataOptions(el, 'data-ajax-select-options') };

		// labels of the selected options rendered by Nette with their ids only
		leaves(this.options.initialItems).forEach(item => {
			el.querySelectorAll(`option[value="${CSS.escape(String(item.id))}"]`).forEach(option => option.textContent = item.text);
		});

		this.loadedIds = new Set();
		const allowNew = el.getAttribute('data-allow-new-value');
		const minimumInputLength = this.customOptions.minimumInputLength;
		this.tomSelect = createTomSelect(el, {
			valueField: 'id',
			labelField: 'text',
			// the server filters: the options of the last response match, the selected ones (kept by
			// clearOptions()) only when they are among them
			searchField: [],
			score: () => (option) => this.loadedIds.has(String(option.id)) ? 1 : 0,
			placeholder: this.options.prompt || undefined,
			allowClear: !!this.options.prompt,
			maxItems: this.options.multiple ? null : 1,
			dropdownParent: this.customOptions.dropdownParent || null,
			create: allowNew && allowNew !== '0' && allowNew !== 'false'
				? (input) => ({ id: 'tag*' + input, text: input })
				: false,
			loadThrottle: 250,
			shouldLoad: (query) => query.length >= minimumInputLength,
			load: (query, callback) => this.load(query, callback),
			render: {
				option: (data, escape) => `<div${data.inactive ? ' class="inactive"' : ''}>${escape(data.text)}</div>`,
				not_loading: (data) => data.input.length < minimumInputLength
					? `<div class="no-results">${texts.minimumInput(minimumInputLength)}</div>`
					: undefined,
			},
		});
	}

	load(query, callback) {
		const entityOptions = { ...this.options.entityOptions, [this.options.queryParam]: query, ...this.customOptions };
		const url = new URL(this.options.url, window.location.href);
		appendParams(url.searchParams, 'entityName', this.options.entityName);
		appendParams(url.searchParams, 'entityOptions', entityOptions);

		fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } })
			.then(response => response.json())
			.then(data => {
				if (data.redirect !== undefined) {
					window.beforeunload_enable = false;
					window.location.href = data.redirect;
					return callback();
				}
				// groups ({text, children}) -> optgroups
				const options = [];
				const optgroups = [];
				Object.values(data).forEach(item => {
					if (item.children) {
						optgroups.push({ value: item.text, label: item.text });
						leaves(item.children).forEach(child => options.push({ ...child, optgroup: item.text }));
					} else {
						options.push(item);
					}
				});
				// results of the previous query go away, selected items stay
				this.tomSelect.clearOptions();
				this.loadedIds = new Set(options.map(option => String(option.id)));
				callback(options, optgroups);
			})
			.catch(() => callback());
	}
}

function run(options) {
	/**
	 * Lazy initialization.
	 *
	 * Building the widget reads computed styles and layout. Right after the previous one was
	 * inserted, each such read forces the browser to lay out the whole page again, so
	 * initializing many selects at once gets quadratically slower - a form with 300 rows took
	 * tens of seconds (measured with Select2).
	 *
	 * Selects that are visible (or close to the viewport) are therefore initialized right
	 * away and the rest only when they are about to scroll into view. Visibility of all newly
	 * added selects is read in one pass before any of them is initialized, so the page is laid
	 * out once, not once per select. A select that is not initialized yet is initialized on
	 * focus as well (e.g. when the user tabs into it).
	 *
	 * A few selects added at once (a row added by a replicator) are always initialized right
	 * away - that is cheap, and the code that added the row may open it, even when the row
	 * ended up at the end of a long list out of the viewport.
	 */
	const VISIBILITY_MARGIN = 200;
	const EAGER_LIMIT = 10;

	function initialize(el) {
		if (el.adtAjaxSelect) {
			return;
		}
		el.adtAjaxSelect = new AjaxSelect(el);
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
		el.tomselect?.focus();
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

		// read all rects first (one layout), only then start building Tom Select
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

	observe('[data-adt-ajax-select]', applyEventHandlers, { batch: true });
}

export default { run }
