import naja from 'naja';
import Scrollparent from "scrollparent";
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
	let scrollParent = Scrollparent(el);

	if (scrollParent.tagName === 'BODY') {
		scrollParent = document.scrollingElement || document.documentElement;
	}

	scrollParent.scrollBy({top: el.getBoundingClientRect().top - 100, behavior: 'smooth'});
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

	$(document).on('input', '[data-adt-submit-form] input, [data-adt-submit-form] textarea, [data-adt-submit-form] select', function() {
		this.classList.remove('is-invalid');
		if (isList(this)) {
			$(this).parent().parent().find('.is-invalid').removeClass('is-invalid');
		}
		if (this.parentNode.classList.contains('input-group')) {
			this.parentNode.classList.remove('is-invalid');
		}
	});

	// the page restored from the back-forward cache still shows the state from before the redirect
	window.addEventListener('pageshow', (e) => {
		if (e.persisted) {
			[...locks.keys()].forEach(form => unlock(form, true));
		}
	});

	if (typeof Nette !== "undefined") {
		Nette.showFormErrors = function(form, errors) {
			// remove previously displayed error messages
			form.querySelectorAll('[id$="-errors"]').forEach(el => {
				el.innerHTML = '';
			});

			const alertErrors = [];
			for (const error of errors) {
				// because radio lists and checkbox lists contains one error message multiple times
				const errorElementId = 'snippet-' + getErrorElementId(error.element) + '-errors';
				const errorElement = document.getElementById(errorElementId);
				if (!errorElement) {
					alertErrors.push(error.message);
					console.warn(`Element with ID "${errorElementId}" no exist.`);
				} else if (!errorElement.innerHTML.includes(error.message)) {
					errorElement.innerHTML += `<div>${error.message}</div>`;
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
	} else {
		console.error('Package nette-forms is missing!');
	}

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

		const message = response && !response.bodyUsed ? await response.text() : error.message;
		const form = currentForm(context.form);
		form.insertAdjacentHTML('afterbegin', '<div class="alert alert-danger">' + message + '</div>');
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
