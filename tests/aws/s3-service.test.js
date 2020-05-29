"use strict";

let s3Service;
let appConfig;
const os = require("os");
const { NoSuchKeyError, S3PutObjectError } = require("../../common/custom-error");
let { CSVItem } = require("../../model/csvItem-model");
const constants = require("../../common/constants");
const mockS3HeadObject = jest.fn();
const mockS3GetObject = jest.fn();
const mockListObjects = jest.fn();
const mockPutObject = jest.fn();
const mockFromStream = jest.fn();

// Mock aws-sdk
jest.mock("aws-sdk", () => {
  return {
    ...jest.requireActual("aws-sdk"),
    S3: jest.fn(() => ({
      headObject: mockS3HeadObject,
      getObject: mockS3GetObject,
      listObjects: mockListObjects,
      putObject: mockPutObject
    })),
    config: {
      update: jest.fn()
    },
    SSM: jest.fn(() => ({
      getParametersByPath: jest.fn((param) => {
        const MOCK_ENV_VARIABLES = {
          SE_SRCH_NEEDS_BUCKET: {
            Parameters: [
              {
                Name: "SE_SRCH_NEEDS_BUCKET",
                Value: "MOCK_SE_SRCH_NEEDS_BUCKET"
              }
            ],
            NextToken: "SF2AWS_LATEST_BUCKET"
          },
          SF2AWS_LATEST_BUCKET: {
            Parameters: [
              {
                Name: "SF2AWS_LATEST_BUCKET",
                Value: "MOCK_SF2AWS_LATEST_BUCKET"
              }
            ],
            NextToken: "SE_AWS2SF_DATA_BUCKET"
          },
          SE_AWS2SF_DATA_BUCKET: {
            Parameters: [
              {
                Name: "SE_AWS2SF_DATA_BUCKET",
                Value: "MOCK_SE_AWS2SF_DATA_BUCKET"
              }
            ],
            NextToken: "SE_SRCH_NEEDS_QUEUE"
          },
          SE_SRCH_NEEDS_QUEUE: {
            Parameters: [
              {
                Name: "SE_SRCH_NEEDS_QUEUE",
                Value: "MOCK_SE_SRCH_NEEDS_QUEUE"
              }
            ],
            NextToken: "QUEUE_BATCH_SIZE"
          },
          QUEUE_BATCH_SIZE: {
            Parameters: [
              {
                Name: "QUEUE_BATCH_SIZE",
                Value: "2"
              }
            ],
            NextToken: "DEAL_RANKS"
          },
          DEAL_RANKS: {
            Parameters: [
              {
                Name: "DEAL_RANKS",
                Value: "S,A,B,B-"
              }
            ],
            NextToken: "DB_TABLE"
          },
          DB_TABLE: {
            Parameters: [
              {
                Name: "DB_TABLE",
                Value: "MOCK_DB_TABLE"
              }
            ],
            NextToken: "SE_SRC_CODE_KEY"
          },
          SE_SRC_CODE_KEY: {
            Parameters: [
              {
                Name: "SE_SRC_CODE_KEY",
                Value: "MOCK_SE_SRC_CODE_KEY"
              }
            ],
            NextToken: "AWS_ACCESSKEY_ID"
          },
          AWS_ACCESSKEY_ID: {
            Parameters: [
              {
                Name: "AWS_ACCESSKEY_ID",
                Value: "MOCK_AWS_ACCESSKEY_ID"
              }
            ],
            NextToken: "AWS_SECRETACCESS_KEY"
          },
          AWS_SECRETACCESS_KEY: {
            Parameters: [
              {
                Name: "AWS_SECRETACCESS_KEY",
                Value: "MOCK_AWS_SECRETACCESS_KEY"
              }
            ],
            NextToken: "PROFILE"
          },
          PROFILE: {
            Parameters: [
              {
                Name: "PROFILE",
                Value: "dev"
              }
            ],
            NextToken: "SPLIT_LIMIT"
          },
          SPLIT_LIMIT: {
            Parameters: [
              {
                Name: "SPLIT_LIMIT",
                Value: "2"
              }
            ],
            NextToken: "DEPLOY_BUCKET"
          },
          DEPLOY_BUCKET: {
            Parameters: [
              {
                Name: "DEPLOY_BUCKET",
                Value: "MOCK_DEPLOY_BUCKET"
              }
            ],
            NextToken: false
          }
        };
        if (param.NextToken === null || param.NextToken === undefined) {
          return {
            promise: jest.fn(() => {
              return MOCK_ENV_VARIABLES["SE_SRCH_NEEDS_BUCKET"];
            })
          };
        }
        return {
          promise: jest.fn(() => {
            return MOCK_ENV_VARIABLES[[param.NextToken]];
          })
        };
      })
    }))
  };
});

