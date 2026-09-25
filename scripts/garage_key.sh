#!/bin/bash

# Generate RPC secret (64 hex chars)
openssl rand -hex 32

# Generate admin token (64 hex chars)
openssl rand -hex 32

# Generate access key (must be: GK + 24 hex chars = 26 total)
echo "GK$(openssl rand -hex 12)"

# Generate secret key (64 hex chars)
openssl rand -hex 32