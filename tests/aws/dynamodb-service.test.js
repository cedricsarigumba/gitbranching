"use strict";

let dynamoDbService;
let appConfig;
const { ItemModel } = require("../../model/item-model");
const mockQuery = jest.fn();
const mockBatchWrite = jest.fn();

// Mock aws-sdk
jest.mock("aws-sdk", () => {
  return {
    ...jest.requireActual("aws-sdk"),
    DynamoDB: {
      DocumentClient: jest.fn(() => {
        return {
          query: mockQuery,
          batchWrite: mockBatchWrite,
        };
      }),
    },
    config: {
      update: jest.fn(),
    },
    SSM: jest.fn(() => ({
      getParametersByPath: jest.fn((param) => {
        const MOCK_ENV_VARIABLES = {
          SE_SRCH_NEEDS_BUCKET: {
            Parameters: [
              {
                Name: "SE_SRCH_NEEDS_BUCKET",
                Value: "MOCK_SE_SRCH_NEEDS_BUCKET",
              },
            ],
            NextToken: "SF2AWS_LATEST_BUCKET",
          },
          SF2AWS_LATEST_BUCKET: {
            Parameters: [
              {
                Name: "SF2AWS_LATEST_BUCKET",
                Value: "MOCK_SF2AWS_LATEST_BUCKET",
              },
            ],
            NextToken: "SE_AWS2SF_DATA_BUCKET",
          },
          SE_AWS2SF_DATA_BUCKET: {
            Parameters: [
              {
                Name: "SE_AWS2SF_DATA_BUCKET",
                Value: "MOCK_SE_AWS2SF_DATA_BUCKET",
              },
            ],
            NextToken: "SE_SRCH_NEEDS_QUEUE",
          },
          SE_SRCH_NEEDS_QUEUE: {
            Parameters: [
              {
                Name: "SE_SRCH_NEEDS_QUEUE",
                Value: "MOCK_SE_SRCH_NEEDS_QUEUE",
              },
            ],
            NextToken: "QUEUE_BATCH_SIZE",
          },
          QUEUE_BATCH_SIZE: {
            Parameters: [
              {
                Name: "QUEUE_BATCH_SIZE",
                Value: "2",
              },
            ],
            NextToken: "DEAL_RANKS",
          },
          DEAL_RANKS: {
            Parameters: [
              {
                Name: "DEAL_RANKS",
                Value: "S,A,B,B-",
              },
            ],
            NextToken: "DB_TABLE",
          },
          DB_TABLE: {
            Parameters: [
              {
                Name: "DB_TABLE",
                Value: "MOCK_DB_TABLE",
              },
            ],
            NextToken: "SE_SRC_CODE_KEY",
          },
          SE_SRC_CODE_KEY: {
            Parameters: [
              {
                Name: "SE_SRC_CODE_KEY",
                Value: "MOCK_SE_SRC_CODE_KEY",
              },
            ],
            NextToken: "AWS_ACCESSKEY_ID",
          },
          AWS_ACCESSKEY_ID: {
            Parameters: [
              {
                Name: "AWS_ACCESSKEY_ID",
                Value: "MOCK_AWS_ACCESSKEY_ID",
              },
            ],
            NextToken: "AWS_SECRETACCESS_KEY",
          },
          AWS_SECRETACCESS_KEY: {
            Parameters: [
              {
                Name: "AWS_SECRETACCESS_KEY",
                Value: "MOCK_AWS_SECRETACCESS_KEY",
              },
            ],
            NextToken: "PROFILE",
          },
          PROFILE: {
            Parameters: [
              {
                Name: "PROFILE",
                Value: "dev",
              },
            ],
            NextToken: "SPLIT_LIMIT",
          },
          SPLIT_LIMIT: {
            Parameters: [
              {
                Name: "SPLIT_LIMIT",
                Value: "2",
              },
            ],
            NextToken: "DEPLOY_BUCKET",
          },
          DEPLOY_BUCKET: {
            Parameters: [
              {
                Name: "DEPLOY_BUCKET",
                Value: "MOCK_DEPLOY_BUCKET",
              },
            ],
            NextToken: false,
          },
        };
        if (param.NextToken === null || param.NextToken === undefined) {
          return {
            promise: jest.fn(() => {
              return MOCK_ENV_VARIABLES["SE_SRCH_NEEDS_BUCKET"];
            }),
          };
        }
        return {
          promise: jest.fn(() => {
            return MOCK_ENV_VARIABLES[[param.NextToken]];
          }),
        };
      }),
    })),
  };
});

beforeAll(async () => {
  process.env.PROFILE = "dev";
  appConfig = require("../../config/app-config");
  await appConfig.configureApp();
  dynamoDbService = require("../../aws/dynamodb-service");
});

describe("getDealsByPartitionKey", () => {
  const DB_PARTITION_KEY = "buying_needs_id";
  const MOCK_BUYING_NEED_ID = "nId";

  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("Process is successful: Should not throw error and should return buying needs", async () => {
    mockQuery
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              Items: ["1", "2"],
              LastEvaluatedKey: true,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              Items: ["3", "4"],
              LastEvaluatedKey: false,
            };
          }),
        };
      });
    const params = {
      ExclusiveStartKey: true,
      TableName: appConfig.config["DB_TABLE"],
      KeyConditionExpression: `${DB_PARTITION_KEY} = :s`,
      ExpressionAttributeValues: { ":s": MOCK_BUYING_NEED_ID },
    };
    const expected = ["1", "2", "3", "4"];

    const actual = await dynamoDbService.getDealsByPartitionKey(MOCK_BUYING_NEED_ID);
    expect(actual).toStrictEqual(expected);
    expect(mockQuery).toBeCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(1, params);
    expect(mockQuery).toHaveBeenNthCalledWith(2, params);
  });
});

