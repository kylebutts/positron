/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

interface VSCodeIPyWidgetsLoader {
	load(): () => void;
	unload(): () => void;
}

export async function activate(context: any): Promise<void> {
	console.log('Activated positron-ipywidgets preload! context:', context);

	// Poll until vscIPyWidgets8 is available.
	//
	// vscIPyWidgets7 and vscIPyWidgets8 are attached to the window in the preload script defined
	// in the vscode-jupyter-ipywidgets repo, and contributed via the vscode-notebook-renderers
	// extension.
	const vscIPyWidgets8 = await new Promise<VSCodeIPyWidgetsLoader>((resolve) => {
		const interval = setInterval(() => {
			const vscIPyWidgets8 = (window as any).vscIPyWidgets8;
			if (vscIPyWidgets8) {
				clearInterval(interval);
				resolve(vscIPyWidgets8);
			}
		}, 100);
	});

	// TODO: Explain
	vscIPyWidgets8.load();

	const WidgetManager = (window as any).vscIPyWidgets.WidgetManager;

	console.log('WidgetManager:', WidgetManager);

	const manager = new WidgetManager();
	console.log('manager:', manager);
}
