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
	// jQuery handlers to catch events triggered by jQuery plugins as well
	$(document)
		.on('click', SELECTOR, function (e) {
			if (this.matches(BUTTON_SELECTOR)) {
				redraw(this, e.originalEvent);
			}
		})
		.on('input', SELECTOR, function () {
			if (!this.matches(BUTTON_SELECTOR)) {
				redrawLater(this);
			}
		})
		// Select2 hides the native select and triggers only change
		.on('change', `select${SELECTOR}`, function () {
			redrawLater(this);
		});
}

export default { run }
