"""Reset aictl-owned tables and load a native store recording into the test database."""

import argparse
import gzip
import json
import os
import re
import sys
import time
from collections import defaultdict

from record_daemon import CLUSTER, DATABASE, guard
from scrub import relative_path, verify_text


def read_batches(path, schema):
    batches = defaultdict(list)
    identities = (os.getenv("USERNAME"), os.getenv("USER"), os.getenv("COMPUTERNAME"))
    with gzip.open(path, "rt", encoding="utf-8") as stream:
        for line_num, line in enumerate(stream, start=1):
            if verify_text(line, identities):
                raise ValueError(f"Possible private value at line {line_num}; no data was loaded")
            row = json.loads(line)
            if row["kind"] != "ingest" or row["outcome"] != "ok":
                continue
            table = row["table"]
            if (table not in schema or row["database"] != DATABASE or row["format"] != "multijson"
                    or not isinstance(row["rows"], list)):
                raise ValueError(f"Unexpected ingestion record at line {line_num}; no data was loaded")
            for entry in row["rows"]:
                if not isinstance(entry, dict) or set(entry) - schema[table]:
                    raise ValueError(f"Unexpected row schema at line {line_num}; no data was loaded")
            batches[table].extend(row["rows"])
    if not any(batches.values()):
        raise ValueError("No successful ingestion rows; no data was loaded")
    return batches


def row_counts(client, tables):
    from aictl.stores.kusto.client import quote

    branches = [
        f"({quote(table)} | summarize row_count=count() | extend table_name='{table}')"
        for table in sorted(tables)
    ]
    kql = "union " + ",\n      ".join(branches) + "\n| project table_name, row_count\n| order by table_name asc"
    guard(DATABASE, kql)
    return {str(row[0]): int(row[1]) for row in client.execute(DATABASE, kql).primary_results[0]}


def run(path, counts_path):
    from aictl.kusto import KustoSettings
    from aictl.stores.kusto.client import KustoClientFactory, quote
    from aictl.stores.kusto.ingest import InlineIngester
    from aictl.stores.kusto.schema import LEGACY_COLUMNS, ensure_schema
    from aictl.stores.kusto.tables import TABLES

    tables = {name: table for name, table in TABLES.items() if not name.endswith("_observations")}
    schema = {name: {column for column, _ in (*table.columns, *LEGACY_COLUMNS.get(name, ()))}
              for name, table in tables.items()}
    if any(not re.fullmatch(r"[a-zA-Z0-9_]+", name) for name in schema):
        raise ValueError("Unexpected table name in the aictl schema")
    batches = read_batches(path, schema)
    settings = KustoSettings(CLUSTER, database=DATABASE, ingestion="inline")
    guard(settings.database)
    client = KustoClientFactory.client(settings)
    ingester = InlineIngester(client, DATABASE)
    ensure_schema(client, DATABASE, modes=dict.fromkeys(tables, "inline"), tables=tables)

    # Clear rows that the isolated recorder wrote, including the tables with no fixture rows.
    # Do not clear any other tables, functions or benchmark data.
    for table, count in row_counts(client, schema).items():
        if count:
            client.execute_mgmt(DATABASE, f".clear table {quote(table)} data")
    for table, rows in sorted(batches.items()):
        ingester.ingest(table, rows)

    expected = {table: len(batches.get(table, ())) for table in sorted(schema)}
    for _ in range(10):
        observed = row_counts(client, schema)
        if observed == expected:
            break
        time.sleep(2)
    report = {"database": DATABASE, "expected": expected, "observed": observed}
    print(json.dumps(report, indent=2))
    if counts_path is not None:
        counts_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if observed != expected:
        raise ValueError("Verified table counts do not match the busy recording")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--recording", required=True, help="Sanitized native Kusto recording")
    parser.add_argument("--counts", help="Optional relative output path for the verified counts")
    parser.add_argument("--reset-test-tables", required=True, action="store_true",
                        help="Clear all aictl-owned test tables, not only those represented in the recording")
    args = parser.parse_args()
    run(relative_path(args.recording), relative_path(args.counts) if args.counts else None)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as exc:
        sys.exit(str(exc))
