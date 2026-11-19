#!/bin/bash
# Opens the Text (Write) tool. Runs a tiny local web server so the browser allows it to work fully.
# Close this window to stop it.
cd "$(dirname "$0")"
PORT=8421
if ! lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Starting Text (Write) on http://localhost:$PORT ..."
  python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
  sleep 1
fi
open "http://localhost:$PORT/index.html?v=$(date +%s)"
echo "Text (Write) is running. Leave this window open while you use it."
wait
