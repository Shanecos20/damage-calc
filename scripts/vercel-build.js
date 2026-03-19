#!/usr/bin/env node
'use strict';

/**
 * Vercel-friendly build with visible steps (tsc + copy can take 30s+ with no output otherwise).
 */

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

function run(label, command, args, options) {
	console.log('\n[vercel-build] ' + label + '…');
	const r = spawnSync(command, args, {
		cwd: root,
		stdio: 'inherit',
		shell: false,
		env: process.env,
		...options,
	});
	if (r.error) {
		console.error(r.error);
		process.exit(1);
	}
	if (r.status !== 0) {
		process.exit(r.status || 1);
	}
}

function runNpm(label, npmArgs) {
	// Windows: shell required so npm resolves (spawn npm.cmd without shell can EINVAL).
	console.log('\n[vercel-build] ' + label + '…');
	const r = spawnSync('npm', npmArgs, {
		cwd: root,
		stdio: 'inherit',
		shell: process.platform === 'win32',
		env: process.env,
	});
	if (r.error) {
		console.error(r.error);
		process.exit(1);
	}
	if (r.status !== 0) {
		process.exit(r.status || 1);
	}
}

console.log('[vercel-build] starting from', root);

run('Regenerate Rad Red data (no-op if exporter missing)', process.execPath, [
	path.join(root, 'scripts', 'generate-radred-sav-data.js'),
]);

runNpm('TypeScript compile (calc)', ['run', 'compile', '--prefix', 'calc']);

run('Assemble dist + HTML', process.execPath, [path.join(root, 'build'), 'view']);

console.log('\n[vercel-build] done.\n');
