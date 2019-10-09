const AWS = require("aws-sdk");
const constants = require("../common/constants");
const ssm = new AWS.SSM({ region: constants.AWS_REGION });

const PROFILE = process.env["PROFILE"];
const FUNCTION_NAME_PATH = "/se-search-execute-function/";

let ENV_VARIABLES = {};

const configureApp = async () => {
  await loadEnvironmentVariables();
  configureAWSEnv();
};

/**
 * Load environment variables from AWS SSM
 */
const loadEnvironmentVariables = async () => {
  if (!PROFILE) {
    throw new Error("PROFILE environment variable is not configured. Returning error.");
  }

  const path = `${FUNCTION_NAME_PATH}${PROFILE}/`;

  let req = {
    Path: path,
    Recursive: true,
    WithDecryption: false
  };

  let resp = {};

  do {
    if (resp.NextToken) req.NextToken = resp.NextToken;

    resp = await ssm.getParametersByPath(req).promise();

    for (let p of resp.Parameters) {
      let pName = p.Name.replace(path, "");
      ENV_VARIABLES[pName] = p.Value.trim();
    }
  } while (resp.NextToken);

  if (Object.keys(ENV_VARIABLES).length == 0) {
    throw new Error("Environment variables not configured properly. Please check AWS-SSM entries.");
  }
};

/**
 * Setup environment related settings
 */
const configureAWSEnv = function() {
  if (PROFILE === "dev") {
    AWS.config.update({
      accessKeyId: ENV_VARIABLES["AWS_ACCESSKEY_ID"],
      secretAccessKey: ENV_VARIABLES["AWS_SECRETACCESS_KEY"],
      region: constants.AWS_REGION
    });
  } else {
    // do nothing for other environments
  }
};

module.exports = {
  configureApp,
  config: ENV_VARIABLES
};
