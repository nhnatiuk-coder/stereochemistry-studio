# Publish Stereochemistry Studio

Upload this source directory as the root of its own GitHub repository.
Use Node 22 or newer.

In Cloudflare Workers & Pages, import that GitHub repository and set:

- Build command: `npm ci && npm test && npm run build:cloudflare`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root

The included `wrangler.jsonc` serves `dist` as static assets and enables the
Workers subdomain. The production build extracts Ketcher's Indigo worker to
keep individual assets under 25 MiB. Chemistry runs locally in the browser.

For an already authenticated local Cloudflare CLI:

```sh
npm ci
npm test
npm run build:cloudflare
npx wrangler deploy
```

The final URL is reported by Cloudflare after a successful deployment.
