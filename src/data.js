// JSON options of a component from a data attribute (data-adt-date-input='{"format": ...}'),
// {} when the attribute is missing or empty. Replaces jQuery .data(), which parsed JSON itself.
export default function dataOptions(el, attribute) {
	const value = el.getAttribute(attribute);
	return value ? JSON.parse(value) : {};
}
