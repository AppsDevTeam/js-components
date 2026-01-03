import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {RouteSetting, defaultRouteSettings} from './route.types.js';

let siteKey;
let markerImg;
const mapInstances = new WeakMap();

async function run(options) {
	siteKey = options.siteKey;
	markerImg = options.markerImg;

	function applyEventHandlers(el) {
		const { position = [], zoom, hideControl = false, markers = [], route = {}, callback } = JSON.parse(el.dataset.adtMap);
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

		const markerOptions = {};
		if (markerImg) {
			const img = new Image();
			img.src = markerImg;
			img.onload = function () {
				markerOptions.icon = L.icon({
					iconUrl: markerImg,
					iconSize: [img.width, img.height],
					iconAnchor: [img.width / 2, img.height]
				});
				if (markers.length) {
					addMarkers(map, markers, markerOptions, position);
				} else {
					createMarker({id: 0, position: position}, markerOptions).addTo(map);
				}
			};
		}

		if (routeSettings.enabled) {
			calculateRoute(map, markers, routeSettings)
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

	document.querySelectorAll('[data-adt-map]').forEach(function(el) {
		applyEventHandlers(el);
	});
}

function addMarkers(map, markers, options, position) {
	const positionsOfMarkers = [];
	const cluster = L.markerClusterGroup({
		disableClusteringAtZoom: map.getMaxZoom(),
	});
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
				createMarker(marker, markerOptions, cluster);
			};
		} else {
			createMarker(marker, options, cluster);
		}

		if (!marker.excludeFromBoundary) {
			positionsOfMarkers.push(marker.position);
		}
	}

	if (!position.length) {
		map.fitBounds(positionsOfMarkers);
	}
	map.addLayer(cluster);
}

function createMarker(marker, options, cluster = null) {
	const mapMarker = L.marker(marker.position, {...options, id: marker.id});
	if (marker.callback) {
		mapMarker.on('click', window[marker.callback]);
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

async function calculateRoute(map, markers, routeSettings) {
	if (markers.length < 2) return;

	const waypoints = markers.map(m => `${m.position['lon']},${m.position['lat']}`).join('|');

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

		map.fitBounds(polyline.getBounds());
	}
}

export default { run }
