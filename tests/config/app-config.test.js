"use strict";

const mockGetParametersByPath = jest.fn();
let appConfig;

// Mock aws-sdk
jest.mock("aws-sdk", () => {
  return {
    ...jest.requireActual("aws-sdk"),
    SSM: jest.fn(() => ({
      getParametersByPath: mockGetParametersByPath,
    })),
  };
});

beforeAll(async () => {
  process.env.PROFILE = "dev";
  appConfig = require("../../config/app-config");
});

describe("configureApp", () => {
  const PROFILE_NOT_CONFIGURED_ERROR_MESSAGE = "PROFILE environment variable is not configured. Returning error.";
  const ENV_VARIABLES_NOT_CONFIGURED_PROPERLY_ERROR_MESSAGE =
    "Environment variables not configured properly. Please check AWS-SSM entries.";

  beforeEach(() => {
    mockGetParametersByPath.mockReset();
  });

  test(`variable PROFILE is not dev: Should not throw error`, async () => {
    jest.resetModules();
    process.env["PROFILE"] = "tst";
    mockGetParametersByPath.mockImplementation((param) => {
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
    });
    let appConfigTest = require("../../config/app-config");

    await expect(appConfigTest.configureApp()).resolves.not.toThrow();
    expect(mockGetParametersByPath).toBeCalledTimes(13);
  });

  test(`process.env doesn't contain the variable PROFILE: Should throw error with "${PROFILE_NOT_CONFIGURED_ERROR_MESSAGE}" as error message`, async () => {
    jest.resetModules();
    delete process.env.PROFILE;
    let appConfigTest = require("../../config/app-config");

    await expect(appConfigTest.configureApp()).rejects.toThrow(new Error(PROFILE_NOT_CONFIGURED_ERROR_MESSAGE));
    expect(mockGetParametersByPath).not.toBeCalled();
  });

  test(`Env variables are not configured properly: Should throw error with "${ENV_VARIABLES_NOT_CONFIGURED_PROPERLY_ERROR_MESSAGE}" as error message`, async () => {
    mockGetParametersByPath.mockImplementation((param) => {
      return {
        promise: jest.fn(() => {
          return {
            Parameters: [],
            NextToken: false,
          };
        }),
      };
    });
    await expect(appConfig.configureApp()).rejects.toThrow(
      new Error(ENV_VARIABLES_NOT_CONFIGURED_PROPERLY_ERROR_MESSAGE)
    );
    let param = {
      Path: "/se-search-execute-function/dev/",
      Recursive: true,
      WithDecryption: false,
    };
    expect(mockGetParametersByPath).toBeCalled();
    expect(mockGetParametersByPath).toBeCalledWith(param);
  });
});
