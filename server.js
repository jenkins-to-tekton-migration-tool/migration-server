const express = require('express');
const fs = require('fs');
const app = express();

const jsonData = fs.readFileSync('tekton_tasks.data', 'utf-8');
const dataObject = JSON.parse(jsonData);
const Fuse = require('fuse.js');

const fuseOptions = {
  isCaseSensitive: true,
  includeScore: true,
  shouldSort: true,
  // includeMatches: false,
  // findAllMatches: false,
  // minMatchCharLength: 1,
  // location: 0,
  threshold: 0.4,
  // distance: 100,
  // useExtendedSearch: false,
  // ignoreLocation: false,
  // ignoreFieldNorm: false,
  // fieldNormWeight: 1,
  keys: [
    "name",
    "latestVersion.description"
  ]
};

const fuse = new Fuse(dataObject.data, fuseOptions);


app.get('/', function(req, res) {
  res.send('Jenkins -> Tekton HTTP Server is working!')
});

app.get('/tektontasks/data', function(req, res) {
  res.json(dataObject);
  console.log('Tekton Tasks successfully retrieved!');
});

app.post('/mappings', function(req, res) {

  var searchPattern = "builah"
  console.log(fuse.search(searchPattern, { limit: 5}))
  res.status(200).send('Mappings created !')

})


app.use(function(req, res, next) {
  res.status(404).send('Sorry, that route doesnt exist yet!')
});

app.listen(3000, function(){
  console.log('HTTP Server is listening on port 3000')
});