// Mock CSV Parser
jest.mock("csvtojson", () => {
  return jest.fn().mockImplementation(() => {
    return {
      fromStream: mockFromStream
    };
  });
});

beforeAll(async () => {
  process.env.PROFILE = "dev";
  appConfig = require("../../config/app-config");
  await appConfig.configureApp();
  s3Service = require("../../aws/s3-service");
});

describe("extractDateDirFromKey", () => {
  test("Extraction of date dir from key is successful: Should return date dir", () => {
    const s3Key = "dt=201907250000001/BuyingNeeds__c-20190725000001-0000.csv";
    const expected = "dt=201907250000001";

    expect(s3Service.extractDateDirFromKey(s3Key)).toStrictEqual(expected);
  });
});

describe("getDeals", () => {
  const MOCK_DIR = "dt=201907250000001";
  const MOCK_KEY = `${MOCK_DIR}/${constants.SOBJECTS.DEAL}.001.csv`;
  const MOCK_STREAM_VALID_DEALS = [
    {
      dealstage__c: constants.BEFORE_COMMISSIONING,
      corp_rank__c: "A"
    },
    {
      dealstage__c: constants.CANDIDATE_UNDECIDED,
      corp_rank__c: "A"
    },
    {
      dealstage__c: constants.CASE,
      corp_rank__c: "A"
    }
  ];
  const MOCK_STREAM_INVALID_DEALS = [
    {
      dealstage__c: constants.CANDIDATE_UNDECIDED,
      corp_rank__c: "Z"
    },
    {
      dealstage__c: constants.CANDIDATE_UNDECIDED,
      corp_rank__c: "Y"
    }
  ];
  const NOT_FOUND_ERROR_CODE = "NotFound";
  const NO_SUCH_KEY_ERROR_MSG = `S3 key does not exist ${MOCK_KEY}`;
  const UNEXPECTED_ERROR_OCCURRED = "Unexpected error occurred";

  beforeEach(() => {
    mockListObjects.mockReset();
    mockS3GetObject.mockReset();
    mockS3HeadObject.mockReset();
    mockFromStream.mockReset();
  });

  test(`Process is successful and has valid deals: Should return valid deals`, async () => {
    mockListObjects.mockImplementation(() => {
      return {
        promise: jest.fn(() => {
          return {
            Contents: [
              {
                Key: MOCK_KEY
              }
            ]
          };
        })
      };
    });
    mockS3HeadObject.mockImplementation(() => {
      return {
        promise: jest.fn()
      };
    });
    mockS3GetObject.mockImplementation(() => {
      return {
        createReadStream: jest.fn().mockImplementation(() => {
          return MOCK_STREAM_VALID_DEALS;
        })
      };
    });
    mockFromStream.mockImplementation((deals) => {
      return {
        subscribe: jest.fn(async (callback) => {
          for (var deal of deals) {
            await callback(deal);
          }
        })
      };
    });

    const listObjectsParams = {
      Bucket: appConfig.config["SF2AWS_LATEST_BUCKET"],
      Prefix: MOCK_DIR
    };
    const headGetObjectParams = {
      Bucket: appConfig.config["SF2AWS_LATEST_BUCKET"],
      Key: MOCK_KEY
    };
    const actual = await s3Service.getDeals(MOCK_DIR);
    expect(actual).toStrictEqual(MOCK_STREAM_VALID_DEALS);
    expect(mockListObjects).toBeCalled();
    expect(mockListObjects).toBeCalledWith(listObjectsParams);
    expect(mockS3HeadObject).toBeCalled();
    expect(mockS3HeadObject).toBeCalledWith(headGetObjectParams);
    expect(mockS3GetObject).toBeCalled();
    expect(mockS3GetObject).toBeCalledWith(headGetObjectParams);
    expect(mockFromStream).toBeCalled();
    expect(mockFromStream).toBeCalledWith(MOCK_STREAM_VALID_DEALS);
  });

  test(`Process is successful and has no valid deals: Should return empty deals`, async () => {
    mockListObjects.mockImplementation(() => {
      return {
        promise: jest.fn(() => {
          return {
            Contents: [
              {
                Key: MOCK_KEY
              }
            ]
          };
        })
      };
    });
    mockS3HeadObject.mockImplementation(() => {
      return {
        promise: jest.fn()
      };
    });
    mockS3GetObject.mockImplementation(() => {
      return {
        createReadStream: jest.fn().mockImplementation(() => {
          return MOCK_STREAM_INVALID_DEALS;
        })
      };
    });
    mockFromStream.mockImplementation((deals) => {
      return {
        subscribe: jest.fn(async (callback) => {
          for (var deal of deals) {
            await callback(deal);
          }
        })
      };
    });

    const listObjectsParams = {
      Bucket: appConfig.config["SF2AWS_LATEST_BUCKET"],
      Prefix: MOCK_DIR
    };
    const headGetObjectParams = {
      Bucket: appConfig.config["SF2AWS_LATEST_BUCKET"],
      Key: MOCK_KEY
    };
    const actual = await s3Service.getDeals(MOCK_DIR);
    expect(actual).toStrictEqual([]);
    expect(mockListObjects).toBeCalled();
    expect(mockListObjects).toBeCalledWith(listObjectsParams);
    expect(mockS3HeadObject).toBeCalled();
    expect(mockS3HeadObject).toBeCalledWith(headGetObjectParams);
    expect(mockS3GetObject).toBeCalled();
    expect(mockS3GetObject).toBeCalledWith(headGetObjectParams);
    expect(mockFromStream).toBeCalled();
    expect(mockFromStream).toBeCalledWith(MOCK_STREAM_INVALID_DEALS);
  });

  test(`S3 Key is not found: Should throw NoSuchKeyError error and "${NO_SUCH_KEY_ERROR_MSG}" as error message`, async () => {
    mockListObjects.mockImplementation(() => {
      return {
        promise: jest.fn(() => {
          return {
            Contents: [
              {
                Key: MOCK_KEY
              }
            ]
          };
        })
      };
    });
    mockS3HeadObject.mockImplementation(() => {
      const error = new Error();
      error.code = NOT_FOUND_ERROR_CODE;
      throw error;
    });
    const listObjectsParams = {
      Bucket: appConfig.config["SF2AWS_LATEST_BUCKET"],
      Prefix: MOCK_DIR
    };
    const headGetObjectParams = {
      Bucket: appConfig.config["SF2AWS_LATEST_BUCKET"],
      Key: MOCK_KEY
    };

    await expect(s3Service.getDeals(MOCK_DIR)).rejects.toThrow(new NoSuchKeyError(NO_SUCH_KEY_ERROR_MSG));
    expect(mockListObjects).toBeCalled();
    expect(mockListObjects).toBeCalledWith(listObjectsParams);
    expect(mockS3HeadObject).toBeCalled();
    expect(mockS3HeadObject).toBeCalledWith(headGetObjectParams);
    expect(mockS3GetObject).not.toBeCalled();
    expect(mockFromStream).not.toBeCalled();
  });

  test(`Unexpected error occurred: Should throw error`, async () => {
    mockListObjects.mockImplementation(() => {
      return {
        promise: jest.fn(() => {
          return {
            Contents: [
              {
                Key: MOCK_KEY
              }
            ]
          };
        })
      };
    });
    mockS3HeadObject.mockImplementation(() => {
      throw new Error(UNEXPECTED_ERROR_OCCURRED);
    });
    const listObjectsParams = {
      Bucket: appConfig.config["SF2AWS_LATEST_BUCKET"],
      Prefix: MOCK_DIR
    };
    const headGetObjectParams = {
      Bucket: appConfig.config["SF2AWS_LATEST_BUCKET"],
      Key: MOCK_KEY
    };

    await expect(s3Service.getDeals(MOCK_DIR)).rejects.toThrow(new Error(UNEXPECTED_ERROR_OCCURRED));
    expect(mockListObjects).toBeCalled();
    expect(mockListObjects).toBeCalledWith(listObjectsParams);
    expect(mockS3HeadObject).toBeCalled();
    expect(mockS3HeadObject).toBeCalledWith(headGetObjectParams);
    expect(mockS3GetObject).not.toBeCalled();
    expect(mockFromStream).not.toBeCalled();
  });
});

