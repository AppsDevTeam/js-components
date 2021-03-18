let isRecaptchaScriptLoading = false;
let recaptchaTimeouts = {};

// Inicializujeme ve volání run
let siteKey;

function addHeadStyle()  {
	const el = document.createElement("style");
	el.innerHTML = ".grecaptcha-badge { visibility: hidden; }";
	document.head.appendChild(el);
}

function loadRecaptchaScriptAsync() {
	return new Promise((resolve, reject) => {
		if (isRecaptchaScriptLoading) return reject();

		isRecaptchaScriptLoading = true;

		if (typeof grecaptcha === 'object') return resolve();

		const el = document.createElement("script");
		el.src = "https://www.google.com/recaptcha/api.js?render=" + siteKey;
		el.onload = () => {
			isRecaptchaScriptLoading = false;
			resolve();
		};
		document.body.appendChild(el);
	});
}

function initRecaptcha($submit, e, options) {
	grecaptcha.execute(siteKey, {action: 'submit'}).then(function (token) {
		$submit.closest('form').find('input[name=recaptchaToken]').val(token);

		if (options.callback) {
			window[options.callback]();
		} else {
			$submit.adtAjax(e)
		}
	});
}

function afterSnippetUpdate($el, options) {
	$el.find('[data-adt-recaptcha] [type=submit]').each(function() {
		$(this).on('click', function(e) {
			e.preventDefault();
			e.stopPropagation();

			initRecaptcha($(this).closest('form'), e, $.extend(true, options, $(this).data('adt-recaptcha')));
		});
	});
}

async function run(options) {
	siteKey = options.siteKey;

	addHeadStyle();

	try {
		await loadRecaptchaScriptAsync();
	} catch {
		// script uz se nacita, nechceme nacitat znovu
	}

	grecaptcha.ready(() => {
		$.nette.ext('live').after($el => afterSnippetUpdate($el, options));
	});
}

export default { run }
