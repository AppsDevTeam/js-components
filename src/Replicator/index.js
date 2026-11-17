import { resolveCallback } from '../callbacks';
import observe from '../observe';

// Replicator of Nette forms (kdyby/replicator): <div data-adt-replicator="<html of a new row>"> with rows
// [data-adt-replicator-item], buttons [data-adt-replicator-add] (outside the rows) and
// [data-adt-replicator-remove] (inside them). A new row is the template with "_new_" in ids, names,
// labels and nette rules replaced by "_new_<counter>". Vanilla port of the jQuery plugin forms-replicator.

const ID_PREFIX = '_new_';
const INPUTS = 'input, select, textarea, button';

class Replicator {
	constructor(el) {
		this.el = el;
		// a nested replicator is the n-th "_new_" in names (counted from 0)
		this.depth = Number(el.getAttribute('data-adt-replicator-depth') || 0);
		this.template = el.getAttribute('data-adt-replicator');

		const lastName = [...this.items()].pop()?.querySelector('[name]')?.getAttribute('name');
		const last = lastName ? this.findNthOccurrence(lastName, this.depth + 1) : null;
		this.counter = last !== null ? last + 1 : 0;

		el.addEventListener('click', (e) => {
			const remove = e.target.closest('[data-adt-replicator-remove]');
			if (remove && this.owns(remove)) {
				this.removeRow(remove);
				return;
			}
			const add = e.target.closest('[data-adt-replicator-add]');
			if (add && this.owns(add)) {
				e.preventDefault();
				this.add(add);
			}
		});
	}

	// rows of this replicator, not of a nested one
	items() {
		return [...this.el.children].filter(child => child.matches('[data-adt-replicator-item]'));
	}

	// the element belongs to this replicator, not to a nested one
	owns(el) {
		return el.closest('[data-adt-replicator]') === this.el;
	}

	add(button) {
		const callback = button.getAttribute('data-adt-replicator-add-before-callback');
		if (callback && !resolveCallback(callback)?.(button)) {
			return;
		}
		this.addRow();
	}

	addRow() {
		const template = document.createElement('template');
		template.innerHTML = this.template;
		const row = template.content;
		const counter = this.counter++;

		row.querySelectorAll(INPUTS).forEach(input => {
			this.replaceElemAttr(input, 'id', counter);
			this.replaceElemAttr(input, 'name', counter);

			const rules = input.getAttribute('data-nette-rules');
			if (rules) {
				const toggles = [];
				input.setAttribute('data-nette-rules', JSON.stringify(this.replaceInRules(JSON.parse(rules), counter, toggles)));
				// elements toggled by the rules get the same ids as the rules now point to
				toggles.forEach(id => row.querySelectorAll(`[id="${CSS.escape(id)}"]`).forEach(el => this.replaceElemAttr(el, 'id', counter)));
			}
		});
		row.querySelectorAll('[id^="snippet"], .invalid-feedback').forEach(el => this.replaceElemAttr(el, 'id', counter));
		row.querySelectorAll('[data-adt-redraw-snippet]').forEach(el => this.replaceElemAttr(el, 'data-adt-redraw-snippet', counter));
		row.querySelectorAll('label').forEach(el => this.replaceElemAttr(el, 'for', counter));

		const newElements = [...row.children];
		const items = this.items();
		if (items.length) {
			items[items.length - 1].after(row);
		} else {
			this.el.prepend(row);
		}

		// toggles of the new inputs (window.Nette of the component Form)
		const form = newElements[0]?.closest('form');
		if (form && window.Nette) {
			window.Nette.toggleForm(form);
		}
		return newElements;
	}

	removeRow(button) {
		const row = this.items().find(item => item.contains(button));
		row?.remove();
	}

	findNthOccurrence(str, nth) {
		const matches = Array.from(str.matchAll(new RegExp(ID_PREFIX + '(\\d+)', 'g')), match => parseInt(match[1], 10));
		return matches[nth - 1] ?? null;
	}

	replaceElemAttr(el, attrName, counter) {
		const value = el.getAttribute(attrName);
		if (value === null) {
			return;
		}
		let index = 0;
		el.setAttribute(attrName, value.replace(new RegExp(ID_PREFIX, 'g'), match => ++index === this.depth + 1 ? ID_PREFIX + counter : match));
	}

	// "items[_new_][name]" / "frm-items-_new_-name" -> the (depth)-th _new_ with the counter
	replaceAttr(string, counter) {
		let index = 0;
		return string.replace(new RegExp('(\\[)' + ID_PREFIX + '(\\])|(-)' + ID_PREFIX + '(-)', 'g'), (match, l1, r1, l2, r2) =>
			index++ === this.depth ? (l1 || l2) + ID_PREFIX + counter + (r1 || r2) : match
		);
	}

	// names of controls and toggled ids (keys of rule.toggle) in nette rules
	replaceInRules(value, counter, toggles, isToggle = false) {
		if (typeof value === 'string') {
			return this.replaceAttr(value, counter);
		}
		if (Array.isArray(value)) {
			return value.map(item => this.replaceInRules(item, counter, toggles));
		}
		if (value && typeof value === 'object') {
			const result = {};
			for (const [key, item] of Object.entries(value)) {
				if (isToggle) {
					toggles.push(key);
				}
				result[isToggle ? this.replaceAttr(key, counter) : key] = this.replaceInRules(item, counter, toggles, key === 'toggle');
			}
			return result;
		}
		return value;
	}
}

function run() {
	observe('[data-adt-replicator]', (el) => {
		el.adtReplicator ??= new Replicator(el);
	});
}

export default { run }
