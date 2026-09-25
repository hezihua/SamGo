function sceneToOrderId(scene) {
  if (!scene) return "";
  var raw = decodeURIComponent(String(scene)).trim();
  if (/^[0-9a-f]{32}$/i.test(raw)) {
    var s = raw.toLowerCase();
    return (
      s.slice(0, 8) +
      "-" +
      s.slice(8, 12) +
      "-" +
      s.slice(12, 16) +
      "-" +
      s.slice(16, 20) +
      "-" +
      s.slice(20)
    );
  }
  if (raw.indexOf("id=") === 0) {
    var id = raw.slice(3);
    if (/^[0-9a-f-]{36}$/i.test(id)) return id;
  }
  return "";
}

function resolveOrderIdFromOptions(options) {
  if (!options) return "";
  if (options.id) return options.id;
  if (options.scene) return sceneToOrderId(options.scene);
  return "";
}

module.exports = {
  sceneToOrderId,
  resolveOrderIdFromOptions,
};