describe("getBuyingNeeds", () => {
  const MOCK_KEY = "dt=201907250000001";
  const NOT_FOUND_ERROR_CODE = "NotFound";
  const NO_SUCH_KEY_ERROR_MSG = `S3 key does not exist ${MOCK_KEY}`;
  const UNEXPECTED_ERROR_OCCURRED = "Unexpected error occurred";
  const MOCK_BUYING_NEEDS = [
    {
      id: "id1",
      industry_small__c: "industry_small__c1;industry_small__c2",
      prefname__c: "prefname__c1;prefname__c2",
      countryresidence__c: "countryresidence__c1;countryresidence__c2"
    }
  ];

  beforeEach(() => {
    mockS3GetObject.mockReset();
    mockS3HeadObject.mockReset();
    mockFromStream.mockReset();
  });

  test(`Process is successful and has retrieved buying needs: Should return buying needs`, async () => {
    mockS3HeadObject.mockImplementation(() => {
      return {
        promise: jest.fn()
      };
    });
    mockS3GetObject.mockImplementation(() => {
      return {
        createReadStream: jest.fn().mockImplementation(() => {
          return MOCK_BUYING_NEEDS;
        })
      };
    });
    mockFromStream.mockImplementation(() => {
      return MOCK_BUYING_NEEDS;
    });
    const headGetObjectParams = {
      Bucket: appConfig.config["SE_SRCH_NEEDS_BUCKET"],
      Key: MOCK_KEY
    };
    const actual = await s3Service.getBuyingNeeds(MOCK_KEY);
    expect(actual).toStrictEqual(MOCK_BUYING_NEEDS);
    expect(mockS3HeadObject).toBeCalled();
    expect(mockS3HeadObject).toBeCalledWith(headGetObjectParams);
    expect(mockS3GetObject).toBeCalled();
    expect(mockS3GetObject).toBeCalledWith(headGetObjectParams);
    expect(mockFromStream).toBeCalled();
    expect(mockFromStream).toBeCalledWith(MOCK_BUYING_NEEDS);
  });

  test(`Process is successful but has no retrieved buying needs: Should return empty buying needs`, async () => {
    mockS3HeadObject.mockImplementation(() => {
      return {
        promise: jest.fn()
      };
    });
    mockS3GetObject.mockImplementation(() => {
      return {
        createReadStream: jest.fn().mockImplementation(() => {
          return [];
        })
      };
    });
    mockFromStream.mockImplementation(() => {
      return [];
    });
    const headGetObjectParams = {
      Bucket: appConfig.config["SE_SRCH_NEEDS_BUCKET"],
      Key: MOCK_KEY
    };
    const actual = await s3Service.getBuyingNeeds(MOCK_KEY);
    expect(actual).toStrictEqual([]);
    expect(mockS3HeadObject).toBeCalled();
    expect(mockS3HeadObject).toBeCalledWith(headGetObjectParams);
    expect(mockS3GetObject).toBeCalled();
    expect(mockS3GetObject).toBeCalledWith(headGetObjectParams);
    expect(mockFromStream).toBeCalled();
    expect(mockFromStream).toBeCalledWith([]);
  });

  test(`S3 Key is not found: Should throw NoSuchKeyError error and "${NO_SUCH_KEY_ERROR_MSG}" as error message`, async () => {
    mockS3HeadObject.mockImplementation(() => {
      const error = new Error();
      error.code = NOT_FOUND_ERROR_CODE;
      throw error;
    });
    const headGetObjectParams = {
      Bucket: appConfig.config["SE_SRCH_NEEDS_BUCKET"],
      Key: MOCK_KEY
    };

    await expect(s3Service.getBuyingNeeds(MOCK_KEY)).rejects.toThrow(new NoSuchKeyError(NO_SUCH_KEY_ERROR_MSG));
    expect(mockS3HeadObject).toBeCalled();
    expect(mockS3HeadObject).toBeCalledWith(headGetObjectParams);
    expect(mockS3GetObject).not.toBeCalled();
    expect(mockFromStream).not.toBeCalled();
  });

  test(`Unexpected error occurred: Should throw error`, async () => {
    mockS3HeadObject.mockImplementation(() => {
      throw new Error(UNEXPECTED_ERROR_OCCURRED);
    });
    const headGetObjectParams = {
      Bucket: appConfig.config["SE_SRCH_NEEDS_BUCKET"],
      Key: MOCK_KEY
    };

    await expect(s3Service.getBuyingNeeds(MOCK_KEY)).rejects.toThrow(new Error(UNEXPECTED_ERROR_OCCURRED));
    expect(mockS3HeadObject).toBeCalled();
    expect(mockS3HeadObject).toBeCalledWith(headGetObjectParams);
    expect(mockS3GetObject).not.toBeCalled();
    expect(mockFromStream).not.toBeCalled();
  });
});

