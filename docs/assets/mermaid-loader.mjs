import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'strict',
  flowchart: { nodeSpacing: 42, rankSpacing: 64, curve: 'linear', useMaxWidth: true },
  themeVariables: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '18px',
    lineColor: '#31565a',
    primaryBorderColor: '#086f6b',
  },
});
