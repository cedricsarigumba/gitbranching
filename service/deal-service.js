const constants = require("../common/constants");
const utils = require("../common/utils");

const { ItemModel } = require("../model/item-model");
const { config } = require("../config/app-config");

/** Cross-check each deals if it matched the need buyingNeeds. If not match, disregard the deal */
function findMatchedDeals(need, deals) {
  const needPrefNames = utils.splitStringToArray(need.prefname__c, ";");
  const needCountryResidences = utils.splitStringToArray(need.countryresidence__c, ";");
  const needIndustries = utils.splitStringToArray(need.desiredindustrysmall__c, ";");

  return deals.filter((deal) => {
    let dealPrefname = deal.prefname__c;
    if (
      ((dealPrefname !== constants.OUTSIDE_JAPAN && utils.isElementExist(needPrefNames, dealPrefname)) ||
        utils.isElementExist(needCountryResidences, deal.countryresidence__c)) &&
      (utils.isElementExist(needIndustries, deal.industrysmall1__c) ||
        utils.isElementExist(needIndustries, deal.industrysmall2__c) ||
        utils.isElementExist(needIndustries, deal.industrysmall3__c))
    ) {
      return deal;
    }
  });
}

/** Find new deals by checking if every item in ${matchDeals} are not included in ${oldDeals} */
function findNewDeals(oldDeals, matchedDeals, buyingNeed) {
  let newDeals = [];

  for (var i = 0, len = matchedDeals.length; i < len; i++) {
    let deal = matchedDeals[i];

    let dealRecords = oldDeals.filter((dbItem) => dbItem.deal_id === deal.id);

    if (constants.DB_STATUS.BOTH_EXIST === dealRecords.length) {
      // * do nothing - deal exist for both AWS_Search_Needs & AWS_Search_Deals
      continue;
    }

    let items = getEligibleDeals(dealRecords, deal, buyingNeed);
    if (items.length) {
      newDeals = [...newDeals, ...items];
    }
  }

  return newDeals;
}

/** Identify if we need to add the deal in AWS_Search_Deal__c and/or AWS_Search_Needs__c. */
function getEligibleDeals(dealRecords, deal, need) {
  const { isEligibleForNeeds, isEligibleForDeals } = filterEligibleDeal(deal);
  let items = [];

  if (constants.DB_STATUS.ONE_ITEM_EXIST === dealRecords.length) {
    if (!dealRecords[0].search_sort_key.includes(constants.DB_SORTK.NEEDS) && isEligibleForNeeds) {
      items.push(new ItemModel(constants.SOBJECTS.SEARCH_NEEDS, constants.DB_SORTK.NEEDS, deal, need));
    } else if (!dealRecords[0].search_sort_key.includes(constants.DB_SORTK.DEAL) && isEligibleForDeals) {
      items.push(new ItemModel(constants.SOBJECTS.SEARCH_DEAL, constants.DB_SORTK.DEAL, deal, need));
    }
  } else if (constants.DB_STATUS.NONE_EXIST === dealRecords.length) {
    if (isEligibleForNeeds)
      items.push(new ItemModel(constants.SOBJECTS.SEARCH_NEEDS, constants.DB_SORTK.NEEDS, deal, need));
    if (isEligibleForDeals)
      items.push(new ItemModel(constants.SOBJECTS.SEARCH_DEAL, constants.DB_SORTK.DEAL, deal, need));
  }

  return items;
}

/** Check deal if eligible for AWS_Search_Deal__c or AWS_Search_Needs__C */
const filterEligibleDeal = (deal) => {
  const ranks = utils.splitStringToArray(config["DEAL_RANKS"]);

  let nresp =
    utils.isElementExist([constants.CANDIDATE_UNDECIDED, constants.CASE], deal.dealstage__c) &&
    utils.isElementExist(ranks, deal.corp_rank__c) &&
    !utils.stringToBool(deal.hidden__c);

  let dresp =
    (deal.dealstage__c === constants.CANDIDATE_UNDECIDED && utils.isElementExist(ranks, deal.corp_rank__c)) ||
    utils.isElementExist([constants.BEFORE_COMMISSIONING, constants.CASE], deal.dealstage__c);

  return { isEligibleForNeeds: nresp, isEligibleForDeals: dresp };
};

module.exports = {
  findMatchedDeals,
  findNewDeals,
};
