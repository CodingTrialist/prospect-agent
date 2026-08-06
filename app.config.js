// Extends app.json. The only dynamic piece is the web base path: GitHub Pages
// serves project sites from /<repo>/, so the exported bundle's <script src>
// needs that prefix. Local dev and root-hosted deploys leave it empty.
//
// The CI workflow passes the value from actions/configure-pages.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL?.replace(/\/$/, '') ?? '';

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
