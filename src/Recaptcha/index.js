import naja from 'naja';

let recaptchaScript = null;

// Inicializujeme ve volání run
let siteKey;

function addHeadStyle()  {
	const el = document.createElement("style");
	el.innerHTML = ".grecaptcha-badge { visibility: hidden; }";
	document.head.appendChild(el);
}

function loadRecaptchaScript() {
	if (!recaptchaScript) {
		recaptchaScript = new Promise((resolve) => {
			if (typeof grecaptcha === 'object') return resolve();

			const el = document.createElement("script");
			el.src = "https://www.google.com/recaptcha/api.js?render=" + siteKey;
			el.onload = () => resolve();
			document.body.appendChild(el);
		}).then(() => new Promise(resolve => grecaptcha.ready(resolve)));
	}
	return recaptchaScript;
}

async function submitWithRecaptcha(submitter, options) {
	await loadRecaptchaScript();

	const token = await grecaptcha.execute(siteKey, {action: 'submit'});
	$(submitter).closest('form').find('input[name=recaptchaToken]').val(token);

	if (options.callback) {
		window[options.callback]();
	} else {
		naja.uiHandler.submitForm(submitter).catch(() => {
			// errors are handled by naja.addEventListener('error', ...)
		});
	}
}

async function run(options) {
	siteKey = options.siteKey;

	addHeadStyle();
	loadRecaptchaScript();

	$(document).on('click', '[data-adt-recaptcha] [type=submit]', function(e) {
		e.preventDefault();
		e.stopPropagation();

		submitWithRecaptcha(this, $.extend(true, {}, options, $(this).data('adt-recaptcha')));
	});
}

export default { run }
