#!/usr/bin/env node

/**
 * Verify Documentation Setup for 47 Eagle
 * Checks if everything is configured correctly before pushing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying 47 Eagle Documentation Setup...\n');

let errors = 0;
let warnings = 0;

function checkmark() { return '✅'; }
function crossmark() { return '❌'; }
function warning() { return '⚠️ '; }

// Check 1: Workflow file exists
console.log('📋 Checking workflow configuration...');
const workflowPath = '.github/workflows/update-docs.yml';
if (fs.existsSync(workflowPath)) {
    console.log(`${checkmark()} Workflow file exists: ${workflowPath}`);
    
    // Check if it's configured for 47-Eagle/docs
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    if (workflowContent.includes('47-Eagle/docs.git')) {
        console.log(`${checkmark()} Configured for 47-Eagle/docs repository`);
    } else {
        console.log(`${warning()}Workflow may not be configured for 47-Eagle/docs`);
        warnings++;
    }
} else {
    console.log(`${crossmark()} Workflow file missing: ${workflowPath}`);
    errors++;
}

// Check 2: Scripts exist
console.log('\n🔧 Checking generator scripts...');
const scripts = [
    'scripts/generate-contract-docs.js',
    'scripts/generate-update-log.js', 
    'scripts/create-docs-index.js'
];

scripts.forEach(script => {
    if (fs.existsSync(script)) {
        console.log(`${checkmark()} Script exists: ${script}`);
    } else {
        console.log(`${crossmark()} Script missing: ${script}`);
        errors++;
    }
});

// Check 3: Package.json scripts
console.log('\n📦 Checking NPM scripts...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.scripts['docs:generate']) {
        console.log(`${checkmark()} NPM script: docs:generate`);
    } else {
        console.log(`${crossmark()} Missing NPM script: docs:generate`);
        errors++;
    }
} catch (e) {
    console.log(`${crossmark()} Could not read package.json`);
    errors++;
}

// Check 4: Git repository
console.log('\n📂 Checking git repository...');
try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    console.log(`${checkmark()} Git repository detected`);
    
    // Check for commits
    try {
        const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
        console.log(`${checkmark()} Git history: ${commitCount} commits`);
    } catch (e) {
        console.log(`${warning()}No git commits found - add some commits for better changelogs`);
        warnings++;
    }
} catch (e) {
    console.log(`${crossmark()} Not a git repository or git not available`);
    errors++;
}

// Check 5: Contracts directory
console.log('\n📜 Checking smart contracts...');
if (fs.existsSync('contracts')) {
    const contractFiles = [];
    function findContracts(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                findContracts(fullPath);
            } else if (file.endsWith('.sol')) {
                contractFiles.push(fullPath);
            }
        });
    }
    findContracts('contracts');
    
    console.log(`${checkmark()} Found ${contractFiles.length} Solidity contracts`);
    if (contractFiles.length === 0) {
        console.log(`${warning()}No .sol files found - documentation will be minimal`);
        warnings++;
    }
} else {
    console.log(`${warning()}No contracts directory found`);
    warnings++;
}

// Check 6: Node.js and dependencies
console.log('\n🔧 Checking Node.js environment...');
try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    console.log(`${checkmark()} Node.js version: ${nodeVersion}`);
} catch (e) {
    console.log(`${crossmark()} Node.js not found`);
    errors++;
}

if (fs.existsSync('node_modules')) {
    console.log(`${checkmark()} Node modules installed`);
} else {
    console.log(`${warning()}Node modules not installed - run: npm install`);
    warnings++;
}

// Test generation
console.log('\n🧪 Testing documentation generation...');
try {
    console.log('   Running docs generation test...');
    execSync('node scripts/generate-contract-docs.js', { stdio: 'ignore' });
    execSync('node scripts/generate-update-log.js', { stdio: 'ignore' });
    execSync('node scripts/create-docs-index.js', { stdio: 'ignore' });
    console.log(`${checkmark()} Documentation generation test passed`);
    
    // Check output
    if (fs.existsSync('docs-export/team/Updates/Smart-Contracts/index.html')) {
        console.log(`${checkmark()} Generated files found`);
    } else {
        console.log(`${crossmark()} Generated files not found`);
        errors++;
    }
} catch (e) {
    console.log(`${crossmark()} Documentation generation failed`);
    console.log(`   Error: ${e.message}`);
    errors++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SETUP VERIFICATION SUMMARY');
console.log('='.repeat(50));

if (errors === 0 && warnings === 0) {
    console.log(`${checkmark()} Perfect! Your setup is completely ready.`);
    console.log('\n🚀 Next steps:');
    console.log('   1. Create Personal Access Token at: https://github.com/settings/tokens');
    console.log('   2. Add DOCS_DEPLOY_TOKEN secret to GitHub');
    console.log('   3. Add DOCS_REPO_URL secret: github.com/47-Eagle/docs.git');
    console.log('   4. Push a commit and watch it work!');
} else if (errors === 0) {
    console.log(`${checkmark()} Setup looks good with ${warnings} minor warnings.`);
    console.log('\n🚀 You can proceed with:');
    console.log('   1. Create Personal Access Token');
    console.log('   2. Add GitHub secrets');
    console.log('   3. Push a commit');
} else {
    console.log(`${crossmark()} Found ${errors} errors and ${warnings} warnings.`);
    console.log('\n🔧 Please fix the errors above before proceeding.');
}

// Instructions
console.log('\n📖 Documentation:');
console.log('   • Setup Guide: docs/SETUP_47EAGLE_DOCS.md');
console.log('   • Quick Start:  docs/AUTO_DOCS_QUICKSTART.md');
console.log('   • Full Guide:   docs/AUTO_DOCS_SETUP.md');

console.log('\n🧪 Test locally:');
console.log('   npm run docs:generate');
console.log('   npm run docs:preview');

console.log('');
process.exit(errors > 0 ? 1 : 0);
