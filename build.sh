#!/bin/bash

echo "Start build CLI tools"

if [ -f "tsconfig.json" ]; then
  TARGET_PATH=$(grep '"outDir"' tsconfig.json | awk -F'"' '{print $4}')
else
  TARGET_PATH="./cli"
fi

if [ -d "$TARGET_PATH" ]; then
  echo "Cleaned legacy CLI tool versions"
  rm -rf "$TARGET_PATH"
fi

npx tsc && tsc-alias

echo "Append shebang to cli scripts"

echo '#!/usr/bin/env node' | cat - cli/adapter/build.js > temp && mv temp cli/adapter/build.js
echo '#!/usr/bin/env node' | cat - cli/builder/build.js > temp && mv temp cli/builder/build.js

echo "Copy config files to $TARGET_PATH"
cp -r ./builder/config "$TARGET_PATH"/builder

echo "Successfully build CLI tools"
