const Scrollparent = require("scrollparent");

function run(options) {
	$.nette.ext("submitForm", {
		before: function (xhr, settings) {
			if (settings.nette && settings.nette.form && settings.nette.form.attr('data-adt-submit-form') !== undefined) {
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
			// if there is no redirect, we will enable buttons
			if (!payload.redirect && settings.nette && settings.nette.form && settings.nette.form.attr('data-adt-submit-form') !== undefined) {
				settings.nette.el.html(settings.nette.el.data('originalContent'));
				settings.nette.form.data('enabledButtons').each(function () {
					$(this).prop('disabled', false);
				});
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
			if (settings.nette && settings.nette.form && settings.nette.form.attr('data-adt-submit-form') !== undefined && settings.nette.form.find('.alert-danger').length > 0) {
				const $error = settings.nette.form.find('.alert-danger:first');

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
