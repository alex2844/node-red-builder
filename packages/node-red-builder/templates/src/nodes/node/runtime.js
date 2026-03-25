import { BaseNode, registerNode } from 'node-red-builder';
/** @import { NodeMessage, NodeAPI } from 'node-red' */
/** @import { NodeProps as BaseNodeProps } from 'node-red-builder' */

/** @typedef {(typeof ACTION)[keyof typeof ACTION]} Action */
export const ACTION = /** @type {const} */ ({
	APPLY: 'apply',
	RESTART: 'restart',
	ADD: 'add',
	DEL: 'delete',
	UPDATE: 'update'
});

/** @typedef {Omit<BaseNodeProps, 'config'> & { action: string, actionType: 'action'|'str'|'msg' }} NodeProps */

/** @extends {BaseNode<NodeProps>} */
export class __NODE_CLASS__ extends BaseNode {
	async onInput(/** @type {NodeMessage} */ msg, /** @type {(msg: NodeMessage) => void} */ send) {
		/** @type {{ action: Action, topic: string }} */
		const { action, topic } = await this.getProps(['action', 'topic'], msg);

		this.setStatus(`Running: ${action}`, 'blue');

		let result = '';
		switch (action) {
			case ACTION.APPLY: { result = 'Configuration applied.'; break; }
			case ACTION.RESTART: { result = 'Restart initiated.'; break; }
			case ACTION.ADD: { result = 'Item created.'; break; }
			case ACTION.DEL: { result = 'Item deleted.'; break; }
			case ACTION.UPDATE: { result = 'Item updated.'; break; }
			default: { result = `Unknown action: ${action}`; }
		}

		msg.topic = topic;
		msg.payload = { action, result, timestamp: new Date().toISOString() };

		send(msg);
		this.clearStatus(1_500);
	}
}

export default (/** @type {NodeAPI} */ RED) => registerNode(RED, '__PREFIX__-__NODE_NAME__', __NODE_CLASS__);
