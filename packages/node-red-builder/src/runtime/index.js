export { BaseConfigNode } from './base-config.js';
export { BaseNode } from './base-node.js';
/** @import { Node, NodeDef, NodeAPI, EditorNodeCredentials } from 'node-red' */

/** @typedef {NodeDef & { config: string, topic: string, topicType: 'msg'|'str'|'flow'|'global' }} NodeProps */

/**
 * Registers a node class with Node-RED.
 * The class instance is stored on `node.instance` so config nodes can expose it
 * via `getClient()` / other methods to dependent nodes.
 *
 * @template T
 * @param {NodeAPI} RED
 * @param {string} typeName
 * @param {new (...args: any[]) => T} NodeClass
 * @param {EditorNodeCredentials<any>} [credentials]
 */
export function registerNode(RED, typeName, NodeClass, credentials) {
	const opts = credentials ? { credentials } : {};
	RED.nodes.registerType(typeName, /** @this {Node & { instance?: T }} */ function (config) {
		RED.nodes.createNode(this, config);
		this.instance = new NodeClass(this, config, RED);
	}, opts);
}
