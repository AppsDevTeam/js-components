import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {RouteSetting, defaultRouteSettings} from './route.types.js';

let siteKey;
let markerImg;
const svgCache = new Map();
const mapInstances = new WeakMap();
const selectedMarkers = new WeakMap();
const selectionOrder = new WeakMap();
const markerInstances = new WeakMap();
const routePolylines = new WeakMap();
const routeSettingsMap = new WeakMap();
const markersDataMap = new WeakMap();
const markerClusters = new WeakMap();
const onSelectionChangeMap = new WeakMap();
const onBeforeRouteCalculationMap = new WeakMap();
const onAfterRouteCalculationMap = new WeakMap();

const DEPOT_TYPE = {
	START: 'depot-start',
	END: 'depot-end'
};

async function run(options) {
	siteKey = options.siteKey;
	markerImg = options.markerImg;

	function applyEventHandlers(el) {
		const {
			position = [],
			zoom,
			hideControl = false,
			markers = [],
			route = {},
			showDefaultMarker = true,
			callback,
			selectable = false,
			onSelectionChange = null,
			customMarkers = {},
			showSelectionOrder = false,
			markerInfoCallback = null,
			onBeforeRouteCalculation = null,
			onAfterRouteCalculation = null,
		} = JSON.parse(el.dataset.adtMap);

		/** @type {RouteSetting} */
		const routeSettings = {
			...defaultRouteSettings,
			...route,
			customMarkers: customMarkers,
		};

		if (mapInstances.has(el)) {
			mapInstances.get(el).remove();
			mapInstances.delete(el);
		}

		const map = L.map(el);
		mapInstances.set(el, map);
		selectedMarkers.set(map, new Set());
		selectionOrder.set(map, new Map());
		markerInstances.set(map, new Map());
		routePolylines.set(map, null);
		routeSettingsMap.set(map, routeSettings);
		markersDataMap.set(map, markers);
		onSelectionChangeMap.set(map, onSelectionChange);
		onBeforeRouteCalculationMap.set(map, onBeforeRouteCalculation);
		onAfterRouteCalculationMap.set(map, onAfterRouteCalculation);

		L.tileLayer("https://api.mapy.cz/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=" + siteKey, {
			minZoom: 0,
			maxZoom: 19,
			attribution: '<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
		}).addTo(map);

		const LogoControl = L.Control.extend({
			options: {
				position: 'bottomleft',
			},
			onAdd: function (map) {
				const container = L.DomUtil.create('div');
				const link = L.DomUtil.create('a', '', container);
				link.setAttribute('href', 'http://mapy.cz/');
				link.setAttribute('target', '_blank');
				link.innerHTML = '<img src="https://api.mapy.cz/img/api/logo.svg" />';
				L.DomEvent.disableClickPropagation(link);

				return container;
			},
		});
		new LogoControl().addTo(map);

		if (position.length) {
			if (zoom) {
				map.setView(position, zoom);
			} else {
				map.fitBounds([position]);
			}
		}

		map.scrollWheelZoom.disable();
		if (hideControl) {
			map.zoomControl.remove();
			map.keyboard.disable();
			map.dragging.disable();
		}


		if (selectable) {
			enableRectangleSelection(map, onSelectionChange, showSelectionOrder);
		}

		const markerOptions = {};
		const customMarkerOptions = {};
		const normalImg = customMarkers.normal || markerImg;
		const selectedImg = customMarkers.selected || markerImg;

		if (normalImg) {
			const img = new Image();
			img.src = normalImg;
			img.onload = function () {
				markerOptions.icon = L.icon({
					iconUrl: normalImg,
					iconSize: [img.width, img.height],
					iconAnchor: [img.width / 2, img.height]
				});

				if (selectedImg && selectedImg !== normalImg) {
					const selectedImgEl = new Image();
					selectedImgEl.src = selectedImg;
					selectedImgEl.onload = function () {
						customMarkerOptions.icon = L.icon({
							iconUrl: selectedImg,
							iconSize: [selectedImgEl.width, selectedImgEl.height],
							iconAnchor: [selectedImgEl.width / 2, selectedImgEl.height]
						});

						if (markers.length) {
							addMarkers(map, markers, markerOptions, customMarkerOptions, position, selectable, onSelectionChange, showSelectionOrder, markerInfoCallback);
						} else if (showDefaultMarker) {
							createMarker({
								id: 0,
								position: position
							}, markerOptions, customMarkerOptions, null, selectable, onSelectionChange, map, showSelectionOrder, markerInfoCallback).addTo(map);
						}
					};
				} else {
					customMarkerOptions.icon = markerOptions.icon;

					if (markers.length) {
						addMarkers(map, markers, markerOptions, customMarkerOptions, position, selectable, onSelectionChange, showSelectionOrder, markerInfoCallback);
					} else if (showDefaultMarker) {
						createMarker({
							id: 0,
							position: position
						}, markerOptions, customMarkerOptions, null, selectable, onSelectionChange, map, showSelectionOrder, markerInfoCallback).addTo(map);
					}
				}
			};
		}

		if (routeSettings.enabled) {
			calculateRoute(map);
		}

		if (callback) {
			map.on('zoomend', window[callback]);
			map.on('moveend', window[callback]);
			map.on('dragend', window[callback]);
			map.on('click', window[callback]);
		}
	}

	const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === 1) {
						if (node.hasAttribute("data-adt-map")) {
							applyEventHandlers(node);
						}

						node.querySelectorAll?.('[data-adt-map]').forEach(el => {
							applyEventHandlers(el);
						});
					}
				});
			}

			if (mutation.type === "attributes" && mutation.attributeName === "data-adt-map") {
				applyEventHandlers(mutation.target);
			}
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ["data-adt-map"]
	});

	document.querySelectorAll('[data-adt-map]').forEach(function (el) {
		applyEventHandlers(el);
	});
}

