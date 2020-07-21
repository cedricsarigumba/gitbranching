"use strict";

const utils = require("../../common/utils");
const { InputValidationError } = require("../../common/custom-error");
const { ItemModel } = require("../../model/item-model");
let { CSVItem } = require("../../model/csvItem-model");
const constants = require("../../common/constants");
const { Parser: jsonParser } = require("json2csv");

describe("validateRequest", () => {
  let message;
  const MISSING_PARAM_ERROR_MSG = "s3 object parameter missing.";
  const S3_EMPTY_ERROR_MSG = "s3 key cannot be empty.";

  beforeEach(() => {
    message = {
      Body:
        '{"Records": [{"eventVersion": "2.1","eventSource": "aws:s3","awsRegion": "us-east-1","eventTime": "2019-07-03T05:49:19.361Z","eventName": "ObjectCreated:Put","userIdentity": {"principalId": "AWS:1123456789"},"requestParameters": {"sourceIPAddress": "192.168.1.1"},"responseElements": {"x-amz-request-id": "123456789","x-amz-id-2": "123456789"},"s3": {"s3SchemaVersion": "1.0","configurationId": "bucketChanges","bucket": {"name": "se-stg-search-needs-bucket","ownerIdentity": {"principalId": "1234567890"},"arn": "arn:aws:s3:::se-stg-search-needs-bucket"},"object": {"key": "dt=201907250000001/BuyingNeeds__c-20190725000001-0000.csv","size": 38,"eTag": "1234567890","sequencer": "1234567890"}}}]}'
    };
  });

  test(`S3 Obj passed is undefined: Should throw InputValidationError and "${MISSING_PARAM_ERROR_MSG}" as error message`, () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3 = undefined;
    message.Body = JSON.stringify(body);

    expect(() => {
      utils.validateRequest(message);
    }).toThrow(new InputValidationError(MISSING_PARAM_ERROR_MSG));
  });

  test(`S3 Obj passed is null: Should throw InputValidationError and "${MISSING_PARAM_ERROR_MSG}" as error message`, () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3 = null;
    message.Body = JSON.stringify(body);

    expect(() => {
      utils.validateRequest(message);
    }).toThrow(new InputValidationError(MISSING_PARAM_ERROR_MSG));
  });

  test(`S3 Obj Key passed is null: Should throw InputValidationError and "${S3_EMPTY_ERROR_MSG}" as error message`, () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3.object.key = null;
    message.Body = JSON.stringify(body);

    expect(() => {
      utils.validateRequest(message);
    }).toThrow(new InputValidationError(S3_EMPTY_ERROR_MSG));
  });

  test(`S3 Obj Key passed is undefined: Should throw InputValidationError and "${S3_EMPTY_ERROR_MSG}" as error message`, () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3.object.key = undefined;
    message.Body = JSON.stringify(body);

    expect(() => {
      utils.validateRequest(message);
    }).toThrow(new InputValidationError(S3_EMPTY_ERROR_MSG));
  });

  test(`S3 Obj Key passed is empty: Should throw InputValidationError and "${S3_EMPTY_ERROR_MSG}" as error message`, () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3.object.key = "";
    message.Body = JSON.stringify(body);

    expect(() => {
      utils.validateRequest(message);
    }).toThrow(new InputValidationError(S3_EMPTY_ERROR_MSG));
  });
});

describe("isUndefined", () => {
  test("Param pass is undefined: Should return true", () => {
    const param = undefined;
    expect(utils.isUndefined(param)).toBeTruthy();
  });

  test("Param pass is null: Should return false", () => {
    const param = null;
    expect(utils.isUndefined(param)).toBeFalsy();
  });

  test("Param pass is empty: Should return false", () => {
    const param = "";
    expect(utils.isUndefined(param)).toBeFalsy();
  });

  test("Param pass is not empty nor null nor undefined: Should return false", () => {
    const param = "notEmptyNorNullNorUndefined";
    expect(utils.isUndefined(param)).toBeFalsy();
  });
});

