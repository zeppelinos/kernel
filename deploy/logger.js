module.exports = function() {
  if (global.log) {
    console.log.apply(this, arguments);
  }
}