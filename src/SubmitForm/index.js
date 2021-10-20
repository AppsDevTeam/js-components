const Scrollparent = require("scrollparent");

function run(options) {
	$.nette.ext("submitForm", {
		before: function (xhr, settings) {
			if (settings.nette) {
				settings.nette.form.find('button').prop('disabled', true);
				settings.nette.el.find('.js-spinner').removeClass('d-none');
				settings.nette.form.find('.js-error').remove();
				settings.nette.form.find('.is-invalid').removeClass('is-invalid');
			}
		},
		success: function (payload, status, xhr, settings) {
			// if there is no redirect, we will enable buttons
			if (!payload.redirect && settings.nette) {
				settings.nette.el.find('.js-spinner').addClass('d-none');
				settings.nette.form.find('button').prop('disabled', false);
			}
		},
		error: function (xhr, status, error, settings) {
			if (settings.nette) {
				settings.nette.form.find('.js-errors').append('<div class="alert alert-danger js-error">' + xhr.responseJSON['error'] + '</div>');

				settings.nette.el.find('.js-spinner').addClass('d-none');
				settings.nette.form.find('button').prop('disabled', false);
			}
		},
		complete:  function (xhr, status, settings) {
			// if there are errors we will scroll to first of them
			if (settings.nette && settings.nette.form.find('.js-error').length > 0) {
				const $error = settings.nette.form.find('.js-error:first');

				// we have to find first scrollable element (it can be document or modal for example)
				let scrollParent = Scrollparent($error[0]);
				if (scrollParent.tagName === 'BODY') {
					scrollParent = document.scrollingElement || document.documentElement;
				}

				$(scrollParent).animate({
					scrollTop: $error.offset().top - 100
				}, 500);
			}
		}
	});
}

export default { run }
