# se-search-execution-function

Search and find new deals that matched the buyer needs

### Tech

This application uses a number of open source projects to work properly:

- [NodeJS] - javascript runtime
- [aws-sdk] - collection of tools to integrate with AWS services
- [sqs-consumer] - aws sqs library
- [csvtojson] - library to convert csv to json
- [json2csv] - library to convert json to csv
- [winston] - nodejs logger
- [PM2] - production process manager to keep application forever alive
- [nodemon] - dev dependency : hot reload during development

### Installation

This application requires [Node.js](https://nodejs.org/) v8+ to run.

**For local environment**, add `PROFILE` in environment variables.

```
PROFILE=dev
```

Install the dependencies and start the server. This will automatically start the SQS-polling.

```sh
$ cd se-search-execution-function
$ npm install -d
$ npm run start:dev
```

**For production environments**, application will be loaded in [AWS-EC2](https://aws.amazon.com/ec2/) via [user-data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html) thus there is no need to manually install the dependencies, just package the source code and upload manually to AWS-S3 deployment bucket.

```sh
$ npm run package
```

### Production maintenance

We are using [PM2](https://github.com/Unitech/pm2) as our application process manager. Refer to commands below on checking application status. For more information, please refer to [PM2](https://github.com/Unitech/pm2) docs.

Starting application

```sh
$ pm2 start --name search-execute app.js -i 1
```

Listing application

```sh
$ pm2 list
```

Managing application

```sh
$ pm2 stop  search-execute
$ pm2 restart  search-execute
$ pm2 delete  search-execute
```

Check additional detail

```sh
$ pm2 describe search-execute
```

To monitor logs, custom metrics, application information:

```
$ pm2 monit
```

### Dependencies

Application will read the environment variables via [AWS-SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html), please configure the ff variables

```
SE_SRCH_NEEDS_BUCKET =
SF2AWS_LATEST_BUCKET =
SE_AWS2SF_DATA_BUCKET =
SE_SRCH_NEEDS_QUEUE =
QUEUE_BATCH_SIZE =
DEAL_RANKS =
DB_TABLE =
SE_SRC_CODE_KEY =
AWS_ACCESSKEY_ID =
AWS_SECRETACCESS_KEY =
PROFILE =
SPLIT_LIMIT =
DEPLOY_BUCKET =
```

### Todos

- unit test

  [NodeJS]: <https://nodejs.org/en/>
  [aws-sdk]: <https://aws.amazon.com/sdk-for-node-js/>
  [sqs-consumer]: <https://github.com/BBC/sqs-consumer>
  [csvtojson]: <https://github.com/Keyang/node-csvtojson>
  [json2csv]: <https://github.com/zemirco/json2csv#readme>
  [winston]: <https://github.com/winstonjs/winston>
  [nodemon]: <https://github.com/remy/nodemon>
  [PM2]: <https://github.com/Unitech/pm2>
