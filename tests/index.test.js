"use strict";

const index = require("../index");
const mockS3Service = require("../aws/s3-service");
const mockNeedService = require("../service/need-service");
const utils = require("../common/utils");

describe("processMessage", () => {
  let message;
  const MOCK_DATE_DIR = "dt=201907250000001";
  const MOCK_EMPTY_DEALS = [];
  const MOCK_DEALS = [
    {
      prefname__c: "prefname__c1",
      countryresidence__c: "countryresidence__c1",
      industry_small__c: "industry_small__c1",
      industrysmall1__c: "industry_small__c1",
      industrysmall2__c: "industry_small__c1",
      industrysmall3__c: "industry_small__c1"
    },
    {
      prefname__c: "prefname__c2",
      countryresidence__c: "countryresidence__c2",
      industry_small__c: "industry_small__c2",
      industrysmall1__c: "industry_small__c2",
      industrysmall2__c: "industry_small__c2",
      industrysmall3__c: "industry_small__c2"
    }
  ];
  const MOCK_BUYING_NEEDS = [
    {
      id: "id1",
      industry_small__c: "industry_small__c1;industry_small__c2",
      prefname__c: "prefname__c1;prefname__c2",
      countryresidence__c: "countryresidence__c1;countryresidence__c2"
    }
  ];
  const SUCCESS_CODE = 200;
  const SUCCESS_MSG = "Success!";
  const ERROR_CODE = 500;
  const MISSING_PARAM_ERROR_MSG = "s3 object parameter missing.";
  const S3_EMPTY_ERROR_MSG = "s3 key cannot be empty.";
  const UNEXPECTED_ERROR_MSG = "Unexpected error occurred!";

  beforeEach(() => {
    message = {
      Body:
        '{"Records": [{"eventVersion": "2.1","eventSource": "aws:s3","awsRegion": "us-east-1","eventTime": "2019-07-03T05:49:19.361Z","eventName": "ObjectCreated:Put","userIdentity": {"principalId": "AWS:1123456789"},"requestParameters": {"sourceIPAddress": "192.168.1.1"},"responseElements": {"x-amz-request-id": "123456789","x-amz-id-2": "123456789"},"s3": {"s3SchemaVersion": "1.0","configurationId": "bucketChanges","bucket": {"name": "se-stg-search-needs-bucket","ownerIdentity": {"principalId": "1234567890"},"arn": "arn:aws:s3:::se-stg-search-needs-bucket"},"object": {"key": "dt=201907250000001/BuyingNeeds__c-20190725000001-0000.csv","size": 38,"eTag": "1234567890","sequencer": "1234567890"}}}]}'
    };
    mockS3Service.extractDateDirFromKey = jest.fn().mockReset();
    mockS3Service.getDeals = jest.fn().mockReset();
    mockS3Service.getBuyingNeeds = jest.fn().mockReset();
    mockNeedService.processBuyingNeeds = jest.fn().mockReset();
  });

  test(`Env is prd and deals are not empty and process is successful: Should return ${SUCCESS_CODE} and "${SUCCESS_MSG}" as message`, async () => {
    jest.resetModules();
    process.env.PROFILE = "prd";
    let indexTmp = require("../index");
    let mockS3ServiceTmp = require("../aws/s3-service");
    let mockNeedServiceTmp = require("../service/need-service");

    mockS3ServiceTmp.extractDateDirFromKey = jest.fn().mockImplementation(() => {
      return MOCK_DATE_DIR;
    });
    mockS3ServiceTmp.getDeals = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockS3ServiceTmp.getBuyingNeeds = jest.fn().mockImplementation(() => {
      return MOCK_BUYING_NEEDS;
    });
    mockNeedServiceTmp.processBuyingNeeds = jest.fn();
    const dateParam = decodeURIComponent(utils.getS3ObjFromMessage(message).object.key);

    const actual = await indexTmp.processMessage(message);
    expect(actual.statusCode).toStrictEqual(SUCCESS_CODE);
    expect(actual.body).toStrictEqual(SUCCESS_MSG);
    expect(mockS3ServiceTmp.extractDateDirFromKey).toBeCalled();
    expect(mockS3ServiceTmp.extractDateDirFromKey).toBeCalledWith(dateParam);
    expect(mockS3ServiceTmp.getDeals).toBeCalled();
    expect(mockS3ServiceTmp.getDeals).toBeCalledWith(MOCK_DATE_DIR);
    expect(mockS3ServiceTmp.getBuyingNeeds).toBeCalled();
    expect(mockS3ServiceTmp.getBuyingNeeds).toBeCalledWith(dateParam);
    expect(mockNeedServiceTmp.processBuyingNeeds).toBeCalled();
    expect(mockNeedServiceTmp.processBuyingNeeds).toBeCalledWith(MOCK_BUYING_NEEDS, MOCK_DEALS, MOCK_DATE_DIR);
  });

  test(`Deals are not empty and process is successful: Should return ${SUCCESS_CODE} and "${SUCCESS_MSG}" as message`, async () => {
    mockS3Service.extractDateDirFromKey = jest.fn().mockImplementation(() => {
      return MOCK_DATE_DIR;
    });
    mockS3Service.getDeals = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockS3Service.getBuyingNeeds = jest.fn().mockImplementation(() => {
      return MOCK_BUYING_NEEDS;
    });
    mockNeedService.processBuyingNeeds = jest.fn();
    const dateParam = decodeURIComponent(utils.getS3ObjFromMessage(message).object.key);

    const actual = await index.processMessage(message);
    expect(actual.statusCode).toStrictEqual(SUCCESS_CODE);
    expect(actual.body).toStrictEqual(SUCCESS_MSG);
    expect(mockS3Service.extractDateDirFromKey).toBeCalled();
    expect(mockS3Service.extractDateDirFromKey).toBeCalledWith(dateParam);
    expect(mockS3Service.getDeals).toBeCalled();
    expect(mockS3Service.getDeals).toBeCalledWith(MOCK_DATE_DIR);
    expect(mockS3Service.getBuyingNeeds).toBeCalled();
    expect(mockS3Service.getBuyingNeeds).toBeCalledWith(dateParam);
    expect(mockNeedService.processBuyingNeeds).toBeCalled();
    expect(mockNeedService.processBuyingNeeds).toBeCalledWith(MOCK_BUYING_NEEDS, MOCK_DEALS, MOCK_DATE_DIR);
  });

  test(`Deals are empty: Should return ${SUCCESS_CODE} and "${SUCCESS_MSG}" as message`, async () => {
    mockS3Service.extractDateDirFromKey = jest.fn().mockImplementation(() => {
      return MOCK_DATE_DIR;
    });
    mockS3Service.getDeals = jest.fn().mockImplementation(() => {
      return MOCK_EMPTY_DEALS;
    });
    const dateParam = decodeURIComponent(utils.getS3ObjFromMessage(message).object.key);

    const actual = await index.processMessage(message);
    expect(actual.statusCode).toStrictEqual(SUCCESS_CODE);
    expect(actual.body).toStrictEqual(SUCCESS_MSG);
    expect(mockS3Service.extractDateDirFromKey).toBeCalled();
    expect(mockS3Service.extractDateDirFromKey).toBeCalledWith(dateParam);
    expect(mockS3Service.getDeals).toBeCalled();
    expect(mockS3Service.getDeals).toBeCalledWith(MOCK_DATE_DIR);
    expect(mockS3Service.getBuyingNeeds).not.toBeCalled();
    expect(mockNeedService.processBuyingNeeds).not.toBeCalled();
  });

  test(`Message passed is undefined: Should return ${ERROR_CODE} as error code and "${MISSING_PARAM_ERROR_MSG}" as error message`, async () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3 = undefined;
    message.Body = JSON.stringify(body);

    const actual = await index.processMessage(message);
    expect(actual.statusCode).toStrictEqual(ERROR_CODE);
    expect(actual.body).toStrictEqual(MISSING_PARAM_ERROR_MSG);
    expect(mockS3Service.extractDateDirFromKey).not.toBeCalled();
    expect(mockS3Service.getDeals).not.toBeCalled();
    expect(mockS3Service.getBuyingNeeds).not.toBeCalled();
    expect(mockNeedService.processBuyingNeeds).not.toBeCalled();
  });

  test(`Message passed is null: Should return ${ERROR_CODE} as error code and "${MISSING_PARAM_ERROR_MSG}" as error message`, async () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3 = null;
    message.Body = JSON.stringify(body);

    const actual = await index.processMessage(message);
    expect(actual.statusCode).toStrictEqual(ERROR_CODE);
    expect(actual.body).toStrictEqual(MISSING_PARAM_ERROR_MSG);
    expect(mockS3Service.extractDateDirFromKey).not.toBeCalled();
    expect(mockS3Service.getDeals).not.toBeCalled();
    expect(mockS3Service.getBuyingNeeds).not.toBeCalled();
    expect(mockNeedService.processBuyingNeeds).not.toBeCalled();
  });

  test(`S3 key is null: Should return ${ERROR_CODE} as error code and "${S3_EMPTY_ERROR_MSG}" as error message`, async () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3.object.key = null;
    message.Body = JSON.stringify(body);

    const actual = await index.processMessage(message);
    expect(actual.statusCode).toStrictEqual(ERROR_CODE);
    expect(actual.body).toStrictEqual(S3_EMPTY_ERROR_MSG);
    expect(mockS3Service.extractDateDirFromKey).not.toBeCalled();
    expect(mockS3Service.getDeals).not.toBeCalled();
    expect(mockS3Service.getBuyingNeeds).not.toBeCalled();
    expect(mockNeedService.processBuyingNeeds).not.toBeCalled();
  });

  test(`S3 key is undefined: Should return ${ERROR_CODE} as error code and "${S3_EMPTY_ERROR_MSG}" as error message`, async () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3.object.key = undefined;
    message.Body = JSON.stringify(body);

    const actual = await index.processMessage(message);
    expect(actual.statusCode).toStrictEqual(ERROR_CODE);
    expect(actual.body).toStrictEqual(S3_EMPTY_ERROR_MSG);
    expect(mockS3Service.extractDateDirFromKey).not.toBeCalled();
    expect(mockS3Service.getDeals).not.toBeCalled();
    expect(mockS3Service.getBuyingNeeds).not.toBeCalled();
    expect(mockNeedService.processBuyingNeeds).not.toBeCalled();
  });

  test(`S3 key is empty: Should return ${ERROR_CODE} as error code and "${S3_EMPTY_ERROR_MSG}" as error message`, async () => {
    let body = JSON.parse(message.Body);
    body.Records[0].s3.object.key = "";
    message.Body = JSON.stringify(body);

    const actual = await index.processMessage(message);
    expect(actual.statusCode).toStrictEqual(ERROR_CODE);
    expect(actual.body).toStrictEqual(S3_EMPTY_ERROR_MSG);
    expect(mockS3Service.extractDateDirFromKey).not.toBeCalled();
    expect(mockS3Service.getDeals).not.toBeCalled();
    expect(mockS3Service.getBuyingNeeds).not.toBeCalled();
    expect(mockNeedService.processBuyingNeeds).not.toBeCalled();
  });

  test(`Unexpected error occurred: Should throw error`, async () => {
    mockS3Service.extractDateDirFromKey = jest.fn().mockImplementation(() => {
      throw new Error(UNEXPECTED_ERROR_MSG);
    });
    const dateParam = decodeURIComponent(utils.getS3ObjFromMessage(message).object.key);

    await expect(index.processMessage(message)).rejects.toThrow(new Error(UNEXPECTED_ERROR_MSG));
    expect(mockS3Service.extractDateDirFromKey).toBeCalled();
    expect(mockS3Service.extractDateDirFromKey).toBeCalledWith(dateParam);
    expect(mockS3Service.getDeals).not.toBeCalled();
    expect(mockS3Service.getBuyingNeeds).not.toBeCalled();
    expect(mockNeedService.processBuyingNeeds).not.toBeCalled();
  });
});
