#!/bin/sh
mkdir -p /data/backups
sqlite3 /data/members.db ".backup /data/backups/members_$(date +%Y%m%d_%H%M%S).db"
