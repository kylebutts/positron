/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/


import { Locator } from '@playwright/test';
import { Code } from '../code';
// import { QuickAccess } from '../quickaccess';
import { PositronTextElement } from './positronBaseElement';

const POSITRON_EXPLORER_PROJECT_TITLE = 'div[id="workbench.view.explorer"] h3.title';
const POSITRON_EXPLORER_PROJECT_FILES = 'div[id="workbench.view.explorer"] span[class="monaco-highlighted-label"]';


/*
 *  Reuseable Positron explorer functionality for tests to leverage.
 */
export class PositronExplorer {
	explorerProjectTitle: PositronTextElement;
	explorerProjectFiles: Locator;

	constructor(private code: Code) {
		this.explorerProjectTitle = new PositronTextElement(POSITRON_EXPLORER_PROJECT_TITLE, this.code);
		this.explorerProjectFiles = code.driver.getLocator(POSITRON_EXPLORER_PROJECT_FILES);
	}

	/**
	 * Returns a string array of the top-level project files/directories in the explorer.
	 * @returns Promise<string[]>
	 */
	async getExplorerProjectFiles() {
		const filesList = await this.explorerProjectFiles.all();
		const fileNames = filesList.map(async file => {
			const fileText = await file.textContent();
			return fileText || '';
		});
		return await Promise.all(fileNames);
	}
}
