# aictl — Build, Install, Test
#
# The single command developers should remember:
#   make install      — rebuilds everything and reinstalls
#
# Single canonical environment: aictl lives in the pipx venv at
#   ~/.local/pipx/venvs/aictl/
# which hosts BOTH the editable runtime (aictl + deps) and the dev tools
# (pytest, ruff, mypy, type stubs). No project-local .venv is needed.
#
# Why: aictl has TWO build layers (Python + JS). pipx with `-e` makes the
# Python side editable so source edits are live; the UI still needs an
# explicit `npm run build` step. `make install` handles both.
#
# Windows: use 'aictl reinstall' or 'pip install -e .[all,dev]' instead.

ifeq ($(OS),Windows_NT)
$(error This Makefile requires Unix/macOS. On Windows use: aictl reinstall)
endif

SHELL   := /bin/bash
PROJECT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
UI_DIR  := $(PROJECT)src/aictl/dashboard/ui
DIST_DIR:= $(PROJECT)src/aictl/dashboard/dist

# Detect install method
HAS_PIPX     := $(shell command -v pipx 2>/dev/null)
PIPX_VENV    := $(shell pipx environment --value PIPX_LOCAL_VENVS 2>/dev/null)/aictl
PIPX_PYTHON  := $(if $(wildcard $(PIPX_VENV)/bin/python),$(PIPX_VENV)/bin/python,)

# Python resolution order:
#   1. $PYTHON (explicit override, e.g. for CI)
#   2. pipx aictl venv (the single canonical environment)
#   3. system python3 (only if pipx not yet installed)
# Intentionally NOT considered: in-project .venv/  — it caused two parallel
# environments (pipx for `aictl`, .venv for `make test`) that drifted.
PYTHON  ?= $(if $(PIPX_PYTHON),$(PIPX_PYTHON),python3)

.PHONY: install install-py install-ui test test-ui test-e2e test-tools test-docker test-all lint typecheck screenshots clean help

# ── Primary target: full rebuild + reinstall ─────────────────────────────────

install: install-ui install-py  ## Full rebuild: UI + Python package
	@echo ""
	@echo "✅ aictl installed. Run 'aictl --version' to verify."

# ── Python package ───────────────────────────────────────────────────────────

install-py:  ## Reinstall Python package (pipx or pip) + dev tools
ifdef HAS_PIPX
	@echo "→ Installing via pipx (--force --editable)..."
	cd /tmp && pipx install --force -e "$(PROJECT)[all]"
	@echo "→ Injecting dev tools (pytest-timeout, ruff, mypy, type stubs)..."
	cd /tmp && pipx inject aictl pytest-timeout ruff mypy types-PyYAML types-psutil
else
	@echo "→ Installing via pip (editable)..."
	pip install -e "$(PROJECT)[all,dev]"
endif

# ── Dashboard UI ─────────────────────────────────────────────────────────────

install-ui: $(DIST_DIR)/index.html  ## Build dashboard UI (skip if up-to-date)

$(DIST_DIR)/index.html: $(shell find $(UI_DIR)/src -type f 2>/dev/null) $(UI_DIR)/package.json
	@if [ ! -d "$(UI_DIR)" ]; then echo "⏭ UI source not found, skipping"; exit 0; fi
	@echo "→ npm install..."
	cd "$(UI_DIR)" && npm install --no-audit --no-fund --loglevel=error
	@echo "→ npm run build..."
	cd "$(UI_DIR)" && npm run build
	@echo "✅ UI built → $(DIST_DIR)"

# ── Test & Lint ──────────────────────────────────────────────────────────────

test: test-ui  ## Run unit tests (fast, no server needed; includes UI vitest)
	$(PYTHON) -m pytest test/ -q --tb=short --ignore=test/e2e --ignore=test/e2e_tools

test-ui:  ## Run dashboard UI tests (Vitest + jsdom)
	cd src/aictl/dashboard/ui && npx vitest run

test-e2e:  ## Run E2E tests (starts aictl server, posts synthetic data)
	$(PYTHON) -m pytest test/e2e/ -v --timeout=120

test-tools:  ## Run real-tool E2E tests (skips missing tools)
	$(PYTHON) -m pytest test/e2e_tools/ -v --timeout=180

test-docker:  ## Run Docker integration suite (fresh install + simulated E2E)
	docker compose -f docker/docker-compose.test.yml run --build --rm test-integration

test-all: test-ui  ## Run everything (UI + unit + E2E + tools)
	$(PYTHON) -m pytest test/ -v --timeout=180 --override-ini="addopts="

lint:  ## Run ruff linter + format check
	$(PYTHON) -m ruff check .
	$(PYTHON) -m ruff format --check .

typecheck:  ## Run mypy on strictly-typed modules (src/aictl/data + dashboard/models)
	$(PYTHON) -m mypy src/aictl/data src/aictl/dashboard/models.py

# ── Docs / Screenshots ───────────────────────────────────────────────────────

# Regenerate the README dashboard screenshots with Playwright. Drives a live
# daemon (start one separately: `aictl daemon serve --no-open --port 8599`) and
# writes PNGs to docs/screenshots/. Override BASE_URL / FEATURE_* as needed:
#   make screenshots BASE_URL=http://127.0.0.1:8599 FEATURE_SESSION=b36f145e
screenshots:  ## Regenerate README dashboard screenshots (needs a running daemon)
	cd scripts/screenshots && npm install --no-audit --no-fund --loglevel=error
	cd scripts/screenshots && npx playwright install chromium
	cd scripts/screenshots && \
		BASE_URL=$(or $(BASE_URL),http://127.0.0.1:8599) \
		THEME=$(or $(THEME),light) RANGE=$(or $(RANGE),7d) \
		FEATURE_TOOL=$(or $(FEATURE_TOOL),copilot-vscode) \
		FEATURE_SESSION=$(FEATURE_SESSION) \
		node capture.mjs

# ── Cleanup ──────────────────────────────────────────────────────────────────

clean:  ## Remove build artifacts (incl. legacy in-project .venv)
	rm -rf build/ *.egg-info aictl.egg-info
	rm -rf $(DIST_DIR)
	rm -rf $(UI_DIR)/node_modules
	rm -rf .venv

# ── Help ─────────────────────────────────────────────────────────────────────

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
