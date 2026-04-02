# aictl — Build, Install, Test
#
# The single command developers should remember:
#   make install      — rebuilds everything and reinstalls
#
# Why: aictl has TWO build layers (Python + JS). pipx copies files on
# install, so source edits aren't picked up until you reinstall. This
# Makefile eliminates the guesswork.
#
# Windows: use 'aictl reinstall' or 'pip install -e .[all]' instead.

ifeq ($(OS),Windows_NT)
$(error This Makefile requires Unix/macOS. On Windows use: aictl reinstall)
endif

SHELL   := /bin/bash
PROJECT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
UI_DIR  := $(PROJECT)aictl/dashboard/ui
DIST_DIR:= $(PROJECT)aictl/dashboard/dist

# Detect install method
HAS_PIPX := $(shell command -v pipx 2>/dev/null)

.PHONY: install install-py install-ui test lint clean help

# ── Primary target: full rebuild + reinstall ─────────────────────────────────

install: install-ui install-py  ## Full rebuild: UI + Python package
	@echo ""
	@echo "✅ aictl installed. Run 'aictl --version' to verify."

# ── Python package ───────────────────────────────────────────────────────────

install-py:  ## Reinstall Python package (pipx or pip)
ifdef HAS_PIPX
	@echo "→ Installing via pipx (--force --editable)..."
	pipx install --force -e "$(PROJECT)[all]"
else
	@echo "→ Installing via pip (editable)..."
	pip install -e "$(PROJECT)[all]"
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

test:  ## Run full test suite
	python3 -m pytest test/ -q --tb=short

lint:  ## Run ruff linter
	python3 -m ruff check aictl/

# ── Cleanup ──────────────────────────────────────────────────────────────────

clean:  ## Remove build artifacts
	rm -rf build/ *.egg-info aictl.egg-info
	rm -rf $(DIST_DIR)
	rm -rf $(UI_DIR)/node_modules

# ── Help ─────────────────────────────────────────────────────────────────────

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
