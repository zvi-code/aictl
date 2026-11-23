"""Masking of process command lines: argv items keep their count and position.

Three signals mask a value: it equals (or contains) a value the linked MCP
definition masks, it follows a secret-named flag or variable, or it has a known
token shape. Session ids, paths, model names and hashes stay as they are.
"""

from __future__ import annotations

import copy
import dataclasses
import json
import pickle

import pytest

from aictl.secret_mask import (
    PLACEHOLDER,
    MaskedArgs,
    MaskedText,
    mask_command_args,
    mask_command_line,
    masked_values,
    raw_args,
    raw_text,
)

UUID = "0f3c2a1e-9b7d-4c55-8e21-4a6b9d0c7f12"
HASH = "3f786850e387550fdab836ed7e6dc881de23001b"


@pytest.mark.parametrize(
    ("argv", "expected"),
    [
        (["tool", "--api-key", "K123456789"], ["tool", "--api-key", PLACEHOLDER]),
        (["tool", "--token=T123456789"], ["tool", f"--token={PLACEHOLDER}"]),
        (["tool", "--password", "P123456789"], ["tool", "--password", PLACEHOLDER]),
        (["tool", "--client-secret", "S123456789"], ["tool", "--client-secret", PLACEHOLDER]),
        (["docker", "run", "-e", "API_TOKEN=V123456789", "img"], ["docker", "run", "-e", f"API_TOKEN={PLACEHOLDER}", "img"]),
        (["docker", "run", "--env", "ANY_NAME=V123456789"], ["docker", "run", "--env", f"ANY_NAME={PLACEHOLDER}"]),
        (["docker", "run", "--env=ANY_NAME=V123456789"], ["docker", "run", f"--env=ANY_NAME={PLACEHOLDER}"]),
        (["docker", "run", "-e", "GITHUB_TOKEN"], ["docker", "run", "-e", "GITHUB_TOKEN"]),
        (["curl", "-H", "Authorization: Bearer B123456789"], ["curl", "-H", f"Authorization: Bearer {PLACEHOLDER}"]),
        (["tool", "--header", "X-Api-Key: H123456789"], ["tool", "--header", f"X-Api-Key: {PLACEHOLDER}"]),
        (["tool", "https://u:pw123456@h.example.test/p"], ["tool", f"https://{PLACEHOLDER}@h.example.test/p"]),
        (["tool", "https://h.example.test/p?api_key=Q123456789&page=2"],
         ["tool", f"https://h.example.test/p?api_key={PLACEHOLDER}&page=2"]),
        (["tool", "OPENAI_API_KEY=E123456789"], ["tool", f"OPENAI_API_KEY={PLACEHOLDER}"]),
    ],
)
def test_a_value_after_a_secret_name_is_masked_and_the_name_stays(argv, expected):
    assert mask_command_args(argv) == expected


@pytest.mark.parametrize(
    "token",
    [
        "ghp_abcdefgh12345678",
        "gho_abcdefgh12345678",
        "sk-abcdefgh12345678",
        "xoxb-1234567890-abcdef",
        "AKIAABCDEFGH12345678",
        "AIzaSyA1234567890abcdefghijklmnop",
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.c2lnbmF0dXJl",
    ],
)
def test_a_known_token_shape_is_masked_anywhere(token):
    shown = mask_command_args(["tool", "positional", token, f"--x={token}"])
    assert token not in json.dumps(shown)
    assert len(shown) == 4 and shown[:2] == ["tool", "positional"]


def test_a_private_key_header_is_masked():
    assert "BEGIN" not in mask_command_args(["tool", "-----BEGIN RSA PRIVATE KEY-----"])[1]


def test_a_value_the_definition_masks_is_masked_where_it_appears():
    known = {"S3cretValue99"}
    argv = ["node", "server.js", "S3cretValue99", "--conn=db://S3cretValue99/x", "--port", "3000"]
    assert mask_command_args(argv, known) == [
        "node", "server.js", PLACEHOLDER, f"--conn=db://{PLACEHOLDER}/x", "--port", "3000"]
    # Without the definition the positional value has no name and no shape: it stays.
    assert mask_command_args(argv)[2] == "S3cretValue99"


def test_a_short_definition_value_is_masked_only_as_a_whole_argument():
    assert mask_command_args(["tool", "1", "v1.2"], {"1"}) == ["tool", PLACEHOLDER, "v1.2"]


