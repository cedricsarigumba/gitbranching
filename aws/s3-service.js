const AWS = require("aws-sdk");
let s3 = new AWS.S3();
const csvParser = require("csvtojson");

const { config } = require("../config/app-config");
const log = require("../common/logger");
const utils = require("../common/utils");
const constants = require("../common/constants");
const { NoSuchKeyError, S3PutObjectError } = require("../common/custom-error");

let isS3OutputLogged = false;

/**
 * Returns the date time stamp part of the s3key
 */
const extractDateDirFromKey = s3key => utils.splitStringToArray(s3key, "/").shift();

/**
 * Locate the Deals__c.csv file in ${SF2AWS_LATEST_BUCKET} bucket using param.dir
 * This will be used to cross-check the matched deals and buyingNeed
 */
async function getDeals(dir) {
  const sf2awsLatestBucket = config["SF2AWS_LATEST_BUCKET"];
  let filteredDeals = [];

  const dealsS3Key = await getDealsCsvInDir(dir, sf2awsLatestBucket);
  const params = { Bucket: sf2awsLatestBucket, Key: dealsS3Key };

  log.info(`Retrieving Deals__c.csv in S3 [${sf2awsLatestBucket}/${dealsS3Key}]`);
  const stream = await createS3ObjStream(params);
  await csvParser(configureParserParams())
    .fromStream(stream)
    .subscribe(deal => (isDealValid(deal) ? filteredDeals.push(deal) : null));

  return filteredDeals;
}

/**
 * Retrieve the BuyingNeeds__c.csv from S3
 */
async function getBuyingNeeds(buyingNeedsKey) {
  const seSrchBucket = config["SE_SRCH_NEEDS_BUCKET"];
  const params = { Bucket: seSrchBucket, Key: buyingNeedsKey };

  log.info(`Retrieving BuyingNeeds__c.csv in S3 [${seSrchBucket}/${buyingNeedsKey}]`);
  const s3ObjStream = await createS3ObjStream(params);
  return await csvParser(configureParserParams()).fromStream(s3ObjStream);
}

/**
 * Saves the new deals to S3 in csv format
 */
async function putDeals2S3(csvPayload, dateDir, buyingNeedId) {
  const aws2sfDataBucket = config["SE_AWS2SF_DATA_BUCKET"];
  let csvChunks = utils.splitToCsvStrings(csvPayload, config["SPLIT_LIMIT"]);

  // * format: se-${env}-aws2sf-data-bucket/dt=${dateDir}/AWS_Search-{$BuyingNeeds_c.Id}-{suffix}.csv
  let s3KeyRootname = `${dateDir}/${constants.CSV_PREFIX}-${buyingNeedId}`;
  let batchSave = [];

  if (!isS3OutputLogged) {
    log.info(`Uploading csv results to ${aws2sfDataBucket}/${dateDir}`);
    isS3OutputLogged = true;
  }

  try {
    for (let i = 0, len = csvChunks.length; i < len; i++) {
      let newS3key = `${s3KeyRootname}-${("0000" + i).slice(-4)}.csv`;
      batchSave.push(save(aws2sfDataBucket, newS3key, csvChunks[i]));
    }

    await Promise.all(batchSave);
  } catch (e) {
    throw new S3PutObjectError(`An error occured during S3 save operation : ${e}`);
  }
}

/**
 * 1 Identify if the deal is already closed or ongoing with a specific buyer
 * 2 or deal is undecided and a high ranked deal.
 * If conditions are not met, then disregard the deal
 */
function isDealValid(deal) {
  const ranks = utils.splitStringToArray(config["DEAL_RANKS"]);
  const stageC = deal.dealstage__c;
  return (
    [constants.BEFORE_COMMISSIONING, constants.CASE].includes(stageC) ||
    (stageC === constants.CANDIDATE_UNDECIDED && ranks.includes(deal.corp_rank__c))
  );
}

/**
 * Retrieve Deal file inside {dir} if exists.
 * - Deal__c/{file}.csv
 */
async function getDealsCsvInDir(dir, bucket) {
  const dealFilePattern = new RegExp(`${dir}/${constants.SOBJECTS.DEAL}.*?.csv$`, "g");
  const { Contents: s3Objects } = await getObjectListInDir(dir, bucket);
  return s3Objects.find(e => dealFilePattern.test(e.Key)).Key;
}

/** Returns some or all (up to 1000) of the objects in a bucket */
const getObjectListInDir = async function(dir, bucket) {
  const params = {
    Bucket: bucket,
    Prefix: dir
  };

  return s3.listObjects(params).promise();
};

/** Converts the request object into a readable stream that can be read from or piped into a writable stream. */
const createS3ObjStream = async function(params) {
  try {
    await s3.headObject(params).promise(); // check if S3 key exist
    return s3.getObject(params).createReadStream();
  } catch (e) {
    if (e.code === "NotFound") {
      throw new NoSuchKeyError(`S3 key does not exist ${params.Key}`, e);
    }

    throw e;
  }
};

/** Put object to S3 */
const save = async function(s3bucket, s3key, s3data) {
  const params = {
    Bucket: s3bucket,
    Key: s3key,
    ServerSideEncryption: "AES256",
    Body: s3data
  };

  return s3.putObject(params).promise();
};

/** Configure csvtojson parser options */
const configureParserParams = () => ({ flatKeys: true, delimiter: ",", trim: true });

module.exports = {
  extractDateDirFromKey,
  getDeals,
  getBuyingNeeds,
  putDeals2S3
};
