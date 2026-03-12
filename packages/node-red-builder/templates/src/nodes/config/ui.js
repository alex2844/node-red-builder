/** @import { EditorRED } from 'node-red' */
/** @import { EditorDefaults } from 'node-red-builder/ui' */
/** @import { __NODE_CLASS__ } from './runtime.js' */

let /** @type {EditorRED} */ RED = /** @type {any} */ (window).RED;

RED.nodes.registerType('__PREFIX__-__NODE_NAME__', {
	category: 'config',
	/** @type {EditorDefaults<__NODE_CLASS__['config']>} */ defaults: {
		name: { value: '' },
		host: { value: 'localhost', required: true },
		port: { value: 8080, required: true, validate: RED.validators.number() }
	},
	label: function () {
		return this.name || '__NODE_NAME__';
	}
});
