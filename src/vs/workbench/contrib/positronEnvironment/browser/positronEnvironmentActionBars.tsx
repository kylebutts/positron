/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Posit, PBC.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./positronEnvironmentActionBars';
import * as React from 'react';
import { PropsWithChildren, useEffect, useRef, useState } from 'react'; // eslint-disable-line no-duplicate-imports
import { localize } from 'vs/nls';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IReactComponentContainer } from 'vs/base/browser/positronReactRenderer';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { PositronActionBar } from 'vs/platform/positronActionBar/browser/positronActionBar';
import { ActionBarRegion } from 'vs/platform/positronActionBar/browser/components/actionBarRegion';
import { ActionBarFilter } from 'vs/platform/positronActionBar/browser/components/actionBarFilter';
import { ActionBarButton } from 'vs/platform/positronActionBar/browser/components/actionBarButton';
import { ActionBarSeparator } from 'vs/platform/positronActionBar/browser/components/actionBarSeparator';
import { PositronActionBarContextProvider } from 'vs/platform/positronActionBar/browser/positronActionBarContext';

// Constants.
const kSecondaryActionBarGap = 4;
const kPaddingLeft = 14;
const kPaddingRight = 8;
const kFindTimeout = 800;

/**
 * PositronEnvironmentActionBarsProps interface.
 */
export interface PositronEnvironmentActionBarsProps {
	// Services.
	commandService: ICommandService;
	configurationService: IConfigurationService;
	contextKeyService: IContextKeyService;
	contextMenuService: IContextMenuService;
	keybindingService: IKeybindingService;
	reactComponentContainer: IReactComponentContainer;

	// Event callbacks.
	onLoadWorkspace: () => void;
	onSaveWorkspaceAs: () => void;
	onFilter: (filterText: string) => void;
	onCancelFilter: () => void;
}

/**
 * PositronEnvironmentActionBars component.
 * @param props A PositronEnvironmentActionBarsProps that contains the component properties.
 */
export const PositronEnvironmentActionBars = (props: PropsWithChildren<PositronEnvironmentActionBarsProps>) => {
	// Hooks.
	const runtimeButtonRef = useRef<HTMLButtonElement>(undefined!);
	const [filterText, setFilterText] = useState('');
	const [alternateFindUI, setAlternateFindUI] = useState(false);

	// Add IReactComponentContainer event handlers.
	useEffect(() => {
		// Create the disposable store for cleanup.
		const disposableStore = new DisposableStore();

		// Add the onSizeChanged event handler.
		disposableStore.add(props.reactComponentContainer.onSizeChanged(size => {
			setAlternateFindUI(size.width - kPaddingLeft - runtimeButtonRef.current.offsetWidth - kSecondaryActionBarGap < 500);
		}));

		// Add the onVisibilityChanged event handler.
		disposableStore.add(props.reactComponentContainer.onVisibilityChanged(visibility => {
		}));

		// Return the cleanup function that will dispose of the event handlers.
		return () => disposableStore.dispose();
	}, []);

	// Find text change handler.
	useEffect(() => {
		if (filterText === '') {
			return props.onCancelFilter();
		} else {
			// Start the find timeout.
			const findTimeout = setTimeout(() => {
				props.onFilter(filterText);
			}, kFindTimeout);

			// Clear the find timeout.
			return () => clearTimeout(findTimeout);
		}
	}, [filterText]);

	// Render.
	return (
		<div className='positron-help-action-bars'>
			<PositronActionBarContextProvider {...props}>
				<PositronActionBar size='small' paddingLeft={kPaddingLeft} paddingRight={kPaddingRight}>
					<ActionBarRegion align='left'>
						<ActionBarButton iconId='positron-open' tooltip={localize('positronLoadWorkspace', "Load workspace")} onClick={() => props.onLoadWorkspace()} />
						<ActionBarButton iconId='positron-save' tooltip={localize('positronSaveWorkspace', "Save workspace as")} onClick={() => props.onSaveWorkspaceAs()} />
						<ActionBarSeparator />
						<ActionBarButton iconId='positron-import-data' text='Import Dataset' dropDown={true} />
						<ActionBarSeparator />
						<ActionBarButton iconId='positron-clean' tooltip={localize('positronClearObjects', "Clear workspace objects")} />
					</ActionBarRegion>
					<ActionBarRegion align='right'>
						<ActionBarButton iconId='positron-list' text='List' dropDown={true} />
						<ActionBarSeparator />
						<ActionBarButton align='right' iconId='positron-refresh' tooltip={localize('positronRefreshObjects', "Refresh workspace objects")} />
					</ActionBarRegion>
				</PositronActionBar>
				<PositronActionBar size='small' gap={kSecondaryActionBarGap} borderBottom={true} paddingLeft={kPaddingLeft} paddingRight={kPaddingRight}>
					<ActionBarRegion align='left'>
						<ActionBarButton ref={runtimeButtonRef} text='R' dropDown={true} tooltip={localize('positronRuntime', "Select runtime")} />
						<ActionBarSeparator />
						<ActionBarButton iconId='positron-environment' text='Global Environment' dropDown={true} tooltip={localize('positronSelectEnvironment', "Select environment")} />
					</ActionBarRegion>
					<ActionBarRegion align='right'>
						{!alternateFindUI && (
							<ActionBarFilter
								width={200}
								initialFilterText={filterText}
								onFilterTextChanged={setFilterText} />
						)}
					</ActionBarRegion>
					{alternateFindUI && (
						<PositronActionBar size='small' gap={kSecondaryActionBarGap} borderBottom={true} paddingLeft={kPaddingLeft} paddingRight={kPaddingRight}>
							<ActionBarFilter
								width={200}
								initialFilterText={filterText}
								onFilterTextChanged={setFilterText} />
						</PositronActionBar>
					)}
				</PositronActionBar>
			</PositronActionBarContextProvider>
		</div>
	);
};