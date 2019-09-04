const { InputValidationError } = require("./custom-error");
const constants = require("../common/constants");
const { Parser: jsonParser } = require("json2csv");

const buildResponse = function(status, body) {
  var response = {
    statusCode: status,
    headers: {
      "Content-Type": "application/json"
    },
    body: body
  };

  return response;
};

const validateRequest = function(message) {
  let s3Obj = getS3ObjFromMessage(message);

  if (isUndefined(s3Obj) || s3Obj === null) {
    throw new InputValidationError("s3 object parameter missing.");
  }

  if (isEmptyString(s3Obj.object.key)) {
    throw new InputValidationError("s3 key cannot be empty.");
  }
};

const splitArrayIntoChunks = function(recordsArray, splitLimit) {
  var arr = [];

  for (index = 0, arrayLength = recordsArray.length; index < arrayLength; index += splitLimit) {
    arr.push(recordsArray.slice(index, index + splitLimit));
  }

  return arr;
};

const splitToCsvStrings = function(recordsArray, splitLimit) {
  let csvStringArray = [];
  const json2csvParser = new jsonParser({ fields: constants.CSV_HEADERS, quote: "" });

  while (recordsArray.length) {
    csvStringArray.push(toCsvString(recordsArray.splice(0, splitLimit), json2csvParser));
  }

  return csvStringArray;
};

const toCsvString = (records, json2csvParser) => json2csvParser.parse(records);

const getS3ObjFromMessage = message => JSON.parse(message.Body).Records[0].s3;

const splitStringToArray = (phrase, separator = ",") => phrase.split(separator);

const constructCsvPayload = arr => arr.map(deal => deal.toCsvItem());

const isElementExist = (arr, e) => arr.indexOf(e) !== -1;

const stringToBool = phrase => phrase.toLowerCase() == "true";

const isUndefined = obj => obj === undefined;

/** private */
const isEmptyString = value =>
  value === null || typeof value == "undefined" || (typeof value == "string" && !value.trim());

module.exports = {
  validateRequest,
  isUndefined,
  getS3ObjFromMessage,
  buildResponse,
  splitStringToArray,
  isElementExist,
  constructCsvPayload,
  splitArrayIntoChunks,
  splitToCsvStrings,
  stringToBool
};
