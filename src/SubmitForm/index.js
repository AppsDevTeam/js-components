const Scrollparent = require("scrollparent");

function isList(el) {
	return el.name.endsWith('[]') || el.type === 'radio';
}

function getErrorElementId(el) {
	return isList(el) ? el.id.split('-').slice(0, -1).join('-') : el.id;
}

function scrollToFirstError(form) {
	const el = $(form).find('.alert-danger:first, .is-invalid:first')[0];

	// we have to find first scrollable element (it can be document or modal for example)
	let scrollParent = Scrollparent(el);

	if (scrollParent.tagName === 'BODY') {
		scrollParent = document.scrollingElement || document.documentElement;
	}

	scrollParent.scrollBy({top: el.getBoundingClientRect().top - 100, behavior: 'smooth'});
}

function run(options) {

	function applyEventHandlers($el) {
		$el.find('input, textarea, select').on('input', function(e) {
			this.classList.remove('is-invalid');
			if (isList(this)) {
				$(this).parent().parent().find('.is-invalid').removeClass('is-invalid');
			}
		});
	}

	const observer = new MutationObserver(function(mutationsList, observer) {
		mutationsList.forEach(function(mutation) {
			if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
				$(mutation.addedNodes).each(function() {
					applyEventHandlers($(this));
				});
			}
		});
	});

	observer.observe($el.get(0), { childList: true, subtree: true });

	applyEventHandlers($el);

	if (typeof Nette !== "undefined") {
		Nette.showFormErrors = function(form, errors) {
			// remove previously displayed error messages
			for (const error of errors) {
				document.getElementById('snippet-' + getErrorElementId(error.element) + '-errors').innerHTML = '';
			}

			for (const error of errors) {
				// because radio lists and checkbox lists contains one error message multiple times
				if (!document.getElementById('snippet-' + getErrorElementId(error.element) + '-errors').innerHTML.includes(error.message)) {
					document.getElementById('snippet-' + getErrorElementId(error.element) + '-errors').innerHTML += '<div>' + error.message + '</div>';
				}

				error.element.classList.add('is-invalid');
				// because of radio lists and checkbox lists
				if (isList(error.element)) {
					error.element.parentNode.classList.add('is-invalid');
				}
				// because of https://github.com/twbs/bootstrap/issues/25110
				if (error.element.parentNode.classList.contains('input-group')) {
					error.element.parentNode.classList.add('has-validation');
				}
			}

			if (errors.length) {
				scrollToFirstError(form);
			}
		};
	} else {
		console.error('Package nette-forms is missing!');
	}

	$.nette.ext("submitForm", {
		before: function (xhr, settings) {
			if (settings.nette && settings.nette.form && settings.nette.form.attr('data-adt-submit-form') !== undefined) {
				let beforeCallback = settings.nette.el.attr('data-adt-submit-form-before-callback');
				if (beforeCallback) {
					if (!window[beforeCallback]()) {
						return false;
					}
				}

				settings.nette.form.data('enabledButtons', settings.nette.form.find('button:enabled'));
				settings.nette.form.find('button').prop('disabled', true);
				settings.nette.el.css('width', settings.nette.el.outerWidth());
				settings.nette.el.data('originalContent', settings.nette.el.html());
				settings.nette.el.html('<span class="spinner-border spinner-border-sm"></span>');
				settings.nette.form.find('.alert-danger').remove();
				settings.nette.form.find('.is-invalid').removeClass('is-invalid');
			}
		},
		success: function (payload, status, xhr, settings) {
			if (!payload.redirect && settings.nette && settings.nette.form && settings.nette.form.attr('data-adt-submit-form') !== undefined) {
				let afterCallback = settings.nette.el.attr('data-adt-submit-form-after-callback');
				if (afterCallback) {
					window[afterCallback](payload, status, xhr, settings);
				}

				// the form or the entire page may be redrawn
				if (settings.nette.el.data('originalContent')) {
					settings.nette.el.html(settings.nette.el.data('originalContent'));
				}
				if (settings.nette.form.data('enabledButtons')) {
					settings.nette.form.data('enabledButtons').each(function () {
						$(this).prop('disabled', false);
					});
				}
			}
		},
		error: function (xhr, status, error, settings) {
			if (settings.nette && settings.nette.form && settings.nette.form.attr('data-adt-submit-form') !== undefined) {
				settings.nette.form.prepend('<div class="alert alert-danger">' + xhr.responseText + '</div>');

				settings.nette.el.html(settings.nette.el.data('originalContent'));
				settings.nette.form.data('enabledButtons').each(function () {
					$(this).prop('disabled', false);
				});
			}
		},
		complete:  function (xhr, status, settings) {
			// if there are errors we will scroll to first of them
			if (settings.nette && settings.nette.form && settings.nette.form.attr('data-adt-submit-form') !== undefined && settings.nette.form.find('.alert-danger, .is-invalid').length > 0) {
				scrollToFirstError(settings.nette.form);
			}
		}
	});
}

export default { run }
