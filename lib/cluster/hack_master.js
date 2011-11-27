var Master
  , master = require('./master')
  , MasterBase = master.Master
  , WorkerData = master.WorkerData
  , utils = require('../utils')
  , net = require('net')
  , childProcess = require('child_process')
  , binding = process.binding('net')
  , nodeBinary = process.argv[0];

Master = function () {
  // Hack-only FD-stuff
  this._fd = binding.socket('tcp4');
  binding.bind(this._fd, parseInt('4000'));
  binding.listen(this._fd, 128);

  this.init();
};

// Inherit from normal Master
Master.prototype = geddy.mixin({}, MasterBase.prototype);
// Overrides
geddy.mixin(Master.prototype, new (function () {

  this.createWorker = function () {
    var fds
      , w
      , data;
    // Create a pair of sockets that the master process and the
    // child will use to communicate
    // http://osr507doc.sco.com/en/netguide/dusockD.socketpairs_codetext.html
    // Credits: Ext's Connect, http://github.com/extjs/Connect
    fds = binding.socketpair();
    // Spawn the child process, running the original cli script, with the
    // 'spawned' flag, and half of the socket-pair
    // Holy balls, this is hacky
    w = childProcess.spawn(nodeBinary, [__dirname + '/../../bin/cli.js',
        '--spawned=true'], {customFds: [fds[1], -1, -1]});
    // Patch child's stdin
    if (!w.stdin) {
      w.stdin = new net.Stream(fds[0], 'unix');
    }
    w.stdout.addListener('data', function (data) {
      console.log(geddy.string.trim(data.toString()));
    });
    w.stdin.write('{}', 'ascii', this._fd);

    data = new WorkerData(w);
    data._fd = this._fd;
    this.workers.addItem(w.pid.toString(), data);

  };

})());

module.exports.Master = Master;
