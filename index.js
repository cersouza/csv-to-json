import {
  promises as fs,
  watchFile
} from 'fs';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync.js';
import Koa from 'koa';

const csvFilePath = './data.csv';
const jsonFilePath = './data.json';
let globalDb = {};

start();

async function start() {
  globalDb = await setUpDataBase(jsonFilePath);

  setUpAPI(globalDb);

  genrateJsonFileFromCsvFile(csvFilePath, jsonFilePath);

  watchFile(csvFilePath, async (curr, prev) => {
    const data = await getJsonFromCsvFile(csvFilePath);
    globalDb.get('data').set('data', data).write();
  });
}

async function setUpAPI(db) {
  try {
    const app = new Koa();
    const port = 3000;

    app.use(ctx => {
      const data = db.get('data');
      ctx.body = {
        data
      }
    });

    app.listen(port);
    console.log(`> API has started on port ${port}!`);
  } catch (err) {
    console.log(`> An error has ocorred when setup API`, err);
  }
}

function setUpDataBase(dbJsonFilePath) {
  let db = {};
  try {
    const adapter = new FileSync(dbJsonFilePath);

    db = low(adapter);

    db.defaults({
      data: []
    }).write();
    
    console.log('> Database has started !');    
  } catch (err) {
    console.log('> An error has ocurred when setup Database', err);
  }

  return db;
};

async function getJsonFromCsvFile(csvFilePath) {
  let json = null;
  try {
    const data = await fs.readFile(csvFilePath, 'utf-8');
    json = csvToJson(data.replace(/\r/g, ''));
  } catch (err) {
    console.log(err);
  }

  return json;
};

async function genrateJsonFileFromCsvFile(csvFilePath, jsonFilePath) {
  try {
    const data = await fs.readFile(csvFilePath, 'utf-8');
    const json = csvToJson(data.replace(/\r/g, ''));
    await fs.writeFile(jsonFilePath, JSON.stringify(json));
  } catch (err) {
    console.log(err);
  }
};

function csvToJson(csvText) {
  const [csvHeaders, ...csvData] = csvText.split('\n');
  const headers = csvHeaders.split(',');
  const json = {
    data: []
  };

  for (let row of csvData) {
    let item = {};
    let data = row.split(',');

    data.forEach((dataAttribute, columnId) => {
      let headerName = headers[columnId];
      item[headerName] = dataAttribute
    });

    json.data.push(item);
  }
  return json;
}