// Calls `callback` for every element matching `selector` - for the elements already in
// the document and for the ones added later (snippet redraw, replicator, modal, ...).
// Each element is passed only once, even when it is moved in the DOM.
//
// Options:
//   batch - callback gets an array of all elements found at once instead of one element
//   once  - callback is called for the first element found only, then the watcher stops
//
// Returns a function that stops watching.
//
// All watchers share one MutationObserver.

const watchers = new Set();
let mutationObserver = null;

function findAll(root, selector) {
	const elements = root.matches(selector) ? [root] : [];
	elements.push(...root.querySelectorAll(selector));
	return elements;
}

function process(watcher, roots) {
	const elements = [];
	for (const root of roots) {
		for (const el of findAll(root, watcher.selector)) {
			if (!watcher.seen.has(el)) {
				watcher.seen.add(el);
				elements.push(el);
			}
		}
	}

	if (!elements.length) {
		return;
	}

	if (watcher.once) {
		watchers.delete(watcher);
		watcher.callback(elements[0]);
	} else if (watcher.batch) {
		watcher.callback(elements);
	} else {
		elements.forEach(el => watcher.callback(el));
	}
}

function handleMutations(mutations) {
	const roots = [];
	for (const mutation of mutations) {
		for (const node of mutation.addedNodes) {
			if (node.nodeType === Node.ELEMENT_NODE && node.isConnected) {
				roots.push(node);
			}
		}
	}

	if (!roots.length) {
		return;
	}

	// a callback may add or remove watchers
	for (const watcher of [...watchers]) {
		if (watchers.has(watcher)) {
			process(watcher, roots);
		}
	}
}

function onBodyReady(callback) {
	if (document.body) {
		callback();
	} else {
		document.addEventListener('DOMContentLoaded', callback, { once: true });
	}
}

export default function observe(selector, callback, { batch = false, once = false } = {}) {
	const watcher = { selector, callback, batch, once, seen: new WeakSet() };
	watchers.add(watcher);

	onBodyReady(() => {
		if (!mutationObserver) {
			mutationObserver = new MutationObserver(handleMutations);
			mutationObserver.observe(document.body, { childList: true, subtree: true });
		}

		if (watchers.has(watcher)) {
			process(watcher, [document.body]);
		}
	});

	return () => watchers.delete(watcher);
}
