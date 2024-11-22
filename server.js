const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const https = require('https')
const Fuse = require('fuse.js');
const url = 'https://api.hub.tekton.dev/v1/query?catalogs=Tekton&kinds=Task';
const filePath = 'tekton_tasks.json';
let fuse;

function fetchAndReadData() {
  https.get(url, (res) => {
    let data = '';

    // Accumulate data chunks
    res.on('data', (chunk) => {
      data += chunk;
    });

    // Process the response once complete
    res.on('end', () => {
      try {
        const json_data_write = JSON.parse(data);

        // Save the JSON data to a file
        fs.writeFile(filePath, JSON.stringify(json_data_write, null, 2), 'utf8', (err) => {
          if (err) {
            console.error('Error writing to file:', err);
          } else {
            console.log(`Data saved to ${filePath}`);
            fuse = new Fuse(json_data_write.data, fuseOptions);
          }
        });
      } catch (err) {
        console.error('Error parsing JSON:', err.message);
      }
    });
  }).on('error', (err) => {
    console.error('Error fetching data:', err.message);
  });
}

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
  // Date in YYYY-MM-DD, HH:MM:SS AM/PMformat
  let date = now.toLocaleDateString('en-CA', options).replace(/\/+/g, '-');
  return `${date}`;
}

app.get('/mappings', function(req, res){
  let plugin = req.query.plugin
  if(!plugin)
    return res.status(400).send({error: 'Plugin Name is required'})

  let plugin_mappings = mappings_data[plugin]
  if(!plugin_mappings)
    return res.status(404).send({error: 'Mappings for this Jenkins Plugin was not found'})

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

  res.status(201).json({'message': 'Successully created mappings'})
})

app.post('/report', function(req, res){
  
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
    res.status(201).json({message: 'Successfully created markdown file'})
  })
})

app.use(function(req, res) {
  res.status(404).send('Sorry, that route doesnt exist yet!')
});

app.listen(3000, function(){
  fetchAndReadData();
  console.log('Migration Server is successfully set up and listening on port 3000')
});
