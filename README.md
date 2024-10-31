# Jenkins Plugins -> Tekton Tasks Migration HTTP Server

## Project Setup
- Please have `npm` and `node` installed in your system before you start running the project. You can verify the installation using `npm -v` and `node -v`.
- Run `npm install` to install all the plugins necessary in order to run this project.
- Run `node server.js` to run the HTTP Server.

## Endpoints
- `GET /tasks/data` =  Returns the list of all Tekton tasks available in Tekton Hub in a JSON format.
- `POST /mappings` =  Returns the list of available mappings of Jenkins Plugins provided as input to Tekton Tasks available in Tekton Hub. This makes use of a fuzzy search library in Javascript (fuse.js) and assigns a score to each mapping (most likely to least likely). At the moment, we are searching for Jenkins `plugin name` in `description` and `task name`. `categories` and `tags` are not included during the search. cuRL Request to /mappings endpoint will look like:
```
curl -X POST https://example.com/api \
-H "Content-Type: application/json" \
-d '{
    "plugins": ["git", "prometheus", "mailer"]
}'
```
