#!/bin/bash

echo "Start build CLI tools"

if [ -f "tsconfig.json" ]; then
  TARGET_PATH=$(grep '"outDir"' tsconfig.json | awk -F'"' '{print $4}')
else
  TARGET_PATH="./cli"
fi

if [ -d "$TARGET_PATH" ]; then
    rm -rf "$TARGET_PATH"
    echo "Remove CLI directory and subfiles"
fi

npm run build:cli

echo "Build CLI tools complete"
