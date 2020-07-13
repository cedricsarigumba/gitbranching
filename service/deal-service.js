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
  const investable_lower__c = isEmptyString(need.investable_lower__c) ? null : BigInt(need.investable_lower__c);
  const investable_upper__c = isEmptyString(need.investable_upper__c) ? null : BigInt(need.investable_upper__c);

  return deals.filter(deal => {
    const askingprice__c = isEmptyString(deal.askingprice__c) ? null : BigInt(deal.askingprice__c);
    const refa__c = isEmptyString(deal.refa__c) ? null : BigInt(deal.refa__c);

    if (isNull(investable_lower__c) && isNull(investable_upper__c)) return true;
    if (isNull(askingprice__c) && isNull(refa__c)) return false;

    if (nonNull(investable_lower__c) && isNull(investable_upper__c)) {
      if (nonNull(askingprice__c)) {
        return investable_lower__c <= askingprice__c;
      } else if (nonNull(refa__c)) {
        return investable_lower__c <= refa__c;
      }
    } else if (isNull(investable_lower__c) && nonNull(investable_upper__c)) {
      if (nonNull(askingprice__c)) {
        return askingprice__c <= investable_upper__c;
      } else if (nonNull(refa__c)) {
        return refa__c <= investable_upper__c;
      }
    } else {
      if (nonNull(askingprice__c)) {
        return investable_lower__c <= askingprice__c && askingprice__c <= investable_upper__c;
      } else if (nonNull(refa__c)) {
        return investable_lower__c <= refa__c && refa__c <= investable_upper__c;
      }
    }
  });
}

function filterDealsBySales(need, deals) {
  const salesscale_lower__c = isEmptyString(need.salesscale_lower__c) ? null : BigInt(need.salesscale_lower__c);
  const salesscale_upper__c = isEmptyString(need.salesscale_upper__c) ? null : BigInt(need.salesscale_upper__c);

  return deals.filter(deal => {
    const sales__c = isEmptyString(deal.sales__c) ? null : BigInt(deal.sales__c);

    if (isNull(salesscale_lower__c) && isNull(salesscale_upper__c)) return true;
    if (isNull(sales__c)) return false;

    if (nonNull(salesscale_lower__c) && isNull(salesscale_upper__c)) {
      return salesscale_lower__c <= sales__c;
    } else if (isNull(salesscale_lower__c) && nonNull(salesscale_upper__c)) {
      return sales__c <= salesscale_upper__c;
    } else {
      return salesscale_lower__c <= sales__c && sales__c <= salesscale_upper__c;
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
