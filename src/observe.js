// Calls `callback` for every element matching `selector` - for the elements already in
// the document and for the ones added later (snippet redraw, replicator, modal, ...).
// Each element is passed only once, even when it is moved in the DOM.
//
// Options:
//   batch     - callback gets an array of all elements found at once instead of one element
//   once      - callback is called for the first element found only, then the watcher stops
//   attribute - callback is called again for an element when this attribute changes
//   onRemove  - called for an element which left the document; when it is added back,
//               callback is called for it again
//
// Returns a function that stops watching.
//
// All watchers share one MutationObserver. Attributes are observed only when a watcher
// asks for them, and only those.

const watchers = new Set();
const attributes = new Set();
let mutationObserver = null;

function startObserving() {
	mutationObserver.observe(document.body, {
		childList: true,
		subtree: true,
		...(attributes.size ? { attributes: true, attributeFilter: [...attributes] } : {}),
	});
}

function findAll(root, selector) {
	const elements = root.matches(selector) ? [root] : [];
	elements.push(...root.querySelectorAll(selector));
	return elements;
}

function findNew(watcher, roots) {
	const elements = [];
	for (const root of roots) {
		for (const el of findAll(root, watcher.selector)) {
			if (!watcher.seen.has(el)) {
				watcher.seen.add(el);
				elements.push(el);
			}
		}
	}
	return elements;
}

function findRemoved(watcher, roots) {
	const elements = new Set();
	for (const root of roots) {
		for (const el of findAll(root, watcher.selector)) {
			// not moved, really removed
			if (watcher.seen.has(el) && !el.isConnected) {
				elements.add(el);
			}
		}
	}
	return elements;
}

function findChanged(watcher, targets, elements) {
	for (const target of targets) {
		if (target.isConnected && target.matches(watcher.selector) && !elements.includes(target)) {
			watcher.seen.add(target);
			elements.push(target);
		}
	}
	return elements;
}

function call(watcher, elements) {
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
	const added = [];
	const removed = [];
	const changed = new Map();
	for (const mutation of mutations) {
		if (mutation.type === 'attributes') {
			if (!changed.has(mutation.attributeName)) {
				changed.set(mutation.attributeName, new Set());
			}
			changed.get(mutation.attributeName).add(mutation.target);
			continue;
		}

		for (const node of mutation.addedNodes) {
			if (node.nodeType === Node.ELEMENT_NODE && node.isConnected) {
				added.push(node);
			}
		}
		for (const node of mutation.removedNodes) {
			if (node.nodeType === Node.ELEMENT_NODE && !node.isConnected) {
				removed.push(node);
			}
		}
	}

	// a callback may add or remove watchers
	for (const watcher of [...watchers]) {
		if (!watchers.has(watcher)) {
			continue;
		}

		if (watcher.onRemove) {
			for (const el of findRemoved(watcher, removed)) {
				watcher.seen.delete(el);
				watcher.onRemove(el);
			}
		}

		const elements = findNew(watcher, added);
		if (watcher.attribute && changed.has(watcher.attribute)) {
			findChanged(watcher, changed.get(watcher.attribute), elements);
		}
		call(watcher, elements);
	}
}

function onBodyReady(callback) {
	if (document.body) {
		callback();
	} else {
		document.addEventListener('DOMContentLoaded', callback, { once: true });
	}
}

export default function observe(selector, callback, { batch = false, once = false, attribute = null, onRemove = null } = {}) {
	const watcher = { selector, callback, batch, once, attribute, onRemove, seen: new WeakSet() };
	watchers.add(watcher);

	if (attribute && !attributes.has(attribute)) {
		attributes.add(attribute);
		if (mutationObserver) {
			startObserving();
		}
	}

	onBodyReady(() => {
		if (!mutationObserver) {
			mutationObserver = new MutationObserver(handleMutations);
			startObserving();
		}

		if (watchers.has(watcher)) {
			call(watcher, findNew(watcher, [document.body]));
		}
	});

	return () => watchers.delete(watcher);
}
