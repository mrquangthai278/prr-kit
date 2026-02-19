/**
 * XML utilities — escape/unescape for agent XML generation
 */
function escapeXml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function unescapeXml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replaceAll('&apos;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

module.exports = { escapeXml, unescapeXml };
