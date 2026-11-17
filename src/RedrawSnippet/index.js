import naja from 'naja';

const SELECTOR = '[data-adt-redraw-snippet]';
const BUTTON_SELECTOR = 'button, input[type="button"], input[type="submit"]';
const DEBOUNCE = 500;

const debounceTimers = new WeakMap();

// Submits the form via the submit button named in data-adt-redraw-snippet,
// the server redraws the snippets depending on the field.
function redraw(el, event) {
	const submitter = el.closest('form')?.querySelector(`[name="${CSS.escape(el.getAttribute('data-adt-redraw-snippet'))}"]`);
	if (!submitter) {
		return;
	}

	naja.uiHandler.submitForm(submitter, {
		history: false,
		// a newer redraw aborts the previous one, other requests are left alone
		unique: 'adt-redraw-snippet',
	}, event).catch(() => {
		// errors are handled by naja.addEventListener('error', ...)
	});
}

function redrawLater(el) {
	clearTimeout(debounceTimers.get(el));
	debounceTimers.set(el, setTimeout(() => redraw(el), DEBOUNCE));
}

async function run(options) {
	document.addEventListener('click', (e) => {
		const el = e.target.closest(SELECTOR);
		if (el && el.matches(BUTTON_SELECTOR)) {
			redraw(el, e);
		}
	});
	document.addEventListener('input', (e) => {
		const el = e.target.closest(SELECTOR);
		if (el && !el.matches(BUTTON_SELECTOR)) {
			redrawLater(el);
		}
	});
	// Tom Select (component Select) keeps the native select hidden and dispatches only change on it
	document.addEventListener('change', (e) => {
		const el = e.target.closest(`select${SELECTOR}`);
		if (el) {
			redrawLater(el);
		}
	});
}

export default { run }