function enableRectangleSelection(map, onSelectionChange, showSelectionOrder) {
	let isDrawing = false;
	let startPoint = null;
	let rectangle = null;

	map.on('mousedown', (e) => {
		if (e.originalEvent.ctrlKey && e.originalEvent.shiftKey) {
			isDrawing = true;
			startPoint = e.latlng;

			rectangle = L.rectangle([startPoint, startPoint], {
				color: '#3388ff',
				weight: 2,
				fillOpacity: 0.1
			}).addTo(map);

			map.dragging.disable();
			e.originalEvent.preventDefault();
		}
	});

	map.on('mousemove', (e) => {
		if (isDrawing && rectangle) {
			rectangle.setBounds([startPoint, e.latlng]);
		}
	});

	map.on('mouseup', (e) => {
		if (isDrawing) {
			isDrawing = false;
			map.dragging.enable();

			if (rectangle) {
				const bounds = rectangle.getBounds();
				const markerMap = markerInstances.get(map);
				const selectedInArea = [];

				markerMap.forEach((markerInstance, markerId) => {
					const latLng = markerInstance.getLatLng();

					if (bounds.contains(latLng)) {
						selectedInArea.push(markerInstance);
					}
				});

				const selected = selectedMarkers.get(map);
				selectedInArea.forEach(marker => {
					if (selected.has(marker.options.id)) {
						deselectMarker(marker, map, showSelectionOrder);
					} else {
						selectMarker(marker, map, showSelectionOrder);
					}
				});

				map.removeLayer(rectangle);
				rectangle = null;

				if (onSelectionChange && window[onSelectionChange]) {
					const order = selectionOrder.get(map);
					const orderedIds = Array.from(order.entries())
						.sort((a, b) => a[1] - b[1])
						.map(entry => entry[0]);
					window[onSelectionChange](orderedIds);
				}

				const settings = routeSettingsMap.get(map);
				if (settings && settings.enabled) {
					calculateRoute(map);
				}
			}
		}
	});
}

