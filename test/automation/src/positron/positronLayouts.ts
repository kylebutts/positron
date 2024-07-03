/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { Code } from '../code';
import { Workbench } from '../workbench';

/*
 *  Reuseable Positron layout functionality for tests to leverage.
 */
export class PositronLayouts {
	static AUX_BAR = '.part.auxiliarybar';
	static PANEL = '.part.panel';
	static SIDEBAR = '.part.sidebar';

	auxilaryBarLocator = this.code.driver.getLocator(PositronLayouts.AUX_BAR);
	panelLocator = this.code.driver.getLocator(PositronLayouts.PANEL);
	sidebarLocator = this.code.driver.getLocator(PositronLayouts.SIDEBAR);

	constructor(private code: Code, private workbench: Workbench) { }

	async enterLayout(layout: 'stacked' | 'side-by-side'): Promise<void> {
		let cmd: string;
		switch (layout) {
			case 'stacked':
				cmd = 'workbench.action.positronStackedDataScienceLayout';
				break;
			case 'side-by-side':
				cmd = 'workbench.action.positronFourPaneDataScienceLayout';
				break;
		}
		await this.workbench.quickaccess.runCommand(cmd);
	}


}
