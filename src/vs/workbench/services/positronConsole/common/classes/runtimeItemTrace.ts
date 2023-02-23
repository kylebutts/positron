/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { RuntimeItem } from 'vs/workbench/services/positronConsole/common/classes/runtimeItem';
import { Line, lineSplitter } from 'vs/workbench/services/positronConsole/common/classes/utils';

/**
 * RuntimeItemTrace class.
 */
export class RuntimeItemTrace extends RuntimeItem {
	//#region Public Properties

	/**
	 * Gets the timestamp.
	 */
	public readonly timestamp = new Date();

	/**
	 * Gets the lines.
	 */
	public readonly lines: readonly Line[];

	//#endregion Public Properties

	//#region Constructor

	/**
	 * Constructor.
	 * @param id The identifier.
	 * @param text The text.
	 */
	constructor(id: string, text: string) {
		super(id);
		this.lines = lineSplitter(text);
	}

	//#endregion Constructor
}