import json
from graphify.cache import check_semantic_cache
from pathlib import Path

detect = json.loads(Path(".graphify_detect.json").read_text())
non_code = []
for ftype in ["document", "paper", "image"]:
    non_code.extend(detect["files"].get(ftype, []))

cached_nodes, cached_edges, cached_hyperedges, uncached = check_semantic_cache(non_code)

if cached_nodes or cached_edges or cached_hyperedges:
    Path(".graphify_cached.json").write_text(json.dumps({"nodes": cached_nodes, "edges": cached_edges, "hyperedges": cached_hyperedges}))
Path(".graphify_uncached.txt").write_text("\n".join(uncached))
total = len(non_code)
hit = total - len(uncached)
print(f"Cache: {hit} files hit, {len(uncached)} files need extraction")
print("Uncached files:")
for f in uncached:
    print(" ", f)
