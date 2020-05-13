#!/usr/bin/ENV bash

num_arguments=$#

if [ $num_arguments != 2 ]
then
    echo "Invalid arguments supplied."
    exit 1
fi

FUNCTION_NAME=$1
ENV=$2
CICD_BUCKET="nma-$ENV-cicd"

if [ $ENV == "prd" ] || [ $ENV == "stg" ]
then
    aws s3 cp ./dist/package.zip s3://${CICD_BUCKET}/${FUNCTION_NAME}/package.zip --profile nma-zeus
elif [ $ENV == "tst" ]
then
    aws s3 cp ./dist/package.zip s3://${CICD_BUCKET}/${FUNCTION_NAME}/package.zip --profile nma-poseidon
else
   echo "Invalid environment: '${ENV}'"
   exit 1
fi