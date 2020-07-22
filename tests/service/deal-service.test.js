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
      getParametersByPath: jest.fn(param => {
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

beforeAll(async () => {
  process.env.PROFILE = "dev";
  appConfig = require("../../config/app-config");
  await appConfig.configureApp();
  dealService = require("../../service/deal-service");
});

describe("findMatchedDeals", () => {
  describe("filterDealsByBaseConditions", () => {
    test("Has matched deals: Should return the matched deals", () => {
      const MOCK_DEALS = [
        {
          prefname__c: "prefname__c",
          countryresidence__c: "countryresidence__c",
          industrysmall1__c: "industry_small__c",
          industrysmall2__c: "industry_small__c",
          industrysmall3__c: "industry_small__c"
        }
      ];
      const MOCK_NEED = {
        prefname__c: "prefname__c",
        countryresidence__c: "countryresidence__c",
        desiredindustrysmall__c: "industry_small__c"
      };
      expect(dealService.findMatchedDeals(MOCK_NEED, MOCK_DEALS)).toStrictEqual(MOCK_DEALS);
    });

    test("Has no matched deals: Should return the empty deals", () => {
      const MOCK_DEALS = [
        {
          prefname__c: "prefname__c",
          countryresidence__c: "countryresidence__c",
          industrysmall1__c: "industry_small__c",
          industrysmall2__c: "industry_small__c",
          industrysmall3__c: "industry_small__c"
        },
        {
          prefname__c: "prefname__c",
          countryresidence__c: constants.OUTSIDE_JAPAN,
          industrysmall1__c: "industry_small__c",
          industrysmall2__c: "industry_small__c",
          industrysmall3__c: "industry_small__c"
        },
        {
          prefname__c: "prefname__c1",
          countryresidence__c: "countryresidence__c",
          industrysmall1__c: "industry_small__c",
          industrysmall2__c: "industry_small__c",
          industrysmall3__c: "industry_small__c"
        }
      ];
      const MOCK_NEED = {
        prefname__c: "prefname__c1",
        countryresidence__c: "countryresidence__c1",
        desiredindustrysmall__c: "industry_small__c1"
      };
      expect(dealService.findMatchedDeals(MOCK_NEED, MOCK_DEALS)).toStrictEqual([]);
    });
  });

  describe("filterDealsByInvestments", () => {
    const baseNeed = {
      prefname__c: "prefname__c",
      countryresidence__c: "countryresidence__c",
      desiredindustrysmall__c: "industry_small__c",
      salesscale_lower__c: "",
      salesscale_upper__c: ""
    };

    const baseDeals = {
      prefname__c: "prefname__c",
      countryresidence__c: "countryresidence__c",
      industrysmall1__c: "industry_small__c",
      industrysmall2__c: "industry_small__c",
      industrysmall3__c: "industry_small__c"
    };

    test("All investment fields have values: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "700000", // does not match investable thresholds
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "250000",
          refa__c: "250000"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "250000",
          refa__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower <= AskingPrice: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: ""
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "50000", // not match lower
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "250000", // investablelower <= askingprice
          refa__c: "250000"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "250000",
          refa__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower == AskingPrice: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000.50",
        investable_upper__c: ""
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "50000", // not match lower
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "100000.50", // investablelower == askingprice
          refa__c: "250000"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "100000.50",
          refa__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower !<= AskingPrice: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "300000",
        investable_upper__c: ""
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "50000", // not match lower
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "250000", // investablelower > askingprice
          refa__c: "250000"
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower <= Refa: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: ""
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "50000" // not match lower
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "250000" // InvestableLower <= Refa
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower == Refa: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000.8",
        investable_upper__c: ""
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "50000" // not match lower
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "100000.8" // InvestableLower == Refa
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "100000.8"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower !<= Refa: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "350000",
        investable_upper__c: ""
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "250000",
          refa__c: "250000" // InvestableLower <= Refa
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "250000" // InvestableLower > Refa
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableUpper >= AskingPrice: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "1000000", // not match higher
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "250000", // InvestableUpper >= AskingPrice
          refa__c: "250000"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "250000",
          refa__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableUpper == AskingPrice: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "1000000", // not match higher
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "500000", // InvestableUpper == AskingPrice
          refa__c: "250000"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "500000",
          refa__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableUpper !>= AskingPrice: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "1000000", // not match higher
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "750000", // InvestableUpper < AskingPrice
          refa__c: "250000"
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableUpper >= Refa: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "1000000" // not match higher
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "250000" // InvestableUpper > Refa
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "250000"
        }
      ];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableUpper == Refa: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "1000000" // not match higher
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "500000" // InvestableUpper == Refa
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "500000"
        }
      ];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableUpper !>= Refa: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "1000000" // not match higher
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "750000" // InvestableUpper < Refa
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower <= AskingPrice <= InvestableUpper: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "1000000", // not much higher
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "250000", // InvestableLower <= AskingPrice <= InvestableUpper
          refa__c: "250000"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "250000",
          refa__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower == AskingPrice <= InvestableUpper: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "1000000", // not much higher
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "100000", // InvestableLower == AskingPrice <= InvestableUpper
          refa__c: "250000"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "100000",
          refa__c: "250000"
        }
      ];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower !<= AskingPrice <= InvestableUpper: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "1000000", // not much higher
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "50000", // InvestableLower > AskingPrice <= InvestableUpper
          refa__c: "250000"
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower <= AskingPrice == InvestableUpper: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "1000000", // not much higher
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "500000", // InvestableLower <= AskingPrice == InvestableUpper
          refa__c: "250000"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "500000",
          refa__c: "250000"
        }
      ];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower <= AskingPrice !<= InvestableUpper: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "1000000", // not much higher
          refa__c: "250000"
        },
        {
          ...baseDeals,
          askingprice__c: "750000", // InvestableLower <= AskingPrice > InvestableUpper
          refa__c: "250000"
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower <= Refa <= InvestableUpper: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "1000000" // not match higher
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "250000" // InvestableLower <= Refa <= InvestableUpper
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower == Refa <= InvestableUpper: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "1000000" // not match higher
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "100000" // InvestableLower == Refa <= InvestableUpper
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "100000"
        }
      ];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower !<= Refa <= InvestableUpper: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "1000000" // not match higher
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "50000" // InvestableLower > Refa <= InvestableUpper
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower <= Refa == InvestableUpper: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "1000000" // not match higher
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "500000" // InvestableLower <= Refa == InvestableUpper
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "500000"
        }
      ];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("InvestableLower <= Refa !<= InvestableUpper: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "1000000" // not match higher
        },
        {
          ...baseDeals,
          askingprice__c: "",
          refa__c: "750000" // InvestableLower <= Refa > InvestableUpper
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("Exceed boundaries (18digits): Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "555555555555555555555", // 21 digit
        investable_upper__c: "999999999999999999999" //21 digit
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "700000" // does not match investable thresholds
        },
        {
          ...baseDeals,
          askingprice__c: "888888888888888888888"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "888888888888888888888"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("Values contains decimal: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "154252419.4",
        investable_upper__c: "954252419.4"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "700000.55" // does not match investable thresholds
        },
        {
          ...baseDeals,
          askingprice__c: "854252419.5" // matched
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          askingprice__c: "854252419.5"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("All investment fields are empty: Should return the matched deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "", // null
        investable_upper__c: "" // null
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "100000",
          refa__c: "200000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(testDeals);
    });

    test("All Need investment & Deal trading price fields are empty: Should return the matched deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "", // null
        investable_upper__c: "" // null
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "", // null
          refa__c: "" // null
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(testDeals);
    });

    test("Null AskingPrice & Refa: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        investable_lower__c: "100000",
        investable_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          askingprice__c: "", // null
          refa__c: "" // null
        },
        {
          ...baseDeals,
          askingprice__c: "", // null
          refa__c: "" // null
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });
  });

  describe("filterDealsBySales", () => {
    const baseNeed = {
      prefname__c: "prefname__c",
      countryresidence__c: "countryresidence__c",
      desiredindustrysmall__c: "industry_small__c",
      investable_lower__c: "",
      investable_upper__c: ""
    };

    const baseDeals = {
      prefname__c: "prefname__c",
      countryresidence__c: "countryresidence__c",
      industrysmall1__c: "industry_small__c",
      industrysmall2__c: "industry_small__c",
      industrysmall3__c: "industry_small__c"
    };

    test("All sales fields have values: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "50000" // does not match salesscale_lower thresholds
        },
        {
          ...baseDeals,
          sales__c: "250000"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleLower <= Sales: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: ""
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "50000" // not matched salesscale_lower
        },
        {
          ...baseDeals,
          sales__c: "250000" // SalesScaleLower <= Sales
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleLower == Sales: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: ""
      };
      const testDeals = [
        {
          ...baseNeed,
          sales__c: "50000" // not matched salesscale_lower
        },
        {
          ...baseDeals,
          sales__c: "100000" // SalesScaleLower == Sales
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "100000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleLower !<= Sales: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: ""
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "50000" // not matched salesscale_lower
        },
        {
          ...baseDeals,
          sales__c: "50000" // SalesScaleLower > Sales
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleUpper >= Sales: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "750000" // not matched salesscale_upper__c
        },
        {
          ...baseDeals,
          sales__c: "250000" // SalesScaleUpper >= Sales
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleUpper == Sales: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "750000" // not matched salesscale_upper__c
        },
        {
          ...baseDeals,
          sales__c: "500000" // SalesScaleUpper == Sales
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "500000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleUpper !>= Sales: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "750000" // not matched salesscale_upper__c
        },
        {
          ...baseDeals,
          sales__c: "750000" // SalesScaleUpper < Sales
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleLower <= Sales <= SalesScaleUpper: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "700000" // does not match sales thresholds
        },
        {
          ...baseDeals,
          sales__c: "250000" // SalesScaleLower <= Sales <= SalesScaleUpper
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "250000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleLower == Sales <= SalesScaleUpper: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "700000" // does not match sales thresholds
        },
        {
          ...baseDeals,
          sales__c: "100000" // SalesScaleLower == Sales <= SalesScaleUpper
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "100000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleLower !<= Sales <= SalesScaleUpper: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "700000" // does not match sales thresholds
        },
        {
          ...baseDeals,
          sales__c: "50000" // SalesScaleLower > Sales <= SalesScaleUpper
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleLower <= Sales == SalesScaleUpper: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "700000" // does not match sales thresholds
        },
        {
          ...baseDeals,
          sales__c: "500000" // SalesScaleLower <= Sales == SalesScaleUpper
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "500000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("SalesScaleLower <= Sales !<= SalesScaleUpper: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "700000" // does not match sales thresholds
        },
        {
          ...baseDeals,
          sales__c: "800000" // SalesScaleLower <= Sales > SalesScaleUpper
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("Exceed boundaries (18digits): Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "555555555555555555555", // 21 digit
        salesscale_upper__c: "999999999999999999999" //21 digit
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "700000" // does not match investable thresholds
        },
        {
          ...baseDeals,
          sales__c: "888888888888888888888"
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "888888888888888888888"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("Values contains decimal: Should return the 2nd deal only", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "154252419.4",
        salesscale_upper__c: "954252419.4"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "700000.55" // does not match investable thresholds
        },
        {
          ...baseDeals,
          sales__c: "854252419.5" // matched
        }
      ];

      const expectedDeals = [
        {
          ...baseDeals,
          sales__c: "854252419.5"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });

    test("All sales fields are empty: Should return the matched deals", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "", // null
        salesscale_upper__c: "" // null
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "300000"
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(testDeals);
    });

    test("All Need & Deal sales fields are empty: Should return the matched deals", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "", // null
        salesscale_upper__c: "" // null
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "" // null
        }
      ];

      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(testDeals);
    });

    test("Null Sales: Should return empty deals", () => {
      const testNeed = {
        ...baseNeed,
        salesscale_lower__c: "100000",
        salesscale_upper__c: "500000"
      };
      const testDeals = [
        {
          ...baseDeals,
          sales__c: "" // null
        },
        {
          ...baseDeals,
          sales__c: "" // null
        }
      ];

      const expectedDeals = [];
      expect(dealService.findMatchedDeals(testNeed, testDeals)).toStrictEqual(expectedDeals);
    });
  });
});

