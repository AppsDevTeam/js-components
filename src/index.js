const loadedComponents = [];

const init = (components) => {
	let componentsConfig = {};
	if (typeof document.querySelector(`body`).dataset.componentsConfig !== 'undefined') {
		componentsConfig = JSON.parse(document.querySelector(`body`).dataset.componentsConfig);
	}

	$.nette.ext('live').after(function($el) {
		for (let [componentName, componentPath] of Object.entries(components)) {
			// component is already loaded
			if (loadedComponents.includes(componentPath)) continue;

			// there is no element using this component
			const el = document.querySelector(`[data-adt-${componentName}]`);
			if (!el) continue;

			loadedComponents.push(componentPath);

			import('app/' + componentPath + '/index.js').then(component => {
				component.default.run(el, componentsConfig[componentName] || {});
			});
		}
	});
};

const getFirstDiffCharIndex = (a, b) => {
	const longerLength = Math.max(a.length, b.length);
	for (let i = 0; i < longerLength; i++) {
		if (a[i] !== b[i]) return i;
	}
	return -1;
}

export const loadScssModule = (styles) => {
	const newStyles = {};
	for (let [key, value] of Object.entries(styles)) {
		const firstDiffCharIndex = getFirstDiffCharIndex(key, value);
		let newKey = value.slice(0, value.slice.length - 16).slice(2 * firstDiffCharIndex);
		newStyles[newKey] = key;
	}
	return newStyles;
}

export default {
	init,
	loadScssModule,
};
