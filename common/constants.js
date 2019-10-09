const AWS_REGION = "ap-northeast-1"; // Tokyo
const AWS_DYNAMODB_VERSION = { apiVersion: "2012-08-10" };

const CSV_PREFIX = "AWS_Search";
const CSV_HEADERS = ["sObject", "DealId__c", "NeedsId__c", "AccountId__c", "OwnerId"];

const OUTSIDE_JAPAN = "日本国外";
const CANDIDATE_UNDECIDED = "候補未定";
const CASE = "案件化中";
const BEFORE_COMMISSIONING = "受託前";

const DB_STATUS = {
  BOTH_EXIST: 2,
  ONE_ITEM_EXIST: 1,
  NONE_EXIST: 0
};

const DB_SORTK = {
  NEEDS: "_Needs",
  DEAL: "_Deal"
};

const LOG_LEVEL = {
  WARN: "WARN",
  ERROR: "ERROR"
};

const SOBJECTS = {
  DEAL: "Deal__c",
  SEARCH_DEAL: "AWS_Search_Deal__c",
  SEARCH_NEEDS: "AWS_Search_Needs__c"
};

module.exports = Object.freeze({
  AWS_REGION,
  AWS_DYNAMODB_VERSION,
  SOBJECTS,
  DB_STATUS,
  DB_SORTK,
  CSV_PREFIX,
  CSV_HEADERS,
  OUTSIDE_JAPAN,
  CANDIDATE_UNDECIDED,
  BEFORE_COMMISSIONING,
  CASE,
  LOG_LEVEL
});
