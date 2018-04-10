var _artifacts;

module.exports = function(contractName) {
  return _artifacts.require(contractName);
};

module.exports.setArtifacts = function(val) {
  _artifacts = val;
}