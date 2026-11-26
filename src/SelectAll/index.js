// A multiple select with data-adt-select-all gets a "select all found" button in its dropdown, which adds every
// result of the current search. The label is the option `label` (%count% = the number of results to add).
import observe from '../observe';

// Tom Select is created by the Select / AjaxSelect built-in through its own observer, the order is not given
function whenReady(el, callback, attempts = 40) {
	if (el.tomselect) {
		callback(el.tomselect);
	} else if (attempts > 0 && el.isConnected) {
		setTimeout(() => whenReady(el, callback, attempts - 1), 50);
	}
}

function attach(ts, label) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'ts-select-all';
	ts.dropdown.prepend(button);

	const pending = () => (ts.currentResults?.items ?? [])
		.map((result) => String(result.id))
		.filter((id) => ts.options[id] && !ts.items.includes(id));

	const update = () => {
		const ids = pending();
		button.hidden = ids.length < 2;
		button.textContent = label.replace('%count%', String(ids.length));
	};

	// The click would take the focus from the field and the dropdown would close before the items are added
	button.addEventListener('mousedown', (event) => event.preventDefault());
	button.addEventListener('click', () => {
		ts.addItems(pending());
		ts.refreshOptions(false);
	});

	ts.hook('after', 'refreshOptions', update);
	update();
}

function run(options) {
	const label = options.label || 'Select all found (%count%)';
	observe('select[multiple][data-adt-select-all]', (el) => whenReady(el, (ts) => attach(ts, label)));
}

export default { run };
