# Documentation

This directory contains the Docusaurus documentation for Agents MCP Server.

## Development

### Start Development Server

```bash
npm start
```

This starts a local development server at `http://localhost:3000`.

### Build Documentation

```bash
npm run build
```

Builds static files in `build/` directory.

### Serve Built Documentation

```bash
npm run serve
```

Serves the built documentation locally.

## Structure

- `docs/` - Documentation markdown files
- `src/` - React components and custom CSS
- `static/` - Static assets (images, etc.)
- `docusaurus.config.ts` - Docusaurus configuration
- `sidebars.ts` - Sidebar navigation configuration

## Writing Documentation

1. Create markdown files in the appropriate `docs/` subdirectory
2. Update `sidebars.ts` to include new pages
3. Use Mermaid diagrams for architecture diagrams
4. Include code examples with syntax highlighting

## Deployment

The documentation can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

Build the documentation and deploy the `build/` directory.
