#!/bin/bash
# <bitbar.title>Epoch HUD</bitbar.title>
# <bitbar.author>Epoch</bitbar.author>

STATUS=$(curl -s "http://127.0.0.1:53922/status")

if [ -z "$STATUS" ]; then
  echo "❌ Epoch Offline"
else
  echo "$STATUS"
fi