function addMarkers(map, markers, options, selectedOptions, position, selectable, onSelectionChange, showSelectionOrder, markerInfoCallback) {
	const positionsOfMarkers = [];
	const cluster = L.markerClusterGroup({
		disableClusteringAtZoom: 18,
		spiderfyOnMaxZoom: true,
		showCoverageOnHover: false,
		zoomToBoundsOnClick: true,

		iconCreateFunction: function (cluster) {
			const childCount = cluster.getChildCount();
			let c = ' marker-cluster-';
			if (childCount < 10) {
				c += 'small';
			} else if (childCount < 100) {
				c += 'medium';
			} else {
				c += 'large';
			}

			return new L.DivIcon({
				html: '<div><span>' + childCount + '</span></div>',
				className: 'marker-cluster' + c,
				iconSize: new L.Point(40, 40)
			});
		}
	});

	markerClusters.set(map, cluster);
	let loadedCount = 0;
	const totalMarkers = markers.length;

	for (const marker of markers) {
		if (marker.img) {
			let markerOptions = options;
			let markerImage = new Image();
			markerImage.src = marker.img;
			markerImage.onload = function () {
				markerOptions.icon = L.icon({
					iconUrl: marker.img,
					iconSize: [markerImage.width, markerImage.height],
					iconAnchor: [markerImage.width / 2, markerImage.height]
				});
				createMarker(marker, markerOptions, selectedOptions, cluster, selectable, onSelectionChange, map, showSelectionOrder, markerInfoCallback);

				loadedCount++;
				if (loadedCount === totalMarkers) {
					checkAndApplyPreselection(map, markers, showSelectionOrder, onSelectionChange, selectable);
				}
			};
		} else {
			createMarker(marker, options, selectedOptions, cluster, selectable, onSelectionChange, map, showSelectionOrder, markerInfoCallback);
			loadedCount++;
		}

		if (!marker.excludeFromBoundary) {
			positionsOfMarkers.push(marker.position);
		}
	}

	if (!position.length && positionsOfMarkers.length) {
		map.fitBounds(positionsOfMarkers);
	}
	map.addLayer(cluster);

	if (loadedCount === totalMarkers) {
		checkAndApplyPreselection(map, markers, showSelectionOrder, onSelectionChange, selectable);
	}
}

function checkAndApplyPreselection(map, markers, showSelectionOrder, onSelectionChange, selectable) {
	if (selectable && showSelectionOrder) {
		applyPreselectedMarkers(map, markers, showSelectionOrder, onSelectionChange);
	}
}

function createMarker(marker, options, selectedOptions, cluster = null, selectable = false, onSelectionChange = null, map = null, showSelectionOrder = false, markerInfoCallback = null) {
	const mapMarker = L.marker(marker.position, {...options, id: marker.id});
	mapMarker._normalIcon = options.icon;
	mapMarker._selectedIcon = selectedOptions.icon;
	mapMarker._markerData = marker;

	const markerElement = mapMarker.getElement();
	if (markerElement && markerElement.parentElement) {
		markerElement.parentElement.style.pointerEvents = 'visible';
	}

	if (map) {
		const markers = markerInstances.get(map);
		markers.set(marker.id, mapMarker);

		mapMarker.on('add', function () {
			const el = mapMarker.getElement();
			if (el) {
				el.style.cursor = 'pointer';

				const parent = el.parentElement;
				if (parent) {
					parent.style.pointerEvents = 'all';
				}
			}
		});
	}

	const originalCallback = marker.callback;

	if (selectable && map) {
		mapMarker.on('click', function (e) {
			if (e.originalEvent.shiftKey && markerInfoCallback && window[markerInfoCallback]) {
				window[markerInfoCallback](marker);
				L.DomEvent.stopPropagation(e);
				return;
			}

			const selected = selectedMarkers.get(map);

			if (selected.has(marker.id)) {
				deselectMarker(mapMarker, map, showSelectionOrder);
			} else {
				selectMarker(mapMarker, map, showSelectionOrder);
			}

			if (onSelectionChange && window[onSelectionChange]) {
				const order = selectionOrder.get(map);
				const orderedIds = Array.from(order.entries())
					.sort((a, b) => a[1] - b[1])
					.map(entry => entry[0]);
				window[onSelectionChange](orderedIds);
			}

			const settings = routeSettingsMap.get(map);
			if (settings && settings.enabled) {
				calculateRoute(map);
			}

			if (originalCallback && window[originalCallback]) {
				window[originalCallback](e);
			}

			L.DomEvent.stopPropagation(e);
		});
	} else if (originalCallback) {
		mapMarker.on('click', window[originalCallback]);
	}

	if (marker.popup) {
		mapMarker.bindPopup(marker.popup);
	} else if (marker.popupCallback) {
		mapMarker.bindPopup(() => window[marker.popupCallback](mapMarker));
	}

	if (cluster) {
		cluster.addLayer(mapMarker);
	}

	return mapMarker;
}

