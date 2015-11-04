var fs = require('fs');
var exec = require('child_process').exec;
var os = require('os');

var watchers = {compile:[],release:[]};
var config = {
	src : "",
	dist:"",
	debug:"",
	rc:""
};

var log = {
	io:null,
	logs:[],
	errors:[],
	broadcast:function(text){
		if(text!="")
			log.io.emit('log', text);
	},
	excute:function(msg){
		log.io.emit('notice', msg);
	},
	write:function(text){
		if(text!=""){
			//console.log(text);
			log.io.emit('log', text);
			log.logs.push(text);
			if(log.logs.length>100){
				logs.shift();
			}
		}
	},
	error:function(text){
		if(text!=""){
			//console.log(text);
			log.io.emit('log', text);
			log.errors.push(text);
			if(log.errors.length>100){
				errors.shift();
			}
		}
	}
	
};

var concat = {
	cache : {},//大文件对应小文件列表
	cacheRe : {},//小文件对应大文件列表
	add: function(fileall,filelist){
		concat.cache[fileall] = filelist;
		for(var i=0;i<filelist.length;i++){
			concat.cacheRe[filelist[i]] = fileall;
		}
		//console.log(concat.cache);
		//console.log(concat.cacheRe);
	},
	//重置文件对应关系
	reset:function(src,fname){
		var srcFile = src+'/'+fname;
		fs.readFile(srcFile,{encoding:"utf8"},function(err,text){
			if (err) throw err; 
			var matches = /import\((.*)\)/.exec(text);
			if(matches!=null){
				var arr = matches[1].split(',');
				for(var i=0;i<arr.length;i++){
					arr[i] = src+'/'+arr[i];
				}
				concat.add(srcFile,arr);
			}
			//console.log(concat.cache);
		});
		
	},
	write:function(filemini){
		var file = concat.cacheRe[filemini];
		if(file!=undefined){
			var filelist = concat.cache[file];
			var content = "";
			for(var i=0;i<filelist.length;i++){
				var path = filelist[i];
				content += '\n/*from:'+path+'*/\n';
				content += fs.readFileSync(path,{encoding:"utf8"});
			}
			var distPath = file.replace(config.src,config.dist);
			fs.writeFile(distPath, content,{encoding:'utf8'}, function (err) {
				if (err) {
					//console.log("write file error!");
					//console.log(err);
					log.broadcast({error:'合并文件错误:' + err});
				};
				//console.log(distPath+' saved!');
				log.broadcast({success:distPath+' 合并文件保存成功!'});
			});
		}
		
	}

};

var file = {
	status:[],
	locked:function(filename){
		for(var i=0;i<file.status.length;i++){
			if(file.status[i]==filename){
				return true;
			}
		}
		return false;
	},
	lock:function(filename){
		file.status.push(filename);
		file.unlock(filename);
	},
	unlock:function(filename){
		setTimeout(function(){
			for(var i=0;i<file.status.length;i++){
				if(file.status[i]==filename){
					file.status.splice(i);
				}
			}
		},2000);
	}
};


var cmd = function(command){
	//console.log(command);
	log.broadcast({cmd:command});
	var child = exec(command,function (error, stdout, stderr) {
		log.write(stdout);
		log.error(stderr);
		if (error !== null) {
		  log.broadcast({error:'exec error: ' + error});
		  //console.log('exec error: ' + error);
		}else{
			log.broadcast({success:'命令执行成功: ' + command});
		}
	});
};

