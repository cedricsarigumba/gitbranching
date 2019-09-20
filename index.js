const { InputValidationError, NoSuchKeyError } = require("./common/custom-error");
const utils = require("./common/utils");
const log = require("./common/logger");

const s3Service = require("./aws/s3-service");
const needService = require("./service/need-service");
const ERROR_KEYWORD = "ERROR";

/** Main processing function */
module.exports.processMessage = async function processMessage(message) {
  log.info(`Received event: ${JSON.stringify(message, null, 2)}`);

  try {
    utils.validateRequest(message);

    const s3Key = decodeURIComponent(utils.getS3ObjFromMessage(message).object.key);
    log.info(`Processing ${JSON.stringify(s3Key)}`);

    const dateDir = s3Service.extractDateDirFromKey(s3Key);

    let deals = await s3Service.getDeals(dateDir);

    if (deals.length) {
      let buyingNeeds = await s3Service.getBuyingNeeds(s3Key);

      log.info(`Total BuyingNeeds: ${buyingNeeds.length}`);
      log.info(`Total Deals: ${deals.length}`);

      await needService.processBuyingNeeds(buyingNeeds, deals, dateDir);
    } else {
      log.info("No deals to process. Aborting operation.");
    }

    log.info("Process complete.");
    return utils.buildResponse(200, "Success!");
  } catch (e) {
    if (e instanceof InputValidationError || e instanceof NoSuchKeyError) {
      log.error(`${ERROR_KEYWORD}: `, e);
      return utils.buildResponse(500, e.message);
    }

    throw e;
  }
};