describe("putDeals2S3", () => {
  let MOCK_VALID_CSV_PAYLOAD;
  const MOCK_DATE_DIR = "dt=201907250000001";
  const MOCK_BUYING_NEED_ID = "nId1";
  const MOCK_ERROR = new Error("ERROR");
  const S3_PUT_OBJECT_ERROR_MESSAGE = `An error occured during S3 save operation : ${MOCK_ERROR}`;

  beforeEach(() => {
    MOCK_VALID_CSV_PAYLOAD = [
      new CSVItem("sobject1", "dId1", "nId1", "account__c1", "nOwnerId1"),
      new CSVItem("sobject2", "dId2", "nId1", "account__c2", "dOwnerId2"),
      new CSVItem("sobject3", "dId3", "nId1", "account__c3", "dOwnerId3"),
      new CSVItem("sobject4", "dId4", "nId1", "account__c4", "dOwnerId4")
    ];
    mockPutObject.mockReset();
  });

  test(`S3 put object is successful: Should not throw any error`, async () => {
    mockPutObject.mockImplementation(() => {
      return {
        promise: jest.fn()
      };
    });
    const s3KeyRootname = `${MOCK_DATE_DIR}/${constants.CSV_PREFIX}-${MOCK_BUYING_NEED_ID}`;
    const newS3key1 = `${s3KeyRootname}-${"0000".slice(-4)}.csv`;
    const newS3key2 = `${s3KeyRootname}-${"0001".slice(-4)}.csv`;
    const body1 = `sObject,DealId__c,NeedsId__c,AccountId__c,OwnerId${os.EOL}sobject1,dId1,nId1,account__c1,nOwnerId1${os.EOL}sobject2,dId2,nId1,account__c2,dOwnerId2`;
    const body2 = `sObject,DealId__c,NeedsId__c,AccountId__c,OwnerId${os.EOL}sobject3,dId3,nId1,account__c3,dOwnerId3${os.EOL}sobject4,dId4,nId1,account__c4,dOwnerId4`;
    const params1 = {
      Bucket: appConfig.config["SE_AWS2SF_DATA_BUCKET"],
      Key: newS3key1,
      ServerSideEncryption: "AES256",
      Body: body1
    };
    const params2 = {
      Bucket: appConfig.config["SE_AWS2SF_DATA_BUCKET"],
      Key: newS3key2,
      ServerSideEncryption: "AES256",
      Body: body2
    };

    await expect(
      s3Service.putDeals2S3(MOCK_VALID_CSV_PAYLOAD, MOCK_DATE_DIR, MOCK_BUYING_NEED_ID)
    ).resolves.not.toThrow();
    expect(mockPutObject).toBeCalledTimes(2);
    expect(mockPutObject).toHaveBeenNthCalledWith(1, params1);
    expect(mockPutObject).toHaveBeenNthCalledWith(2, params2);
  });

  test(`S3PutObjectError occurred: Should throw S3PutObjectError as error and "${S3_PUT_OBJECT_ERROR_MESSAGE}" as error message`, async () => {
    mockPutObject.mockImplementation(() => {
      throw MOCK_ERROR;
    });
    const s3KeyRootname = `${MOCK_DATE_DIR}/${constants.CSV_PREFIX}-${MOCK_BUYING_NEED_ID}`;
    const newS3key1 = `${s3KeyRootname}-${"0000".slice(-4)}.csv`;
    const newS3key2 = `${s3KeyRootname}-${"0001".slice(-4)}.csv`;
    const body1 = `sObject,DealId__c,NeedsId__c,AccountId__c,OwnerId${os.EOL}sobject1,dId1,nId1,account__c1,nOwnerId1${os.EOL}sobject2,dId2,nId1,account__c2,dOwnerId2`;
    const body2 = `sObject,DealId__c,NeedsId__c,AccountId__c,OwnerId${os.EOL}sobject3,dId3,nId1,account__c3,dOwnerId3${os.EOL}sobject4,dId4,nId1,account__c4,dOwnerId4`;
    const params1 = {
      Bucket: appConfig.config["SE_AWS2SF_DATA_BUCKET"],
      Key: newS3key1,
      ServerSideEncryption: "AES256",
      Body: body1
    };
    const params2 = {
      Bucket: appConfig.config["SE_AWS2SF_DATA_BUCKET"],
      Key: newS3key2,
      ServerSideEncryption: "AES256",
      Body: body2
    };

    await expect(s3Service.putDeals2S3(MOCK_VALID_CSV_PAYLOAD, MOCK_DATE_DIR, MOCK_BUYING_NEED_ID)).rejects.toThrow(
      new S3PutObjectError(S3_PUT_OBJECT_ERROR_MESSAGE)
    );
    expect(mockPutObject).toBeCalledTimes(2);
    expect(mockPutObject).toHaveBeenNthCalledWith(1, params1);
    expect(mockPutObject).toHaveBeenNthCalledWith(2, params2);
  });
});
