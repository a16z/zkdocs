newDirPath="./zkdocs-ui/public/test_schemas/";
newDirPath+="$1";
wasmPath="./zkdocs-backend/circuit_cache/circuit_js/circuit.wasm"
zkeyPath="./zkdocs-backend/circuit_cache/circuit_final.zkey"
echo "Creating directory at $newDirPath";
mkdir $newDirPath;
echo "Copying $wasmPath -> $newDirPath";
cp $wasmPath $newDirPath;
echo "Copying $zkeyPath -> $newDirPath";
cp $zkeyPath $newDirPath;
echo "Copying schema $2 -> $newDirPath";
cp $2 $newDirPath;


