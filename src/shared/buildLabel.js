/**
 * Formats the generated build stamp (window.QuadTVBuild) for display.
 * Shared by the popup footer, the help overlay and console logging.
 *
 * @param {Object|undefined} build - window.QuadTVBuild from buildInfo.js
 * @returns {string}
 */
function formatBuildLabel(build) {
  if (!build) return 'build: unknown (run npm run build:info)';
  const time = build.builtAt ? new Date(build.builtAt).toLocaleTimeString() : '';
  return `v${build.version} · ${build.branch}@${build.commit}${build.dirty ? '*' : ''} · ${time}`;
}

if (typeof window !== 'undefined') {
  window.QuadTVFormatBuildLabel = formatBuildLabel;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatBuildLabel };
}
