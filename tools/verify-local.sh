#!/usr/bin/env bash
# First-run verification for the laptop (WSL2 Ubuntu, repo on the Linux filesystem).
# Prints ONE block between "=== LITMUS VERIFY" and "=== END ===": paste that block back.
# No LLM key is needed: the default check runs with GENERATOR_PROVIDER=local and
# Ollama NOT running, so /ask must answer with a clean provider-failure refusal.
#
# Usage (from the repo root):
#   bash tools/verify-local.sh [--skip-up] [--skip-models] [--skip-ingest]
#                              [--skip-retrieval] [--full] [--down]
#   --skip-up         do not run "docker compose up -d --build" (stack already up)
#   --skip-models     skip the model pre-download check
#   --skip-ingest     skip ingest (and the /ask check that needs documents)
#   --skip-retrieval  skip measure_retrieval.py (slow on a CPU-only laptop)
#   --full            also run backend pytest in the container and the frontend gates
#   --down            stop the stack at the end (volumes are kept)
# Nothing here deletes data. Secrets are masked in the output.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 2
COMPOSE=(docker compose --env-file .env -f infra/docker-compose.yml)
OUT_FILE="${LITMUS_VERIFY_OUT:-$ROOT/verify-local.out.txt}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

SKIP_UP=0; SKIP_MODELS=0; SKIP_INGEST=0; SKIP_RETR=0; FULL=0; DOWN=0
for a in "$@"; do
  case "$a" in
    --skip-up) SKIP_UP=1 ;;
    --skip-models) SKIP_MODELS=1 ;;
    --skip-ingest) SKIP_INGEST=1 ;;
    --skip-retrieval) SKIP_RETR=1 ;;
    --full) FULL=1 ;;
    --down) DOWN=1 ;;
    -h|--help) sed -n 2,17p "$0"; exit 0 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done

CLI=tools

RES=()     # one line per check: ID|STATUS|detail
DETAIL=()  # free-form evidence lines
strip_q() { tr -d "\"' \r"; }
note() { RES+=("$1|$2|$3"); }
ev()   { DETAIL+=("$*"); }
now()  { date +%s; }

# Mask anything that looks like a secret before it reaches the output.
mask() {
  sed -E \
    -e 's/((API|SECRET|ACCESS|ADMIN|AUTH)?_?(KEY|TOKEN|PASSWORD|SALT)[A-Z_]*=)[^[:space:]]+/\1***masked***/Ig' \
    -e 's/(^|[^A-Za-z0-9])(sk-ant-|sk-|xai-)[A-Za-z0-9_-]{8,}/\1\2***masked***/g' \
    -e 's#(postgres(ql)?(\+[a-z0-9]+)?://[^:/@ ]+:)[^@ ]+@#\1***masked***@#g'
}
tailm() { tail -n "${2:-15}" "$1" | mask; }

# -------------------------------------------------------------------- C01 env
KERNEL="$(uname -sr)"
# shellcheck disable=SC1091
DISTRO="$(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME")"
DOCKER_V="$(docker --version 2>&1 | head -1)"
COMPOSE_V="$(docker compose version 2>&1 | head -1)"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  note C01 PASS "$DISTRO; $KERNEL; $DOCKER_V; $COMPOSE_V"
elif command -v docker >/dev/null 2>&1; then
  note C01 FAIL "docker is installed but the daemon is not reachable (start Docker Desktop and enable WSL integration for this distro)"
else
  note C01 FAIL "docker not found in this distro (Docker Desktop > Settings > Resources > WSL integration)"
fi
DOCKER_OK=0; [ "$(echo "${RES[0]}" | cut -d'|' -f2)" = PASS ] && DOCKER_OK=1

# ------------------------------------------------------------------- C02 disk
ROOT_FREE_GB="$(df -Pk "$ROOT" | awk 'NR==2{printf "%.1f",$4/1048576}')"
ROOT_FS="$(df -PT "$ROOT" | awk 'NR==2{print $2}')"
if awk "BEGIN{exit !($ROOT_FREE_GB>=15)}"; then
  note C02 PASS "free where the repo lives: ${ROOT_FREE_GB} GB (fs: $ROOT_FS)"
