import json
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from pathlib import Path

extraction = json.loads(Path(".graphify_extract.json").read_text())
detection  = json.loads(Path(".graphify_detect.json").read_text())
analysis   = json.loads(Path(".graphify_analysis.json").read_text())

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis["communities"].items()}
cohesion = {int(k): v for k, v in analysis["cohesion"].items()}
tokens = {"input": 0, "output": 0}

# Sample nodes per community to auto-label
community_samples = {}
for nid, cid in communities.items():
    label = G.nodes[nid].get("label", nid) if nid in G.nodes else nid
    community_samples.setdefault(cid, []).append(label)

# Print samples so we can pick labels
for cid in sorted(set(communities.values())):
    samples = community_samples.get(cid, [])[:5]
    print(f"Community {cid}: {samples}")
