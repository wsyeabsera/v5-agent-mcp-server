# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated tasks.

## Available Workflows

### deploy-docs.yml

Automatically builds and deploys documentation to GitHub Pages when:
- Changes are pushed to `main` branch in `docs/` or `packages/` directories
- Workflow is manually triggered

**What it does:**
1. Checks out repository
2. Sets up Node.js 18
3. Installs dependencies (Yarn)
4. Builds Docusaurus documentation
5. Deploys to GitHub Pages

**Access:**
- Documentation will be available at: `https://yab.github.io/clear-ai-v4/`
- You must enable GitHub Pages in repository settings

## Enabling GitHub Pages

1. Go to repository Settings
2. Navigate to "Pages" section
3. Under "Source", select "GitHub Actions"
4. The workflow will automatically deploy on next push to main

## Manual Trigger

To manually trigger deployment:

1. Go to "Actions" tab
2. Select "Deploy Documentation"
3. Click "Run workflow"

