/** @import { Node, NodeAPI, NodeDef, NodeMessage, NodeStatusFill, NodeStatusShape } from 'node-red' */

/**
 * @template {NodeDef & Record<string, any>} TProps
 * @template {{ getClient(): any }} [TConfigNode=any]
 */
export class BaseNode {
	/** @type {NodeAPI} */ RED;
	/** @type {Node} */ node;
	/** @type {TProps} */ props;
	/** @type {TConfigNode|undefined} */ config;
	/** @type {ReturnType<typeof setTimeout>|null} */ #statusTimeout = null;

	/**
	 * @param {Node} node
	 * @param {TProps} props
	 * @param {NodeAPI} RED
	 */
	constructor(node, props, RED) {
		this.RED = RED;
		this.node = node;
		this.props = props;

		// Resolve config node if this node references one
		if (props.config) {
			const configNode = /** @type {Node & { instance: TConfigNode }} */ (RED.nodes.getNode(props.config));
			this.config = configNode?.instance;

			if (!this.config)
				this.node.warn('Config node not found.');
		}

		// Only wire up the 'input' event if the subclass actually overrides onInput
		if (this.onInput !== BaseNode.prototype.onInput)
			this.node.on('input', (msg, send, done) => {
				this.#handleInput(done, () => this.onInput(msg, send));
			});

		// Wire up the 'close' event for cleanup
		this.node.on('close', (/** @type {boolean} */ removed, /** @type {() => void} */ done) => {
			this.clearStatus();
			if (this.onClose !== BaseNode.prototype.onClose)
				Promise.resolve(this.onClose(removed)).finally(() => done());
			else
				done();
		});
	}

	/**
	 * Convenience getter for the API client exposed by the linked config node.
	 * Throws clearly if the client is not initialized, rather than returning null silently.
	 *
	 * @returns {TConfigNode extends { getClient(): infer T } ? T : never}
	 */
	get client() {
		const client = this.config?.getClient();
		if (!client)
			throw new Error('API client not initialized — check the config node.');
		return client;
	}

	/**
	 * Evaluates multiple typed properties from the node config in parallel.
	 *
	 * @param {string[]} keys
	 * @param {NodeMessage} msg
	 * @returns {Promise<Record<string, any>>}
	 */
	async getProps(keys, msg) {
		const results = await Promise.all(keys.map(key => this.getProp(key, msg)));
		return Object.fromEntries(keys.map((key, i) => [key, results[i]]));
	}

	/**
	 * Evaluates a single typed property (e.g. msg.payload, flow variable, JSONata expression).
	 * The value and its type are looked up as `props[key]` and `props[keyType]`.
	 *
	 * @param {string} key
	 * @param {NodeMessage} msg
	 * @returns {Promise<any>}
	 */
	async getProp(key, msg) {
		const value = this.props[key];
		const type = this.props[`${key}Type`];
		return new Promise((resolve, reject) => {
			if (type === 'jsonata')
				this.RED.util.evaluateNodeProperty(value, type, this.node, msg, (err, result) => {
					if (err) reject(err);
					else resolve(result);
				});
			else
				try {
					resolve(this.RED.util.evaluateNodeProperty(value, type, this.node, msg));
				} catch (err) {
					reject(err);
				}
		});
	}

	/**
	 * Sets the node status badge. Long texts are automatically truncated.
	 *
	 * @param {any} text
	 * @param {NodeStatusFill} [fill='green']
	 * @param {NodeStatusShape} [shape='dot']
	 */
	setStatus(text, fill = 'green', shape = 'dot') {
		if (this.#statusTimeout) {
			clearTimeout(this.#statusTimeout);
			this.#statusTimeout = null;
		}

		const str = String(text);
		const statusText = str.length > 32 ? str.slice(0, 29) + '...' : str;
		this.node.status({ fill, shape, text: statusText });
	}

	/**
	 * Clears the node status badge.
	 *
	 * @param {number} [delay=0] - Optional delay in ms before clearing the status.
	 */
	clearStatus(delay = 0) {
		if (this.#statusTimeout) {
			clearTimeout(this.#statusTimeout);
			this.#statusTimeout = null;
		}

		if (delay > 0)
			this.#statusTimeout = setTimeout(() => {
				this.node.status({});
				this.#statusTimeout = null;
			}, delay);
		else
			this.node.status({});
	}

	/**
	 * Internal wrapper: calls the user's logic, then done(), or done(err) on failure.
	 * Also sets an error status badge automatically.
	 *
	 * @param {(err?: Error) => void} done
	 * @param {() => Promise<void>} logic
	 */
	async #handleInput(done, logic) {
		try {
			await logic();
			done();
		} catch (/** @type {any} */ err) {
			this.setStatus(err.message || 'Error', 'red', 'dot');
			done(err);
		}
	}

	/**
	 * Override in subclass to handle incoming messages.
	 *
	 * @param {NodeMessage} msg
	 * @param {(msg: NodeMessage | (NodeMessage | NodeMessage[] | null)[]) => void} send
	 */
	async onInput(msg, send) {
		void msg;
		void send;
	}

	/**
	 * Override in subclass to run cleanup logic when the node is closed.
	 *
	 * @param {boolean} removed - true if deleted, false if Node-RED is restarting
	 */
	async onClose(removed) {
		void removed;
	}
}
