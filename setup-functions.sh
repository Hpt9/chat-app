#!/bin/bash

# Create functions directory if it doesn't exist
mkdir -p functions/src

# Initialize Firebase Functions if not already initialized
if [ ! -f "firebase.json" ]; then
    echo "Initializing Firebase project..."
    firebase init functions
fi

# Install dependencies
cd functions
npm install

# Build the functions
npm run build

# Deploy the functions
npm run deploy

echo "Firebase Functions deployed successfully!"
echo "Wait a few minutes for the indexes to be created..."
echo "You can check the status of your indexes at:"
echo "https://console.firebase.google.com/project/chat-app-4041d/firestore/indexes" 