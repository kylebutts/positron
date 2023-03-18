/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as positron from 'positron';
import { randomUUID } from 'crypto';

/**
 * ZedVar is a simple Zed variable.
 */
class ZedVariable {
	// Zed variables do not currently support truncation.
	public readonly truncated: boolean = false;
	public readonly type_name;

	constructor(
		readonly name: string,
		readonly value: string,
		readonly kind: string,
		readonly length: number,
		readonly size: number,
	) {
		// The type name is the language-specific name for the variable's type.
		// In Zed, the variable classes are named things like ZedNUMBER,
		// ZedSTRING, etc.
		this.type_name = `Zed${kind.toUpperCase()}`;

		// The Zed language has a sample type named 'blob' that has its own Zed
		// type, ZedBLOB, but is represented as a 'vector' in the environment.
		if (this.kind === 'blob') {
			this.kind = 'vector';
		}
	}
}

/**
 * ZedEnvironment is a synthetic environment backend for the Zed language containing a set of ZedVariables.
 */
export class ZedEnvironment {

	/**
	 * Emitter that handles outgoing messages to the front end
	 */
	private readonly _onDidEmitData = new vscode.EventEmitter<object>();
	onDidEmitData: vscode.Event<object> = this._onDidEmitData.event;

	/**
	 * A map of variable names to their respective metadata
	 */
	private readonly _vars = new Map<string, ZedVariable>();

	/**
	 * Creates a new ZedEnvironment backend
	 *
	 * @param id The ID of the environment client instance
	 */
	constructor(readonly id: string,
		private readonly zedVersion: string) {
		// Create a few variables to start with
		this._vars.set('z', new ZedVariable('z', 'zed1', 'string', 4, 4));
		this._vars.set('e', new ZedVariable('e', 'zed2', 'string', 4, 4));
		this._vars.set('d', new ZedVariable('d', 'zed3', 'string', 4, 4));

		// Create a Zed Version variable
		this._vars.set('ZED_VERSION', new ZedVariable('ZED_VERSION',
			this.zedVersion,
			'string',
			this.zedVersion.length,
			this.zedVersion.length));

		setTimeout(() => {
			// List the environment on the first tick after startup. There's no
			// reason we couldn't do this immediately, but waiting a tick simulates the
			// behavior of a "real" language more accuratley.

			this.emitFullList();
		});
	}

	/**
	 * Handles an incoming message from the Positron front end
	 *
	 * @param message The message to handle
	 */
	public handleMessage(message: any) {
		switch (message.msg_type) {

			// A request to refresh the environment by sending a full list to the front end
			case 'refresh':
				this.emitFullList();
				break;

			// A request to clear the environment
			case 'clear':
				this.clearAllVars();
				break;
		}
	}

	/**
	 * Defines a number of variables at once.
	 *
	 * @param count The number of variables to define
	 * @param kind The kind of variable to define; if not specified, a random kind will be chosen
	 */
	public defineVars(count: number, kind: string) {
		// Get the starting index for the new variables
		const start = this._vars.size + 1;

		// Begin building the list of new variables to send
		const added = [];

		for (let i = 0; i < count; i++) {
			let kindToUse = kind;
			if (!kind || kind === 'random') {
				// Random: pick a random kind
				kindToUse = ['string', 'number', 'vector', 'blob'][Math.floor(Math.random() * 4)];
			}

			const name = `${kindToUse}${start + i}`;
			let value = '';

			// Create a random value for the variable
			let size = 0;
			if (kindToUse === 'string') {
				// Strings: use a random UUID
				value = randomUUID();
				size = value.length;
			} else if (kindToUse === 'number') {
				// Numbers: use a random number
				value = Math.random().toString();
				size = 4;
			} else if (kindToUse === 'vector') {
				// Vectors: Generate 5 random bytes
				const bytes = [];
				for (let i = 0; i < 5; i++) {
					bytes.push(Math.floor(Math.random() * 256));
				}
				value = bytes.join(', ');
				size = 5;
			} else if (kindToUse === 'blob') {
				size = Math.floor(Math.random() * 1024 * 1024);
				value = `blob(${size} bytes)`;
			} else {
				// Everything else: use the counter
				value = `value${start + i}`;
				size = value.length;
			}
			const newZedVar = new ZedVariable(name, value, kindToUse, value.length, size);
			added.push(newZedVar);

			this._vars.set(name, newZedVar);
		}

		// Emit the new variables to the front end
		this.emitUpdate(added);
	}

