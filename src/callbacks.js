// Registry shared by registerCallbacks() of the package entry and the lazily loaded components.
// Names of callbacks come from HTML attributes, so a name must never reach an arbitrary global
// (window['eval'], window['constructor'], ...) - an injected attribute would call it.
const callbacks = Object.create(null);

export const registerCallbacks = (map) => {
	for (const [name, fn] of Object.entries(map)) {
		if (typeof fn !== 'function') {
			throw new TypeError(`adt-js-components: callback "${name}" is not a function.`);
		}
		callbacks[name] = fn;
	}
};

const DENIED = new Set([
	'eval', 'Function', 'AsyncFunction', 'setTimeout', 'setInterval', 'setImmediate', 'requestAnimationFrame',
	'queueMicrotask', 'open', 'close', 'fetch', 'importScripts', 'postMessage', 'alert', 'confirm', 'prompt',
	'print', 'location', 'document', 'window', 'self', 'top', 'parent', 'opener', 'frames', 'globalThis',
]);

const warned = new Set();

// The registered callback, or a function the page defined on window itself (deprecated). Built-ins
// (native code) are refused, whatever their name.
export const resolveCallback = (name) => {
	if (typeof name !== 'string' || name === '') {
		return null;
	}
	if (Object.prototype.hasOwnProperty.call(callbacks, name)) {
		return callbacks[name];
	}
	if (
		!/^[A-Za-z_$][\w$]*$/.test(name)
		|| DENIED.has(name)
		|| name in Object.prototype
		|| name in Function.prototype
	) {
		console.error(`adt-js-components: callback "${name}" refused, register it by AdtJsComponents.registerCallbacks().`);
		return null;
	}
	const fn = window[name];
	if (typeof fn !== 'function' || /\{\s*\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(fn))) {
		console.error(`adt-js-components: callback "${name}" not found, register it by AdtJsComponents.registerCallbacks().`);
		return null;
	}
	if (!warned.has(name)) {
		warned.add(name);
		console.warn(`adt-js-components: callback "${name}" taken from window is deprecated, register it by AdtJsComponents.registerCallbacks({ ${name} }).`);
	}
	return fn;
};
