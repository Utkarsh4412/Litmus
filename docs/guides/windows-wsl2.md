# Running on Windows 11 with WSL2

This guide covers Windows 11 Home with Docker Desktop (WSL2 backend) and an Ubuntu distro. Nothing here needs Windows-native Python or Node.

## 1. One-time machine setup

1. **Memory cap.** Create or edit `%UserProfile%\.wslconfig`:
   ```ini
   [wsl2]
   memory=5GB
   processors=6
   swap=6GB
   ```
   The default stack (Qdrant, Postgres, backend with two small ML models, frontend) is estimated at 3 to 4.6 GB. Below about 4 GB the backend can be killed while loading the models; above about 6 GB on a 16 GB laptop with little free RAM, Windows starts paging. Apply with `wsl --shutdown`, then reopen Ubuntu.
2. **Disk.** Keep the Ubuntu disk and the Docker Desktop disk image on a drive with space (Docker Desktop: Settings, Resources, Advanced, Disk image location). Images, build cache and the model cache need about 8 GB or more.
3. **Docker Desktop.** Settings, General: "Use the WSL 2 based engine" on. Settings, Resources, WSL Integration: enable your Ubuntu distro.
4. **Line endings.** Inside Ubuntu: `git config --global core.autocrlf input`.

## 2. Keep the repo inside Ubuntu

Work in `~/litmus` (the Linux filesystem), not under `/mnt/c` or `/mnt/d`. File watching and `npm ci` are much faster and more reliable there. Open it in VS Code with the WSL extension (`code .` from `~/litmus`). The folder does not appear as a drive letter in Explorer; browse it as `\\wsl$\Ubuntu\home\<you>\litmus` if you must.

## 3. No API key needed for the first run

In `.env`, set `GENERATOR_PROVIDER=local` and leave the key fields empty. Only the `local` provider starts without a key. Do not start Ollama: the check that follows expects `/ask` to answer with a clean "provider unavailable" refusal, which proves the failure path works. Retrieval, ingest and the retrieval metrics need no LLM.

## 4. Verify

From PowerShell (Windows side, prints one block to paste back):

```powershell
powershell -ExecutionPolicy Bypass -File \\wsl$\Ubuntu\home\<you>\litmus\tools\verify-local.ps1
```

Or from Ubuntu, in `~/litmus`: `bash tools/verify-local.sh`. Useful flags: `--skip-up` (stack already running), `--skip-models`, `--skip-retrieval` (slow on CPU), `--full` (also runs the test suites), `--down` (stop the stack afterwards, volumes are kept).

## 5. Everyday commands

| Task | Ubuntu | PowerShell |
|---|---|---|
| Health probes | `bash infra/check-health.sh` | `infra\check-health.ps1` |
| Recent logs | `bash infra/debug-logs.sh` | `infra\debug-logs.ps1` |
| Restart | `bash infra/restart.sh` | `infra\restart.ps1` |
| Clean rebuild (slow) | `bash infra/restart.sh --no-cache` | `infra\restart.ps1 -NoCache` |

Run the PowerShell scripts with `powershell -ExecutionPolicy Bypass -File <path>`. They work when Docker is reachable from Windows; inside Ubuntu use the `.sh` files.

## 6. Troubleshooting

- **`docker: command not found` or the daemon is unreachable in Ubuntu:** start Docker Desktop and enable WSL Integration for the distro.
- **Backend killed or restarting:** check `docker compose --env-file .env -f infra/docker-compose.yml logs backend`; look for `Killed` or exit code 137, then raise `memory` in `.wslconfig` (or close other apps) and run `wsl --shutdown`.
- **Backend refuses to start and names a missing key:** `GENERATOR_PROVIDER` is `anthropic` or `openai` without its key. Set it to `local` for the first run.
- **First start is slow:** the two Hugging Face models (about 1 GB) download on first use. `python /tools/download_models.py` inside the backend container fetches them in advance.
- **CRLF errors in shell scripts:** the repo forces LF for `*.sh`; re-clone inside Ubuntu rather than copying files from Windows.


### Frontend file watching

Vite uses filesystem notifications by default (`VITE_POLL=0`). If the repo stays on a Windows path such as `D:\litmus` / `/mnt/d/litmus` mounted into a Linux container, set `VITE_POLL=1` in the root `.env`; Compose forwards it to the frontend. Recreate the frontend container after changing the flag. This enables the existing 300 ms watcher polling interval.

For a local PowerShell dev server, run `$env:VITE_POLL='1'; npm run dev` from `frontend/`. For a frontend `.env.local`, set `VITE_POLL=1` there and restart Vite. Keep polling off for a native filesystem such as `~/litmus` to avoid unnecessary CPU use. This flag controls file watching, not API or graph-build polling.

### Frontend fonts and content security policy

The frontend serves Instrument Sans, Newsreader and JetBrains Mono from its own built assets (Fontsource, OFL-1.1), with system fallback stacks and `font-display: swap`. Keep `font-src 'self'` and `style-src 'self'` in a deployment CSP; Google Fonts origins are no longer required. This does not change any other application CSP requirements. The initial theme follows the OS preference until the document has an explicit `data-theme="dark"` or `data-theme="light"`; `data-effects="off"` forces solid glass surfaces. Theme and motion preferences are available in the persistent appearance controls.
