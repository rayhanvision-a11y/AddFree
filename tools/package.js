// tools/package.js
// Creates a clean, Chrome Web Store-compliant ZIP package
// Run: node tools/package.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const packageDir = path.join(distDir, 'package');

console.log('🚀 Preparing AddFree for Chrome Web Store...');

// 1. Run build script to ensure rules and domains are up to date
console.log('📦 Updating domain lists and rules...');
execSync('node tools/build.js', { cwd: root, stdio: 'inherit' });

// 2. Read manifest
const manifestRaw = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
const manifest = JSON.parse(manifestRaw);
const version = manifest.version || '1.0.0';
const zipName = `AddFree-v${version}-webstore.zip`;
const zipPath = path.join(distDir, zipName);

// 3. Clean and prepare dist/package directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(packageDir, { recursive: true });

// 4. Clean manifest for Chrome Web Store (strip dev-only declarativeNetRequestFeedback)
if (Array.isArray(manifest.permissions)) {
  manifest.permissions = manifest.permissions.filter(p => p !== 'declarativeNetRequestFeedback');
}

fs.writeFileSync(path.join(packageDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// 5. Copy required files and folders only
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy background.js
fs.copyFileSync(path.join(root, 'background.js'), path.join(packageDir, 'background.js'));

// Copy folders: content, popup, rules, icons
const includeDirs = ['content', 'popup', 'rules', 'icons'];
for (const dir of includeDirs) {
  const dirPath = path.join(root, dir);
  if (fs.existsSync(dirPath)) {
    copyDir(dirPath, path.join(packageDir, dir));
  }
}

// Ensure _metadata, .git, tools, test, etc. are NOT in the package
console.log('🗜️ Creating store ZIP: ' + zipName);

// Remove test or old zip if exists
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

try {
  // Use tar.exe which uses standard POSIX forward slashes ('/') in ZIP archives
  // Windows Compress-Archive uses backslashes ('\') which breaks Edge/Chrome Store validators!
  execSync(`tar.exe -a -c -f "${zipPath}" *`, { cwd: packageDir, stdio: 'inherit' });
  console.log(`\n✅ SUCCESS! Store package created with standard forward slashes at:\n   ${zipPath}\n`);
} catch (err) {
  console.log('tar.exe fallback, using PowerShell with forward slashes normalization...');
  const psScript = `
    Add-Type -AssemblyName System.IO.Compression;
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $zip = [System.IO.Compression.ZipFile]::Open('${zipPath.replace(/\\/g, '\\\\')}', [System.IO.Compression.ZipArchiveMode]::Create);
    Get-ChildItem -Path '${packageDir.replace(/\\/g, '\\\\')}' -Recurse | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
      $rel = $_.FullName.Substring('${packageDir.replace(/\\/g, '\\\\')}'.Length + 1).Replace('\\', '/');
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel);
    };
    $zip.Dispose();
  `;
  execSync(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
  console.log(`\n✅ SUCCESS! Store package created at:\n   ${zipPath}\n`);
}
