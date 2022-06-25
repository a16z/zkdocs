# zkDocs UI
## Commands 
- Start dev server: `yarn run start`
- Start tailwind-css watcher: `./build_tailwind.sh`
- Copy snarkjs from node_modules: `./cp_snarkjs.sh`

## Adding a new schema
1. The zkey, circuit wasm file and schema file should be copied to a new directory in `./zkdocs-ui/public/test_schemas/<schema_name>`. (Done automatically by `cp_script.sh`)
2. The schema name should be added to `zkdocs-ui/src/lib/Config.ts` in the Schemas array so that the client knows how to find it.