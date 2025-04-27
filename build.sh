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

npx tsc

echo "Successfully build CLI tools"