async function selectMarker(marker, map, showSelectionOrder) {
	const selected = selectedMarkers.get(map);
	const order = selectionOrder.get(map);

	selected.add(marker.options.id);

	const maxOrder = order.size > 0 ? Math.max(...order.values()) : 0;
	const newOrder = maxOrder + 1;
	order.set(marker.options.id, newOrder);

	if (marker._selectedIcon) {
		marker.setIcon(marker._selectedIcon);
	}

	const icon = marker.getElement();
	if (icon) {
		icon.classList.add('marker-selected');
	}

	if (showSelectionOrder) {
		const newIcon = await createMarkerIcon(map, marker.options.icon.options.iconUrl, newOrder)
		marker.setIcon(newIcon);
	}
}

function deselectMarker(marker, map, showSelectionOrder) {
	const selected = selectedMarkers.get(map);
	const order = selectionOrder.get(map);
	const removedOrder = order.get(marker.options.id);

	selected.delete(marker.options.id);
	order.delete(marker.options.id);
	order.forEach((value, key) => {
		if (value > removedOrder) {
			order.set(key, value - 1);
		}
	});

	if (showSelectionOrder) {
		updateMarkerOrderDisplay(map, marker, null, false);
	} else if (marker._normalIcon) {
		marker.setIcon(marker._normalIcon);
	}

	const icon = marker.getElement();
	if (icon) {
		icon.classList.remove('marker-selected');
	}

	if (showSelectionOrder) {
		const markers = markerInstances.get(map);
		markers.forEach((markerInstance) => {
			const newOrder = order.get(markerInstance.options.id);
			if (newOrder) {
				updateMarkerOrderDisplay(map, markerInstance, newOrder, true);
			}
		});
	}
}


async function updateMarkerOrderDisplay(map, marker, orderNumber, isSelected, color = null) {
	if (!marker._normalIcon || !marker._normalIcon.options) return;

	const iconUrl = isSelected && marker._selectedIcon ?
		marker._selectedIcon.options.iconUrl :
		marker._normalIcon.options.iconUrl;
	const newIcon = await createMarkerIcon(map, iconUrl, orderNumber, color);

	marker.setIcon(newIcon);
}

async function createMarkerIcon(map, iconUrl, orderNumber, color = null) {
	let inlineStyle = null;
	const settings = routeSettingsMap.get(map);

	if ((settings && settings.enabled) || color) {
		inlineStyle = `--marker-fill: ${color ?? settings.color};`;
	}

	let svg;
	if (svgCache.has(iconUrl)) {
		svg = svgCache.get(iconUrl);
	} else {
		const response = await fetch(iconUrl);
		svg = await response.text();
		svgCache.set(iconUrl, svg);
	}

	return L.divIcon({
		className: 'marker-icon-wrapper',
		html: `
            <div class="marker-icon" style="${inlineStyle}">
                ${svg}
                ${orderNumber ? `<span class="selection-order-label">${orderNumber}</span>` : ''}
            </div>
        `,
		iconSize: [43, 58],
		iconAnchor: [21, 58]
	});
}

function applyPreselectedMarkers(map, markersData, showSelectionOrder, onSelectionChange) {
	const markerMap = markerInstances.get(map);
	const order = selectionOrder.get(map);
	const preselected = markersData
		.filter(m => {
			return m.selected === true;
		})
		.sort((a, b) => (a.selectionOrder || 0) - (b.selectionOrder || 0));

	preselected.forEach((markerData, index) => {
		const markerInstance = markerMap.get(markerData.id);
		if (markerInstance) {
			selectMarker(markerInstance, map, showSelectionOrder);
		} else {
			console.warn('Marker instance NOT found for ID:', markerData.id);
		}
	});

	if (onSelectionChange && window[onSelectionChange] && order.size > 0) {
		const orderedIds = Array.from(order.entries())
			.sort((a, b) => a[1] - b[1])
			.map(entry => entry[0]);

		window[onSelectionChange](orderedIds);
	}

	const settings = routeSettingsMap.get(map);
	if (settings && settings.enabled && order.size >= 2) {
		calculateRoute(map);
	}
}

