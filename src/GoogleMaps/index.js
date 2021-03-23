import { Loader } from "@googlemaps/js-api-loader"
import styles from './styles.json';

function run(options) {
	if (!options.enabled) return;

	const loader = new Loader({
		apiKey: options.apiKey,
		version: "weekly",
	});
	
	loader.load().then(() => {
		$('[data-adt-google-maps]').each(function() {
			const options = $(this).data('adt-google-maps');
			const center = { lat: options.lat, lng: options.lng };
			const map = new google.maps.Map(this, {
				center,
				zoom: options.zoom,
				styles,
			});

			if ('marker' in options) {
				new google.maps.Marker({
					position: center,
					map,
					title: options.marker.title,
				});
			}
		})
	});
}

export default { run }
