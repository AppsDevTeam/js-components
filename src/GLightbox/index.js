import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.css';
import observe from '../observe';

function run(options) {
	let lightbox = null;

	// one instance for the whole page, it only reloads its elements when new ones show up
	observe('[data-adt-glightbox]', function () {
		if (lightbox) {
			lightbox.reload();
		} else {
			lightbox = GLightbox();
		}
	}, { batch: true });
}

export default { run }
