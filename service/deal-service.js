const constants = require("../common/constants");
const { splitStringToArray, isElementExist, isEmptyString, stringToBool, isNull, nonNull } = require("../common/utils");

const { ItemModel } = require("../model/item-model");
const { config } = require("../config/app-config");

/** Cross-check each deals if it matched the need buyingNeeds. If not match, disregard the deal */
function findMatchedDeals(need, deals) {
  let matchedDeals = filterDealsByBaseConditions(need, deals);
  matchedDeals = filterDealsByInvestments(need, matchedDeals);
  matchedDeals = filterDealsBySales(need, matchedDeals);

  return matchedDeals;
}

function filterDealsByBaseConditions(need, deals) {
  const needPrefNames = splitStringToArray(need.prefname__c, ";");
  const needCountryResidences = splitStringToArray(need.countryresidence__c, ";");
  const needIndustries = splitStringToArray(need.desiredindustrysmall__c, ";");

  return deals.filter(deal => {
    let dealPrefname = deal.prefname__c;
    if (
      ((dealPrefname !== constants.OUTSIDE_JAPAN && isElementExist(needPrefNames, dealPrefname)) ||
        isElementExist(needCountryResidences, deal.countryresidence__c)) &&
      (isElementExist(needIndustries, deal.industrysmall1__c) ||
        isElementExist(needIndustries, deal.industrysmall2__c) ||
        isElementExist(needIndustries, deal.industrysmall3__c))
    ) {
      return deal;
    }
  });
}

function filterDealsByInvestments(need, deals) {
  const investableLower = isEmptyString(need.investable_lower__c) ? null : BigInt(need.investable_lower__c);
  const investableUpper = isEmptyString(need.investable_upper__c) ? null : BigInt(need.investable_upper__c);

  // If need investables fields are null, then we do not need to do any filtering.
  if (isNull(investableLower) && isNull(investableUpper)) return deals;

  return deals.filter(deal => {
    const askingPrice = isEmptyString(deal.askingprice__c) ? null : BigInt(deal.askingprice__c);
    const refa = isEmptyString(deal.refa__c) ? null : BigInt(deal.refa__c);

    if (isNull(askingPrice) && isNull(refa)) return false;

    if (nonNull(investableLower) && isNull(investableUpper)) {
      if (nonNull(askingPrice)) {
        return investableLower <= askingPrice;
      } else {
        return investableLower <= refa;
      }
    } else if (isNull(investableLower) && nonNull(investableUpper)) {
      if (nonNull(askingPrice)) {
        return askingPrice <= investableUpper;
      } else {
        return refa <= investableUpper;
      }
    } else {
      if (nonNull(askingPrice)) {
        return investableLower <= askingPrice && askingPrice <= investableUpper;
      } else {
        return investableLower <= refa && refa <= investableUpper;
      }
    }
  });
}

function filterDealsBySales(need, deals) {
  const salesScaleLower = isEmptyString(need.salesscale_lower__c) ? null : BigInt(need.salesscale_lower__c);
  const salesScaleUpper = isEmptyString(need.salesscale_upper__c) ? null : BigInt(need.salesscale_upper__c);

  //  If need sales fields are null, then we do not need to do any filtering.
  if (isNull(salesScaleLower) && isNull(salesScaleUpper)) return deals;

  return deals.filter(deal => {
    const sales = isEmptyString(deal.sales__c) ? null : BigInt(deal.sales__c);

    if (isNull(sales)) return false;

    if (nonNull(salesScaleLower) && isNull(salesScaleUpper)) {
      return salesScaleLower <= sales;
    } else if (isNull(salesScaleLower) && nonNull(salesScaleUpper)) {
      return sales <= salesScaleUpper;
    } else {
      return salesScaleLower <= sales && sales <= salesScaleUpper;
    }
  });
}

/** Find new deals by checking if every item in ${matchDeals} are not included in ${oldDeals} */
function findNewDeals(oldDeals, matchedDeals, buyingNeed) {
  let newDeals = [];

  for (var i = 0, len = matchedDeals.length; i < len; i++) {
    let deal = matchedDeals[i];

    let dealRecords = oldDeals.filter(dbItem => dbItem.deal_id === deal.id);

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
const filterEligibleDeal = deal => {
  const ranks = splitStringToArray(config["DEAL_RANKS"]);

  let nresp =
    isElementExist([constants.CANDIDATE_UNDECIDED, constants.CASE], deal.dealstage__c) &&
    isElementExist(ranks, deal.corp_rank__c) &&
    !stringToBool(deal.hidden__c);

  let dresp =
    (deal.dealstage__c === constants.CANDIDATE_UNDECIDED && isElementExist(ranks, deal.corp_rank__c)) ||
    isElementExist([constants.BEFORE_COMMISSIONING, constants.CASE], deal.dealstage__c);

  return { isEligibleForNeeds: nresp, isEligibleForDeals: dresp };
};

module.exports = {
  findMatchedDeals,
  filterDealsByBaseConditions,
  filterDealsByInvestments,
  filterDealsBySales,
  findNewDeals
};
