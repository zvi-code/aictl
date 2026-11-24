"""A query parameter must not be read where a table column of the same name is in scope.

In KQL a column shadows a query parameter of the same name inside the table's pipeline.
The ``requests`` table has a column ``requested_model``, so ``where isempty(requested_model)
or model == requested_model`` after ``requests | summarize arg_max(_v, *) by ...`` read the
(empty) column and the model filter silently returned every row. A parameter named like a
column is read once into a ``let`` before the pipeline, and the view uses that alias.

The rule below finds the shape that failed: a statement that keeps every column
(``arg_max(_v, *)``, or a current view, which has every column of its table) and reads such a
parameter after it, with no ``project`` between.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from aictl.stores.kusto.current import CURRENT_TABLES, logical
from aictl.stores.kusto.tables import TABLES

QUERIES = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries"
_DECLARE = re.compile(r"declare query_parameters\((.*?)\);", re.S)
_COMMENT = re.compile(r"//[^\n]*")
_STRING = re.compile(r"@?'(?:[^'\\\n]|\\.)*'|@?\"(?:[^\"\\\n]|\\.)*\"")


def _parameters(text: str) -> set[str]:
    match = _DECLARE.search(text)
    return set(re.findall(r"(\w+)\s*:\s*\w+", match.group(1))) if match else set()


def shadowed_reads(text: str) -> list[str]:
    """The parameters named like a column that a statement reads after ``arg_max(_v, *)``."""
    text = _STRING.sub("''", _COMMENT.sub("", text))
    # The columns of the tables this view reads, not of every table.
    read = {table for table in TABLES if re.search(rf"\b{table}\b", text)}
    read |= {table for table in CURRENT_TABLES if re.search(rf"\b{logical(table)}\b", text)}
    columns = {name for table in read for name, _kind in TABLES[table].columns}
    currents = [logical(table) for table in CURRENT_TABLES]
    names = _parameters(text) & columns
    found = []
    for statement in _DECLARE.sub("", text).split(";"):
        for name in sorted(names):
            for use in re.finditer(rf"\b{name}\b", statement):
                before = statement[:use.start()]
                keep = max(before.rfind("arg_max(_v, *)"), *(before.rfind(view) for view in currents))
                if keep >= 0 and not re.search(r"\|\s*project(?:-\w+)?\b", before[keep:]) and not re.match(
                        rf"\s*let\s+\w+\s*=\s*{name}\s*$", statement):
                    found.append(name)
    return sorted(set(found))


@pytest.mark.parametrize("path", sorted(QUERIES.glob("*.kql")), ids=lambda path: path.name)
def test_no_view_reads_a_parameter_that_a_column_shadows(path):
    assert shadowed_reads(path.read_text()) == [], (
        f"{path.name}: read the parameter into a let before the table is read, and use the alias")


def test_the_rule_finds_the_shape_that_failed():
    declared = "declare query_parameters(requested_model:string = '', row_limit:long);\n"
    broken = declared + "requests\n| summarize arg_max(_v, *) by id\n| where isempty(requested_model) or model == requested_model\n"
    fixed = (declared + "let wanted_model = requested_model;\nrequests\n| summarize arg_max(_v, *) by id\n"
             "| where isempty(wanted_model) or model == wanted_model\n")
    assert shadowed_reads(broken) == ["requested_model"]
    assert shadowed_reads(fixed) == []
    # A current view has every column of its table from its first operator on.
    current = declared + "requests_current\n| where isempty(requested_model) or model == requested_model\n"
    assert shadowed_reads(current) == ["requested_model"]
