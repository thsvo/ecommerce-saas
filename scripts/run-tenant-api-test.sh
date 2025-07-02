#!/bin/bash

# Script to install dependencies and run the tenant API test

echo "Installing axios dependency if not already installed..."
npm install axios --save

echo "\nRunning tenant API test..."
node scripts/test-tenant-api.js