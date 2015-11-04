var express = require('express');
var app = express();
var fs = require('fs');

var path = process.cwd();

var cfg = {
	src :"",
	dist:"",
	debug:"",
	rc:""
};


var http = require('http').Server(app);
var io = require('socket.io')(http);
var fsm = require('./fsmanager.js');
fsm.init(io);


http.listen(3000, function(){
	//console.log(process.cwd());
	console.log('Fey is running on *:3000');
});

io.on('connection', function(socket){
  //console.log('a user connected');
  
  var compile = 0;
  var release = 0;
  watchers = fsm.watcher();
	if(watchers.compile.length>0)
		compile = 1;
	if(watchers.release.length>0)
		release = 1;
	
  socket.emit('notice', {type:'status',data:{compile:compile,release:release},cfg:cfg});
  
  
  socket.on('disconnect', function(){
    //console.log('user disconnected');
  });
  
  socket.on('function',function(msg){
	
	switch(msg.type){
		case "watch":			
			cfg.src = msg.data.src;
			cfg.dist = msg.data.dist;
			watchers = fsm.watcher();
			if(watchers.compile.length>0)
				fsm.unwatch();
			else
				fsm.watch(cfg);
		break;
		
		case "unwatch":
			fsm.unwatch();
		break;
		case "unwatchRelease":
			fsm.unwatchRelease();
		break;
		case "watchRelease":			
			cfg.rc = msg.data.rc;
			cfg.debug = msg.data.debug;
			watchers = fsm.watcher();
			if(watchers.release.length>0)
				fsm.unwatchRelease();
			else
				fsm.watchRelease(cfg);
		break;
		case "release":
			cfg.rc = msg.data.rc;
			cfg.debug = msg.data.debug;
			fsm.release(cfg.debug,cfg.rc);
		break;
	}
	
  });
  
});



app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/web/:file', function(req, res){
	res.sendFile(__dirname + '/web/'+ req.params.file);
});










