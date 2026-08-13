import { exactKeys, identifier, integer } from './contract-helpers.mjs';

function key(value) {
  return `${value.sourceId}@${value.revision}:${value.componentId}:${value.split}`;
}

export function assertSplitCoverage(analysis, registry) {
  const expected = registry.components.flatMap((component) => component.visibility.map((split) => ({
    sourceId: component.sourceId,
    revision: component.revision,
    componentId: component.componentId,
    ...split,
  }))).toSorted((left, right) => key(left).localeCompare(key(right)));
  if (!Array.isArray(analysis.splitCoverage)
      || analysis.splitCoverage.length !== expected.length) {
    throw new TypeError('Analysis split coverage must cover every registry split exactly once.');
  }
  const componentRows = analysis.coverage?.componentProjections?.flatMap((component) =>
    component.splitCoverage.map((split) => ({
      sourceId: component.sourceId, revision: component.revision,
      componentId: component.componentId, ...split,
    }))).toSorted((left, right) => key(left).localeCompare(key(right)));
  if (JSON.stringify(componentRows) !== JSON.stringify(analysis.splitCoverage)) {
    throw new TypeError('Analysis split coverage does not reproduce component execution work.');
  }
  const totals = {
    available: 0, received: 0, selected: 0, analyzed: 0,
    protectedReceived: 0,
  };
  let prior = '';
  for (const [index, row] of analysis.splitCoverage.entries()) {
    const path = `Analysis splitCoverage[${index}]`;
    exactKeys(row, [
      'sourceId', 'revision', 'componentId', 'split', 'visibility',
      'rowsDeclared', 'rowsAdmitted', 'rowsReceived', 'rowsSelected', 'rowsAnalyzed',
    ], path);
    for (const field of ['sourceId', 'revision', 'componentId', 'split']) {
      identifier(row[field], `${path}.${field}`);
    }
    for (const field of [
      'rowsDeclared', 'rowsAdmitted', 'rowsReceived', 'rowsSelected', 'rowsAnalyzed',
    ]) integer(row[field], `${path}.${field}`);
    const expectedRow = expected[index];
    const rowKey = key(row);
    const nonTraining = row.visibility !== 'training-visible';
    if (rowKey <= prior || !expectedRow || rowKey !== key(expectedRow)
        || row.visibility !== expectedRow.visibility
        || row.rowsDeclared !== expectedRow.rowsDeclared
        || row.rowsAdmitted !== expectedRow.rowsAdmitted
        || row.rowsAdmitted > row.rowsDeclared
        || row.rowsReceived > row.rowsAdmitted
        || row.rowsSelected > row.rowsReceived || row.rowsAnalyzed > row.rowsSelected
        || (nonTraining && [
          row.rowsAdmitted, row.rowsReceived, row.rowsSelected, row.rowsAnalyzed,
        ].some((value) => value !== 0))) {
      throw new TypeError(`${path} contradicts registry admission or actual bounded work.`);
    }
    if (!['training-visible', 'development-visible', 'protected'].includes(row.visibility)) {
      throw new TypeError(`${path}.visibility is unsupported.`);
    }
    if (!nonTraining) {
      totals.available += row.rowsAdmitted;
      totals.received += row.rowsReceived;
      totals.selected += row.rowsSelected;
      totals.analyzed += row.rowsAnalyzed;
    } else if (row.visibility === 'protected') {
      totals.protectedReceived += row.rowsReceived;
    }
    prior = rowKey;
  }
  if (totals.available !== analysis.work.episodesAvailable
      || totals.received !== analysis.work.episodesReceived
      || totals.selected !== analysis.work.episodesSelected
      || totals.analyzed !== analysis.work.episodesAnalyzed) {
    throw new TypeError('Analysis split coverage does not reproduce aggregate episode work.');
  }
  return totals;
}

export function cycleSplitAccounting(analysis) {
  return analysis.splitCoverage.map((row) => ({
    sourceId: row.sourceId,
    revision: row.revision,
    componentId: row.componentId,
    split: row.split,
    visibility: row.visibility,
    rowsDeclared: row.rowsDeclared,
    rowsAvailable: row.rowsAdmitted,
    rowsVisited: row.rowsReceived,
    rowsSelected: row.rowsSelected,
    rowsAnalyzed: row.rowsAnalyzed,
  }));
}

export function assertCycleSplitAccounting(cycle, analysis) {
  if (!Array.isArray(cycle.splitAccounting)
      || JSON.stringify(cycle.splitAccounting) !== JSON.stringify(cycleSplitAccounting(analysis))) {
    throw new TypeError('Discovery cycle split accounting does not reproduce its analysis.');
  }
  for (const [index, row] of cycle.splitAccounting.entries()) {
    exactKeys(row, [
      'sourceId', 'revision', 'componentId', 'split', 'visibility', 'rowsDeclared',
      'rowsAvailable', 'rowsVisited', 'rowsSelected', 'rowsAnalyzed',
    ], `Discovery cycle.splitAccounting[${index}]`);
  }
}
