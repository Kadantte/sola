require("dotenv").config();
const path = require("path");
const child_process = require("child_process");
const fs = require("fs-extra");
const fetch = require("node-fetch");

const {SOLA_SOLR_URL, SOLA_SOLR_CORE} = process.env;

const createCore = async (coreName) => {
  console.log(`Check if solr core ${coreName} already loaded`);
  const result = await fetch(`${SOLA_SOLR_URL}admin/cores?wt=json`).then((res) => res.json());

  if (Object.keys(result.status).includes(coreName)) {
    console.log(`Unloading existing core ${coreName}`);
    await fetch(`${SOLA_SOLR_URL}admin/cores?action=UNLOAD&core=${coreName}&wt=json`);
  }

  const instanceDir = path.join("/var/solr/data", coreName);
  const dataDir = path.join(instanceDir, "data");
  const config = path.join(instanceDir, "solrconfig.xml");
  const schema = path.join(instanceDir, "schema.xml");
  if (fs.existsSync(instanceDir)) {
    console.log("Removing previous core");
    fs.removeSync(instanceDir);
  }
  console.log(`Creating solr core ${coreName}`);
  fs.ensureDirSync(instanceDir);
  fs.copySync(path.join(__dirname, "../solr-conf", "solrconfig.xml"), config);
  fs.copySync(path.join(__dirname, "../solr-conf", "schema.xml"), schema);
  child_process.execSync(`chown -R solr:solr "${instanceDir}"`);
  // `${SOLA_SOLR_URL}admin/cores?action=CREATE&name=${coreName}&instanceDir=/opt/solr_data/lire_0&configSet=liresolr_conf` for docker
  fetch(`${SOLA_SOLR_URL}admin/cores?action=CREATE&name=${coreName}&instanceDir=${instanceDir}&dataDir=${dataDir}&config=${config}&schema=${schema}`)
    .then((response) => {
      console.log(response);
    })
    .catch((error) => {
      console.log(error);
    });
};

((num = 4) => {
  Array.from(new Array(parseInt(num, 10)), (_, index) => index)
    .reduce((chain, i) => chain.then(() => createCore(`${SOLA_SOLR_CORE}_${i}`)), Promise.resolve([]));
})(process.argv[2]);
