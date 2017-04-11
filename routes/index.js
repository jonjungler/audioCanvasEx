var express = require('express');
var router = express.Router();
var path = require("path");

var audioPath = path.join(__dirname,'../public/audios');
/* GET home page. */
router.get('/', function(req, res, next) {
	var fs = require("fs");
	fs.readdir(audioPath,function (error,names) {
		if (error) {
			console.log('audioPathError:',error);
		}else{
  			res.render('index', { title: 'Passionate Music',music:names });
		}
	})
});

module.exports = router;