describe("saveDeals", () => {
  const MOCK_DEALS = [
    new ItemModel(
      "AWS_Search_Deal__c",
      "_Deal",
      { id: "dId1", ownerid: "dOwnerId1" },
      { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" }
    ),
  ];
  const createParamHelper = function (items) {
    let itemsObj = items.map((i) => {
      return {
        PutRequest: {
          Item: i.toDbItem(),
        },
      };
    });
    return { RequestItems: { [appConfig.config["DB_TABLE"]]: itemsObj } };
  };

  beforeEach(() => {
    mockBatchWrite.mockReset();
  });

  test("Processing is successful and no unprocessed items: Should not throw error", async () => {
    mockBatchWrite.mockImplementation(() => {
      return {
        promise: jest.fn(() => {
          return {
            UnprocessedItems: [],
          };
        }),
      };
    });
    const param = createParamHelper(MOCK_DEALS);
    await expect(dynamoDbService.saveDeals(MOCK_DEALS)).resolves.not.toThrow();
    expect(mockBatchWrite).toBeCalled();
    expect(mockBatchWrite).toBeCalledWith(param);
  });

  test("Processing is successful bust has unprocessed items and successfuly processed after retry: Should not throw error", async () => {
    mockBatchWrite
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: [],
            };
          }),
        };
      });
    const param = createParamHelper(MOCK_DEALS);

    await expect(dynamoDbService.saveDeals(MOCK_DEALS)).resolves.not.toThrow();
    expect(mockBatchWrite).toBeCalled();
    expect(mockBatchWrite).toBeCalledWith(param);
  });

  test("Processing is successful bust has unprocessed items and doesn't successfuly processed after retry: Should not throw error", async () => {
    mockBatchWrite
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementation(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: [],
            };
          }),
        };
      });

    const firstParam = createParamHelper(MOCK_DEALS);
    const nextParam = { RequestItems: MOCK_DEALS };
    await expect(dynamoDbService.saveDeals(MOCK_DEALS)).resolves.not.toThrow();
    expect(mockBatchWrite).toBeCalledTimes(5);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(1, firstParam);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(2, nextParam);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(3, nextParam);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(4, nextParam);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(5, nextParam);
  }, 6000);
});

describe("deleteDeals", () => {
  const MOCK_DEALS = [
    new ItemModel(
      "AWS_Search_Deal__c",
      "_Deal",
      { id: "dId1", ownerid: "dOwnerId1" },
      { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" }
    ),
  ];
  const createParamHelper = function (items) {
    let itemsObj = items.map((i) => {
      return {
        DeleteRequest: {
          Key: {
            buying_needs_id: i.needsId,
            search_sort_key: `${i.dealId}_${i.sortK}`,
          },
        },
      };
    });
    return { RequestItems: { [appConfig.config["DB_TABLE"]]: itemsObj } };
  };

  beforeEach(() => {
    mockBatchWrite.mockReset();
  });

  test("Processing is successful and no unprocessed items: Should not throw error", async () => {
    mockBatchWrite.mockImplementation(() => {
      return {
        promise: jest.fn(() => {
          return {
            UnprocessedItems: [],
          };
        }),
      };
    });
    const param = createParamHelper(MOCK_DEALS);
    await expect(dynamoDbService.deleteDeals(MOCK_DEALS)).resolves.not.toThrow();
    expect(mockBatchWrite).toBeCalled();
    expect(mockBatchWrite).toBeCalledWith(param);
  });

  test("Processing is successful bust has unprocessed items and successfuly processed after retry: Should not throw error", async () => {
    mockBatchWrite
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: [],
            };
          }),
        };
      });
    const param = createParamHelper(MOCK_DEALS);

    await expect(dynamoDbService.deleteDeals(MOCK_DEALS)).resolves.not.toThrow();
    expect(mockBatchWrite).toBeCalled();
    expect(mockBatchWrite).toBeCalledWith(param);
  });

  test("Processing is successful bust has unprocessed items and doesn't successfuly processed after retry: Should not throw error", async () => {
    mockBatchWrite
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementationOnce(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: MOCK_DEALS,
            };
          }),
        };
      })
      .mockImplementation(() => {
        return {
          promise: jest.fn(() => {
            return {
              UnprocessedItems: [],
            };
          }),
        };
      });

    const firstParam = createParamHelper(MOCK_DEALS);
    const nextParam = { RequestItems: MOCK_DEALS };
    await expect(dynamoDbService.deleteDeals(MOCK_DEALS)).resolves.not.toThrow();
    expect(mockBatchWrite).toBeCalledTimes(5);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(1, firstParam);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(2, nextParam);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(3, nextParam);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(4, nextParam);
    expect(mockBatchWrite).toHaveBeenNthCalledWith(5, nextParam);
  }, 6000);
});
