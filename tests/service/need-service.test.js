"use strict";

const needService = require("../../service/need-service");
let { CSVItem } = require("../../model/csvItem-model");
const { ItemModel } = require("../../model/item-model");
const { S3PutObjectError } = require("../../common/custom-error");
const mockS3Service = require("../../aws/s3-service");
const mockDbService = require("../../aws/dynamodb-service");
const mockDealService = require("../../service/deal-service");

describe("processBuyingNeeds", () => {
  let MOCK_BUYING_NEEDS;
  let MOCK_DEALS;
  let MOCK_NEW_DEALS;
  const MOCK_DATE_DIR = "dt=201907250000001";
  const MOCK_EMPTY_BUYING_NEEDS = [];
  const MOCK_EMPTY_DEALS = [];

  beforeEach(() => {
    MOCK_BUYING_NEEDS = [
      {
        id: "id1",
        industry_small__c: "industry_small__c1;industry_small__c2",
        prefname__c: "prefname__c1;prefname__c2",
        countryresidence__c: "countryresidence__c1;countryresidence__c2",
      },
      {
        id: "id2",
        industry_small__c: "",
        prefname__c: "prefname__c1;prefname__c2",
        countryresidence__c: "countryresidence__c1;countryresidence__c2",
      },
    ];

    MOCK_DEALS = [
      {
        prefname__c: "prefname__c1",
        countryresidence__c: "countryresidence__c1",
        industry_small__c: "industry_small__c1",
        industrysmall1__c: "industry_small__c1",
        industrysmall2__c: "industry_small__c1",
        industrysmall3__c: "industry_small__c1",
      },
      {
        prefname__c: "prefname__c2",
        countryresidence__c: "countryresidence__c2",
        industry_small__c: "industry_small__c2",
        industrysmall1__c: "industry_small__c2",
        industrysmall2__c: "industry_small__c2",
        industrysmall3__c: "industry_small__c2",
      },
    ];

    MOCK_NEW_DEALS = [
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
      ),
    ];

    mockDealService.findMatchedDeals = jest.fn().mockReset();
    mockDealService.findNewDeals = jest.fn().mockReset();
    mockDbService.getDealsByPartitionKey = jest.fn().mockReset();
    mockDbService.saveDeals = jest.fn().mockReset();
    mockDbService.deleteDeals = jest.fn().mockReset();
    mockS3Service.putDeals2S3 = jest.fn().mockReset();
  });

  test(`Processing is successful: Should not throw error`, async () => {
    mockDealService.findMatchedDeals = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockDbService.getDealsByPartitionKey = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockDealService.findNewDeals = jest.fn().mockImplementation(() => {
      return MOCK_NEW_DEALS;
    });
    mockDbService.saveDeals = jest.fn();
    mockDbService.deleteDeals = jest.fn();
    mockS3Service.putDeals2S3 = jest.fn();

    const csvPayload = [
      new CSVItem("sobject1", "dId1", "nId1", "account__c1", "nOwnerId1"),
      new CSVItem("sobject2", "dId2", "nId2", "account__c2", "dOwnerId2"),
    ];

    await expect(needService.processBuyingNeeds(MOCK_BUYING_NEEDS, MOCK_DEALS, MOCK_DATE_DIR)).resolves.not.toThrow();

    expect(mockDealService.findMatchedDeals).toBeCalled();
    expect(mockDealService.findMatchedDeals).toBeCalledWith(MOCK_BUYING_NEEDS[1], MOCK_DEALS);
    expect(mockDealService.findNewDeals).toBeCalledTimes(2);
    expect(mockDealService.findNewDeals).toHaveBeenNthCalledWith(1, MOCK_DEALS, MOCK_DEALS, MOCK_BUYING_NEEDS[0]);
    expect(mockDealService.findNewDeals).toHaveBeenNthCalledWith(2, MOCK_DEALS, MOCK_DEALS, MOCK_BUYING_NEEDS[1]);
    expect(mockDbService.getDealsByPartitionKey).toBeCalledTimes(2);
    expect(mockDbService.getDealsByPartitionKey).toHaveBeenNthCalledWith(1, MOCK_BUYING_NEEDS[0].id);
    expect(mockDbService.getDealsByPartitionKey).toHaveBeenNthCalledWith(2, MOCK_BUYING_NEEDS[1].id);
    expect(mockDbService.saveDeals).toBeCalledTimes(2);
    expect(mockDbService.saveDeals).toHaveBeenNthCalledWith(1, MOCK_NEW_DEALS);
    expect(mockDbService.saveDeals).toHaveBeenNthCalledWith(2, MOCK_NEW_DEALS);
    expect(mockDbService.deleteDeals).not.toBeCalled();
    expect(mockS3Service.putDeals2S3).toBeCalledTimes(2);
    expect(mockS3Service.putDeals2S3).toHaveBeenNthCalledWith(1, csvPayload, MOCK_DATE_DIR, MOCK_BUYING_NEEDS[0].id);
    expect(mockS3Service.putDeals2S3).toHaveBeenNthCalledWith(2, csvPayload, MOCK_DATE_DIR, MOCK_BUYING_NEEDS[1].id);
  });

  test(`Buying needs is empty: Should proceed with processing without errors`, async () => {
    await expect(
      needService.processBuyingNeeds(MOCK_EMPTY_BUYING_NEEDS, MOCK_DEALS, MOCK_DATE_DIR)
    ).resolves.not.toThrow();

    expect(mockDealService.findMatchedDeals).not.toBeCalled();
    expect(mockDealService.findNewDeals).not.toBeCalled();
    expect(mockDbService.getDealsByPartitionKey).not.toBeCalled();
    expect(mockDbService.saveDeals).not.toBeCalled();
    expect(mockDbService.deleteDeals).not.toBeCalled();
    expect(mockS3Service.putDeals2S3).not.toBeCalled();
  });

  test(`Matched deals are empty: Should proceed with processing without errors`, async () => {
    mockDealService.findMatchedDeals = jest.fn().mockImplementation(() => {
      return MOCK_EMPTY_DEALS;
    });

    await expect(
      needService.processBuyingNeeds(MOCK_BUYING_NEEDS, MOCK_EMPTY_DEALS, MOCK_DATE_DIR)
    ).resolves.not.toThrow();

    expect(mockDealService.findMatchedDeals).toBeCalled();
    expect(mockDealService.findMatchedDeals).toBeCalledWith(MOCK_BUYING_NEEDS[1], MOCK_EMPTY_DEALS);
    expect(mockDealService.findNewDeals).not.toBeCalled();
    expect(mockDbService.getDealsByPartitionKey).not.toBeCalled();
    expect(mockDbService.saveDeals).not.toBeCalled();
    expect(mockDbService.deleteDeals).not.toBeCalled();
    expect(mockS3Service.putDeals2S3).not.toBeCalled();
  });

  test(`New deals are empty: Should proceed with processing without errors`, async () => {
    mockDealService.findMatchedDeals = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockDbService.getDealsByPartitionKey = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockDealService.findNewDeals = jest.fn().mockImplementation(() => {
      return MOCK_EMPTY_DEALS;
    });

    await expect(needService.processBuyingNeeds(MOCK_BUYING_NEEDS, MOCK_DEALS, MOCK_DATE_DIR)).resolves.not.toThrow();

    expect(mockDealService.findMatchedDeals).toBeCalled();
    expect(mockDealService.findMatchedDeals).toBeCalledWith(MOCK_BUYING_NEEDS[1], MOCK_DEALS);
    expect(mockDealService.findNewDeals).toBeCalledTimes(2);
    expect(mockDealService.findNewDeals).toHaveBeenNthCalledWith(1, MOCK_DEALS, MOCK_DEALS, MOCK_BUYING_NEEDS[0]);
    expect(mockDealService.findNewDeals).toHaveBeenNthCalledWith(2, MOCK_DEALS, MOCK_DEALS, MOCK_BUYING_NEEDS[1]);
    expect(mockDbService.getDealsByPartitionKey).toBeCalledTimes(2);
    expect(mockDbService.getDealsByPartitionKey).toHaveBeenNthCalledWith(1, MOCK_BUYING_NEEDS[0].id);
    expect(mockDbService.getDealsByPartitionKey).toHaveBeenNthCalledWith(2, MOCK_BUYING_NEEDS[1].id);
    expect(mockDbService.saveDeals).not.toBeCalled();
    expect(mockDbService.deleteDeals).not.toBeCalled();
    expect(mockS3Service.putDeals2S3).not.toBeCalled();
  });

  test(`Put deals to S3 generates S3PutObjectError: Should delete deals and throw S3PutObjectError error`, async () => {
    mockDealService.findMatchedDeals = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockDbService.getDealsByPartitionKey = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockDealService.findNewDeals = jest.fn().mockImplementation(() => {
      return MOCK_NEW_DEALS;
    });
    mockDbService.saveDeals = jest.fn();
    mockDbService.deleteDeals = jest.fn();
    mockS3Service.putDeals2S3 = jest.fn().mockImplementation(() => {
      throw new S3PutObjectError();
    });

    const csvPayload = [
      new CSVItem("sobject1", "dId1", "nId1", "account__c1", "nOwnerId1"),
      new CSVItem("sobject2", "dId2", "nId2", "account__c2", "dOwnerId2"),
    ];

    await expect(needService.processBuyingNeeds(MOCK_BUYING_NEEDS, MOCK_DEALS, MOCK_DATE_DIR)).rejects.toThrow(
      S3PutObjectError
    );

    expect(mockDealService.findMatchedDeals).toBeCalled();
    expect(mockDealService.findMatchedDeals).toBeCalledWith(MOCK_BUYING_NEEDS[0], MOCK_DEALS);
    expect(mockDealService.findNewDeals).toBeCalled();
    expect(mockDealService.findNewDeals).toBeCalledWith(MOCK_DEALS, MOCK_DEALS, MOCK_BUYING_NEEDS[0]);
    expect(mockDbService.getDealsByPartitionKey).toBeCalled();
    expect(mockDbService.getDealsByPartitionKey).toBeCalledWith(MOCK_BUYING_NEEDS[0].id);
    expect(mockDbService.saveDeals).toBeCalled();
    expect(mockDbService.saveDeals).toBeCalledWith(MOCK_NEW_DEALS);
    expect(mockDbService.deleteDeals).toBeCalled();
    expect(mockDbService.deleteDeals).toBeCalledWith(MOCK_NEW_DEALS);
    expect(mockS3Service.putDeals2S3).toBeCalled();
    expect(mockS3Service.putDeals2S3).toBeCalledWith(csvPayload, MOCK_DATE_DIR, MOCK_BUYING_NEEDS[0].id);
  });

  test(`Put deals to S3 generates unexpected error: Should throw unexpected error`, async () => {
    mockDealService.findMatchedDeals = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockDbService.getDealsByPartitionKey = jest.fn().mockImplementation(() => {
      return MOCK_DEALS;
    });
    mockDealService.findNewDeals = jest.fn().mockImplementation(() => {
      return MOCK_NEW_DEALS;
    });
    mockDbService.saveDeals = jest.fn();
    mockDbService.deleteDeals = jest.fn();
    mockS3Service.putDeals2S3 = jest.fn().mockImplementation(() => {
      throw new Error();
    });

    const csvPayload = [
      new CSVItem("sobject1", "dId1", "nId1", "account__c1", "nOwnerId1"),
      new CSVItem("sobject2", "dId2", "nId2", "account__c2", "dOwnerId2"),
    ];

    await expect(needService.processBuyingNeeds(MOCK_BUYING_NEEDS, MOCK_DEALS, MOCK_DATE_DIR)).rejects.toThrow(Error);

    expect(mockDealService.findMatchedDeals).toBeCalled();
    expect(mockDealService.findMatchedDeals).toBeCalledWith(MOCK_BUYING_NEEDS[0], MOCK_DEALS);
    expect(mockDealService.findNewDeals).toBeCalled();
    expect(mockDealService.findNewDeals).toBeCalledWith(MOCK_DEALS, MOCK_DEALS, MOCK_BUYING_NEEDS[0]);
    expect(mockDbService.getDealsByPartitionKey).toBeCalled();
    expect(mockDbService.getDealsByPartitionKey).toBeCalledWith(MOCK_BUYING_NEEDS[0].id);
    expect(mockDbService.saveDeals).toBeCalled();
    expect(mockDbService.saveDeals).toBeCalledWith(MOCK_NEW_DEALS);
    expect(mockDbService.deleteDeals).not.toBeCalled();
    expect(mockS3Service.putDeals2S3).toBeCalled();
    expect(mockS3Service.putDeals2S3).toBeCalledWith(csvPayload, MOCK_DATE_DIR, MOCK_BUYING_NEEDS[0].id);
  });
});
