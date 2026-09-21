/**
 * Tests the shared build stamp formatter.
 */
const { formatBuildLabel } = require('../../src/shared/buildLabel.js');

describe('formatBuildLabel', () => {
  const build = { version: '0.3.9', branch: 'fix/thing', commit: 'abc1234', dirty: false, builtAt: '2026-09-21T20:54:54.338Z' };

  test('formats version, branch, commit and time', () => {
    expect(formatBuildLabel(build)).toMatch(/^v0\.3\.9 · fix\/thing@abc1234 · \S+/);
  });

  test('marks uncommitted changes with an asterisk', () => {
    expect(formatBuildLabel({ ...build, dirty: true })).toContain('abc1234*');
  });

  test('explains how to generate the stamp when it is missing', () => {
    expect(formatBuildLabel(undefined)).toContain('npm run build:info');
  });
});
