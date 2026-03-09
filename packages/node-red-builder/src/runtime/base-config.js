/** @import { Node, NodeAPI, NodeDef } from 'node-red' */
/** @import { Request, Response } from 'express' */

/**
 * @template {NodeDef & Record<string, any>} TConfig
 * @template [TCredentials=Record<string, any>]
 * @template [TClient=any]
 */
export class BaseConfigNode {
	/** @type {NodeAPI} */ RED;
	/** @type {Node & { credentials: TCredentials }} */ node;
	/** @type {TConfig} */ config;
	/** @type {TClient|null} */ #client = null;
	/** @type {{ method: string, path: string}[]} */ routes = [];
	/** @type {string} */ namespace;

	/**
	 * @param {Node & { credentials: Record<string, any> }} node
	 * @param {TConfig} config
	 * @param {NodeAPI} RED
	 */
	constructor(node, config, RED) {
		this.RED = RED;
		this.node = node;
		this.config = config;
		this.namespace = config.type.split('-').slice(0, -1).join('-') || config.type;

		this.node.on('close', (/** @type {boolean} */ removed, /** @type {() => void} */ done) => {
			this.#internalClose(removed).finally(() => done());
		});
	}

	/**
	 * Registers an Express route on the Node-RED admin API, scoped to this node instance.
	 * Returns the full registered path.
	 *
	 * @param {'get'|'post'|'put'|'delete'} method
	 * @param {string} path
	 * @param {(req: Request, res: Response) => void | Promise<void>} handler
	 * @param {'read'|'write'} [permission='read']
	 */
	registerRoute(method, path, handler, permission = 'read') {
		const fullPath = `/${this.namespace}/${this.node.id}${path.startsWith('/') ? path : '/' + path}`;
		const authMiddleware = this.RED.auth.needsPermission(`${this.config.type}.${permission}`);

		this.RED.httpAdmin[method](fullPath, authMiddleware, handler);
		this.routes.push({ method, path: fullPath });
		return fullPath;
	}

	/**
	 * Instantiates a client and stores it. If the client emits an 'auth' event
	 * (e.g. after a token refresh), credentials are automatically persisted.
	 *
	 * @template TOpts
	 * @param {new (options: TOpts) => TClient} ClientClass
	 * @param {TOpts} options
	 * @returns {TClient}
	 */
	initClient(ClientClass, options) {
		this.#client = new ClientClass(options);
		const /** @type {any} */ client = this.#client;
		if (typeof client?.on === 'function')
			client.on('auth', (/** @type {any} */ creds) => {
				this.RED.nodes.addCredentials(this.node.id, { ...this.node.credentials, creds });
				this.node.debug('Credentials updated automatically');
			});
		return this.#client;
	}

	getClient() {
		return this.#client;
	}

	/**
	 * @param {boolean} removed
	 */
	async #internalClose(removed) {
		const /** @type {any} */ client = this.#client;
		if (typeof client?.removeAllListeners === 'function')
			client.removeAllListeners();

		// Remove all registered admin routes
		const stack = this.RED.httpAdmin._router.stack;
		this.routes.forEach(route => {
			for (let i = stack.length - 1; i >= 0; i--) {
				const layer = stack[i];
				if (layer.route?.path === route.path && layer.route?.methods[route.method])
					stack.splice(i, 1);
			}
		});

		if (this.onClose !== BaseConfigNode.prototype.onClose)
			await this.onClose(removed);
		this.#client = null;
	}

	/**
	 * Override in subclass to run cleanup logic when the node is closed.
	 *
	 * @param {boolean} removed - true if the node was deleted, false if Node-RED is restarting
	 */
	async onClose(removed) {
		void removed;
	}
}
