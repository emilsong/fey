# Fey

may be the most simple front-end developing platform

##### Alpha Testing Now

welcome to report any issues emilsong@gmail.com


## Intro

Fey is writen by nodejs, using express and socket.io framework building the web interface. You can access the program with your browser.

## install

First, install the application with: `npm install -g fey`.

Then install the global dependence.

`npm install less -g`

`npm install coffee -g`

`npm install uglifyjs -g`

## start

command enter `fey`

you will see `Fey is running on *:3000`

open your browser and access http://localhost:3000

enjoy!


![demo](http://photo.yupoo.com/emilsong/Eg3ugaea/medish.jpg)


##使用帮助

FEY可能是史上最简单最易用的前端开发编译环境，所以一般人不需要看这个帮助:)

###基本概念

####什么是FEY的编译？
编译主要是将Less/Coffeescript的代码转换成浏览器可执行的原生css和javascript，同时处理css和javascript文件合并工作。此过程不会对代码进行压缩。

####什么是FEY的发布？
发布是将开发环境中的css/javascript/图片文件进行压缩，并移动到发布目录，方便上线和发布。

##编译设置

假设我们的前端工作目录为三个目录src(源码目录)debug(调试目录)release(发布目录)，他们可以分别对应不同的git/svn仓库。
使用FEY编译设置目录后，点击开始工作。
FEY会自动监听src目录中的.less/.coffee文件的修改，并编译成css和js文件放到当前目录
FEY会自动监听src目录中的.all.css和.all.js文件，当配置在其中的文件进行更改时，自动生成新的.all文件到对应的debug目录

####.all文件的怎么写?

假如我们需要将test1.js,test2.js,test3.js合并到test.all.js文件，只要在test.all.js文件中加入以下代码
`/*import(test1.js,test2.js,test3.js)*/`

当修改test1.js或者test2,test3这些碎片文件时，FEY会自动生成test.all.js文件到debug目录对应的目录下。
如果你的test1.js是test1.coffee文件编译而成。没问题，当test1.coffee修改时，test1.js重新生成，test.all.js也重新生成。
CSS文件完全相同，注意为了更加简单，FEY不再支持@import导入CSS文件了。请使用上面提到的方法

####复制.lib文件

可能我们在项目中的一些前端类似的库文件，需要直接单独发布，异步加载。所以FEY提供复制功能，将.lib.js和.lib.css直接复制。

##发布设置

发布过程主要是对代码和图片进行压缩的过程，设置源码路径，发布路径后点击发布项目。即会进行发布，可在log区看到相应的log
实时发布会监控源码目录，如果里边文件进行更改，新增就会实时压缩并发布到发布目录。
FEY集成的压缩工具CleanCSS/UglifyJS/Imagemin都是业界最好的压缩工具，其中imagemin可以将png图片无损压缩60%的体积。

####输出的LOG

FEY是nodejs开发的，web界面是通过websocket来与nodejs服务通信来实时显示相关LOG。