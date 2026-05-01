#!/bin/bash

set -e

echo "=== Building SEA binary ==="

# Step 1: Build the bundled JS
echo "Step 1: Bundling source code..."
rm -rf executable/*
mkdir -p executable
npx esbuild src/bin.ts --bundle --platform=node --minify --target=node22 --outdir=executable
ls -lh executable/

# Step 2: Create the SEA blob
echo ""
echo "Step 2: Creating SEA blob..."
node --experimental-sea-config sea-config.json

# Step 3: Copy the node binary
echo ""
echo "Step 3: Copying Node.js binary..."
cp "$(which node)" executable/instant_http

# Step 3.5: Strip debug symbols to reduce size
echo ""
echo "Step 3.5: Stripping debug symbols..."
if command -v strip &> /dev/null; then
  strip executable/instant_http
  echo "Stripped!"
else
  echo "strip command not found, skipping"
fi

# Step 4: Inject the blob using postject
echo ""
echo "Step 4: Injecting SEA blob..."
npx postject executable/instant_http NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite

# Step 5: Cleanup
echo ""
echo "Step 5: Cleaning up..."
rm -f sea-prep.blob

# Make sure it's executable
chmod +x executable/instant_http

echo ""
echo "✅ Success! Built executable at executable/instant_http"
ls -lh executable/
