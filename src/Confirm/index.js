// A link or button with data-adt-confirm="<question>" goes through only once confirmed. The listener runs in
// the capture phase so that a cancelled click never reaches Naja (it skips clicks with defaultPrevented).
function run() {
	document.addEventListener('click', (event) => {
		const element = event.target.closest('[data-adt-confirm]');
		if (element && !window.confirm(element.dataset.adtConfirm)) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}, true);
}

export default { run };
