#!/bin/sh

set -eu

plugin_slug="universal-openai-connector"
plugin_root=$(pwd)
work_dir=$(mktemp -d "${TMPDIR:-/tmp}/${plugin_slug}.XXXXXX")
staging_dir="$work_dir/$plugin_slug"
zip_path="$plugin_root/$plugin_slug.zip"

cleanup() {
	rm -rf "$work_dir"
}

trap cleanup EXIT INT TERM HUP

mkdir -p "$staging_dir"
rm -f "$zip_path"

rsync -a --exclude-from="$plugin_root/.distignore" "$plugin_root/" "$staging_dir/"

cd "$work_dir"
zip -qr "$zip_path" "$plugin_slug"

printf 'Created %s\n' "$zip_path"
