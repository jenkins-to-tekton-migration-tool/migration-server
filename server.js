const express = require('express');
const fs = require('fs');
const path = require('path');
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
    "latestVersion.description",
    "tags.name"
  ]
};

const fuse = new Fuse(dataObject.data, fuseOptions);

var mappings_data = {}

function formatTimestamp()
{
  let now = new Date()
  let options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }
  // Date in YYYY-MM-DD, HH:MM:SS format
  let date = now.toLocaleDateString('en-CA', options).replace(/\/+/g, '-');
  return `${date}`;
}


app.get('/', function(req, res) {

  res.send('Jenkins -> Tekton HTTP Server is working!')

});

app.get('/tasks/data', function(req, res) {

  console.log('Tekton Tasks successfully retrieved!');
  return res.status(200).json(dataObject);

});

app.get('/mappings', function(req, res){
  let plugin = req.query.plugin_name
  if(!plugin)
    return res.status(400).send({error: 'Plugin Name is required'})

  let plugin_mappings = mappings_data[plugin]
  if(!plugin_mappings)
    return res.status(404).send({error: 'Plugin Name not found'})

  let obj = {}
  obj[plugin] = plugin_mappings
  res.status(200).send(obj)
})

/* I am assuming that this is how the request body is sent to the /mappings API endpoint
{
  "plugins": ["git", "prometheus", "mailer"]
}*/
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

  res.status(200).json({'message': 'Successully created mappings'})
})

app.get('/report', function(req, res){
  
  let timestamp = formatTimestamp()
  let numberOfJenkinsPlugins = Object.keys(mappings_data).length
  let numberOfEmptyMappings = 0
  let numberOfNonEmptyMappings = 0
  let supportedPercentage
  let unsupportedPercentage
  let supportedPlugins = ''
  let unsupportedPlugins = ''

  for(var key of Object.keys(mappings_data)) {
    if(mappings_data[key].length == 0) {
      numberOfEmptyMappings++;
      unsupportedPlugins += `- ${key}  \n`
    }
    else {
      numberOfNonEmptyMappings++;
      supportedPlugins += `- ${key}  \n`
    }
  }

  supportedPercentage = Math.round(numberOfNonEmptyMappings * 100 / numberOfJenkinsPlugins)
  unsupportedPercentage = Math.round( 100 - supportedPercentage )

  var markdownContent = ''
  markdownContent += `# Migration Report\n\n`;
  markdownContent += `Performed at: `
  markdownContent += `${timestamp} IST  \n\n`
  markdownContent += `#### Jenkins Plugins\n\n`
  markdownContent += `Total: **`
  markdownContent += `${numberOfJenkinsPlugins}**  \n\n`
  markdownContent += `- Supported: **`
  markdownContent += `${numberOfNonEmptyMappings} (`
  markdownContent += `${supportedPercentage})**  \n`
  markdownContent += `- Unsupported: **`
  markdownContent += `${numberOfEmptyMappings} (`
  markdownContent += `${unsupportedPercentage})**  \n\n`
  markdownContent += `##### Supported\n\n`
  markdownContent += `${supportedPlugins}  \n\n`
  markdownContent += `##### Unsupported\n\n`
  markdownContent += `${unsupportedPlugins}  \n\n`

  let filePath = path.join(__dirname, `${timestamp} - report.md`)

  fs.writeFile(filePath, markdownContent, (err) => {

    if(err){
      return res.status(500).json({error: 'Error while writing to file'})
    }

    console.log('Successfully created file at the server')
    res.download(filePath, `${timestamp} - report.md`)
    res.status(200).json({message: 'Successfully downloaded markdown file'})
  })
})

app.use(function(req, res) {
  res.status(404).send('Sorry, that route doesnt exist yet!')
});

app.listen(3000, function(){
  console.log('HTTP Server is listening on port 3000')

});
