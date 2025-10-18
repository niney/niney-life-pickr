/**
 * Build script to copy static assets (SQL migration files) to dist folder
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively copy directory
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDir(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

/**
 * Main function
 */
function main() {
  const srcMigrations = path.join(__dirname, '..', 'src', 'db', 'migrations');
  const destMigrations = path.join(__dirname, '..', 'dist', 'db', 'migrations');

  console.log('📦 Copying static assets...');
  console.log(`Source: ${srcMigrations}`);
  console.log(`Destination: ${destMigrations}`);

  try {
    copyDir(srcMigrations, destMigrations);
    console.log('✅ Assets copied successfully!');
  } catch (error) {
    console.error('❌ Failed to copy assets:', error);
    process.exit(1);
  }
}

main();
