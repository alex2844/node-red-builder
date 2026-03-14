import { BaseConfigNode, registerNode } from 'node-red-builder';
/** @import { Node, NodeAPI, NodeDef } from 'node-red' */

/**
 * @typedef {object} __NODE_CLASS__Props
 * @property {string} name
 * @property {string} host
 * @property {number} port
 */

/** @typedef {NodeDef & __NODE_CLASS__Props} __NODE_CLASS__Def */

/** @extends {BaseConfigNode<__NODE_CLASS__Def>} */
export class __NODE_CLASS__ extends BaseConfigNode {
	/**
	 * @param {Node} node
	 * @param {__NODE_CLASS__Def} config
	 * @param {NodeAPI} RED
	 */
	constructor(node, config, RED) {
		super(node, config, RED);
	}
}

export default (/** @type {NodeAPI} */ RED) => registerNode(RED, '__PREFIX__-__NODE_NAME__', __NODE_CLASS__);
