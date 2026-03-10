import { setupTypedInput, createTypedInputOptions } from 'node-red-builder/ui';
import { ACTION } from './runtime.js';
/** @import { EditorRED } from 'node-red' */
/** @import { EditorDefaults, TypedInputDefinition } from 'node-red-builder/ui' */
/** @import { __NODE_CLASS__ } from './runtime.js' */

let /** @type {EditorRED} */ RED = /** @type {any} */ (window).RED;

RED.nodes.registerType('__PREFIX__-__NODE_NAME__', {
	category: '__PREFIX__',
	/** @type {EditorDefaults<__NODE_CLASS__['props']>} */ defaults: {
		name: { value: '' },
		action: { value: ACTION.APPLY },
		actionType: { value: 'action' },
		topic: { value: 'topic' },
		topicType: { value: 'msg' }
	},
	inputs: 1,
	outputs: 1,
	icon: 'font-awesome/fa-circle',
	color: '__COLOR__',
	paletteLabel: '__NODE_NAME__',
	label: function () {
		return this.name || '__NODE_NAME__';
	},
	oneditprepare: function () {
		/** @type {TypedInputDefinition<__NODE_CLASS__['props']['actionType']>[]} */
		const actionTypes = [
			{
				value: 'action',
				options: createTypedInputOptions(ACTION, key => this._(`__NODE_NAME__.action.${key.toLowerCase()}`))
			},
			'str', 'msg'
		];
		setupTypedInput('node-input-action', actionTypes);
		setupTypedInput('node-input-topic');
	}
});
