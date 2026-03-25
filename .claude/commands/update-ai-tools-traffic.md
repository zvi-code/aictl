---
description: Search for updates to the AI tools traffic monitoring reference document. Finds new interception methods, new proxy tools, API format changes, and adds them.
argument-hint: [tool or topic to focus on, or 'full' for comprehensive scan]
---

You are updating a living reference document that catalogs methods for monitoring, intercepting, and analyzing HTTP traffic between AI coding tools and LLM provider APIs.

## The document to update

Read the current version:
@ai-tools-traffic-monitoring.md

## Your task

Search the web for:

1. **New interception tools** — new MITM proxies, LLM-specific interceptors, observability platforms
2. **API format changes** — new Anthropic/OpenAI/Google API fields, headers, endpoints
3. **New base URL override methods** — new env vars for redirecting tool traffic
4. **New built-in telemetry** — tools adding native request logging, OTel support
5. **Security changes** — certificate pinning, proxy detection, TOS changes
6. **New tools** not yet in the document

## Focus area

$ARGUMENTS

## Rules

1. Read the current document first
2. Search systematically
3. Only update what has changed
4. Add changelog entry at top
5. Mark deprecated items, don't delete