describe("findNewDeals", () => {
  test("Deal exist for AWS_Search_Needs but doesn't exist in AWS_Search_Deals and is eligible for deals: Should return eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS
      }
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId2",
        ownerid: "dOwnerId1",
        dealstage__c: constants.CANDIDATE_UNDECIDED,
        corp_rank__c: "A",
        hidden__c: "false"
      }
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    const expected = [
      new ItemModel(
        "AWS_Search_Deal__c",
        "_Deal",
        { id: "dId2", ownerid: "dOwnerId1" },
        { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" }
      )
    ];
    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual(expected);
  });

  test("Deal exist for AWS_Search_Needs but doesn't exist in AWS_Search_Deals and is not eligible for deals: Should return empty eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS
      }
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId2",
        ownerid: "dOwnerId1",
        dealstage__c: "dealstage__c",
        corp_rank__c: "A",
        hidden__c: "false"
      }
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual([]);
  });

  test("Deal exist in AWS_Search_Deals but doesn't exist in AWS_Search_Needs and is eligible for needs: Should return eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS
      }
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId1",
        ownerid: "dOwnerId1",
        dealstage__c: constants.CANDIDATE_UNDECIDED,
        corp_rank__c: "A",
        hidden__c: "false"
      }
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    const expected = [
      new ItemModel(
        "AWS_Search_Needs__c",
        "_Needs",
        { id: "dId1", ownerid: "dOwnerId1" },
        { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" }
      )
    ];
    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual(expected);
  });

  test("Deal exist in AWS_Search_Deals but doesn't exist in AWS_Search_Needs and is not eligible for needs: Should return empty eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS
      }
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId1",
        ownerid: "dOwnerId1",
        dealstage__c: "dealstage__c",
        corp_rank__c: "A",
        hidden__c: "false"
      }
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual([]);
  });

  test("Deal doesn't exist for both AWS_Search_Needs & AWS_Search_Deals and is eligible for needs and deals: Should return eligible deals", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.NEEDS
      }
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId3",
        ownerid: "dOwnerId1",
        dealstage__c: constants.CANDIDATE_UNDECIDED,
        corp_rank__c: "A",
        hidden__c: "false"
      }
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
      )
    ];
    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual(expected);
  });

  test("Deal exist for both AWS_Search_Needs & AWS_Search_Deals: Should return empty result", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.NEEDS
      },
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.DEAL
      }
    ];

    const MOCK_MATCHED_DEALS = [
      {
        id: "dId1",
        ownerid: "dOwnerId1",
        dealstage__c: "dealstage__c1",
        corp_rank__c: "corp_rank__c1",
        hidden__c: "false"
      }
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };
    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual([]);
  });

  test("Matched deals is empty: Should return an empty result", () => {
    const MOCK_OLD_DEALS = [
      {
        deal_id: "dId1",
        search_sort_key: constants.DB_SORTK.NEEDS
      },
      {
        deal_id: "dId2",
        search_sort_key: constants.DB_SORTK.DEAL
      }
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
        hidden__c: "false"
      }
    ];
    const MOCK_BUYING_NEED = { id: "nId1", ownerid: "nOwnerId1", account__c: "account__c1" };

    expect(dealService.findNewDeals(MOCK_OLD_DEALS, MOCK_MATCHED_DEALS, MOCK_BUYING_NEED)).toStrictEqual([]);
  });
});
