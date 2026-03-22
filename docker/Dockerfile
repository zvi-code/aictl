# aictl integration test — isolated fresh-install environment
# Python 3.12 + Node.js 22 (for Claude Code)
FROM python:3.12-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git procps && \
    rm -rf /var/lib/apt/lists/*

# Node.js 22 (Claude Code requirement)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# --- aictl install (mirrors README instructions) ---
WORKDIR /app
COPY . /app

# Full install with all extras (pip, not pipx — simpler in container)
RUN pip install --no-cache-dir ".[all]"

# Verify CLI is available
RUN aictl --version && claude --version

# Create a sample project to work with
RUN mkdir -p /project && cp -a /app/test/fixtures/project/. /project/

# Test scripts and entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/run-integration-test.sh /run-integration-test.sh
RUN chmod +x /entrypoint.sh /run-integration-test.sh

EXPOSE 8484

ENTRYPOINT ["/entrypoint.sh"]
