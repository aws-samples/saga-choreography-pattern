// Create service client module using ES6 syntax.
const AWSXRay = require('aws-xray-sdk');

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// Create an Amazon DynamoDB service client object.
const ddbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient());
export { ddbClient };