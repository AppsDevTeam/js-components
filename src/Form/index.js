import naja from 'naja';
import Nette from 'nette-forms';
import observe from '../observe';

function isList(el) {
	return el.type === 'checkbox' && el.name.endsWith('[]') || el.type === 'radio';
}

function getErrorElementId(el) {
	return isList(el) ? el.id.split('-').slice(0, -1).join('-') : el.id;
}

function toggleInvalid(el, invalid) {
	el.classList.toggle('is-invalid', invalid);
	// because of radio lists and checkbox lists
	if (isList(el)) {
		el.parentNode.classList.toggle('is-invalid', invalid);
	}
	// because of https://github.com/twbs/bootstrap/issues/25110
	if (el.parentNode.classList.contains('input-group')) {
		el.parentNode.classList.toggle('has-validation', invalid);
		el.parentNode.classList.toggle('is-invalid', invalid);
	}
}

function hasErrors(errorElement) {
	return Array.from(errorElement.childNodes).some(node => node.nodeName !== 'SCRIPT' && node.textContent.trim() !== '');
}

function markErrorsFor(errorElement) {
	const el = document.getElementById(errorElement.getAttribute('data-adt-errors-for'));
	if (el && el.tagName !== 'FORM') {
		toggleInvalid(el, hasErrors(errorElement));
	}
}

function scrollToFirstError(form) {
	const el = form.querySelector('.alert-danger, .is-invalid');
	if (!el) {
		return;
	}

	// we have to find first scrollable element (it can be document or modal for example)
	const scrollParent = getScrollParent(el);

	scrollParent.scrollBy({top: el.getBoundingClientRect().top - 100, behavior: 'smooth'});
}

// nearest ancestor with scrollable overflow, otherwise the document
function getScrollParent(el) {
	for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
		const style = getComputedStyle(parent);
		if (/(auto|scroll|overlay)/.test(style.overflow + style.overflowY + style.overflowX)) {
			return parent;
		}
	}
	return document.scrollingElement || document.documentElement;
}

const SPINNER = '<span class="spinner-border spinner-border-sm"></span>';

// forms with a running request; a form stays locked until its last request completes
const locks = new Map();