async function calculateRoute(map) {
	const selectedSet = selectedMarkers.get(map);
	const order = selectionOrder.get(map);
	const markers = markersDataMap.get(map);
	const routeSettings = routeSettingsMap.get(map);
	const oldPolyline = routePolylines.get(map);

	if (oldPolyline) {
		map.removeLayer(oldPolyline);
		routePolylines.set(map, null);
	}

	if (!routeSettings || !routeSettings.enabled) {
		return;
	}

	const hasCustomStart = routeSettings.startPoint !== null && routeSettings.startPoint !== undefined;
	const hasCustomEnd = routeSettings.endPoint !== null && routeSettings.endPoint !== undefined;

	if (hasCustomStart) addDepotMarker(map, routeSettings.startPoint, DEPOT_TYPE.START);
	if (hasCustomEnd) addDepotMarker(map, routeSettings.endPoint, DEPOT_TYPE.END);

	if (!selectedSet || selectedSet.size === 0) return;

	const orderedIds = Array.from(order.entries())
		.sort((a, b) => a[1] - b[1])
		.map(entry => entry[0]);
	const routeMarkers = orderedIds
		.map(id => markers.find(m => m.id === id))
		.filter(m => m !== undefined);

	if (routeMarkers.length < 2) return;

	const beforeCallback = onBeforeRouteCalculationMap.get(map);
	if (beforeCallback && window[beforeCallback]) {
		window[beforeCallback]();
	}

	let startPoint = hasCustomStart ? routeSettings.startPoint : routeMarkers[0].position;
	let endPoint = hasCustomEnd ? routeSettings.endPoint : routeMarkers[routeMarkers.length - 1].position;

	const WAYPOINTS_LIMIT = 15;
	const allCoords = [];
	const allParts = [];
	let totalDuration = 0;
	let totalLength = 0;

	try {
		if (routeMarkers.length <= WAYPOINTS_LIMIT) {
			const params = new URLSearchParams({
				start: `${startPoint.lon},${startPoint.lat}`,
				end: `${endPoint.lon},${endPoint.lat}`,
				routeType: routeSettings.routeType,
				apikey: siteKey
			});
			routeMarkers.forEach(m => params.append('waypoints', `${m.position.lon},${m.position.lat}`));

			const response = await fetch(`https://api.mapy.cz/v1/routing/route?${params.toString()}`);
			const data = await response.json();

			if (data.geometry?.geometry?.coordinates) {
				allCoords.push(...data.geometry.geometry.coordinates.map(c => [c[1], c[0]]));
			}
			if (data.parts) {
				allParts.push(...data.parts);
			}
			if (data.duration) {
				totalDuration += data.duration;
			}
			if (data.length) {
				totalLength += data.length;
			}
		} else {
			const chunks = [];
			for (let i = 0; i < routeMarkers.length; i += WAYPOINTS_LIMIT) {
				chunks.push(routeMarkers.slice(i, i + WAYPOINTS_LIMIT));
			}

			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				const isFirstChunk = i === 0;
				const isLastChunk = i === chunks.length - 1;

				const chunkStart = isFirstChunk ? startPoint : chunks[i - 1][chunks[i - 1].length - 1].position;
				const chunkEnd = isLastChunk ? endPoint : chunk[chunk.length - 1].position;

				const params = new URLSearchParams({
					start: `${chunkStart.lon},${chunkStart.lat}`,
					end: `${chunkEnd.lon},${chunkEnd.lat}`,
					routeType: routeSettings.routeType,
					apikey: siteKey
				});

				const markersToAdd = isFirstChunk ? chunk : chunk.slice(1);
				markersToAdd.forEach(m => params.append('waypoints', `${m.position.lon},${m.position.lat}`));

				const response = await fetch(`https://api.mapy.cz/v1/routing/route?${params.toString()}`);
				const data = await response.json();

				if (data.geometry?.geometry?.coordinates) {
					allCoords.push(...data.geometry.geometry.coordinates.map(c => [c[1], c[0]]));
				}
				if (data.parts) {
					allParts.push(...data.parts);
				}
				if (data.duration) {
					totalDuration += data.duration;
				}
				if (data.length) {
					totalLength += data.length;
				}
			}
		}
	} catch (error) {
		console.error('Error calculating route:', error);
		const afterCallback = onAfterRouteCalculationMap.get(map);
		if (afterCallback && window[afterCallback]) window[afterCallback]({}, 0, 0);

		return;
	}

	if (allCoords.length > 0) {
		const polyline = L.polyline(allCoords, {
			color: routeSettings.color,
			weight: routeSettings.weight,
			opacity: routeSettings.opacity
		}).addTo(map);
		routePolylines.set(map, polyline);
	}

	// @type {TRouteParts}
	const routeParts = {};
	allParts.forEach((part, index) => {
		if (index < orderedIds.length) {
			const markerId = orderedIds[index];
			routeParts[markerId] = {
				duration: part.duration,
				length: part.length,
			};
		}
	});

	const afterCallback = onAfterRouteCalculationMap.get(map);
	if (afterCallback && window[afterCallback]) window[afterCallback](routeParts, totalLength, totalDuration);
}

