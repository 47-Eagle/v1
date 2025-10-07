#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Create Documentation Index Page
 * Generates a landing page for the Smart Contracts documentation section
 */

const OUTPUT_DIR = path.join(__dirname, '../docs-export/team/Updates/Smart-Contracts');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate main index page
 */
function generateIndex() {
    const timestamp = new Date().toLocaleString();
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>47 Eagle - Smart Contract Updates</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 3rem 2rem;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .content {
            padding: 2rem;
        }
        
        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        
        .card {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 2rem;
            transition: all 0.3s;
            cursor: pointer;
        }
        
        .card:hover {
            border-color: #667eea;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
            transform: translateY(-4px);
        }
        
        .card-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .card h3 {
            margin-bottom: 0.5rem;
            color: #1e3c72;
        }
        
        .card p {
            color: #666;
        }
        
        .card a {
            display: inline-block;
            margin-top: 1rem;
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .card a:hover {
            text-decoration: underline;
        }
        
        .footer {
            background: #f5f5f5;
            padding: 1.5rem 2rem;
            text-align: center;
            color: #666;
            border-top: 1px solid #e0e0e0;
        }
        
        .badge {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.85rem;
            margin-top: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦅 47 Eagle</h1>
            <p>Smart Contract Documentation & Updates</p>
            <div class="badge">Last Updated: ${timestamp}</div>
        </div>
        
        <div class="content">
            <h2>📚 Documentation Sections</h2>
            
            <div class="card-grid">
                <div class="card" onclick="window.location.href='CONTRACT_DOCUMENTATION.md'">
                    <div class="card-icon">📜</div>
                    <h3>Contract Documentation</h3>
                    <p>Complete technical documentation for all smart contracts including functions, events, and architecture.</p>
                    <a href="CONTRACT_DOCUMENTATION.md">View Documentation →</a>
                </div>
                
                <div class="card" onclick="window.location.href='UPDATES.md'">
                    <div class="card-icon">📰</div>
                    <h3>Latest Updates</h3>
                    <p>Recent changes, improvements, and bug fixes across the smart contract codebase.</p>
                    <a href="UPDATES.md">View Updates →</a>
                </div>
                
                <div class="card" onclick="window.location.href='CONTRACT_STATS.md'">
                    <div class="card-icon">📊</div>
                    <h3>Statistics</h3>
                    <p>Metrics and statistics about the smart contract ecosystem including LOC, functions, and events.</p>
                    <a href="CONTRACT_STATS.md">View Stats →</a>
                </div>
                
                <div class="card" onclick="window.location.href='VAULT_INJECTION_IMPLEMENTATION.md'">
                    <div class="card-icon">💰</div>
                    <h3>Vault Injection</h3>
                    <p>Comprehensive guide to the vault injection mechanism for fee distribution and value accrual.</p>
                    <a href="VAULT_INJECTION_IMPLEMENTATION.md">View Guide →</a>
                </div>
                
                <div class="card" onclick="window.location.href='VAULT_INJECTION_QUICK_REFERENCE.md'">
                    <div class="card-icon">🚀</div>
                    <h3>Quick Reference</h3>
                    <p>Quick reference guide for vault operations, configuration, and common tasks.</p>
                    <a href="VAULT_INJECTION_QUICK_REFERENCE.md">View Reference →</a>
                </div>
                
                <div class="card" onclick="window.location.href='feed.json'">
                    <div class="card-icon">📡</div>
                    <h3>JSON Feed</h3>
                    <p>Machine-readable feed of updates for integration with your applications and services.</p>
                    <a href="feed.json">View Feed →</a>
                </div>
            </div>
            
            <h2 style="margin-top: 3rem;">🔗 Quick Links</h2>
            <div style="margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 8px;">
                <ul style="list-style: none;">
                    <li style="margin: 0.5rem 0;">📖 <a href="https://docs.47eagle.com" target="_blank">Main Documentation</a></li>
                    <li style="margin: 0.5rem 0;">🌐 <a href="https://47eagle.com" target="_blank">Official Website</a></li>
                    <li style="margin: 0.5rem 0;">💻 <a href="https://github.com/your-org/eagle-ovault-clean" target="_blank">GitHub Repository</a></li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>🦅 <strong>47 Eagle</strong> | Eagle Omnichain Vault</p>
            <p style="margin-top: 0.5rem; font-size: 0.9rem;">
                Documentation auto-generated from repository | 
                <a href="https://github.com/your-org/eagle-ovault-clean" target="_blank" style="color: #667eea;">View Source</a>
            </p>
        </div>
    </div>
</body>
</html>
`;
    
    return html;
}

/**
 * Generate markdown index as well
 */
function generateMarkdownIndex() {
    let md = `# 🦅 47 Eagle - Smart Contract Documentation\n\n`;
    md += `**Last Updated:** ${new Date().toLocaleString()}\n\n`;
    md += `Welcome to the Smart Contract documentation section of 47 Eagle.\n\n`;
    md += `## 📚 Available Documentation\n\n`;
    md += `### 📜 [Contract Documentation](CONTRACT_DOCUMENTATION.md)\n`;
    md += `Complete technical documentation for all smart contracts.\n\n`;
    md += `### 📰 [Latest Updates](UPDATES.md)\n`;
    md += `Recent changes and improvements to the codebase.\n\n`;
    md += `### 📊 [Statistics](CONTRACT_STATS.md)\n`;
    md += `Metrics and statistics about the contract ecosystem.\n\n`;
    md += `### 💰 [Vault Injection Guide](VAULT_INJECTION_IMPLEMENTATION.md)\n`;
    md += `Comprehensive implementation guide for vault injection.\n\n`;
    md += `### 🚀 [Quick Reference](VAULT_INJECTION_QUICK_REFERENCE.md)\n`;
    md += `Quick reference for vault operations.\n\n`;
    md += `### 📡 [JSON Feed](feed.json)\n`;
    md += `Machine-readable feed of updates.\n\n`;
    md += `---\n\n`;
    md += `*Documentation auto-generated from repository*\n`;
    
    return md;
}

/**
 * Main execution
 */
async function main() {
    console.log('📝 Creating documentation index...');
    
    const htmlIndex = generateIndex();
    const mdIndex = generateMarkdownIndex();
    
    // Write files
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), htmlIndex);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), mdIndex);
    
    console.log('✅ Index pages created successfully!');
    console.log(`📁 Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);

