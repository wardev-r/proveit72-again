#!/usr/bin/env bash
# 72 Worker deploy — run from repo root:  bash worker/deploy.sh
# Paste each key at its prompt. Keys are NOT stored in this file or history.
set -e

# Change to this script's directory so wrangler picks up worker/wrangler.toml
cd "$(dirname "$0")"

echo "== 72 Worker deploy =="
wrangler login

echo
echo ">> [1/3] Paste STRIPE SECRET KEY  (sk_live_... = real money):"
wrangler secret put STRIPE_SECRET_KEY

echo
echo ">> [2/3] Paste PLATFORM_URL  (https://velvetrope2you.com):"
wrangler secret put PLATFORM_URL

echo
echo ">> [3/3] Paste OWNER_API_KEY  (any long random string — SAVE IT):"
wrangler secret put OWNER_API_KEY

echo
echo "Deploying..."
wrangler deploy

echo
echo "== DONE. Copy the Worker URL printed above. =="
echo "LAST STEP (after creating the Stripe webhook -> <worker-url>/webhook):"
echo "   wrangler secret put STRIPE_WEBHOOK_SECRET   &&   wrangler deploy"
