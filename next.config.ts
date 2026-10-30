import type { NextConfig } from 'next';

const config: NextConfig = {
  // pg is a Node-only driver; keep it out of the server bundle.
  serverExternalPackages: ['pg'],
  // The dev server is reached over the LAN and the tailnet; list those origins so Next
  // serves dev assets and HMR to them. Set ALLOWED_DEV_ORIGINS="host1,host2" to add more.
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? '192.168.30.123,100.66.31.100').split(',').filter(Boolean),
  turbopack: { root: import.meta.dirname },
};

export default config;
