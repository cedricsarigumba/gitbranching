"use strict";

let dealService;
let appConfig;
const constants = require("../../common/constants");
const { ItemModel } = require("../../model/item-model");

// Mock aws-sdk
jest.mock("aws-sdk", () => {
  return {
    ...jest.requireActual("aws-sdk"),
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
  dealService = require("../../service/deal-service");
});

describe("findDealsUsingCurrentSearchFlow", () => {
  test("Has matched deals: Should return the matched deals", () => {
    const MOCK_DEALS = [
      {
        prefname__c: "prefname__c",
        countryresidence__c: "countryresidence__c",
        industry_small__c: "industry_small__c",
      },
    ];
    const MOCK_NEED = {
      prefname__c: "prefname__c",
      countryresidence__c: "countryresidence__c",
      industry_small__c: "industry_small__c",
    };
    expect(dealService.findDealsUsingCurrentSearchFlow(MOCK_NEED, MOCK_DEALS)).toStrictEqual(MOCK_DEALS);
  });

  test("Has no matched deals: Should return the empty deals", () => {
    const MOCK_DEALS = [
      {
        prefname__c: "prefname__c",
        countryresidence__c: "countryresidence__c",
        industry_small__c: "industry_small__c",
      },
    ];
    const MOCK_NEED = {
      prefname__c: "prefname__c1",
      countryresidence__c: "countryresidence__c1",
      industry_small__c: "industry_small__c1",
    };
    expect(dealService.findDealsUsingCurrentSearchFlow(MOCK_NEED, MOCK_DEALS)).toStrictEqual([]);
  });
});

describe("findDealsUsingNewSearchFlow", () => {
  test("Has matched deals: Should return the matched deals", () => {
    const MOCK_DEALS = [
      {
        prefname__c: "prefname__c",
        countryresidence__c: "countryresidence__c",
        industrysmall1__c: "industry_small__c",
        industrysmall2__c: "industry_small__c",
        industrysmall3__c: "industry_small__c",
      },
    ];
    const MOCK_NEED = {
      prefname__c: "prefname__c",
      countryresidence__c: "countryresidence__c",
      desiredindustrysmall__c: "industry_small__c",
    };
    expect(dealService.findDealsUsingNewSearchFlow(MOCK_NEED, MOCK_DEALS)).toStrictEqual(MOCK_DEALS);
  });

  test("Has no matched deals: Should return the empty deals", () => {
    const MOCK_DEALS = [
      {
        prefname__c: "prefname__c",
        countryresidence__c: "countryresidence__c",
        industrysmall1__c: "industry_small__c",
        industrysmall2__c: "industry_small__c",
        industrysmall3__c: "industry_small__c",
      },
      {
        prefname__c: "prefname__c",
        countryresidence__c: constants.OUTSIDE_JAPAN,
        industrysmall1__c: "industry_small__c",
        industrysmall2__c: "industry_small__c",
        industrysmall3__c: "industry_small__c",
      },
      {
        prefname__c: "prefname__c1",
        countryresidence__c: "countryresidence__c",
        industrysmall1__c: "industry_small__c",
        industrysmall2__c: "industry_small__c",
        industrysmall3__c: "industry_small__c",
      },
    ];
    const MOCK_NEED = {
      prefname__c: "prefname__c1",
      countryresidence__c: "countryresidence__c1",
      desiredindustrysmall__c: "industry_small__c1",
    };
    expect(dealService.findDealsUsingNewSearchFlow(MOCK_NEED, MOCK_DEALS)).toStrictEqual([]);
  });
});

describe("findNewDeals", () => {
  test("Deal exist for AWS_Search_Needs but doesn't exist in AWS_Search_Deals and is eligible for deals: Should return eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL,
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS,
      },
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId2",
        ownerid: "dOwnerId1",
        dealstage__c: constants.CANDIDATE_UNDECIDED,
        corp_rank__c: "A",
        hidden__c: "false",
      },
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    const expected = [
      new ItemModel(
        "AWS_Search_Deal__c",
        "_Deal",
        { id: "dId2", ownerid: "dOwnerId1" },
        { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" }
      ),
    ];
    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual(expected);
  });

  test("Deal exist for AWS_Search_Needs but doesn't exist in AWS_Search_Deals and is not eligible for deals: Should return empty eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL,
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS,
      },
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId2",
        ownerid: "dOwnerId1",
        dealstage__c: "dealstage__c",
        corp_rank__c: "A",
        hidden__c: "false",
      },
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual([]);
  });

  test("Deal exist in AWS_Search_Deals but doesn't exist in AWS_Search_Needs and is eligible for needs: Should return eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL,
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS,
      },
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId1",
        ownerid: "dOwnerId1",
        dealstage__c: constants.CANDIDATE_UNDECIDED,
        corp_rank__c: "A",
        hidden__c: "false",
      },
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    const expected = [
      new ItemModel(
        "AWS_Search_Needs__c",
        "_Needs",
        { id: "dId1", ownerid: "dOwnerId1" },
        { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" }
      ),
    ];
    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual(expected);
  });

  test("Deal exist in AWS_Search_Deals but doesn't exist in AWS_Search_Needs and is not eligible for needs: Should return empty eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL,
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS,
      },
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId1",
        ownerid: "dOwnerId1",
        dealstage__c: "dealstage__c",
        corp_rank__c: "A",
        hidden__c: "false",
      },
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual([]);
  });

  test("Deal doesn't exist for both AWS_Search_Needs & AWS_Search_Deals and is eligible for needs and deals: Should return eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL,
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS,
      },
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId3",
        ownerid: "dOwnerId1",
        dealstage__c: constants.CANDIDATE_UNDECIDED,
        corp_rank__c: "A",
        hidden__c: "false",
      },
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    const expected = [
      new ItemModel(
        "AWS_Search_Needs__c",
        "_Needs",
        { id: "dId3", ownerid: "dOwnerId1" },
        { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" }
      ),
      new ItemModel(
        "AWS_Search_Deal__c",
        "_Deal",
        { id: "dId3", ownerid: "dOwnerId1" },
        { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" }
      ),
    ];
    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual(expected);
  });

  test("Deal exist for both AWS_Search_Needs & AWS_Search_Deals: Should return empty result", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.NEEDS,
      },
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL,
      },
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId1",
        ownerid: "dOwnerId1",
        dealstage__c: "dealstage__c1",
        corp_rank__c: "corp_rank__c1",
        hidden__c: "false",
      },
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };
    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual([]);
  });

  test("Matched deals is empty: Should return an empty result", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.NEEDS,
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.DEAL,
      },
    ];
    const MOCK_MATCHED_DEALS = [];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual([]);
  });

  test("Old deals is empty and no eligible deals: Should return an empty result", () => {
    const MOCK_OLD_DEALS = [];
    const MOCK_MATCHED_DEALS = [
      {
        id: "dId1",
        ownerid: "dOwnerId1",
        dealstage__c: "dealstage__c1",
        corp_rank__c: "corp_rank__c1",
        hidden__c: "false",
      },
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual([]);
  });
});