	/**
	 * Updates some number of variables in the environment
	 *
	 * @param count The number of variables to update
	 * @returns The number of variables that were updated
	 */
	public updateVars(count: number): number {
		// We can't update more variables than we have, so clamp the count to
		// the number of variables in the environment.
		if (count > this._vars.size) {
			count = this._vars.size;
		}

		// Update the variables
		const updated = [];
		const randomKeys = this.selectRandomKeys(count);
		for (const key of randomKeys) {
			const oldVar = this._vars.get(key)!;
			let value = '';
			let size = 0;
			// Create a random value for the variable
			if (oldVar.kind === 'string') {
				// Strings: replace 5 random characters with a hexadecimal digit
				const chars = oldVar.value.split('');
				for (let i = 0; i < 5; i++) {
					const randomIndex = Math.floor(Math.random() * chars.length);
					chars[randomIndex] = Math.floor(Math.random() * 16).toString(16);
				}
				value = chars.join('');
				size = value.length;
			} else if (oldVar.kind === 'number') {
				// Numbers: just use a new random number
				value = Math.random().toString();
				size = 4;
			} else if (oldVar.kind === 'vector') {
				if (oldVar.value.startsWith('blob')) {
					// Blobs are basically huge vectors. Randomly double or halve the size.
					if (Math.random() < 0.5) {
						size = oldVar.size * 2;
						value = `blob(${size} bytes)`;
					} else {
						size = Math.floor(oldVar.size / 2);
						value = `blob(${size} bytes)`;
					}
				} else {
					// Vectors: replace 2 random bytes with new random bytes and add an extra byte
					// at the end
					const bytes = oldVar.value.split(',').map((x) => parseInt(x, 10));
					for (let i = 0; i < 2; i++) {
						const randomIndex = Math.floor(Math.random() * bytes.length);
						bytes[randomIndex] = Math.floor(Math.random() * 256);
					}
					bytes.push(Math.floor(Math.random() * 256));
					value = bytes.join(', ');
					size = bytes.length;
				}
			} else {
				// Everything else: reverse the value
				value = oldVar.value.split('').reverse().join('');
				size = value.length;
			}

			const newVar = new ZedVariable(oldVar.name, value, oldVar.kind, value.length, size);
			this._vars.set(key, newVar);

			// Add the variable to the list of updated variables
			updated.push(newVar);
		}

		// Emit the updated variables to the front end
		this.emitUpdate(updated);

		return count;
	}

	/**
	 *
	 * @param count The number of variables to remove
	 * @returns The number of variables that were removed
	 */
	public removeVars(count: number): number {
		// We can't remove more variables than we have, so clamp the count to
		// the number of variables in the environment.
		if (count > this._vars.size) {
			count = this._vars.size;
		}

		// Remove the variables
		const keys = this.selectRandomKeys(count);
		for (const key of keys) {
			this._vars.delete(key);
		}

		// Emit the removed variables to the front end
		this.emitUpdate(undefined, keys);

		return count;
	}

	/**
	 * Clears all variables from the environment
	 */
	public clearAllVars() {
		// Clear the variables
		this._vars.clear();

		// Refresh the client view
		this.emitFullList();
	}

	/**
	 * Emits a full list of variables to the front end
	 */
	private emitFullList() {
		// Create a list of all the variables in the environment
		const vars = Array.from(this._vars.values());

		// Emit the data to the front end
		this._onDidEmitData.fire({
			msg_type: 'list',
			variables: vars
		});
	}

	private emitUpdate(assigned?: Array<ZedVariable>, removed?: Array<string>) {
		this._onDidEmitData.fire({
			msg_type: 'update',
			assigned: assigned || [],
			removed: removed || []
		});
	}

	/**
	 * Selects random variable name keys on which to perform some action
	 *
	 * @param count The number of keys to select
	 * @returns An array of keys representing the names of the selected variables
	 */
	private selectRandomKeys(count: number): Array<string> {
		// Make a list of variables; we randomly select variables from the
		// environment until we have the desired number.
		const keys = Array.from(this._vars.keys());
		const randomKeys = [];
		for (let i = 0; i < count; i++) {
			const randomIndex = Math.floor(Math.random() * keys.length);
			randomKeys.push(keys[randomIndex]);
			keys.splice(randomIndex, 1);
		}
		return randomKeys;
	}
}