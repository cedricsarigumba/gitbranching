const utils = require("../common/utils");
const { S3PutObjectError } = require("../common/custom-error");
const log = require("../common/logger");

const s3Service = require("../aws/s3-service");
const dbService = require("../aws/dynamodb-service");
const dealService = require("./deal-service");

/** Process each buying needs, cross-check with each deals to identify the eligible/matched deals */
async function processBuyingNeeds(buyingNeeds, deals, dateDir) {
  let newDealsTotal = [];

  for (var i = 0, len = buyingNeeds.length; i < len; i++) {
    let need = buyingNeeds[i];
    let newDeals = [];

    try {
      let matchedDeals;
      let industrySmallList = utils.splitStringToArray(need.industry_small__c, ";");

      if (industryListExist(industrySmallList)) {
        matchedDeals = dealService.findDealsUsingCurrentSearchFlow(need, deals);
      } else {
        matchedDeals = dealService.findDealsUsingNewSearchFlow(need, deals);
      }

      if (matchedDeals.length) {
        let oldDeals = await dbService.getDealsByPartitionKey(need.id);
        newDeals = dealService.findNewDeals(oldDeals, matchedDeals, need);

        if (!newDeals.length) {
          // do nothing. no new deals to process for this buyingNeed
          log.debug(`No newDeals for buyingNeed [${need.id}], skipping..`);
          continue;
        }

        await dbService.saveDeals(newDeals);
        newDealsTotal = [...newDealsTotal, ...newDeals];

        let csvPayload = utils.constructCsvPayload(newDeals);
        await s3Service.putDeals2S3(csvPayload, dateDir, need.id);
      } else {
        log.info(`No matchDeals for buyingNeed [${need.id}], skipping..`);
        continue;
      }
    } catch (e) {
      if (e instanceof S3PutObjectError) {
        log.error(`An exception occured during executing s3.putObject, rolling-back changes..`);
        await dbService.deleteDeals(newDealsTotal);
        newDealsTotal = [];
      }

      throw e;
    }
  }

  log.info(`Total number of new data inserted: ${newDealsTotal.length}`);
}

function industryListExist(industryList) {
  return utils.isNonEmptyArray(industryList);
}

module.exports.processBuyingNeeds = processBuyingNeeds;
