import observe from '../observe';

async function run(options) {
	observe('[data-adt-replicator]', function(el) {
		$(el).formReplicator({
			template: $.parseHTML($(el).attr('data-adt-replicator')),
			addStaticButton: $(el).find('[data-adt-replicator-add]').not($(el).find('[data-adt-replicator] [data-adt-replicator-add]')),
			addStaticButtonShowAlways: true,
		});
	});
}

export default { run }
