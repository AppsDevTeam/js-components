// Registry shared by registerChartPlugins() of the package entry and the lazily loaded component,
// so registering a plugin does not load chart.js
export const chartPlugins = {};

export const registerChartPlugins = (plugins) => Object.assign(chartPlugins, plugins);
