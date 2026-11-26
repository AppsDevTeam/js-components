// Table rows over the built-in Replicator, which wants its rows as direct children (tbody) and its add button
// inside itself. Here [data-adt-replicator-rows-add] may stand anywhere in the wrapper
// [data-adt-replicator-rows="<button name>"]; removing a row submits the form by that button (recalculation).
import { submitBy } from '../SubmitOnChange/index.js';

function run() {
	// Capture: Replicator removes the row on bubbling and the button would not find its wrapper any more
	document.addEventListener('click', (event) => {
		const wrapper = event.target.closest('[data-adt-replicator-rows]');
		if (!wrapper) {
			return;
		}

		if (event.target.closest('[data-adt-replicator-rows-add]')) {
			event.preventDefault();
			wrapper.querySelector('[data-adt-replicator]')?.adtReplicator?.addRow();
		} else if (event.target.closest('[data-adt-replicator-remove]') && wrapper.dataset.adtReplicatorRows) {
			const form = wrapper.closest('form');
			setTimeout(() => submitBy(form, wrapper.dataset.adtReplicatorRows));
		}
	}, true);
}

export default { run };
