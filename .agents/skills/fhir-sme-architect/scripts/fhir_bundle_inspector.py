#!/usr/bin/env python3
"""Quick FHIR JSON resource/Bundle inspector.

This script does not replace HL7/HAPI validation. It provides a fast local sanity
check for resource type, profile declarations, Bundle entries, reference graph,
and unresolved internal Bundle references.

Usage:
  python scripts/fhir_bundle_inspector.py path/to/resource-or-bundle.json
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set, Tuple

FHIR_REFERENCE_KEYS = {"reference"}


def load_json(path: Path) -> Dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"JSON parse error at line {exc.lineno}, column {exc.colno}: {exc.msg}")
    if not isinstance(data, dict):
        raise SystemExit("Top-level JSON value must be an object/resource.")
    return data


def resource_key(resource: Dict[str, Any], full_url: str | None = None) -> str:
    rtype = resource.get("resourceType", "<missing>")
    rid = resource.get("id")
    if rid:
        return f"{rtype}/{rid}"
    if full_url:
        return full_url
    return f"{rtype}/<no-id>"


def collect_references(obj: Any, path: str = "$") -> Iterable[Tuple[str, str]]:
    if isinstance(obj, dict):
        if set(obj.keys()) & FHIR_REFERENCE_KEYS and isinstance(obj.get("reference"), str):
            yield path + ".reference", obj["reference"]
        for key, value in obj.items():
            yield from collect_references(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for idx, value in enumerate(obj):
            yield from collect_references(value, f"{path}[{idx}]")


def summarize_resource(resource: Dict[str, Any], label: str) -> None:
    rtype = resource.get("resourceType", "<missing>")
    rid = resource.get("id", "<no-id>")
    profiles = resource.get("meta", {}).get("profile", [])
    print(f"Resource: {label}")
    print(f"  type: {rtype}")
    print(f"  id: {rid}")
    if profiles:
        print("  profiles:")
        for profile in profiles:
            print(f"    - {profile}")


def inspect_bundle(bundle: Dict[str, Any]) -> None:
    entries = bundle.get("entry", [])
    if not isinstance(entries, list):
        raise SystemExit("Bundle.entry must be an array when present.")

    print(f"Bundle.type: {bundle.get('type', '<missing>')}")
    print(f"Bundle.entry count: {len(entries)}")

    resources: List[Tuple[str | None, Dict[str, Any]]] = []
    full_urls: Set[str] = set()
    logical_ids: Set[str] = set()
    type_counts: Counter[str] = Counter()

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        full_url = entry.get("fullUrl")
        resource = entry.get("resource")
        if isinstance(full_url, str):
            full_urls.add(full_url)
        if isinstance(resource, dict):
            resources.append((full_url, resource))
            rtype = resource.get("resourceType", "<missing>")
            type_counts[rtype] += 1
            if resource.get("id"):
                logical_ids.add(f"{rtype}/{resource['id']}")

    print("Resource counts:")
    for rtype, count in sorted(type_counts.items()):
        print(f"  {rtype}: {count}")

    if bundle.get("type") == "document":
        first = resources[0][1] if resources else {}
        if first.get("resourceType") != "Composition":
            print("WARNING: document Bundle first resource is not Composition.")

    if bundle.get("type") == "message":
        first = resources[0][1] if resources else {}
        if first.get("resourceType") != "MessageHeader":
            print("WARNING: message Bundle first resource is not MessageHeader.")

    refs_by_resource: defaultdict[str, List[Tuple[str, str]]] = defaultdict(list)
    unresolved: List[Tuple[str, str, str]] = []

    for full_url, resource in resources:
        source = resource_key(resource, full_url)
        for ref_path, ref in collect_references(resource):
            refs_by_resource[source].append((ref_path, ref))
            if ref.startswith("#"):
                continue
            if ref.startswith("http://") or ref.startswith("https://"):
                continue
            if ref.startswith("urn:uuid:") and ref not in full_urls:
                unresolved.append((source, ref_path, ref))
            elif "/" in ref and ref not in logical_ids and ref not in full_urls:
                # Relative references may be external to the Bundle, so warn rather than fail.
                unresolved.append((source, ref_path, ref))

    print("References:")
    if not refs_by_resource:
        print("  none found")
    for source, refs in sorted(refs_by_resource.items()):
        print(f"  {source}:")
        for ref_path, ref in refs:
            print(f"    {ref_path}: {ref}")

    if unresolved:
        print("Potential unresolved internal/relative references:")
        for source, ref_path, ref in unresolved:
            print(f"  {source} -> {ref_path}: {ref}")
    else:
        print("No unresolved UUID/relative references detected.")


def main(argv: List[str]) -> int:
    if len(argv) != 2:
        print(__doc__.strip())
        return 2
    path = Path(argv[1])
    data = load_json(path)
    if data.get("resourceType") == "Bundle":
        inspect_bundle(data)
    else:
        summarize_resource(data, resource_key(data))
        refs = list(collect_references(data))
        print("References:")
        if not refs:
            print("  none found")
        for ref_path, ref in refs:
            print(f"  {ref_path}: {ref}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
