# Roshi Communication MFE

A React/TypeScript Module Federation remote for the shared Roshi Communication Hub.

## Exposes

- `./CommunicationHub` - inbox and conversation list.
- `./CommunicationComposer` - contextual secure-message composer.
- `./host-contract` - typed host integration contract.

The remote calls only the host-provided Communication BFF. It does not hold service credentials, call FHIR directly, or make delivery/consent decisions. Run the standalone app with synthetic data and an available local BFF.

## Commands

```powershell
npm install
npm run dev
npm run build
npm run lint
npm test
```

The host must pin an immutable `mf-manifest.json` release and provide a fallback when the remote is unavailable.