describe("getS3ObjFromMessage", () => {
  test("Process is successful: Should return the S3Obj from message", () => {
    const message = {
      Body:
        '{"Records": [{"eventVersion": "2.1","eventSource": "aws:s3","awsRegion": "us-east-1","eventTime": "2019-07-03T05:49:19.361Z","eventName": "ObjectCreated:Put","userIdentity": {"principalId": "AWS:1123456789"},"requestParameters": {"sourceIPAddress": "192.168.1.1"},"responseElements": {"x-amz-request-id": "123456789","x-amz-id-2": "123456789"},"s3": {"s3SchemaVersion": "1.0","configurationId": "bucketChanges","bucket": {"name": "se-stg-search-needs-bucket","ownerIdentity": {"principalId": "1234567890"},"arn": "arn:aws:s3:::se-stg-search-needs-bucket"},"object": {"key": "dt=201907250000001/BuyingNeeds__c-20190725000001-0000.csv","size": 38,"eTag": "1234567890","sequencer": "1234567890"}}}]}'
    };
    const s3Obj = {
      s3SchemaVersion: "1.0",
      configurationId: "bucketChanges",
      bucket: {
        name: "se-stg-search-needs-bucket",
        ownerIdentity: { principalId: "1234567890" },
        arn: "arn:aws:s3:::se-stg-search-needs-bucket"
      },
      object: {
        key: "dt=201907250000001/BuyingNeeds__c-20190725000001-0000.csv",
        size: 38,
        eTag: "1234567890",
        sequencer: "1234567890"
      }
    };
    expect(utils.getS3ObjFromMessage(message)).toStrictEqual(s3Obj);
  });
});

describe("buildResponse", () => {
  test("Process is successful: Should build response", () => {
    const status = "status";
    const body = "body";
    const response = {
      statusCode: status,
      headers: {
        "Content-Type": "application/json"
      },
      body: body
    };
    expect(utils.buildResponse(status, body)).toStrictEqual(response);
  });
});

describe("splitStringToArray", () => {
  test("Phrase passed in not undefined nor null nor empty but there is no separator passed: Should return an empty array", () => {
    const phrase = "A,B,C";

    expect(utils.splitStringToArray(phrase)).toStrictEqual(["A", "B", "C"]);
  });

  test("Phrase passed in not undefined nor null nor empty and there is a separator passed: Should return an empty array", () => {
    const phrase = "A;B;C";
    const separator = ";";

    expect(utils.splitStringToArray(phrase, separator)).toStrictEqual(["A", "B", "C"]);
  });

  test("Phrase passed in undefined: Should return an empty array", () => {
    const phrase = undefined;
    const separator = ",";

    expect(utils.splitStringToArray(phrase, separator)).toStrictEqual([]);
  });

  test("Phrase passed in null: Should return an empty array", () => {
    const phrase = null;
    const separator = ",";

    expect(utils.splitStringToArray(phrase, separator)).toStrictEqual([]);
  });

  test("Phrase passed in empty: Should return an empty array", () => {
    const phrase = "";
    const separator = ",";

    expect(utils.splitStringToArray(phrase, separator)).toStrictEqual([]);
  });
});

describe("isElementExist", () => {
  test("Element does exist: Should return true", () => {
    const arr = ["A", "B", "C"];
    const e = "A";
    expect(utils.isElementExist(arr, e)).toBeTruthy();
  });

  test("Element doesn't exist: Should return false", () => {
    const arr = ["A", "B", "C"];
    const e = "Z";
    expect(utils.isElementExist(arr, e)).toBeFalsy();
  });

  test("String pass is undefined: Should return false", () => {
    const arr = ["A", "B", "C"];
    const e = undefined;
    expect(utils.isElementExist(arr, e)).toBeFalsy();
  });

  test("String pass is null: Should return false", () => {
    const arr = ["A", "B", "C"];
    const e = null;
    expect(utils.isElementExist(arr, e)).toBeFalsy();
  });

  test("String pass is empty: Should return false", () => {
    const arr = ["A", "B", "C"];
    const e = "";
    expect(utils.isElementExist(arr, e)).toBeFalsy();
  });
});

