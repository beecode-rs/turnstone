# Architecture

An Expo app layered as business services (connection, tree, search, git, change watching) behind expo-router screen controllers, storage behind DALs, and the ssh2 npm package isolated behind a single `SshTransport` port, implemented only in `src/lib/ssh2-client.ts`.

The full layer mapping lives in [docs/architecture-mapping.md](../../docs/architecture-mapping.md).
