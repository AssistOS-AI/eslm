import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('consolidated specifications are contiguous and structurally complete', async () => {
  const root = `${PROJECT_ROOT}/docs/specs`;
  const files = (await readdir(root)).filter((file) => /^DS\d{3}-.+\.md$/u.test(file)).sort();
  assert.equal(files.length, 30);
  files.forEach((file, index) => assert.equal(file.slice(2, 5), String(index).padStart(3, '0')));
  for (const file of files) {
    const text = await readFile(`${root}/${file}`, 'utf8');
    for (const heading of ['Introduction', 'Core Content', 'Decisions & Questions', 'Conclusion']) assert.match(text, new RegExp(`^## ${heading}$`, 'mu'));
    const entries = [...text.matchAll(/^### Question #(\d+): .+$/gmu)];
    assert.ok(entries.length > 0, `${file} must retain at least one explicit question`);
    entries.forEach((entry, index) => assert.equal(Number(entry[1]), index + 1, `${file} question numbering`));
    assert.doesNotMatch(text, /^### Decision #|^Decision:/mu);

    const sections = text.split(/^### Question #\d+: .+$/gmu).slice(1);
    for (const section of sections) {
      const responseCount = (section.match(/^Response:/gmu) ?? []).length;
      const optionsCount = (section.match(/^Options:$/gmu) ?? []).length;
      assert.equal(responseCount + optionsCount, 1, `${file} question must have one Response or Options contract`);
    }
  }
});

test('repository-owned training skills are self-contained and catalogued', async () => {
  const root = `${PROJECT_ROOT}/training/.agents/skills`;
  const skills = (await readdir(root)).sort();
  assert.deepEqual(skills, [
    'benchmark-guided-symbolic-learner',
    'core-change-guardian',
    'document-to-kb-builder',
    'everyday-eval-discovery',
    'kb-compiler-quality-auditor',
    'review-processing-graph-views',
    'rl-dataset-graph-discovery',
  ]);
  for (const skill of skills) {
    const text = await readFile(`${root}/${skill}/SKILL.md`, 'utf8');
    assert.match(text, /^---\nname: /u);
    assert.doesNotMatch(text, /from ['"]\.\.\/\.\.\/\.\.\/src/u);
  }
});
