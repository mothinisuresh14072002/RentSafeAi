#!/bin/sh
set -eu

until mc alias set rentsafe http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; do
  sleep 2
done

mc mb --ignore-existing "rentsafe/$MINIO_BUCKET"
mc anonymous set none "rentsafe/$MINIO_BUCKET"
