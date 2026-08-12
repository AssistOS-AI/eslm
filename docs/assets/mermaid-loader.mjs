import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

function nodeId(fragment) {
  return fragment.trim().replace(/^\|[^|]*\|\s*/u, '').match(/^([A-Za-z][A-Za-z0-9_-]*)/u)?.[1] ?? null;
}

function addTopologyRoles(source) {
  const nodes = new Set();
  const incoming = new Map();
  const outgoing = new Map();
  for (const line of source.split('\n')) {
    const arrow = line.indexOf('-->');
    if (arrow < 0) continue;
    const from = nodeId(line.slice(0, arrow));
    const to = nodeId(line.slice(arrow + 3));
    if (!from || !to) continue;
    nodes.add(from);
    nodes.add(to);
    outgoing.set(from, (outgoing.get(from) ?? 0) + 1);
    incoming.set(to, (incoming.get(to) ?? 0) + 1);
  }
  const sources = [...nodes].filter((id) => !incoming.has(id)).sort();
  const outcomes = [...nodes].filter((id) => !outgoing.has(id)).sort();
  const processes = [...nodes].filter((id) => incoming.has(id) && outgoing.has(id)).sort();
  const roleLines = [
    sources.length > 0 ? `  class ${sources.join(',')} diagram-source` : '',
    processes.length > 0 ? `  class ${processes.join(',')} diagram-process` : '',
    outcomes.length > 0 ? `  class ${outcomes.join(',')} diagram-outcome` : '',
  ].filter(Boolean);
  return roleLines.length > 0 ? `${source.trimEnd()}\n${roleLines.join('\n')}\n` : source;
}

for (const diagram of document.querySelectorAll('pre.mermaid')) {
  diagram.textContent = addTopologyRoles(diagram.textContent);
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'strict',
  flowchart: { nodeSpacing: 42, rankSpacing: 64, curve: 'linear', useMaxWidth: true },
  themeVariables: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '16px',
    lineColor: '#31565a',
    primaryBorderColor: '#086f6b',
  },
});