@pytest.mark.parametrize(
    "argv",
    [
        ["claude", "--resume", UUID, "--model", "claude-opus-5-5", "--add-dir", "/Users/x/proj"],
        ["claude", f"--session-id={UUID}", "--permission-mode", "plan", "--max-tokens", "4000"],
        ["codex", "resume", UUID, "-m", "gpt-6", "--sandbox", "workspace-write"],
        ["git", "checkout", HASH],
        ["node", "/opt/app/dist/index.js", "--port", "8599", "--no-auth", "--verbose"],
        ["copilot", "--model", "gpt-6.1-sol", "--reasoning-effort", "high", "https://example.test/docs?page=2"],
        ["python3", "-m", "pytest", "test/test_x.py", "-k", "token_shape"],
    ],
)
def test_non_secret_arguments_stay_intact(argv):
    assert mask_command_args(argv) == argv
    assert mask_command_line(" ".join(argv)) == " ".join(argv)


def test_argv_count_and_positions_never_change():
    argv = ["a", "--api-key", "K123456789", "--token", "-x", "b", "--password=", "c"]
    shown = mask_command_args(argv)
    assert len(shown) == len(argv)
    # A flag followed by another flag has no value to mask; an empty value stays empty.
    assert shown == ["a", "--api-key", PLACEHOLDER, "--token", "-x", "b", "--password=", "c"]


def test_a_joined_command_line_is_masked_across_items():
    line = "curl -H Authorization: Bearer B123456789 --api-key K123456789 https://h.example.test/x"
    shown = mask_command_line(line)
    assert "B123456789" not in shown and "K123456789" not in shown
    assert shown.split(" ")[0:3] == ["curl", "-H", "Authorization:"]
    assert shown.count(" ") == line.count(" ")


def test_masked_values_lists_what_the_definition_replaced():
    raw = {
        "args": ["--api-key", "K1", "--token=T22222", "https://u:pw@h.example.test/s?key=Q3"],
        "env": {"A": "envvalue", "REF": "${env:A}", "EMPTY": ""},
        "headers": {"Authorization": "Bearer B4"},
    }
    from aictl.secret_mask import mask_mcp_config

    assert masked_values(raw, mask_mcp_config(raw)) >= {"K1", "T22222", "u:pw", "Q3", "envvalue", "B4"}
    assert not masked_values(raw, mask_mcp_config(raw)) & {"${env:A}", "", "--api-key", "Bearer"}


def test_masked_forms_keep_raw_in_memory_but_never_serialize_it():
    text = MaskedText("tool --api-key K123456789 S3cretValue99", known={"S3cretValue99"})
    args = MaskedArgs(("tool", "--api-key", "K123456789", "S3cretValue99"), known={"S3cretValue99"})
    assert raw_text(text) == "tool --api-key K123456789 S3cretValue99"
    assert raw_args(args) == ("tool", "--api-key", "K123456789", "S3cretValue99")
    assert raw_text("plain") == "plain" and raw_args(("a",)) == ("a",)
    for value in (text, args):
        blobs = [
            pickle.dumps(value).decode("latin-1"),
            repr(copy.copy(value)),
            repr(copy.deepcopy(value)),
            json.dumps(value),
            repr(value),
            str(value),
        ]
        for blob in blobs:
            assert "K123456789" not in blob and "S3cretValue99" not in blob
        assert type(copy.copy(value)) in (str, tuple) and type(pickle.loads(pickle.dumps(value))) in (str, tuple)


def test_masked_text_limit_masks_before_truncating():
    secret = "K" * 30
    text = MaskedText("x" * 190 + f" --api-key {secret}", limit=200)
    assert len(text) <= 200 and "KKKK" not in text


def test_process_records_hold_the_masked_form():
    from aictl.monitoring.session import ProcessInfo as LiveProcess
    from aictl.tools import ProcessInfo as FoundProcess

    live = LiveProcess(pid=1, ppid=None, name="claude", cmdline=("claude", "--api-key", "K123456789", "--resume", UUID))
    found = FoundProcess(2, "claude", "claude --api-key K123456789 --resume " + UUID)
    for record in (live, found):
        dumped = [
            json.dumps(dataclasses.asdict(record)),
            pickle.dumps(record).decode("latin-1"),
            repr(copy.deepcopy(record)),
            repr(copy.copy(record)),
            repr(record),
        ]
        for blob in dumped:
            assert "K123456789" not in blob
            assert UUID in blob
    assert raw_args(live.cmdline)[2] == "K123456789"
    assert "K123456789" in raw_text(found.cmdline)
    # A record built from an already masked value keeps the raw form for in-process readers.
    again = dataclasses.replace(live, pid=3)
    assert raw_args(again.cmdline)[2] == "K123456789"
