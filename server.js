var express = require('express');
var app = express();

app.get('/', function(req, res) {
  res.send('Jenkins -> Tekton HTTP Server is working!')
});

app.use(function(req, res, next) {
  res.status(404).send('Sorry, that route doesnt exist yet!')
});

app.listen(3000, function(){
  console.log('HTTP Server is listening on port 3000')
});
