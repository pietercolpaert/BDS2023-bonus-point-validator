const rdfDereferencer = require("rdf-dereference").default;
const process = require('process');
const fs = require("fs");

let file = 'entrypoints-example.json';
let entrypoints = [];
if (process.argv[2]) {
  file = process.argv[2];  
} else {
  console.error('Using entrypoints-example.json -- change the file by providing a path in the second argument');
}

if (fs.existsSync(file)) {
  entrypoints = JSON.parse(fs.readFileSync(file));
} else {
  console.error('File ' + file + ' doesn’t exist');
  process.exit();
}

console.log('People who indicated somehow they know Pieter Colpaert');

//Pages that I want to ignore for my use case
let history = ['https://riccardotommasini.com/', 'https://ruben.verborgh.org/profile/#me', 'https://sven-lieber.org/profile#me', 'https://www.rubensworks.net/#me'] ;
let results = [];
let searchURLListRecursively = async function (urls) {
  for (let url of urls) {
    console.error('GET ' + url);
    history.push(url);
    try {
      const { data: triples } = await rdfDereferencer.dereference(url);
      let nextPossibilities = [];
      triples.on('data', (triple) => {
        if ((triple.predicate.value === 'http://xmlns.com/foaf/0.1/knows' || triple.predicate.value === 'http://www.wikidata.org/prop/direct/P3342')) {
          //If you found Pieter Colpaert, add it to the result list if it isn’t already
          if (triple.object.value === 'https://pietercolpaert.be/#me' || triple.object.value === 'http://www.wikidata.org/entity/Q66736299') {
            if(results.indexOf(triple.subject.value) === -1) {
              results.push(triple.subject.value);
              console.log(' * ' + triple.subject.value);
            }
          } else {
            //we didn’t find Pieter Colpaert, but someone else that we’d like to follow to see whether they indicated they know Pieter Colpaert. Let’s however not follow this person if we already visited their page before.
            if (history.indexOf(triple.object.value) === -1) {
              nextPossibilities.push(triple.object.value);
            }
          }
        }
      });
      triples.on('error', () => { console.error('Problem parsing ' + url + ', but just continuing')});
      triples.on('end', () => {
        searchURLListRecursively(nextPossibilities);
      });
    } catch (e) {
      console.error(e);
    }
  }
  
}

searchURLListRecursively(entrypoints);