function addDepotMarker(map, position, depotType) {
	const routeSettings = routeSettingsMap.get(map);
	const customMarkers = routeSettings.customMarkers || {};
	const iconUrl = customMarkers.depot || markerImg;

	const img = new Image();
	img.src = iconUrl;
	img.onload = function () {
		const icon = L.icon({
			iconUrl: iconUrl,
			iconSize: [img.width, img.height],
			iconAnchor: [img.width / 2, img.height]
		});

		L.marker(position, {icon: icon}).addTo(map);
	};
}

function getSelectedMarkers(mapElement) {
	const map = mapInstances.get(mapElement);
	if (!map) return [];

	const order = selectionOrder.get(map);
	return Array.from(order.entries())
		.sort((a, b) => a[1] - b[1])
		.map(entry => entry[0]);
}

function clearSelection(mapElement) {
	const map = mapInstances.get(mapElement);
	if (!map) return;

	const selected = selectedMarkers.get(map);
	const order = selectionOrder.get(map);
	const markers = markerInstances.get(map);

	markers.forEach((markerInstance) => {
		if (selected.has(markerInstance.options.id)) {
			deselectMarker(markerInstance, map, true);
		}
	});

	selected.clear();
	order.clear();
}

function getOnSelectionChange(map) {
	return onSelectionChangeMap.get(map);
}

function toggleMarker(mapElement, markerId, selected) {
	const map = mapInstances.get(mapElement);
	const markers = markerInstances.get(map);
	const marker = markers?.get(markerId);

	if (!marker) return;

	const selectedSet = selectedMarkers.get(map);
	const isSelected = selectedSet.has(markerId);

	if (selected && !isSelected) {
		selectMarker(marker, map, true);
	} else if (!selected && isSelected) {
		deselectMarker(marker, map, true);
	} else {
		return;
	}

	const cluster = markerClusters.get(map);
	if (cluster) {
		cluster.refreshClusters(marker);
	}

	const settings = routeSettingsMap.get(map);
	if (settings && settings.enabled) {
		calculateRoute(map);
	}
}

function setOrder(mapElement, markerId, orderNumber) {
	let color = null;
	const map = mapInstances.get(mapElement);
	const settings = $(mapElement).data('adt-map')
	const markers = markerInstances.get(map);
	const marker = markers?.get(markerId);

	if (settings && settings.route && settings.route.enabled) {
		color = settings.route.color;
	}

	if (!marker) return;

	updateMarkerOrderDisplay(mapElement, marker, orderNumber, true, color);
}

function onBeforeRouteCalculation(mapElement, callbackName) {
	const map = mapInstances.get(mapElement);
	if (!map) return;
	onBeforeRouteCalculationMap.set(map, callbackName);
}

function onAfterRouteCalculation(mapElement, callbackName) {
	const map = mapInstances.get(mapElement);
	if (!map) return;
	onAfterRouteCalculationMap.set(map, callbackName);
}

function recalculateRoute(mapElement) {
	const map = mapInstances.get(mapElement);
	if (!map) return;
	calculateRoute(map);
}

export default {
	run,
	getSelectedMarkers,
	clearSelection,
	toggleMarker,
	setOrder,
	onBeforeRouteCalculation,
	onAfterRouteCalculation,
	recalculateRoute,
}
