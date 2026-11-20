"""Record bounded R1 views from the fixed test database. Does not write to Kusto."""

import argparse
from pathlib import Path

from record_daemon import CLUSTER, DATABASE, KustoTape
from record_http import Jsonl
from scrub import Scrubber, relative_path

from aictl.kusto import KustoSettings
from aictl.stores.kusto.client import KustoClientFactory
from aictl.stores.kusto.reader import KustoReader

FIXED_NODE = "anon_756642e58edb39aae31ad893"
FIXED_WINDOW = {"since": 1795134000.0, "until": 1795134600.0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path("test") / "recordings" / "r1-kusto.jsonl.gz")
    args = parser.parse_args()
    scrubber = Scrubber()
    # These literals are part of the checked-in query and result schema, not row data.
    scrubber.identifiers.update(("_deleted", "project", "total", "node", "session", "count", "process",
                                "all", "counts", "item", "example", "model", "latency"))
    tape = KustoTape(scrubber)
    tape.install()
    file = Jsonl(relative_path(args.out), 1_000_000)
    tape.attach(file)
    try:
        settings = KustoSettings(CLUSTER, DATABASE)
        reader = KustoReader(KustoClientFactory.client(settings), DATABASE)
        for view, params in (
            ("nodes.sessions", dict(**FIXED_WINDOW, node_limit=257, session_limit=101)),
            ("sessions.lookup", dict(requested_session="example")),
            ("sessions.processes", dict(requested_session="example")),
            ("requests.models", dict(requested_session="example")),
            ("usage.sessions", dict(without_requests=True)),
            ("events.page", dict(**FIXED_WINDOW, limit=1)),
            ("events.count", FIXED_WINDOW),
            ("requests.records", dict(requested_session="example")),
            ("skills.detail", dict(requested_skill="example")),
        ):
            result = reader.read(view, {"all_nodes": False, "requested_node": FIXED_NODE, **params})
            print(f"{view}: {len(result.rows)} rows, truncated={result.truncated}")
    finally:
        tape.attach(None)
        file.close()


if __name__ == "__main__":
    main()
