#!/bin/bash
# Upload the portfolio to IONOS from Terminal.
#
#   bash ~/Documents/Claude/Website/tools/deploy.sh          # preview: lists what would upload, changes nothing
#   bash ~/Documents/Claude/Website/tools/deploy.sh --go     # upload for real
#
# Fill in the three settings below once. Find them in IONOS:
#   Hosting > SFTP & SSH > Manage > click your account name.
# The account must be "SFTP + SSH" (rsync needs SSH). The first connection asks
# you to confirm the server's fingerprint (type yes), then for your SFTP password.

IONOS_USER="u00000000"                          # e.g. u12345678 or a-1234567
IONOS_HOST="access000000000.webspace-data.io"   # the Server/Host shown in IONOS
REMOTE_DIR="design"                             # the webspace folder design.emilyblackwell.com points to

# ---------------------------------------------------------------------------
set -e
SITE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SITE"

if [[ "$IONOS_USER" == u00000000 ]]; then
  echo "Open tools/deploy.sh and fill in IONOS_USER, IONOS_HOST and REMOTE_DIR first."; exit 1
fi

# Readable by the web server: files 644, folders 755 (fixes the 403s).
chmod -R u=rwX,go=rX *.html css js

MODE="--dry-run"; [[ "$1" == "--go" ]] && MODE=""
[[ -n "$MODE" ]] && echo "PREVIEW ONLY. Run again with --go to upload."

# Only the live site goes up: top-level pages, css and js.
# Nothing on the server is deleted. archive/, tools/ and other folders stay on your Mac.
rsync -rlptvz $MODE --exclude ".DS_Store" \
  *.html css js \
  "$IONOS_USER@$IONOS_HOST:$REMOTE_DIR/"

[[ -z "$MODE" ]] && echo "Done. Hard-refresh the site (Cmd+Shift+R)."
