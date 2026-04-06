/** @typedef {(typeof ACTION)[keyof typeof ACTION]} Action */
export const ACTION = /** @type {const} */ ({
	APPLY: 'apply',
	RESTART: 'restart',
	ADD: 'add',
	DEL: 'delete',
	UPDATE: 'update'
});