var processor = {
	less : function(src,dist){
		log.broadcast({log:'编译less文件:' + src});
		var command = 'lessc '+src+' '+dist;
		cmd(command);
	},
	coffee : function(src){
		log.broadcast({log:'编译coffee文件:' + src});
		var command = 'coffee --compile '+src;
		cmd(command);
	},
	copy : function(src,dist){
		log.broadcast({log:'复制文件:' + src});
		var command = 'cp '+src+' '+dist;
		if(os.platform()=="win32"){
			command = 'copy '+src+' '+dist;
			command = command.replace(/\//g,'\\');
		}
		cmd(command);
	},
	cleancss : function(src,dist){
		log.broadcast({log:'压缩CSS文件:' + src});
		var command = 'lessc -x '+src+' '+dist;
		cmd(command);
	},
	uglifyjs:function(src,dist){
		log.broadcast({log:'压缩JS文件:' + src});
		var command = 'uglifyjs '+src+' -mt -o '+dist;
		cmd(command);
	},
	compress:function(fname,src,dist){
		var ext = fname.substr(fname.lastIndexOf('.'));
		var srcFile = src+fname;
		var distFile = dist+fname;
		//编译LESS和Coffee
		switch(ext){
			case ".css":
				processor.cleancss(srcFile,distFile);
				break;
			case ".js":
				processor.uglifyjs(srcFile,distFile);
			break;
			default:
			break;
		}
	},
	piccompress:function(type,src,dist){
	
		var Imagemin = require('imagemin');
		var imagemin = new Imagemin()
			.src(src)
			.dest(dist);
		
		switch(type){
			case "png":
				imagemin.use(Imagemin.optipng({ optimizationLevel: 3 }));
			case "pnglossy":
				imagemin.use(Imagemin.pngquant());
			case "gif":
				imagemin.use(Imagemin.gifsicle({ interlaced: true }));
			case "jpg":
				imagemin.use(Imagemin.jpegtran({ progressive: true }));
			case "svg":
				imagemin.use(Imagemin.svgo());
		};

		imagemin.run(function (err, files) {
			if (err) {
				//throw err;
				log.broadcast('error','压缩图片失败:'+err);
			}else{
				log.broadcast('success','压缩图片成功:'+dist);
			}
			//console.log(files[0]); => { contents: <Buffer 89 50 4e ...> }
		});
	},
	watch:function(event,fname,src,dist){
		if (fname) {
			var ext = fname.substr(fname.lastIndexOf('.'));
			var srcFile = src+'/'+fname;
			
			//编译LESS和Coffee
			switch(ext){
				case ".less":
					var distFile = src+'/'+fname.replace(/\.less$/,".css");
					processor.less(srcFile,distFile);
					break;
				case ".coffee":
					processor.coffee(srcFile);
				break;
			}

			//处理文件合并的修改
			var fnameext = fname.substr(0,fname.length - (fname.length - fname.lastIndexOf('.')));
			var ext2 = fnameext.substr(fnameext.lastIndexOf('.')) + ext;
			if(ext2==".all.js"||ext2==".all.css"){
				concat.reset(src,fname);
			}
			
			if(ext2==".lib.js"||ext2==".lib.css"){
				var distFile = dist+'/'+fname;
				processor.copy(srcFile,distFile);
			}else{
				//处理碎片文件
				if(ext==".js"||ext==".css"){
					concat.write(srcFile);
				}
			}
			
		} 
	},
	watchRelease:function(event,fname,src,dist){
		//console.log(event);
		if (fname) {
			var ext = fname.substr(fname.lastIndexOf('.'));
			var srcFile = src+'/'+fname;
			var distFile = dist+'/'+fname;
			
			fs.stat(srcFile, function(err1, stats) {  
				if (err1) { 
					log.broadcast({error:srcFile+'读取错误：'+err1});
				} else {  
					if (stats.isDirectory()) {
						if(!fs.existsSync(distFile))
							fs.mkdirSync(distFile);
					}					
					else{
						
						if(os.platform()!="win32"&&/(png|jpg|gif|svg)/.test(ext)){
							distFile = dist+'/';
							setTimeout(function(){
								processor.piccompress(ext.substr(1),srcFile,distFile);
							},200);					
						}else{

							var folder = dist+'/';
							if(!fs.existsSync(folder))
								fs.mkdirSync(folder);
							setTimeout(function(){
								processor.copy(srcFile,distFile);
							},200);
						}
					}
				}  
			})  
			
			
		} 
	}
};



var allFolders = [];
var getAllFolder = function(path,distPath, handleFolder) {  
    fs.readdir(path, function(err, files) {  
        if (err) { 
			log.broadcast({error:'文件夹'+path+'读取错误，请检查确认路径存在'});
            //console.log('read dir error');  
        } else {  
            files.forEach(function(item) {
                var parentSrc = path +'/'+ item;
				var distSrc = distPath +'/'+ item;
                fs.stat(parentSrc, function(err1, stats) {  
					//console.log(parentSrc);
                    if (err1) { 
						log.broadcast({error:parentSrc+'读取错误：'+err1});
						//console.log(err1);
                        //console.log('stat error');  
                    } else {  
                        if (stats.isDirectory()) {
							allFolders.push(parentSrc);
							//console.log(parentSrc);
							if(handleFolder){
								handleFolder(parentSrc,distSrc);
							}
                            getAllFolder(parentSrc, distSrc,handleFolder);  
                        } else{
							//check *.all files,setup the mapping
							var ext = item.substr(item.lastIndexOf('.'));
							var fnameext = item.substr(0,item.length - (item.length - item.lastIndexOf('.')));
							var ext2 = fnameext.substr(fnameext.lastIndexOf('.')) + ext;
							if(ext2==".all.js"||ext2==".all.css"){
								concat.reset(path,item);
							}
						}
                    }  
                })  
            });  
        }  
    });  
}  


var releaseAllFolder = function(path,distPath) {  
    fs.readdir(path, function(err, files) {  
        if (err) {  
			log.broadcast({error:'文件夹'+path+'读取错误，请检查确认路径存在'});
            //console.log('read dir error');  
        } else {  
            files.forEach(function(item) {
                var parentSrc = path +'/'+ item;
				var distSrc = distPath +'/'+ item;
                fs.stat(parentSrc, function(err1, stats) {  
					//console.log(parentSrc);
                    if (err1) { 
						log.broadcast({error:parentSrc+'读取错误：'+err1});
						//console.log(err1);
                        //console.log('stat error');  
                    } else {  
                        if (stats.isDirectory()) {
							//console.log(parentSrc);
							if(!fs.existsSync(distSrc))
								fs.mkdirSync(distSrc);
                            releaseAllFolder(parentSrc, distSrc);  
                        }else{
							log.broadcast({log:'发布文件'+parentSrc});
                        	processor.compress(item,path,distPath);
                        }
                    }  
                })  
            });  
        }  
    });  
}  

var checkFolderIndex = 0;
var checkFolderExits = function(folders,callback){
	if(checkFolderIndex<folders.length){
		var folder = folders[checkFolderIndex];
		fs.exists(folder, function (exists) {
			if(exists){
				checkFolderIndex++;
				checkFolderExits(folders,callback);
				if(checkFolderIndex==folders.length&&callback){
					checkFolderIndex = 0;
					callback();	
				}
			}else{
				log.broadcast({error:"文件路径不存在："+folder});
			}
		});
	}
};

exports.watcher = function(){
	return watchers;
}

exports.watch = function (cfg) {
	
	config.src = cfg.src;
	config.dist = cfg.dist;	
	var src = config.src;
	var dist = config.dist;
	
	checkFolderExits([src,dist],function(){
		
		var watcher = fs.watch(src, function (event, filename) {
			if(!file.locked(src+filename)){
				file.lock(src+filename);
				processor.watch(event,filename,src,dist);
			}
		});
		watchers.compile.push(watcher);			

		getAllFolder(src,dist,
			function(parentSrc,distSrc){
				var watcher = fs.watch(parentSrc, function (event, filename) {
					if(!file.locked(parentSrc+filename)){
						file.lock(parentSrc+filename);
						processor.watch(event,filename,parentSrc,distSrc);
					}
				});
				watchers.compile.push(watcher);
		});
		log.broadcast({success:'开始监听文件修改：'+src+',目标目录为：'+dist});
		log.excute({type:'status',data:{compile:1}});
	
	});
	
};

exports.watchRelease = function(cfg){
	var src = cfg.debug;
	var dist = cfg.rc;
	checkFolderExits([src,dist],function(){
		
		var watcher = fs.watch(src, function (event, filename) {
			if(!file.locked(src+filename)){
				file.lock(src+filename);
				//console.log(src+filename,"event");
				processor.watchRelease(event,filename,src,dist);
			}
		});
		watchers.release.push(watcher);			

		getAllFolder(src,dist,
			function(parentSrc,distSrc){
				var watcher = fs.watch(parentSrc, function (event, filename) {
					if(!file.locked(parentSrc+filename)){
						file.lock(parentSrc+filename);

						processor.watchRelease(event,filename,parentSrc,distSrc);
					}
				});
				watchers.release.push(watcher);
		});
		
		log.broadcast({success:'开始监听文件修改：'+src+',目标目录为：'+dist});
		log.excute({type:'status',data:{release:1}});

	});
	
};



exports.unwatch = function () {   
   
   if(watchers.compile.length>0){
		for(var i=0;i<watchers.compile.length;i++){
			watchers.compile[i].close();
		}
		watchers.compile = [];
		log.broadcast({log:'已经取消编译监听'});
		log.excute({type:'status',data:{compile:0}});
   }else{
		log.broadcast({error:'没有正在监听的实时编译项目'});
   }

};

exports.unwatchRelease = function(){
	if(watchers.release.length>0){
		for(var i=0;i<watchers.release.length;i++){
			watchers.release[i].close();
		}
		watchers.release = [];
		log.broadcast({log:'已经取消发布监听'});
		log.excute({type:'status',data:{release:0}});
   }else{
		log.broadcast({error:'没有正在监听的实时发布项目'});
   }

};

exports.release = function(src,dist){
	config.debug = src;
	config.rc = dist;
	
	fs.exists(src, function (exists) {
		if(exists){
			fs.exists(dist, function (exists) {
				if(exists){
					log.broadcast({log:'发布项目和压缩文件中...'});
					releaseAllFolder(src,dist);
					//console.log("release and compressing ...");
				}else
					log.broadcast({error:"文件路径不存在："+dist});
			});
		}else
			log.broadcast({error:"文件路径不存在："+src});
	});
};

exports.init = function(io){
	log.io = io;
};




