const { configureApp, config } = require("./config/app-config");
const { Consumer: sqsConsumer } = require("sqs-consumer");

const app = require("./index");
const constants = require("./common/constants");
const log = require("./common/logger");

const SE_SEARCH_EXCTN_FXN_ERROR = "SeSearchExecutionFunctionError";

(async function() {
  let sqsListener;

  try {
    log.info("Starting application, loading environment configs..");
    await configureApp();

    log.info("Starting sqs-polling..");

    sqsListener = sqsConsumer.create({
      queueUrl: config["SE_SRCH_NEEDS_QUEUE"],
      region: constants.AWS_REGION,
      batchSize: config["QUEUE_BATCH_SIZE"],
      handleMessage: async message => app.processMessage(message)
    });

    // sqs-polling configuration error
    sqsListener.on("error", err => {
      log.error(`${SE_SEARCH_EXCTN_FXN_ERROR}: `, err);
    });

    // business logic error
    sqsListener.on("processing_error", err => {
      log.error(`${SE_SEARCH_EXCTN_FXN_ERROR}: `, err);
    });

    sqsListener.on("stopped", err => {
      log.info("SQS Polling stopped. Exiting application..");
    });

    sqsListener.start();
  } catch (e) {
    if (sqsListener) sqsListener.stop();

    log.error(`${SE_SEARCH_EXCTN_FXN_ERROR}: `, e);
  }
})();
