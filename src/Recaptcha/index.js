import naja from 'naja';
import dataOptions from '../data';
import { resolveCallback } from '../callbacks';

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
	const tokenInput = submitter.form?.querySelector('input[name=recaptchaToken]');
	if (tokenInput) {
		tokenInput.value = token;
	}

	if (options.callback) {
		resolveCallback(options.callback)?.();
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

	document.addEventListener('click', (e) => {
		const submitter = e.target.closest('[data-adt-recaptcha] [type=submit]');
		if (!submitter) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();

		submitWithRecaptcha(submitter, { ...options, ...dataOptions(submitter, 'data-adt-recaptcha') });
	});
}

export default { run }
