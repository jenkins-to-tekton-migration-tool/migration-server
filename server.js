const express = require('express');
const fs = require('fs');
const app = express();

const jsonData = fs.readFileSync('tekton_tasks.data', 'utf-8');
const dataObject = JSON.parse(jsonData);
const Fuse = require('fuse.js');

app.use(express.json());

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

var mappings_data = {}

app.get('/', function(req, res) {
  res.send('Jenkins -> Tekton HTTP Server is working!')
});

app.get('/tasks/data', function(req, res) {
  res.status(200).json(dataObject);
  console.log('Tekton Tasks successfully retrieved!');
});

// I am assuming that this is how the request body is sent to the /mappings API endpoint
//{
//  "plugins": ["git", "prometheus", "mailer"]
//}
app.post('/mappings', function(req, res) {

  let plugins = req.body.plugins
  // console.log(plugins)

  for(let i = 0; i < plugins.length; i++)  
  {
    let searchPattern = plugins[i]

    let search_results = fuse.search(searchPattern, { limit: 5}).map((element) => ({
      task: element.item.name,
      score: element.score
    }))
    console.log(search_results)

    var task_names = search_results.map((element) => `${element.task}`)
    mappings_data[plugins[i]] = task_names
  }

  res.status(200).json(mappings_data)

})

app.use(function(req, res, next) {
  res.status(404).send('Sorry, that route doesnt exist yet!')
});

app.listen(3000, function(){
  console.log('HTTP Server is listening on port 3000')
});
