// The model, icons, theme, skins and plugins are bundled, so the editor loads nothing from the server
// at run time; a plugin outside PLUGINS would be fetched from base_url and fail.
import hugerte from 'hugerte';
import 'hugerte/models/dom';
import 'hugerte/icons/default';
import 'hugerte/themes/silver';
import 'hugerte/skins/ui/oxide/skin.js';
import 'hugerte/skins/ui/oxide/content.js';
import 'hugerte/skins/ui/oxide-dark/skin.js';
import 'hugerte/skins/ui/oxide-dark/content.js';
import 'hugerte/skins/content/default/content.js';
import 'hugerte/skins/content/dark/content.js';
import 'hugerte/plugins/autolink';
import 'hugerte/plugins/code';
import 'hugerte/plugins/fullscreen';
import 'hugerte/plugins/image';
import 'hugerte/plugins/link';
import 'hugerte/plugins/lists';
import 'hugerte/plugins/media';
import 'hugerte/plugins/nonbreaking';
import 'hugerte/plugins/table';
import naja from 'naja';
import observe from '../observe';
import dataOptions from '../data';
import cs from './langs/cs';

const SELECTOR = 'textarea[data-adt-huge-rte]';

const PLUGINS = 'autolink code fullscreen image link lists media nonbreaking table';

const LANGUAGES = { cs };

for (const [language, strings] of Object.entries(LANGUAGES)) {
	hugerte.addI18n(language, strings);
}

const DEFAULTS = {
	plugins: PLUGINS,
	menubar: false,
	branding: false,
	min_height: 300,
	toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link image media table | code fullscreen',
};

let globalOptions = {};

const isDark = () => document.documentElement.dataset.bsTheme === 'dark';

// A file from the disk goes into the content as a blob: image, the saved HTML gets it as data: -
// what to do with it is up to the server.
function pickLocalImage(callback) {
	const input = document.createElement('input');
	input.setAttribute('type', 'file');
	input.setAttribute('accept', 'image/*');

	input.onchange = function () {
		const file = this.files[0];
		const reader = new FileReader();
		reader.onload = function () {
			const blobCache = hugerte.activeEditor.editorUpload.blobCache;
			const blobInfo = blobCache.create('blobid' + (new Date()).getTime(), file, reader.result.split(',')[1]);
			blobCache.add(blobInfo);
			callback(blobInfo.blobUri(), { title: file.name });
		};
		reader.readAsDataURL(file);
	};

	input.click();
}

function config(target) {
	const { pickLocalImage: localImages, protect, ...options } = { ...DEFAULTS, ...globalOptions, ...dataOptions(target, 'data-adt-huge-rte') };
	const language = document.documentElement.lang;

	return {
		...options,
		target,
		...(LANGUAGES[language] ? { language } : {}),
		// JSON cannot carry a RegExp, protect takes the patterns as strings
		...(protect ? { protect: protect.map((pattern) => new RegExp(pattern, 'g')) } : {}),
		...(localImages ? { file_picker_types: 'image', file_picker_callback: (callback) => pickLocalImage(callback) } : {}),
		// The skin cannot be switched live, so the editor is rebuilt on a theme change
		skin_url: isDark() ? 'dark' : 'default',
		content_css: isDark() ? 'dark' : 'default',
		setup: (editor) => {
			editor.on('change input NodeChange', () => editor.save());
		},
	};
}

const editorOf = (element) => hugerte.get().find((editor) => editor.getElement() === element);

function rebuild() {
	hugerte.get().forEach((editor) => {
		const element = editor.getElement();

		editor.save();
		editor.remove();
		hugerte.init(config(element));
	});
}

function run(options) {
	globalOptions = options;
	window.hugerte = window.hugerte ?? hugerte;

	observe(SELECTOR, (element) => hugerte.init(config(element)), {
		onRemove: (element) => editorOf(element)?.remove(),
	});

	// An AJAX submit would otherwise send the textarea as it was before the last keystroke
	naja.addEventListener('before', () => hugerte.triggerSave());

	let dark = isDark();
	new MutationObserver(() => {
		if (dark !== isDark()) {
			dark = isDark();
			rebuild();
		}
	}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
}

export default { run };
