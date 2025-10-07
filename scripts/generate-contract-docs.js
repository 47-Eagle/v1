#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generate Smart Contract Documentation
 * Extracts contract information and creates markdown documentation
 */

const OUTPUT_DIR = path.join(__dirname, '../docs-generated');
const CONTRACTS_DIR = path.join(__dirname, '../contracts');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract contract metadata from Solidity files
 */
function extractContractInfo(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Extract contract name
    const contractMatch = content.match(/contract\s+(\w+)/);
    const contractName = contractMatch ? contractMatch[1] : fileName.replace('.sol', '');
    
    // Extract NatSpec comments
    const titleMatch = content.match(/@title\s+(.+)/);
    const noticeMatch = content.match(/@notice\s+(.+)/);
    const devMatch = content.match(/@dev\s+(.+)/);
    
    // Extract functions (public/external only)
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s+(external|public)/g;
    const functions = [];
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
        functions.push(match[1]);
    }
    
    // Extract events
    const eventRegex = /event\s+(\w+)\s*\(/g;
    const events = [];
    while ((match = eventRegex.exec(content)) !== null) {
        events.push(match[1]);
    }
    
    return {
        name: contractName,
        fileName,
        filePath: filePath.replace(CONTRACTS_DIR, ''),
        title: titleMatch ? titleMatch[1] : contractName,
        notice: noticeMatch ? noticeMatch[1] : '',
        dev: devMatch ? devMatch[1] : '',
        functions: functions.slice(0, 20), // Limit to 20 functions
        events: events.slice(0, 20),
        linesOfCode: content.split('\n').length
    };
}

/**
 * Find all Solidity contracts
 */
function findContracts(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('test')) {
            findContracts(filePath, fileList);
        } else if (file.endsWith('.sol') && !file.includes('Mock') && !file.includes('Test')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

/**
 * Generate markdown documentation
 */
function generateMarkdown(contracts) {
    const timestamp = new Date().toISOString();
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    
    let markdown = `# 📋 Smart Contract Documentation\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
    markdown += `**Commit:** \`${commitHash}\`\n`;
    markdown += `**Total Contracts:** ${contracts.length}\n\n`;
    markdown += `---\n\n`;
    
    // Table of Contents
    markdown += `## 📑 Table of Contents\n\n`;
    contracts.forEach(contract => {
        markdown += `- [${contract.name}](#${contract.name.toLowerCase()})\n`;
    });
    markdown += `\n---\n\n`;
    
    // Contract Details
    contracts.forEach(contract => {
        markdown += `## ${contract.name}\n\n`;
        
        if (contract.title && contract.title !== contract.name) {
            markdown += `**${contract.title}**\n\n`;
        }
        
        if (contract.notice) {
            markdown += `> ${contract.notice}\n\n`;
        }
        
        markdown += `**File:** \`${contract.filePath}\`\n`;
        markdown += `**Lines of Code:** ${contract.linesOfCode}\n\n`;
        
        if (contract.dev) {
            markdown += `**Technical Details:** ${contract.dev}\n\n`;
        }
        
        if (contract.functions.length > 0) {
            markdown += `### 🔧 Key Functions\n\n`;
            contract.functions.forEach(fn => {
                markdown += `- \`${fn}()\`\n`;
            });
            markdown += `\n`;
        }
        
        if (contract.events.length > 0) {
            markdown += `### 📡 Events\n\n`;
            contract.events.forEach(event => {
                markdown += `- \`${event}\`\n`;
            });
            markdown += `\n`;
        }
        
        markdown += `---\n\n`;
    });
    
    return markdown;
}

/**
 * Generate quick stats
 */
function generateStats(contracts) {
    const totalLOC = contracts.reduce((sum, c) => sum + c.linesOfCode, 0);
    const totalFunctions = contracts.reduce((sum, c) => sum + c.functions.length, 0);
    const totalEvents = contracts.reduce((sum, c) => sum + c.events.length, 0);
    
    let stats = `# 📊 Smart Contract Statistics\n\n`;
    stats += `| Metric | Value |\n`;
    stats += `|--------|-------|\n`;
    stats += `| Total Contracts | ${contracts.length} |\n`;
    stats += `| Lines of Code | ${totalLOC.toLocaleString()} |\n`;
    stats += `| Public Functions | ${totalFunctions} |\n`;
    stats += `| Events | ${totalEvents} |\n`;
    stats += `| Last Updated | ${new Date().toLocaleString()} |\n\n`;
    
    return stats;
}

/**
 * Main execution
 */
async function main() {
    console.log('🔍 Scanning for contracts...');
    const contractFiles = findContracts(CONTRACTS_DIR);
    console.log(`📝 Found ${contractFiles.length} contracts`);
    
    console.log('📖 Extracting contract information...');
    const contracts = contractFiles.map(extractContractInfo);
    
    // Sort by name
    contracts.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('✍️  Generating documentation...');
    const markdown = generateMarkdown(contracts);
    const stats = generateStats(contracts);
    
    // Write files
    fs.writeFileSync(path.join(OUTPUT_DIR, 'CONTRACT_DOCUMENTATION.md'), markdown);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'CONTRACT_STATS.md'), stats);
    
    // Generate JSON for API/webhook
    const jsonData = {
        timestamp: new Date().toISOString(),
        commit: execSync('git rev-parse --short HEAD').toString().trim(),
        contracts: contracts.map(c => ({
            name: c.name,
            file: c.filePath,
            functions: c.functions.length,
            events: c.events.length,
            linesOfCode: c.linesOfCode
        }))
    };
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'contract-metadata.json'),
        JSON.stringify(jsonData, null, 2)
    );
    
    console.log('✅ Documentation generated successfully!');
    console.log(`📁 Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);

