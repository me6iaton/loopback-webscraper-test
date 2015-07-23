module.exports = function(Record) {

  Record.disableRemoteMethod('create', true);
  Record.disableRemoteMethod('createChangeStream', true);

};
