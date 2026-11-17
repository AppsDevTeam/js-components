import Chart from 'chart.js/auto';
import observe from '../observe';
import dataOptions from '../data';
import { chartPlugins } from './plugins';

const ATTRIBUTE = 'data-adt-chart';

function valueFormatter(format) {
	const numberFormat = new Intl.NumberFormat(document.documentElement.lang || undefined, format);
	return (value) => numberFormat.format(value);
}

function chartConfig(el) {
	const { plugins = [], format, ...config } = dataOptions(el, ATTRIBUTE);
	config.options ??= {};
	config.plugins = plugins.filter(name => {
		if (!chartPlugins[name]) {
			console.error(`adt-js-components: chart plugin "${name}" is not registered (registerChartPlugins()).`);
		}
		return chartPlugins[name];
	}).map(name => chartPlugins[name]);

	if (format) {
		const formatValue = valueFormatter(format);
		const valueAxis = config.options.indexAxis === 'y' ? 'x' : 'y';
		const scales = config.options.scales ??= {};
		scales[valueAxis] ??= {};
		scales[valueAxis].ticks ??= {};
		scales[valueAxis].ticks.callback ??= formatValue;

		const tooltip = ((config.options.plugins ??= {}).tooltip ??= {});
		tooltip.callbacks ??= {};
		tooltip.callbacks.label ??= (context) => {
			const value = typeof context.parsed === 'object' ? context.parsed[valueAxis] : context.parsed;
			return (context.dataset.label ? context.dataset.label + ': ' : '') + formatValue(value);
		};
	}
	return config;
}

function render(el) {
	const config = chartConfig(el);
	const chart = Chart.getChart(el);
	// a changed attribute updates the chart in place (no flicker), only another type needs a new one
	if (chart && chart.config.type === config.type) {
		chart.data = config.data;
		chart.options = config.options;
		chart.update();
		return;
	}
	chart?.destroy();
	new Chart(el, config);
}

function run() {
	observe(`canvas[${ATTRIBUTE}]`, render, {
		attribute: ATTRIBUTE,
		onRemove: (el) => Chart.getChart(el)?.destroy(),
	});
}

export default { run }
