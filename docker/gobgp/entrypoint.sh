#!/bin/sh
set -e

envsubst < /etc/gobgp/gobgp.conf.tmpl > /tmp/gobgp.conf

exec gobgpd -f /tmp/gobgp.conf \
  --api-hosts 0.0.0.0:50051 \
  --log-plain \
  --log-level info
