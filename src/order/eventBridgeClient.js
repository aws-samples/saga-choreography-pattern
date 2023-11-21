const AWSXRay = require('aws-xray-sdk')
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
const ebClient = AWSXRay.captureAWSv3Client(new EventBridgeClient());
export { ebClient };