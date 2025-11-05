# Deployment Guide

Guide for deploying Docusaurus documentation to GitHub Pages.

## Configuration

The documentation is configured for GitHub Pages deployment at:
**URL**: `https://wsyeabsera.github.io/v5-agent-mcp-server/`

## Prerequisites

1. GitHub repository: `https://github.com/wsyeabsera/v5-agent-mcp-server`
2. GitHub Pages enabled in repository settings
3. GitHub Actions enabled

## Enabling GitHub Pages

1. Go to your repository: https://github.com/wsyeabsera/v5-agent-mcp-server
2. Click **Settings**
3. Navigate to **Pages** in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. Click **Save**

## Automatic Deployment

The documentation will automatically deploy when:
- Changes are pushed to the `main` branch in the `docs/` directory
- The workflow is manually triggered

## Manual Deployment

To manually trigger deployment:

1. Go to the **Actions** tab in your repository
2. Select **Deploy Documentation** workflow
3. Click **Run workflow**
4. Select the branch (usually `main`)
5. Click **Run workflow**

## Verify Deployment

After deployment completes (usually 2-3 minutes):

1. Check the Actions tab for deployment status
2. Visit: https://wsyeabsera.github.io/v5-agent-mcp-server/
3. Documentation should load correctly with all assets

## Local Testing

To test the build locally with the correct baseUrl:

```bash
cd docs
npm run build
npm run serve
```

Then visit: http://localhost:3000/v5-agent-mcp-server/

## Troubleshooting

### 404 Errors

- Ensure `baseUrl` in `docusaurus.config.ts` matches repository name: `/v5-agent-mcp-server/`
- Verify `organizationName` and `projectName` are correct
- Make sure GitHub Pages is enabled with "GitHub Actions" as source

### Broken CSS/Assets

- Clear browser cache
- Check that `baseUrl` has trailing slash: `/v5-agent-mcp-server/`
- Verify build completed successfully in Actions

### Build Failures

- Check Actions logs for errors
- Ensure all dependencies are installed
- Verify Node.js version (20+) is correct

## Configuration Details

Current configuration:
- **URL**: `https://wsyeabsera.github.io`
- **Base URL**: `/v5-agent-mcp-server/`
- **Organization**: `wsyeabsera`
- **Project**: `v5-agent-mcp-server`

These settings are in `docs/docusaurus.config.ts`.