elif awk "BEGIN{exit !($ROOT_FREE_GB>=8)}"; then
  note C02 WARN "only ${ROOT_FREE_GB} GB free where the repo lives; images plus models need about 8 GB (ESTIMATE)"
else
  note C02 FAIL "only ${ROOT_FREE_GB} GB free; the build will likely fail"
fi

# -------------------------------------------------------------------- C03 ram
MEM_TOTAL_MB="$(awk '/MemTotal/{printf "%d",$2/1024}' /proc/meminfo)"
MEM_AVAIL_MB="$(awk '/MemAvailable/{printf "%d",$2/1024}' /proc/meminfo)"
SWAP_MB="$(awk '/SwapTotal/{printf "%d",$2/1024}' /proc/meminfo)"
if [ "$MEM_TOTAL_MB" -ge 4096 ]; then
  note C03 PASS "WSL sees ${MEM_TOTAL_MB} MB total, ${MEM_AVAIL_MB} MB available, swap ${SWAP_MB} MB"
else
  note C03 WARN "WSL sees only ${MEM_TOTAL_MB} MB (the default stack is estimated at 3.0 to 4.6 GB; raise memory= in .wslconfig, then wsl --shutdown)"
fi

# --------------------------------------------------------- C04 repo location
case "$ROOT" in
  /mnt/*) note C04 WARN "repo is on the Windows drive ($ROOT): npm and file watching will be slow; move it to ~/litmus" ;;
  *) note C04 PASS "repo at $ROOT (Linux filesystem, $ROOT_FS)" ;;
esac
if grep -rIl $'\r' --include='*.sh' "$ROOT/infra" "$ROOT/tools" 2>/dev/null | grep -q .; then
  note C04b FAIL "CRLF line endings found in a .sh file (re-clone, or run: git add --renormalize .)"
fi

# ------------------------------------------------------------- C05 env file
PROVIDER="(no .env)"; KEYS_NOTE=""
if [ ! -f .env ]; then
  note C05 FAIL ".env missing. Create it: cp .env.example .env, then set GENERATOR_PROVIDER=local"
else
  if command -v python3 >/dev/null 2>&1; then
    PARSE="$(python3 - <<'PY' 2>&1
import re
bad=[]
for n,l in enumerate(open(".env",encoding="utf-8"),1):
    t=l.rstrip("\n")
    if t.strip() and not t.lstrip().startswith("#") and not re.match(r"^\s*[A-Za-z_][A-Za-z0-9_]*\s*=",t):
        bad.append(n)
print("BAD:"+",".join(map(str,bad)) if bad else "OK")
PY
)"
  else PARSE="OK"; fi
  PROVIDER="$(grep -E '^GENERATOR_PROVIDER=' .env | tail -1 | cut -d= -f2- | strip_q)"
  PROVIDER="${PROVIDER:-anthropic}"
  has() { [ -n "$(grep -E "^$1=" .env | tail -1 | cut -d= -f2- | strip_q)" ]; }
  has ANTHROPIC_API_KEY && A="set" || A="empty"
  has OPENAI_API_KEY && O="set" || O="empty"
  KEYS_NOTE="anthropic key: $A, openai key: $O"
  if [ "$PARSE" != OK ]; then
    note C05 FAIL ".env has lines that are not NAME=value: ${PARSE#BAD:}"
  elif [ "$PROVIDER" = local ]; then
    note C05 PASS "GENERATOR_PROVIDER=local ($KEYS_NOTE): starts keyless; /ask will refuse cleanly because Ollama is not running"
  elif { [ "$PROVIDER" = anthropic ] && [ "$A" = empty ]; } || { [ "$PROVIDER" = openai ] && [ "$O" = empty ]; }; then
    note C05 FAIL "GENERATOR_PROVIDER=$PROVIDER without its key: the backend refuses to start (config.py validate_startup). Set GENERATOR_PROVIDER=local for this check"
  else
    note C05 WARN "GENERATOR_PROVIDER=$PROVIDER ($KEYS_NOTE): the /ask check below expects 'local'; a real answer is a different test"
  fi
fi

# --------------------------------------------------------- C06 compose config
if [ "$DOCKER_OK" = 1 ] && [ -f .env ]; then
  if "${COMPOSE[@]}" config -q >"$WORK/cfg.txt" 2>&1; then
    note C06 PASS "docker compose config is valid (default profile)"
  else
    note C06 FAIL "docker compose config failed: $(tailm "$WORK/cfg.txt" 4 | tr '\n' ' ')"
  fi
else
  note C06 SKIP "docker or .env not ready"
fi

# ----------------------------------------------------------- C07 up --build
UP_OK=0
if [ "$DOCKER_OK" = 1 ] && [ -f .env ]; then
  if [ "$SKIP_UP" = 1 ]; then
    note C07 SKIP "--skip-up"; UP_OK=1
  else
    T0=$(now)
    if "${COMPOSE[@]}" up -d --build >"$WORK/up.txt" 2>&1; then
      note C07 PASS "up -d --build finished in $(( $(now) - T0 )) s"; UP_OK=1
    else
      note C07 FAIL "up -d --build failed after $(( $(now) - T0 )) s"
      ev "--- last lines of compose up ---"; while IFS= read -r l; do ev "$l"; done < <(tailm "$WORK/up.txt" 25)
    fi
  fi
else
  note C07 SKIP "docker or .env not ready"
fi

# ---------------------------------------------------------------- C08 health
http() { curl -sS -m "${3:-10}" -o "$2" -w '%{http_code}' "$1" 2>"$WORK/curl.err" || echo 000; }
wait_for() { # url seconds
  local end=$(( $(now) + $2 ))
  while [ "$(now)" -lt "$end" ]; do
    [ "$(http "$1" "$WORK/h.json" 4)" = 200 ] && return 0; sleep 3
  done; return 1
}
BACKEND_OK=0
if [ "$UP_OK" = 1 ]; then
  HL=""
  wait_for http://127.0.0.1:8011/health 240 && { HL="$HL backend=ok"; BACKEND_OK=1; } || HL="$HL backend=DOWN"
  [ "$(http http://127.0.0.1:6333/healthz "$WORK/q.txt" 5)" = 200 ] && HL="$HL qdrant=ok" || HL="$HL qdrant=DOWN"
  "${COMPOSE[@]}" exec -T postgres pg_isready -U litmus -d litmus >/dev/null 2>&1 && HL="$HL postgres=ok" || HL="$HL postgres=DOWN"
  [ "$(http http://127.0.0.1:5173 "$WORK/f.html" 5)" = 200 ] && HL="$HL frontend=ok" || HL="$HL frontend=DOWN"
  case "$HL" in *DOWN*) note C08 FAIL "$HL" ;; *) note C08 PASS "$HL" ;; esac
  if [ "$BACKEND_OK" = 1 ]; then ev "GET /health: $(head -c 600 "$WORK/h.json" | mask)"; fi
  if [ "$BACKEND_OK" = 0 ]; then
    ev "--- backend log tail ---"
    while IFS= read -r l; do ev "$l"; done < <("${COMPOSE[@]}" logs --tail=40 backend 2>&1 | mask)
  fi
else
  note C08 SKIP "stack not up"
fi

# ----------------------------------------------------------------- C09 models
if [ "$BACKEND_OK" = 1 ] && [ "$SKIP_MODELS" = 0 ]; then
  T0=$(now)
  if "${COMPOSE[@]}" exec -T backend python "/$CLI/download_models.py" >"$WORK/models.txt" 2>&1; then
    CACHE="$(du -sh .hf_cache 2>/dev/null | cut -f1)"
    note C09 PASS "models present in $(( $(now) - T0 )) s; .hf_cache = ${CACHE:-?}"
  else
    note C09 FAIL "download_models failed: $(tailm "$WORK/models.txt" 5 | tr '\n' ' ')"
  fi
else
  note C09 SKIP "backend not healthy or --skip-models"
fi

# ------------------------------------------------------------------ C10 ingest
INGESTED=0
if [ "$BACKEND_OK" = 1 ] && [ "$SKIP_INGEST" = 0 ]; then
  T0=$(now)
  if "${COMPOSE[@]}" exec -T backend python "/$CLI/ingest.py" >"$WORK/ingest.txt" 2>&1; then
    INGESTED=1
    note C10 PASS "ingest finished in $(( $(now) - T0 )) s: $(tailm "$WORK/ingest.txt" 2 | tr '\n' ' ')"
  else
    note C10 FAIL "ingest failed after $(( $(now) - T0 )) s: $(tailm "$WORK/ingest.txt" 6 | tr '\n' ' ')"
  fi
else
  note C10 SKIP "backend not healthy or --skip-ingest"
fi

# ------------------------------------------------------ C11 retrieval metrics
if [ "$INGESTED" = 1 ] && [ "$SKIP_RETR" = 0 ]; then
  T0=$(now)
  if "${COMPOSE[@]}" exec -T backend python "/$CLI/measure_retrieval.py" --concurrency 2 >"$WORK/retr.txt" 2>&1; then
    note C11 PASS "measure_retrieval finished in $(( $(now) - T0 )) s"
    ev "--- measure_retrieval (tail) ---"; while IFS= read -r l; do ev "$l"; done < <(tailm "$WORK/retr.txt" 12)
  else
    note C11 FAIL "measure_retrieval failed after $(( $(now) - T0 )) s: $(tailm "$WORK/retr.txt" 5 | tr '\n' ' ')"
  fi
else
  note C11 SKIP "no ingest or --skip-retrieval"
fi

# --------------------------------------------- C12 /ask clean provider failure
Q='{"question":"What is BM25 and how does it differ from dense retrieval?"}'
if [ "$INGESTED" = 1 ]; then
  CODE="$(curl -sS -m 120 -o "$WORK/ask.json" -w '%{http_code}' -H 'Content-Type: application/json' -d "$Q" http://127.0.0.1:8011/ask 2>"$WORK/curl.err" || echo 000)"
  VERDICT="$(python3 - "$WORK/ask.json" <<'PY' 2>&1
import json,sys
try: d=json.load(open(sys.argv[1]))
except Exception as e: print("NOJSON "+type(e).__name__); raise SystemExit
a=d.get("answer","") or ""
print("refusal=%s provider=%s status=%s answer=%r" % (d.get("refusal"), d.get("provider"), d.get("status"), a[:140]))
ok = d.get("refusal") is True and d.get("provider") == "local" and "provider is unavailable" in a
print("MATCH" if ok else "NOMATCH")
PY
)"
  LOGHIT="$("${COMPOSE[@]}" logs --tail=200 backend 2>&1 | grep -c 'Provider error' || true)"
  ev "POST /ask -> HTTP $CODE; $(echo "$VERDICT" | head -1)"
  ev "backend log lines containing 'Provider error': $LOGHIT"
  if [ "$CODE" = 200 ] && echo "$VERDICT" | grep -q '^MATCH'; then
    note C12 PASS "HTTP 200, refusal=true, provider=local, localized provider_unavailable text, $LOGHIT 'Provider error' log line(s)"
  elif [ "$CODE" -ge 500 ] 2>/dev/null; then
    note C12 FAIL "HTTP $CODE (a provider failure must be a clean refusal, not a server error)"
  else
    note C12 WARN "HTTP $CODE; does not match the expected refusal shape (see detail)"
  fi
else
  note C12 SKIP "needs ingested documents (otherwise /ask returns the no_documents refusal first)"
fi

# --------------------------------------- C13 strategies degrade without a key
if [ "$INGESTED" = 1 ]; then
  CODE="$(curl -sS -m 180 -o "$WORK/cmp.json" -w '%{http_code}' -H 'Content-Type: application/json' \
    -d '{"question":"What is BM25?","strategies":["classic","graph","agentic"]}' http://127.0.0.1:8011/compare/strategies 2>/dev/null || echo 000)"
  ev "POST /compare/strategies -> HTTP $CODE; body: $(head -c 400 "$WORK/cmp.json" | mask | tr '\n' ' ')"
  if grep -q Traceback "$WORK/cmp.json" 2>/dev/null; then note C13 FAIL "stack trace leaked in the response body"
  elif [ "$CODE" -lt 500 ] 2>/dev/null; then note C13 PASS "HTTP $CODE, no stack trace in the body"
  else note C13 FAIL "HTTP $CODE"; fi
else
  note C13 SKIP "needs ingested documents"
fi

# --------------------------------------------------------- C14 RAM and disk
STATS=""
if [ "$UP_OK" = 1 ]; then
  STATS="$(docker stats --no-stream --format '{{.Name}} {{.MemUsage}} cpu={{.CPUPerc}}' 2>&1 | grep -i litmus || true)"
  [ -z "$STATS" ] && STATS="$(docker stats --no-stream --format '{{.Name}} {{.MemUsage}} cpu={{.CPUPerc}}' 2>&1 | grep -i litmus || true)"
  note C14 PASS "see RAM per container below"
else
  note C14 SKIP "stack not up"
fi
DF="$(docker system df 2>&1 | head -6)"
DISK_AFTER="$(df -Pk "$ROOT" | awk 'NR==2{printf "%.1f",$4/1048576}')"

# --------------------------------------------------------- C15/C16 --full
if [ "$FULL" = 1 ] && [ "$BACKEND_OK" = 1 ]; then
  if "${COMPOSE[@]}" exec -T backend python -m pytest -q -x -p no:cacheprovider >"$WORK/pt.txt" 2>&1; then
    note C15 PASS "backend pytest: $(tail -n 1 "$WORK/pt.txt")"
  else
    note C15 FAIL "backend pytest: $(tail -n 3 "$WORK/pt.txt" | tr '\n' ' ')"
  fi
  if [ -d frontend ] && command -v npm >/dev/null 2>&1; then
    if (cd frontend && npm ci --no-audit --no-fund >"$WORK/npm.txt" 2>&1 && npm run -s typecheck >>"$WORK/npm.txt" 2>&1 \
        && npm run -s lint >>"$WORK/npm.txt" 2>&1 && npm test -s -- --run >>"$WORK/npm.txt" 2>&1); then
      note C16 PASS "frontend npm ci, typecheck, lint, test"
    else note C16 FAIL "frontend gate failed: $(tailm "$WORK/npm.txt" 6 | tr '\n' ' ')"; fi
  else note C16 SKIP "npm not installed in this distro (frontend gates run in CI or after installing Node)"; fi
fi

[ "$DOWN" = 1 ] && [ "$DOCKER_OK" = 1 ] && "${COMPOSE[@]}" down >/dev/null 2>&1

# -------------------------------------------------------------------- output
P=0; W=0; F=0; K=0
for r in "${RES[@]}"; do
  case "$(echo "$r" | cut -d'|' -f2)" in PASS) P=$((P+1));; WARN) W=$((W+1));; FAIL) F=$((F+1));; *) K=$((K+1));; esac
done
{
  echo "=== LITMUS VERIFY (bash) $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo "repo: $ROOT   cli-dir: $CLI   generator: $PROVIDER   $KEYS_NOTE"
  echo "git: $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo none) $(git -C "$ROOT" status --porcelain 2>/dev/null | wc -l) changed file(s)"
  for r in "${RES[@]}"; do IFS='|' read -r id st d <<<"$r"; printf '%-5s %-5s %s\n' "$id" "$st" "$d"; done
  echo "--- RAM per container ---"; echo "${STATS:-n/a}"
  echo "--- WSL memory: total ${MEM_TOTAL_MB} MB, available at start ${MEM_AVAIL_MB} MB; free now: $(awk '/MemAvailable/{printf "%d",$2/1024}' /proc/meminfo) MB ---"
  echo "--- disk: free on repo fs ${ROOT_FREE_GB} GB before, ${DISK_AFTER} GB after ---"
  echo "$DF"
  echo "--- evidence ---"
  for l in "${DETAIL[@]}"; do echo "$l"; done
  echo "SUMMARY: PASS=$P WARN=$W FAIL=$F SKIP=$K"
  echo "=== END ==="
} | mask | tee "$OUT_FILE"
echo "(also saved to $OUT_FILE)"
[ "$F" -eq 0 ]
