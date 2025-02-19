import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

let siteKey;
let markerImg;
const mapInstances = new WeakMap();

async function run(options) {
	siteKey = options.siteKey;
	markerImg = options.markerImg;

	function applyEventHandlers(el) {
		const { position = [], zoom, hideControl = false, markers = [], callback } = JSON.parse(el.dataset.adtMap);

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
					const markerPositions = [];
					const cluster = L.markerClusterGroup({
						disableClusteringAtZoom: map.getMaxZoom()
					});
					for (const marker of markers) {
						const mapMarker = L.marker(marker.position, {...markerOptions, id: marker.id});
						if (marker.callback) {
							mapMarker.on('click', window[marker.callback]);
						}
						if (marker.popup) {
							mapMarker.bindPopup(marker.popup);
						} else if (marker.popupCallback) {
							mapMarker.bindPopup(() => window[marker.popupCallback](mapMarker));
						}
						if (!marker.excludeFromBoundary) {
							markerPositions.push(marker.position);
						}
						cluster.addLayer(mapMarker);
					}
					if (!position.length) {
						map.fitBounds(markerPositions);
					}
					map.addLayer(cluster);
				} else {
					L.marker(position, markerOptions).addTo(map);
				}
			};
		}

		if (callback) {
			map.on('zoomend', window[callback]);
			map.on('moveend', window[callback]);
			map.on('dragend', window[callback]);
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

export default { run }