describe("constructCsvPayload", () => {
  test("Process is successful: Should return the deals in CSVItem format", () => {
    const arr = [
      new ItemModel(
        "sobject1",
        "_Needs",
        { id: "dId1", ownerid: "dOwnerId1" },
        { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" }
      ),
      new ItemModel(
        "sobject2",
        "_Deal",
        { id: "dId2", ownerid: "dOwnerId2" },
        { id: "nId2", ownerid: "nOwnerId2", account__c: "account__c2" }
      )
    ];

    const expected = [
      new CSVItem("sobject1", "dId1", "nId1", "account__c1", "nOwnerId1"),
      new CSVItem("sobject2", "dId2", "nId2", "account__c2", "dOwnerId2")
    ];

    expect(utils.constructCsvPayload(arr)).toStrictEqual(expected);
  });
});

describe("splitArrayIntoChunks", () => {
  test("Split array into chunks successful: Should return the array chunks", () => {
    const arr = ["A", "B", "C", "D", "E", "F"];
    const splitLimit = 2;

    const expected = [
      ["A", "B"],
      ["C", "D"],
      ["E", "F"]
    ];

    expect(utils.splitArrayIntoChunks(arr, splitLimit)).toStrictEqual(expected);
  });
});

describe("splitToCsvStrings", () => {
  test("Split to CSV Strings is successful: Should return CSV Strings", () => {
    const recordsArray = [
      {
        sObject: "sObject1",
        DealId__c: "DealId__c1",
        NeedsId__c: "NeedsId__c1",
        AccountId__c: "AccountId__c1",
        OwnerId: "OwnerId1"
      },
      {
        sObject: "sObject2",
        DealId__c: "DealId__c2",
        NeedsId__c: "NeedsId__c2",
        AccountId__c: "AccountId__c2",
        OwnerId: "OwnerId2"
      },
      {
        sObject: "sObject3",
        DealId__c: "DealId__c3",
        NeedsId__c: "NeedsId__c3",
        AccountId__c: "AccountId__c3",
        OwnerId: "OwnerId3"
      },
      {
        sObject: "sObject4",
        DealId__c: "DealId__c4",
        NeedsId__c: "NeedsId__c4",
        AccountId__c: "AccountId__c4",
        OwnerId: "OwnerId4"
      }
    ];
    const splitLimit = 2;

    const json2csvParser = new jsonParser({ fields: constants.CSV_HEADERS, quote: "" });
    const recordsArrayCopy = Array.from(recordsArray);
    const expected = [
      json2csvParser.parse(recordsArrayCopy.splice(0, splitLimit)),
      json2csvParser.parse(recordsArrayCopy.splice(0, splitLimit))
    ];

    expect(utils.splitToCsvStrings(recordsArray, splitLimit)).toStrictEqual(expected);
  });
});

describe("stringToBool", () => {
  test(`String passed is "TRUE": Should return true`, () => {
    var param = "TRUE";
    expect(utils.stringToBool(param)).toBeTruthy();
  });

  test(`String passed is "true": Should return true`, () => {
    var param = "true";
    expect(utils.stringToBool(param)).toBeTruthy();
  });

  test(`String passed is "FALSE": Should return false`, () => {
    var param = "FALSE";
    expect(utils.stringToBool(param)).toBeFalsy();
  });

  test(`String passed is "false": Should return false`, () => {
    var param = "false";
    expect(utils.stringToBool(param)).toBeFalsy();
  });
});

describe("isNonEmptyArray", () => {
  test("Array passed is not empty nor null nor undefined: Should return true", () => {
    const arr = ["A", "B", "C"];
    expect(utils.isNonEmptyArray(arr)).toBeTruthy();
  });

  test("Array passed is null: Should return false", () => {
    const arr = null;
    expect(utils.isNonEmptyArray(arr)).toBeFalsy();
  });

  test("Array passed is undefined: Should return false", () => {
    const arr = undefined;
    expect(utils.isNonEmptyArray(arr)).toBeFalsy();
  });

  test("Array passed is empty: Should return false", () => {
    const arr = [];
    expect(utils.isNonEmptyArray(arr)).toBeFalsy();
  });
});

describe("isEmptyString", () => {
  test("All possible combinations: should return correct boolean", () => {
    expect(utils.isEmptyString(undefined)).toBeTruthy();
    expect(utils.isEmptyString("")).toBeTruthy();
    expect(utils.isEmptyString(null)).toBeTruthy();
    expect(utils.isEmptyString("hoge")).toBeFalsy();
    expect(utils.isEmptyString(1)).toBeFalsy();
  });
});

describe("nonNull", () => {
  test("All possible combinations: should return correct boolean", () => {
    expect(utils.nonNull(null)).toBeFalsy();
    expect(utils.nonNull(undefined)).toBeTruthy();
    expect(utils.nonNull("")).toBeTruthy();
    expect(utils.nonNull("hoge")).toBeTruthy();
    expect(utils.nonNull(1)).toBeTruthy();
  });
});

describe("isNull", () => {
  test("All possible combinations: should return correct boolean", () => {
    expect(utils.isNull(null)).toBeTruthy();
    expect(utils.isNull(undefined)).toBeFalsy();
    expect(utils.isNull("")).toBeFalsy();
    expect(utils.isNull("hoge")).toBeFalsy();
    expect(utils.isNull(1)).toBeFalsy();
  });
});
