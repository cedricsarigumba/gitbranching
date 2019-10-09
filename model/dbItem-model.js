class DbItem {
  constructor(needsId, sortKey, dealId) {
    this.buying_needs_id = needsId;
    this.search_sort_key = sortKey;
    this.deal_id = dealId;
  }
}

module.exports.DbItem = DbItem;
