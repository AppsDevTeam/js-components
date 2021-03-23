import tinymce from 'tinymce/tinymce';

// Default icons are required for TinyMCE 5.3 or above
import 'tinymce/icons/default';

// A theme is also required
import 'tinymce/themes/silver';

// Any plugins you want to use has to be imported
import 'tinymce/plugins/paste';
import 'tinymce/plugins/link';
import 'tinymce/plugins/code';
import 'tinymce/plugins/lists';

import 'tinymce-i18n/langs5/cs';

async function run(options) {
	$.observe('[data-adt-tinymce]', function(el) {
		tinymce.init({
			target: el,
			language: 'cs',
			plugins: 'link lists paste code',
			content_css : '/tinymce/skins/content/default/content.css',
			skin_url: '/tinymce/skins/ui/oxide',
			menubar: false,
			statusbar: false,
			toolbar: 'bold italic | bullist numlist | link | code',
			entity_encoding: 'raw',
			paste_as_text: true,
			setup: function (editor) {
				editor.on("NodeChange", function (e) {
					editor.save(); // updates this instance's textarea
				});
			}
		});
	});
}

export default { run }