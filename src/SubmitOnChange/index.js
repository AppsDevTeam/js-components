// A field with data-adt-submit-on-change="<button name>" submits its form by that button through Naja after
// a change (recalculation, loading a customer). The listener is on the document, so rows added later work too.
import naja from 'naja';

export function submitBy(form, name) {
	// Nette renders a control named "submit" as "_submit"
	const button = form?.querySelector(`[name="${name}"]`) ?? form?.querySelector(`[name="_${name}"]`);
	return button ? naja.uiHandler.submitForm(button) : Promise.resolve();
}

function run() {
	document.addEventListener('change', (event) => {
		const field = event.target.closest('[data-adt-submit-on-change]');
		if (field) {
			submitBy(field.form ?? field.closest('form'), field.dataset.adtSubmitOnChange);
		}
	});
}

export default { run };