function lock(form, button) {
	const state = locks.get(form);
	if (state) {
		state.count++;
		return;
	}

	const newState = {
		count: 1,
		enabledButtons: [...form.querySelectorAll('button:enabled')],
		button: button instanceof HTMLButtonElement ? button : null,
	};
	locks.set(form, newState);

	form.querySelectorAll('button').forEach(el => el.disabled = true);
	if (newState.button) {
		newState.originalContent = button.innerHTML;
		newState.originalWidth = button.style.width;
		button.style.width = button.offsetWidth + 'px';
		button.innerHTML = SPINNER;
	}
	form.querySelectorAll('.alert-danger').forEach(el => el.remove());
	form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function unlock(form, force = false) {
	const state = locks.get(form);
	if (!state || (--state.count > 0 && !force)) {
		return;
	}

	locks.delete(form);

	// the form or the entire page may be redrawn, then these elements are not in the document anymore
	if (state.button) {
		state.button.innerHTML = state.originalContent;
		state.button.style.width = state.originalWidth;
	}
	state.enabledButtons.forEach(el => el.disabled = false);
}

// the form may be replaced by the redrawn snippet
function currentForm(form) {
	return form.isConnected || !form.id ? form : document.getElementById(form.id) || form;
}

function run(options) {
	observe('[data-adt-errors-for]', markErrorsFor);

	// error container which is a snippet itself keeps its element, only its content is replaced
	naja.snippetHandler.addEventListener('afterUpdate', (event) => {
		const {snippet} = event.detail;
		if (snippet.matches('[data-adt-errors-for]')) {
			markErrorsFor(snippet);
		}
	});

	document.addEventListener('input', (e) => {
		const input = e.target;
		if (!input.matches?.('[data-adt-submit-form] input, [data-adt-submit-form] textarea, [data-adt-submit-form] select')) {
			return;
		}
		input.classList.remove('is-invalid');
		if (isList(input)) {
			input.parentNode.parentNode.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
		}
		if (input.parentNode.classList.contains('input-group')) {
			input.parentNode.classList.remove('is-invalid');
		}
	});

	// the page restored from the back-forward cache still shows the state from before the redirect
	window.addEventListener('pageshow', (e) => {
		if (e.persisted) {
			[...locks.keys()].forEach(form => unlock(form, true));
		}
	});

	// nette-forms validation of all forms (data-nette-rules); Naja takes it from window.Nette when
	// submitting via AJAX. Taking over showFormErrors in the same module guarantees nette-forms is
	// loaded before it is set.
	window.Nette = Nette;
	Nette.initOnLoad();

	Nette.showFormErrors = function(form, errors) {
		// remove previously displayed error messages
		form.querySelectorAll('[id$="-errors"]').forEach(el => {
			el.replaceChildren();
		});

		const alertErrors = [];
		for (const error of errors) {
			// because radio lists and checkbox lists contains one error message multiple times
			const errorElementId = 'snippet-' + getErrorElementId(error.element) + '-errors';
			const errorElement = document.getElementById(errorElementId);
			if (!errorElement) {
				alertErrors.push(error.message);
				console.warn(`Element with ID "${errorElementId}" no exist.`);
			} else if (![...errorElement.children].some(el => el.textContent === error.message)) {
				// textContent, not innerHTML: the message may contain a value from the form or the
				// server, as HTML it would run injected code (DOM XSS)
				const message = document.createElement('div');
				message.textContent = error.message;
				errorElement.append(message);
			}

			toggleInvalid(error.element, true);
		}

		if (errors.length) {
			scrollToFirstError(form);
		}

		if (alertErrors.length) {
			alert(alertErrors.join('\n'));
		}
	};

	naja.uiHandler.addEventListener('interaction', (event) => {
		// e.g. the form is invalid
		if (event.defaultPrevented) {
			return;
		}

		const {element, options} = event.detail;
		const form = element instanceof HTMLFormElement ? element : element.form;
		if (!form || !form.matches('[data-adt-submit-form]')) {
			return;
		}

		// the element is the submitter, or the form when it was submitted without one
		const button = element === form ? null : element;

		const beforeCallback = element.getAttribute('data-adt-submit-form-before-callback');
		if (beforeCallback && !window[beforeCallback]()) {
			event.preventDefault();
			return;
		}

		// shared with the request following a redirect, as Naja copies the options to it
		options.adtSubmitForm = { form, button, element };
	});

	naja.addEventListener('start', (event) => {
		const context = event.detail.options.adtSubmitForm;
		// the request following a redirect keeps the form locked by the original request
		if (context && !context.locked) {
			context.locked = true;
			lock(context.form, context.button);
		}
	});

	naja.addEventListener('success', (event) => {
		const {payload, options} = event.detail;
		const context = options.adtSubmitForm;
		if (!context || context.redirected || payload.redirect) {
			return;
		}

		const afterCallback = context.element.getAttribute('data-adt-submit-form-after-callback');
		if (afterCallback) {
			window[afterCallback](payload, event.detail);
		}
	});

	naja.addEventListener('error', async (event) => {
		const {error, response, options} = event.detail;
		const context = options.adtSubmitForm;
		if (!context) {
			return;
		}

		// the body of an error response comes from the server or a proxy - never parsed as HTML (an
		// error page would also only show as its source), plain text only
		const isText = response && !response.bodyUsed && (response.headers.get('Content-Type') || '').startsWith('text/plain');
		const message = isText ? (await response.text()).slice(0, 1000) : error.message;
		const form = currentForm(context.form);
		const alert = document.createElement('div');
		alert.className = 'alert alert-danger';
		alert.textContent = message;
		form.prepend(alert);
		scrollToFirstError(form);
	});

	naja.addEventListener('complete', (event) => {
		const {payload, options} = event.detail;
		const context = options.adtSubmitForm;
		if (!context || !context.locked) {
			return;
		}

		// the page is leaving or the request following the redirect completes the submission
		if (payload?.redirect) {
			context.redirected = true;
			return;
		}

		context.locked = false;
		unlock(context.form);

		// if there are errors we will scroll to first of them
		scrollToFirstError(currentForm(context.form));
	});
}

export default { run }
