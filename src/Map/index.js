let areResourcesLoading = false;
let siteKey;

function loadResources() {
	return new Promise((resolve, reject) => {
		if (areResourcesLoading) return reject();

		areResourcesLoading = true;

		console.log(L);

		if (typeof grecaptcha === 'object') return resolve();

		const el = document.createElement("script");
		el.src = "https://www.google.com/recaptcha/api.js?render=" + siteKey;
		el.onload = () => {
			areResourcesLoading = false;
			resolve();
		};
		document.body.appendChild(el);
	});
}

function afterSnippetUpdate($el, options) {
	$el.find('[data-adt-map]').each(function() {
		$(this).on('click', function(e) {
			e.preventDefault();
			e.stopPropagation();

			initRecaptcha($(this), e, $.extend(true, options, $(this).data('adt-recaptcha')));
		});
	});
}

async function run(options) {
	siteKey = options.siteKey;

	console.log('xxx');

	// try {
	// 	await loadResources();
	// } catch {
	// 	// script uz se nacita, nechceme nacitat znovu
	// }

	$.nette.ext('live').after(function($el) {
		$el.find('[data-adt-map]').each(function() {
			console.log('yyy');
		});

		let existingMap = null; // Globální proměnná pro uložení existující instance mapy
		// Pokud již existuje mapa, zničí ji
		if (existingMap) {
			existingMap.remove();
			existingMap = null;
		}
		// replace with your own API key
		const API_KEY = 'XOU3MChgVI1TbOJOE-ShaXb-SUtoFSbWnnSJr_3V_cs';
		/*
		We create the map and set its initial coordinates and zoom.
		See https://leafletjs.com/reference.html#map
		*/
		const map = L.map(el);
		if (position.length) {
			map.setView(position, zoom);
		}
		// Uložení instance mapy do globální proměnné
		existingMap = map;
		/*
		Then we add a raster tile layer with REST API Mapy.cz tiles
		See https://leafletjs.com/reference.html#tilelayer
		*/
		L.tileLayer(`https://api.mapy.cz/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${API_KEY}`, {
			minZoom: 0,
			maxZoom: 19,
			attribution: '<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
		}).addTo(map);
		if (hideControl) {
			map.scrollWheelZoom.disable();
			map.zoomControl.remove();
			map.keyboard.disable();
			map.dragging.disable();
			const mapElement = document.getElementById(el); // Element, kde je mapa inicializována
			mapElement.style.fontSize = '16px';
			mapElement.style.lineHeight = '1.42857143';
		}
		// Přidání markeru
		const markerOptions = {
			icon: L.icon({
				iconUrl: '//' + window.location.hostname + '/images/mapmarker.png',
			}),
		};
		if (markers.length) {
			const markerPositions = [];
			const cluster = L.markerClusterGroup({
				disableClusteringAtZoom: map.getMaxZoom()
			});
			for (const marker of markers) {
				const mapMarker = L.marker(marker.position, markerOptions);
				if (marker.handler) {
					mapMarker.on('click', marker.handler);
				}
				if (marker.popup) {
					mapMarker.bindPopup(marker.popup)
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
		if (callback) {
			map.on('zoomend', callback);
			map.on('moveend', callback);
			map.on('dragend', callback);
		}
		/*
		We also require you to include our logo somewhere over the map.
		We create our own map control implementing a documented interface,
		that shows a clickable logo.
		See https://leafletjs.com/reference.html#control
		*/
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
		// finally we add our LogoControl to the map
		new LogoControl().addTo(map);
	});

	grecaptcha.ready(() => {
		$.nette.ext('live').after($el => afterSnippetUpdate($el, options));
	});
}

export default { run }
