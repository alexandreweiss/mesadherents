#!/bin/sh
/usr/sbin/cron
exec gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 60 wsgi:app --preload
