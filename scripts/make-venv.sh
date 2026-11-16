#!/usr/bin/env sh
# Create a virtualenv with pip in it, even on Python builds that ship without
# ensurepip (Debian/Ubuntu without the python3-venv package).
#   usage: scripts/make-venv.sh VENV_DIR
set -eu
venv=$1
python=${PYTHON:-python3}

if [ -x "$venv/bin/python" ] && "$venv/bin/python" -m pip --version >/dev/null 2>&1; then
  exit 0
fi

if "$python" -c "import ensurepip" >/dev/null 2>&1; then
  "$python" -m venv "$venv"
  exit 0
fi

if command -v uv >/dev/null 2>&1; then
  echo "ensurepip is unavailable; creating the virtualenv with uv" >&2
  uv venv --seed --python "$python" "$venv"
  exit 0
fi

cat >&2 <<MSG
This Python ($("$python" --version 2>&1)) has no ensurepip module, so it cannot
create a virtualenv with pip. Either:
  - install your distribution's venv package (Debian/Ubuntu: sudo apt install python3-venv), or
  - install uv (https://docs.astral.sh/uv/) and re-run make setup, or
  - create it by hand:
      $python -m venv --without-pip $venv
      curl -sS https://bootstrap.pypa.io/get-pip.py | $venv/bin/python
MSG
exit 1
