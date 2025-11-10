#!/bin/bash

# Eagle LP Quick Deploy Script
# This script helps you deploy your app quickly

echo "🦅 Eagle LP Deployment Helper"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the project root."
    exit 1
fi

echo "Choose deployment platform:"
echo "1) Vercel (Recommended - Fastest & Easiest)"
echo "2) Netlify (Good alternative)"
echo "3) Build only (for manual deployment)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying to Vercel..."
        echo ""
        
        # Check if vercel is installed
        if ! command -v vercel &> /dev/null; then
            echo "📦 Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "✅ Running production deployment..."
        vercel --prod
        
        echo ""
        echo "🎉 Deployment complete!"
        echo "⚠️  Don't forget to set environment variables in Vercel dashboard:"
        echo "    - VITE_DYNAMIC_ENVIRONMENT_ID"
        echo "    - VITE_GRAPH_API_KEY"
        echo "    - VITE_ALCHEMY_API_KEY"
        ;;
    
    2)
        echo ""
        echo "🌐 Preparing for Netlify deployment..."
        echo ""
        echo "📦 Building app..."
        npm run build
        
        echo ""
        echo "✅ Build complete! Your files are in the 'dist' folder."
        echo ""
        echo "Next steps:"
        echo "1. Go to https://app.netlify.com/"
        echo "2. Drag and drop the 'dist' folder"
        echo "3. Set environment variables in Site settings"
        echo ""
        ;;
    
    3)
        echo ""
        echo "📦 Building app for production..."
        npm run build
        
        echo ""
        echo "✅ Build complete!"
        echo "📁 Files are in: ./dist"
        echo ""
        echo "You can now:"
        echo "- Upload to any static hosting service"
        echo "- Deploy to your own server"
        echo "- Use with Docker"
        ;;
    
    *)
        echo "❌ Invalid choice. Please run again and choose 1-3."
        exit 1
        ;;
esac

