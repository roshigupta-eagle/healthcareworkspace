import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  server: { port: 3101 },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'communication_mfe',
      filename: 'remoteEntry.js',
      exposes: {
        './CommunicationHub': './src/exposes/CommunicationHub.tsx',
        './CommunicationComposer': './src/exposes/CommunicationComposer.tsx',
        './host-contract': './src/contracts/hostContract.ts',
      },
      shared: {
        react: { singleton: true, requiredVersion: '19.2.4' },
        'react-dom': { singleton: true, requiredVersion: '19.2.4' },
      },
      manifest: { fileName: 'mf-manifest.json' },
    }),
  ],
});
