const { configureApp, config } = require("./config/app-config");
const { Consumer: sqsConsumer } = require("sqs-consumer");

const app = require("./index");
const constants = require("./common/constants");
const log = require("./common/logger");

const ERROR_KEYWORD = "ERROR";

(async function() {
  let sqsListener;

  try {
    log.info("Starting application, loading environment configs..");
    await configureApp();

    const QUEUE_URL = config["SE_SRCH_NEEDS_QUEUE"];
    log.info(`Starting sqs-polling : ${QUEUE_URL}`);

    sqsListener = sqsConsumer.create({
      queueUrl: QUEUE_URL,
      region: constants.AWS_REGION,
      batchSize: config["QUEUE_BATCH_SIZE"],
      handleMessage: async message => app.processMessage(message)
    });

    // sqs-polling configuration error
    sqsListener.on("error", err => {
      log.error(`${ERROR_KEYWORD}: `, err);
    });

    // business logic error
    sqsListener.on("processing_error", err => {
      log.error(`${ERROR_KEYWORD}: `, err);
    });

    sqsListener.on("stopped", err => {
      log.info("SQS Polling stopped. Exiting application..");
    });

    sqsListener.start();
  } catch (e) {
    if (sqsListener) sqsListener.stop();

    log.error(`${ERROR_KEYWORD}: `, e);
  }
})();
