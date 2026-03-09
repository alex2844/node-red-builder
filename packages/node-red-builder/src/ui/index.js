/** @typedef {import('node-red').EditorWidgetTypedInputType} WidgetTypedInputType */
/** @typedef {import('node-red').EditorWidgetTypedInputTypeDefinition} WidgetTypedInputTypeDefinition */

/**
 * @template T
 * @typedef {import('node-red').EditorNodePropertiesDef<Omit<T, 'id'|'type'|'z'|'wires'|'x'|'y'|'_'>>} EditorDefaults
 */

/**
 * @template {string} T
 * @typedef {Extract<T, WidgetTypedInputType> | (Omit<WidgetTypedInputTypeDefinition, 'value'> & { value: T })} TypedInputDefinition
 */

/**
 * Initializes a Node-RED typedInput widget on the given element.
 * Automatically wires it to the hidden `<elementId>Type` field.
 *
 * @template {WidgetTypedInputType | WidgetTypedInputTypeDefinition} T
 * @param {string} elementId
 * @param {T[]} [types] - defaults to ['str', 'msg', 'flow', 'global']
 */
export function setupTypedInput(elementId, types) {
	const /** @type {WidgetTypedInputType[]} */ defaultTypes = ['str', 'msg', 'flow', 'global'];
	const el = $(`#${elementId}`);
	el.typedInput({
		types: types && types.length > 0 ? types : defaultTypes,
		typeField: `#${elementId}Type`
	});
	return el;
}

/**
 * Converts an object or array of values into the `options` format expected
 * by a typedInput type definition.
 *
 * @param {Record<string, string> | readonly string[]} items
 * @param {(key: string, value: string) => string} [getLabel]
 * @returns {WidgetTypedInputTypeDefinition['options']}
 */
export function createTypedInputOptions(items, getLabel) {
	if (Array.isArray(items))
		return items.map(value => ({
			value,
			label: getLabel ? getLabel(value, value) : value.trim()
		}));
	return Object.entries(items).map(([key, value]) => ({
		value,
		label: getLabel ? getLabel(key, value) : key
	}));
}
