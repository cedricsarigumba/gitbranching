const AWS = require("aws-sdk");

const { config } = require("../config/app-config");
const log = require("../common/logger");
const constants = require("../common/constants");
const utils = require("../common/utils");

AWS.config.update({ region: constants.AWS_REGION });
let ddb = new AWS.DynamoDB.DocumentClient(constants.AWS_DYNAMODB_VERSION);

const DB_PARTITION_KEY = "buying_needs_id";
const DB_BATCH_LIMIT = 25;
const DB_OPERATION_PUT = "PutRequest";
const DB_OPERATION_DELETE = "DeleteRequest";
const DB_BATCH_WRITE_MAX_RETRY = 5;
const DB_RETRY_DELAY_IN_MS = 1000;

/** Retrieve the existing deals records of this buyingNeed by partitionKey */
async function getDealsByPartitionKey(buyingNeedId) {
  var params = {
    TableName: config["DB_TABLE"],
    KeyConditionExpression: `${DB_PARTITION_KEY} = :s`,
    ExpressionAttributeValues: { ":s": buyingNeedId }
  };

  let items = [];
  let resp = {};

  do {
    if (resp.LastEvaluatedKey) params.ExclusiveStartKey = resp.LastEvaluatedKey;

    resp = await ddb.query(params).promise();
    items = [...items, ...resp.Items];
  } while (resp.LastEvaluatedKey);

  return items;
}

/** Insert ${deals} in database */
async function saveDeals(deals) {
  await putItemsToDatabase(deals, DB_OPERATION_PUT);
}

/**
 * Delete the recently added deals.
 * Called if there are exceptions during the execution of S3.putObject.
 */
async function deleteDeals(deals) {
  await putItemsToDatabase(deals, DB_OPERATION_DELETE);
}

/** Execute DynamoDb.BatchWrite operation*/
const putItemsToDatabase = async function(deals, operation) {
  let chunkNewDeals = utils.splitArrayIntoChunks(deals, DB_BATCH_LIMIT);

  log.debug(`${operation} total: [${deals[0].needsId}] : ${deals.length}`);

  for (var i = 0, len = chunkNewDeals.length; i < len; i++) {
    let batchWriteItems = buildDbPayload(chunkNewDeals[i], operation);
    await executeBatchWrite(batchWriteItems);
  }
};

const executeBatchWrite = async function(batchWriteItems) {
  let unprocessedItemsExist = true;
  let retryCounter = 0;
  let batchWriteResponse = "";

  do {
    const batchWritePayload = { RequestItems: batchWriteItems };
    batchWriteResponse = await ddb.batchWrite(batchWritePayload).promise();

    if (areThereUnprocessedItems(batchWriteResponse)) {
      batchWriteItems = batchWriteResponse.UnprocessedItems;
      log.warn(`${constants.LOG_LEVEL.WARN} Unprocessed Items : ${JSON.stringify(batchWriteItems)}`);
      retryCounter++;

      await waitBeforeTriggeringRetry();
    } else {
      unprocessedItemsExist = false;
    }
  } while (unprocessedItemsExist && retryCounter < DB_BATCH_WRITE_MAX_RETRY);

  logIfRetryLimitReached(retryCounter, batchWriteResponse);
};

const areThereUnprocessedItems = function(batchWriteResponse) {
  return Object.keys(batchWriteResponse.UnprocessedItems).length > 0;
};

const waitBeforeTriggeringRetry = async function() {
  await new Promise(resolve => setTimeout(resolve, DB_RETRY_DELAY_IN_MS));
};

const logIfRetryLimitReached = function(retryCounter, message) {
  if (retryCounter === DB_BATCH_WRITE_MAX_RETRY) {
    log.error(
      `${constants.LOG_LEVEL.ERROR} DynamoDB Error: Retry Limit Reached : ${JSON.stringify(message.UnprocessedItems)}`
    );
  }
};

/** Build DB PUT/DELETE Request Payload */
const buildDbPayload = function(items, operation) {
  let itemsObj = [];

  if (operation === DB_OPERATION_PUT) {
    itemsObj = items.map(i => {
      return {
        PutRequest: {
          Item: i.toDbItem()
        }
      };
    });
  } else if (operation === DB_OPERATION_DELETE) {
    itemsObj = items.map(i => {
      return {
        DeleteRequest: {
          Key: {
            buying_needs_id: i.needsId,
            search_sort_key: `${i.dealId}_${i.sortK}`
          }
        }
      };
    });
  }

  return { [config["DB_TABLE"]]: itemsObj };
};

module.exports = {
  getDealsByPartitionKey,
  saveDeals,
  deleteDeals
};
