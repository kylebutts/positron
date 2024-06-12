/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

// @ts-check
const path = require('path');

const srcDir = path.join(__dirname, 'preload');
const outDir = path.join(__dirname, 'preload-out');

require('../esbuild-webview-common').run({
	entryPoints: [
		path.join(srcDir, 'index.ts'),
	],
	srcDir,
	outdir: outDir,
}, process.argv);
