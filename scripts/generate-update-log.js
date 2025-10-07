#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generate Update Log from Git Commits
 * Creates a changelog/update feed for the docs site
 */

const OUTPUT_DIR = path.join(__dirname, '../docs-generated');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Get recent commits
 */
function getRecentCommits(count = 20) {
    try {
        const gitLog = execSync(
            `git log -${count} --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso`,
            { encoding: 'utf8' }
        );
        
        return gitLog.split('\n').map(line => {
            const [hash, author, email, date, message] = line.split('|');
            return { hash, author, email, date, message };
        }).filter(commit => commit.hash);
    } catch (error) {
        console.warn('Warning: Could not retrieve git log:', error.message);
        return [];
    }
}

/**
 * Categorize commits by type
 */
function categorizeCommit(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('feat') || lower.includes('feature') || lower.includes('add')) {
        return { category: '✨ Features', emoji: '✨' };
    } else if (lower.includes('fix') || lower.includes('bug')) {
        return { category: '🐛 Bug Fixes', emoji: '🐛' };
    } else if (lower.includes('doc') || lower.includes('docs')) {
        return { category: '📝 Documentation', emoji: '📝' };
    } else if (lower.includes('test')) {
        return { category: '✅ Tests', emoji: '✅' };
    } else if (lower.includes('refactor') || lower.includes('improve')) {
        return { category: '♻️ Refactoring', emoji: '♻️' };
    } else if (lower.includes('perf') || lower.includes('optimize')) {
        return { category: '⚡ Performance', emoji: '⚡' };
    } else if (lower.includes('deploy') || lower.includes('release')) {
        return { category: '🚀 Deployment', emoji: '🚀' };
    } else if (lower.includes('contract') || lower.includes('solidity')) {
        return { category: '📜 Smart Contracts', emoji: '📜' };
    } else {
        return { category: '🔧 Other Changes', emoji: '🔧' };
    }
}

/**
 * Generate changelog markdown
 */
function generateChangelog(commits) {
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    let markdown = `# 📰 Latest Updates - Smart Contracts\n\n`;
    markdown += `**Last Updated:** ${currentDate}\n\n`;
    markdown += `---\n\n`;
    
    // Group commits by category
    const grouped = {};
    commits.forEach(commit => {
        const { category, emoji } = categorizeCommit(commit.message);
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(commit);
    });
    
    // Output by category
    Object.entries(grouped).forEach(([category, commits]) => {
        markdown += `## ${category}\n\n`;
        commits.forEach(commit => {
            const shortHash = commit.hash.substring(0, 7);
            const date = new Date(commit.date).toLocaleDateString();
            markdown += `- **[${shortHash}]** ${commit.message}\n`;
            markdown += `  - *By ${commit.author} on ${date}*\n`;
        });
        markdown += `\n`;
    });
    
    markdown += `---\n\n`;
    markdown += `*Generated automatically from Git history*\n`;
    
    return markdown;
}

/**
 * Generate summary for recent changes
 */
function generateSummary(commits) {
    const categories = {};
    commits.forEach(commit => {
        const { category } = categorizeCommit(commit.message);
        categories[category] = (categories[category] || 0) + 1;
    });
    
    let summary = `# 📋 Update Summary\n\n`;
    summary += `**Period:** Last ${commits.length} commits\n\n`;
    summary += `## Changes by Category\n\n`;
    
    Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
            summary += `- ${category}: **${count}** changes\n`;
        });
    
    summary += `\n**Total Changes:** ${commits.length}\n\n`;
    
    return summary;
}

/**
 * Generate JSON feed for website integration
 */
function generateJSONFeed(commits) {
    const feed = {
        version: '1.0',
        title: '47 Eagle - Smart Contract Updates',
        home_page_url: 'https://docs.47eagle.com/team/Updates/Smart-Contracts',
        feed_url: 'https://docs.47eagle.com/team/Updates/Smart-Contracts/feed.json',
        updated: new Date().toISOString(),
        items: commits.slice(0, 10).map(commit => ({
            id: commit.hash,
            title: commit.message,
            content_text: `Commit by ${commit.author} on ${commit.date}`,
            url: `https://github.com/your-org/your-repo/commit/${commit.hash}`,
            date_published: new Date(commit.date).toISOString(),
            author: {
                name: commit.author,
                email: commit.email
            },
            tags: [categorizeCommit(commit.message).category]
        }))
    };
    
    return JSON.stringify(feed, null, 2);
}

/**
 * Main execution
 */
async function main() {
    console.log('📜 Retrieving git history...');
    const commits = getRecentCommits(20);
    
    if (commits.length === 0) {
        console.warn('⚠️  No commits found. Creating placeholder...');
        const placeholder = `# No Recent Updates\n\nNo git history available.\n`;
        fs.writeFileSync(path.join(OUTPUT_DIR, 'UPDATES.md'), placeholder);
        return;
    }
    
    console.log(`📝 Processing ${commits.length} commits...`);
    
    const changelog = generateChangelog(commits);
    const summary = generateSummary(commits);
    const jsonFeed = generateJSONFeed(commits);
    
    // Write files
    fs.writeFileSync(path.join(OUTPUT_DIR, 'UPDATES.md'), changelog);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'UPDATE_SUMMARY.md'), summary);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'feed.json'), jsonFeed);
    
    // Create webhook payload
    const webhookPayload = {
        event: 'documentation_update',
        timestamp: new Date().toISOString(),
        repository: 'eagle-ovault-clean',
        commits: commits.length,
        latest_commit: commits[0],
        summary: Object.entries(
            commits.reduce((acc, c) => {
                const { category } = categorizeCommit(c.message);
                acc[category] = (acc[category] || 0) + 1;
                return acc;
            }, {})
        ).map(([category, count]) => ({ category, count }))
    };
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'webhook-payload.json'),
        JSON.stringify(webhookPayload, null, 2)
    );
    
    console.log('✅ Update log generated successfully!');
}

main().catch(console.error);

