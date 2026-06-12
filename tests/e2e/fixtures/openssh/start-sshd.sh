#!/bin/sh
set -eu

mkdir -p /home/e2e/.ssh /run/sshd

if [ -z "${AUTHORIZED_KEYS:-}" ]; then
  echo "AUTHORIZED_KEYS is required" >&2
  exit 1
fi

printf '%s\n' "$AUTHORIZED_KEYS" > /home/e2e/.ssh/authorized_keys
chmod 700 /home/e2e/.ssh
chmod 600 /home/e2e/.ssh/authorized_keys
chown -R e2e:e2e /home/e2e/.ssh /srv/terminallyskill-e2e

ssh-keygen -A

exec "$@"
