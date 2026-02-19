const PRR_FOLDER_NAME = '_prr';

function toColonPath(p) {
  return p.replaceAll('/', ':').replaceAll('\\', ':');
}

function toDashPath(p) {
  return p.replaceAll('/', '-').replaceAll('\\', '-').replaceAll('.', '-');
}

module.exports = { PRR_FOLDER_NAME, toColonPath, toDashPath };
