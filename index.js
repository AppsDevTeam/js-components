import ComponentLoader from './src/ComponentLoader';

export default ComponentLoader;

$.fn.adtAjax = function (e, options) {
	return $.nette.ajax(options || {}, this[0], e);
};
