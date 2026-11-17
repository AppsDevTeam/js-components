import ComponentLoader from './src/ComponentLoader';
import observe from './src/observe';

export default ComponentLoader;
export { observe };

// kept for projects calling $.observe() directly
$.observe = function(selector, callback) {
	observe(selector, callback);
};
