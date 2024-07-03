/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/


import { expect } from '@playwright/test';
import { Application, Logger } from '../../../../../automation/out';
import { installAllHandlers } from '../../../utils';

/*
 * Help test cases
 */
export function setup(logger: Logger) {
	describe('Layouts', () => {

		// Shared before/after handling
		installAllHandlers(logger);

		describe('Stacked Layout', () => {

			// before(async function () {

			// 	const app = this.app as Application;

			// 	const pythonFixtures = new PositronPythonFixtures(app);
			// 	await pythonFixtures.startPythonInterpreter();

			// });

			it.only('Verify stacked layout puts stuff in appropriate places', async function () {

				const app = this.app as Application;
				const layouts = app.workbench.positronLayouts;
				const { sidebarLocator, auxilaryBarLocator } = layouts;

				// Enter layout with help pane docked in session panel
				await layouts.enterLayout('stacked');

				// Sidebar should be open
				await expect(sidebarLocator).toBeVisible();
				const sidebarBounds = await sidebarLocator.boundingBox();
				expect(sidebarBounds?.width ?? 0).toBeGreaterThan(0);

				const variablesSection = auxilaryBarLocator.getByLabel('Variables Section');
				const plotsSection = auxilaryBarLocator.getByLabel('Plots Section');
				await expect(variablesSection).toBeVisible();
				await expect(plotsSection).toBeVisible();

				// Variables section should sit above the plots section
				const variablesSectionBounds = await variablesSection.boundingBox();
				const plotsSectionBounds = await plotsSection.boundingBox();
				expect(variablesSectionBounds?.y ?? 0).toBeLessThan(plotsSectionBounds?.y ?? 0);

				await expect(layouts.auxilaryBarLocator).toBeVisible();

			});
		});
	});
}
