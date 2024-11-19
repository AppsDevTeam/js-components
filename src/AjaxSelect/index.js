import '../../assets/selectWoo/dist/js/selectWoo';
import '../../assets/selectWoo/dist/css/select2.min.css';
import '@ttskch/select2-bootstrap4-theme/dist/select2-bootstrap4.min.css';
import '../../assets/selectWoo/dist/js/i18n/cs'

function run(options) {
	/**
	 * AJAX select
	 */
	function AjaxSelect($element) {
		this.$originalElement = $element;
		this.options = this.$originalElement.data('ajax-select');
		this.customOptions = $.extend({minimumInputLength: 2, language: "en"}, this.$originalElement.data('ajax-select-options') || {});
		this.init();
	}

	AjaxSelect.prototype.init = function () {
		var self = this;

		// posbírat listy stromu
		var walk = function (items) {
			var result = [ ];

			for (var key in items) {
				if (!items.hasOwnProperty(key)) {
					continue;
				}

				var item = items[key];

				if (item.children) {
					Array.prototype.push.apply(result, walk(item.children));
				} else {
					result.push(item);
				}
			}

			return result;
		};

		var items = walk(self.options.initialItems);

		var itemsIds = [];
		for (var key in items) {
			this.$originalElement.find('option[value="'+items[key].id+'"]').text(items[key].text);
			itemsIds.push(items[key].id);
		}

		this.$originalElement.selectWoo({
			tags: !!this.$originalElement.data('allow-new-value'),
			insertTag: function (data, tag) {
				// Insert the tag at the end of the results
				data.push(tag);
			},
			createTag: function (params) {
				if (params.term === '') {
					return null;
				}
				return {
					id: 'tag*'+params.term,
					text: params.term
				};
			},
			language: this.customOptions.language,
			placeholder: this.options.prompt || undefined,
			allowClear: this.options.prompt ? true : false,
			minimumInputLength: this.customOptions.minimumInputLength,
			multiple: this.options.multiple || false,
			formatResultCssClass: function (object) {
				if (object.inactive == true) {
					return 'inactive';
				}
			},
			dropdownParent: this.customOptions.dropdownParent ? $('#' + this.customOptions.dropdownParent) : $(document.body),
			templateResult: function (data, container) {
				if ('aria-posinset' in data) {
					$(container).attr('aria-posinset', data['aria-posinset'])
				}
				if ('aria-setsize' in data) {
					$(container).attr('aria-setsize', data['aria-setsize'])
				}
				return data.text;
			},
			ajax: {
				url: this.options.url,
				dataType: 'json',
				delay: 250,
				data: function (term, page) {
					var options = $.extend({ }, self.options.entityOptions);
					options[self.options.queryParam] = term.term;

					$.extend(options, self.customOptions);

					return {
						entityName: self.options.entityName,
						entityOptions: options,
					};
				},
				processResults: function (data, page, s2) {
					if (data.redirect !== undefined) {
						beforeunload_enable = false;
						window.location.href = data.redirect;
						return false;
					}
					return { results: data };
				},
				cache: true
			},
			theme: 'bootstrap4',
			width: '100%',
		});

		let $label = $(document).find("label[for='" + this.$originalElement.attr('id') + "']");

		if ($label.length) {
			let labelId = $label.attr('id');
			if (labelId === undefined) {
				$label.attr('id', this.$originalElement.attr('id') + 'Label');
			}
			this.$originalElement.parent().find('.select2-selection').attr(
				'aria-labelledBy',
				$label.attr('id')
			);
		}
	};

	AjaxSelect.prototype.destroy = function () {
		this.$originalElement.select2('destroy');
	};

	AjaxSelect.init = function ($container) {
		$container.find('select[data-ajax-select]').each(function () {
			new AjaxSelect($(this));
		});
	};

	$.nette.ext('live').after(function ($element) {
		AjaxSelect.init($element);
	});

}

export default { run }