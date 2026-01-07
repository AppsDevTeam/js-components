import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {RouteSetting, defaultRouteSettings} from './route.types.js';

let siteKey;
let markerImg;
const mapInstances = new WeakMap();
const selectedMarkers = new WeakMap();
const selectionOrder = new WeakMap();
const markerInstances = new WeakMap();
const routePolylines = new WeakMap();
const routeSettingsMap = new WeakMap();
const markersDataMap = new WeakMap();
const markerClusters = new WeakMap();
const onSelectionChangeMap = new WeakMap();

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
		} = JSON.parse(el.dataset.adtMap);

		/** @type {RouteSetting} */
		const routeSettings = {
			...defaultRouteSettings,
			...route,
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
			setTimeout(() => {
				calculateRoute(map);
			}, 500);
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
					if (node.nodeType === 1 && node.hasAttribute("data-adt-map")) {
						applyEventHandlers(node);
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
		setTimeout(() => {
			checkAndApplyPreselection(map, markers, showSelectionOrder, onSelectionChange, selectable);
		}, 200);
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

	if (map) {
		const markers = markerInstances.get(map);
		markers.set(marker.id, mapMarker);
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

function selectMarker(marker, map, showSelectionOrder) {
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
		updateSelectionOrderLabel(marker, newOrder);
	}
}

function updateSelectionOrderLabel(marker, orderNumber) {
	marker.setIcon(
		L.divIcon({
			className: 'marker-icon-wrapper',
			html: `
				<div class="marker-icon">
					<img src="` + marker.options.icon.options.iconUrl + `" />
					<div class="selection-order-label">${orderNumber}</div>
				</div>
			`,
			iconSize: [43, 58],
			iconAnchor: [21, 58]
		})
	);
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
		updateMarkerOrderDisplay(marker, null, false);
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
				updateMarkerOrderDisplay(markerInstance, newOrder, true);
			}
		});
	}
}


function updateMarkerOrderDisplay(marker, orderNumber, isSelected) {
	if (!marker._normalIcon || !marker._normalIcon.options) return;

	const iconUrl = isSelected && marker._selectedIcon ?
		marker._selectedIcon.options.iconUrl :
		marker._normalIcon.options.iconUrl;

	const iconSize = marker._normalIcon.options.iconSize || [43, 58];
	const iconAnchor = marker._normalIcon.options.iconAnchor || [iconSize[0] / 2, iconSize[1]];
	const newIcon = L.divIcon({
		className: 'marker-wrapper',
		html: `
			<div class="marker-icon">
				<img src="${iconUrl}" style="width: ${iconSize[0]}px; height: ${iconSize[1]}px;" />
				${orderNumber ? `<span class="selection-order-label">${orderNumber}</span>` : ''}
			</div>
		`,
		iconSize: iconSize,
		iconAnchor: iconAnchor
	});

	marker.setIcon(newIcon);
	// updateSelectionOrderLabel(marker, orderNumber);
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

	if (selectedSet && selectedSet.size > 0) {
		const orderedIds = Array.from(order.entries())
			.sort((a, b) => a[1] - b[1])
			.map(entry => entry[0]);
		const routeMarkers = orderedIds
			.map(id => markers.find(m => m.id === id))
			.filter(m => m !== undefined);

		if (routeMarkers.length < 2) {
			return;
		}

		const waypoints = routeMarkers.map(m => `${m.position['lon']},${m.position['lat']}`).join('|');

		try {
			const response = await fetch(
				`https://api.mapy.cz/v1/routing/route?` + new URLSearchParams({
					start: waypoints.split('|')[0],
					end: waypoints.split('|')[waypoints.split('|').length - 1],
					routeType: routeSettings.routeType,
					waypoints: waypoints.split('|').slice(1, -1).join('|'),
					apikey: siteKey,
				})
			);

			const data = await response.json();

			if (data.geometry?.geometry?.coordinates) {
				const coords = data.geometry.geometry.coordinates.map(c => [c[1], c[0]]);
				const polyline = L.polyline(coords, {
					color: routeSettings.color,
					weight: routeSettings.weight,
					opacity: routeSettings.opacity
				}).addTo(map);

				routePolylines.set(map, polyline);
			}
		} catch (error) {
			console.error('Error calculating route:', error);
		}
	}
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
	const map = mapInstances.get(mapElement);
	const markers = markerInstances.get(map);
	const marker = markers?.get(markerId);
	const settings = routeSettingsMap.get(map);

	if (!marker) return;

	updateMarkerOrderDisplay(marker, orderNumber, true);
}

export default {
	run,
	getSelectedMarkers,
	clearSelection,
	toggleMarker,
	setOrder,
}