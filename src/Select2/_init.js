// The select2 "full" UMD build resolves to its CommonJS branch under Vite/Rollup,
// which exports an uninvoked factory — a side-effect import alone does not attach
// $.fn.select2 (nor $.fn.select2.amd). Invoke the factory against the global jQuery.
// Namespace import avoids the static "default is not exported" error for the UMD file.
import $ from 'jquery';
import * as select2Full from 'select2/dist/js/select2.full';

const initSelect2 = select2Full.default || select2Full;
if (typeof initSelect2 === 'function') {
	initSelect2(window, $);
}

// The i18n locale needs $.fn.select2.amd to already exist. A static import can't
// guarantee that — bundlers order modules by dependency, not source order, so a
// dependency-free locale file would evaluate before this one. A dynamic import runs
// here, after select2 is registered.
import('select2/dist/js/i18n/cs');
