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

function initRecaptcha($form) {
	(function setRecaptchaToken() {
		// ziskame a nastavime token
		grecaptcha.execute(siteKey, {action: 'submit'}).then(function (token) {
			$form.find('input[name=recaptchaToken]').val(token);
		});

		// kazdych 110s ho refreshneme, protoze ma platnost pouze 120s
		recaptchaTimeouts[$form.attr('id')] = setTimeout(setRecaptchaToken, 110000);
	})();
}

function afterSnippetUpdate($el) {
	$el.find('[data-adt-recaptcha]').each(function() {
		// jiz registrovane timery smazu, protoze je potreba celou recaptchu inicializovat znovu
		delete recaptchaTimeouts[$(this).attr('id')];

		// pokud ma formular data initOnLoad true, chci recaptchu inicializovat ihned
		if ($(this).data('adt-recaptcha').initOnLoad) {
			initRecaptcha($(this));
		} else {
			// jinak chci recaptchu inicializovat az pri kliknuti do libovolneho pole formulare
			$(this).one('click', 'input, textarea, select', function() {
				initRecaptcha($(this).closest('form'));
			});
		}
	});
}

async function run(el, options) {
	siteKey = options.siteKey;

	addHeadStyle();

	try {
		await loadRecaptchaScriptAsync();
	} catch {
		// script uz se nacita, nechceme nacitat znovu
	}

	grecaptcha.ready(() => {
		$.nette.ext('live').after(afterSnippetUpdate);
	});
}

export default { run }