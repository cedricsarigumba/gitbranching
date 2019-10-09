let { DbItem } = require("./dbItem-model");
let { CSVItem } = require("./csvItem-model");
const { DB_SORTK } = require("./../common/constants");

class ItemModel {
  constructor(sobject, sortK, { id: dId, ownerid: dOwnerId }, { id: nId, ownerid: nOwnerId, account__c }) {
    this.sobject = sobject;
    this.sortK = sortK;
    this.dealId = dId;
    this.needsId = nId;
    this.accountId = account__c;
    this.ownerId = sortK === DB_SORTK.NEEDS ? nOwnerId : dOwnerId;
  }

  toDbItem() {
    return new DbItem(this.needsId, `${this.dealId}_${this.sortK}`, this.dealId);
  }

  toCsvItem() {
    return new CSVItem(this.sobject, this.dealId, this.needsId, this.accountId, this.ownerId);
  }
}

module.exports.ItemModel = ItemModel;
