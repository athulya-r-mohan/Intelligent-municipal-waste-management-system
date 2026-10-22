#!/bin/sh
set -e

echo "=== Starting EcoPulse Backend Container ==="

# Wait for PostgreSQL to be ready if DB_HOST is specified
if [ -n "$DB_HOST" ]; then
  DB_PORT_VAL=${DB_PORT:-5432}
  echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT_VAL..."
  while ! nc -z "$DB_HOST" "$DB_PORT_VAL"; do
    sleep 0.5
  done
  echo "PostgreSQL is reachable and accepting connections."
fi

# Run database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Collect static files for WhiteNoise
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear || true

# If a custom command was provided, execute it
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Otherwise start Gunicorn production WSGI server
echo "Starting Gunicorn server on 0.0.0.0:8000..."
exec gunicorn backend.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --threads "${GUNICORN_THREADS:-2}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --access-logfile - \
    --error-logfile -
