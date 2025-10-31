#!/bin/bash
# Quick script to copy Agent 4 security docs to your docs repo

# EDIT THIS: Path to your documentation repository
DOCS_REPO_PATH="/path/to/your-docs-repo"
TARGET_DIR="$DOCS_REPO_PATH/docs/security"

echo "📋 Copying Agent 4 Security Documentation..."
echo ""

# Check if docs repo path exists
if [ ! -d "$DOCS_REPO_PATH" ]; then
    echo "❌ Error: Documentation repo not found at: $DOCS_REPO_PATH"
    echo "📝 Edit this script and update DOCS_REPO_PATH with your actual path"
    exit 1
fi

# Create target directory
mkdir -p "$TARGET_DIR"

# Copy all security docs
cp -v agent4-security/* "$TARGET_DIR/"

echo ""
echo "✅ Security docs copied to: $TARGET_DIR"
echo ""
echo "📝 Next steps:"
echo "   cd $DOCS_REPO_PATH"
echo "   git add docs/security/"
echo "   git commit -m 'docs: Add Agent 4 security documentation'"
echo "   git push"
