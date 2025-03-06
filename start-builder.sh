#!/bin/bash

# Navigate to the project directory (adjust if needed)
# cd /path/to/ollama-modelfile-builder

# Start the server in the background
echo "Starting the server on port 3021..."
npm start &

# Give the server a moment to start (2 seconds)
sleep 2

# Open the browser to http://localhost:3021/client/index.html
echo "Opening browser to http://localhost:3021/client/index.html..."
case "$(uname -s)" in
    Darwin)
        # macOS
        open "http://localhost:3021/client/index.html"
        ;;
    Linux)
        # Linux
        xdg-open "http://localhost:3021/client/index.html"
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)
        # Windows (Git Bash or similar)
        start "http://localhost:3021/client/index.html"
        ;;
    *)
        echo "Unsupported OS. Please open http://localhost:3021/client/index.html manually."
        ;;
esac

# Keep the script running to keep the server alive
wait