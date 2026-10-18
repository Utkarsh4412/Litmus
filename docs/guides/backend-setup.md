# Backend setup and troubleshooting

Use Python 3.11. On Windows 11, use WSL2 and Docker Desktop as described in the [platform guide](windows-wsl2.md).

From the project root in WSL:

```sh
python3.11 -m venv .venv
. .venv/bin/activate
python -m pip install -e './backend[dev,openai]'
cd backend
python -m pytest -q
ruff check src tests ../tools
mypy src/litmus
MYPYPATH=src mypy ../tools
python -c "import litmus.main"
```

Follow the [quick start](../../README.md) for configuration and services. Importing the application does not start its services. Authentication, provider credentials, database availability and model caches must be configured for requests.

Run `python tools/download_models.py --cache-dir .hf_cache` from the project root to populate the model cache. Model loading can require network access and substantial disk space. Configure an OpenAI-compatible generator only with an endpoint-supported model. Additional strategy and evaluation features have their own credential requirements.

Use `tools/verify-local.ps1` or `tools/verify-local.sh` for local diagnostics. Skipping checks does not establish that the omitted checks work.
