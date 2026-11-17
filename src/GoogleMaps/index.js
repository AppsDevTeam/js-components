import { Loader } from "@googlemaps/js-api-loader"
import styles from './styles.json';
import observe from '../observe';

function run(options) {
	if (!options.enabled) return;

	const loader = new Loader({
		apiKey: options.apiKey,
		version: "weekly",
	});
	
	loader.load().then(() => {
		observe('[data-adt-google-maps]', function(el) {
			const options = $(el).data('adt-google-maps');
			const center = { lat: options.lat, lng: options.lng };
			const map = new google.maps.Map(el, {
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
