import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.css';

function run(options) {
	$.nette.ext('live').after(function ($element) {
		if ($element[0].querySelector('[data-adt-glightbox]')) {
			GLightbox();
		}
	});
}

export default { run }