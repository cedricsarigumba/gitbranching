class CSVItem {
  constructor(sObject, DealId__c, NeedsId__c, AccountId__c, OwnerId) {
    this.sObject = sObject;
    this.DealId__c = DealId__c;
    this.NeedsId__c = NeedsId__c;
    this.AccountId__c = AccountId__c;
    this.OwnerId = OwnerId;
  }
}

module.exports.CSVItem = CSVItem;
