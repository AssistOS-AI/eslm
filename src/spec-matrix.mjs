import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from './paths.mjs';

const specsDirectory = join(PROJECT_ROOT, 'docs/specs');
const SAFE_SPEC_FILE = /^DS\d{3}-[A-Za-z0-9-]+\.md$/u;

function frontmatter(markdown) {
  const end = markdown.indexOf('\n---\n', 4);
  if (!markdown.startsWith('---\n') || end < 0) throw new Error('Specification is missing frontmatter.');
  const metadata = {};
  for (const line of markdown.slice(4, end).split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/u);
    if (match) metadata[match[1]] = match[2];
  }
  return metadata;
}

export async function generateSpecMatrix() {
  const directoryFiles = await readdir(specsDirectory);
  const invalid = directoryFiles.filter((file) => /^DS\d{3}-.+\.md$/u.test(file) && !SAFE_SPEC_FILE.test(file));
  if (invalid.length > 0) {
    throw new Error(`Specification filenames are unsafe for static publication: ${invalid.join(', ')}.`);
  }
  const files = directoryFiles
    .filter((file) => SAFE_SPEC_FILE.test(file))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const specifications = [];
  for (const file of files) specifications.push({ file, ...frontmatter(await readFile(join(specsDirectory, file), 'utf8')) });
  specifications.forEach((specification, index) => {
    const expected = `DS${String(index).padStart(3, '0')}`;
    if (specification.id !== expected) throw new Error(`Expected ${expected}, found ${specification.id ?? 'missing id'}.`);
    for (const field of ['title', 'status', 'owner', 'summary']) if (!specification[field]) throw new Error(`${specification.file} lacks ${field}.`);
  });
  const rows = specifications.map((specification) =>
    `| [${specification.id}](specsLoader.html?spec=${encodeURIComponent(specification.file)}) | ${specification.title} | [[status:${specification.status}]] | ${specification.owner} | ${specification.summary.replaceAll('|', '\\|')} |`).join('\n');
  const output = `# Specification Matrix

Generated from DS frontmatter by \`src/spec-matrix.mjs\`. Edit DS files and rerun the generator instead of editing this file manually.

| Specification | Title | Status | Owner | Summary |
| --- | --- | --- | --- | --- |
${rows}
`;
  await writeFile(join(specsDirectory, 'matrix.md'), output, 'utf8');
  return { specifications: specifications.length };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  generateSpecMatrix().then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
