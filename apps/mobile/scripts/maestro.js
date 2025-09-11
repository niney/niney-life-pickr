#!/usr/bin/env node

/**
 * Cross-platform Maestro runner for npm scripts
 * Automatically detects and uses the correct Maestro executable
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Get Maestro installation path
const homedir = os.homedir();
const maestroPath = path.join(homedir, '.maestro', 'bin', 'maestro');
const maestroBatPath = path.join(homedir, '.maestro', 'bin', 'maestro.bat');

// Determine which Maestro executable to use
let maestroExecutable;
if (process.platform === 'win32' && fs.existsSync(maestroBatPath)) {
  maestroExecutable = maestroBatPath;
} else if (fs.existsSync(maestroPath)) {
  maestroExecutable = maestroPath;
} else {
  console.error('Maestro is not installed or not found in the expected location.');
  console.error('Please install Maestro using:');
  console.error('  curl -Ls "https://get.maestro.mobile.dev" | bash');
  process.exit(1);
}

// Get command line arguments (skip node and script name)
const args = process.argv.slice(2);

// Run Maestro with the provided arguments
const maestro = spawn(maestroExecutable, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

maestro.on('error', (error) => {
  console.error(`Error running Maestro: ${error.message}`);
  process.exit(1);
});

maestro.on('exit', (code) => {
  process.exit(code);
});