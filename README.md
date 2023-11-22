## Build Saga Choreography Pattern on AWS

Saga design pattern is used to preserve data integrity in distributed transactions that span multiple services. 

A saga consists of a sequence of local transactions. Each local transaction in a saga updates the database and initiates the next local transaction. If a transaction fails, the saga runs compensating transactions to revert the database changes made by the previous transactions.

Saga design pattern has two variants - Choreography and Orchestration.
The saga choreography pattern is Event Driven. The saga participants subscribe to the events and act based on the event details. They coordinate among themselves over a messaging system and there is no central-hub or an orchestrator to coordinate the flow of transactions.

## Architecture

The source code in this repo provides sample code for implementation of the saga choreography pattern on AWS. Below diagram depicts the architecture created by this source code.

1. It has three microservices, namely - Order, Inventory and Payment services which are implemented as Lambdas.
2. Each service is exposed through an Amazon API Gateway REST endpoint.
3. Each service has a data store - implemented as DynamoDB tables.
4. Each service publishes messages and consumes them on Amazon EventBridge.

![Architecture Diagram](architecture.png)


## Prerequisites

For this walkthrough, you need:
- An [AWS](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fportal.aws.amazon.com%2Fbilling%2Fsignup%2Fresume&client_id=signup) account
- An AWS user with AdministratorAccess (see the [instructions](https://console.aws.amazon.com/iam/home#/roles%24new?step=review&commonUseCase=EC2%2BEC2&selectedUseCase=EC2&policies=arn:aws:iam::aws:policy%2FAdministratorAccess) on the [AWS Identity and Access Management](http://aws.amazon.com/iam) (IAM) console)
- Access to the following AWS services: Amazon API Gateway, AWS Lambda, Amazon EventBridge and Amazon DynamoDB.
- [Node.js](https://nodejs.org/en/download/) installed
- AWS CLI
- AWS CDK Toolkit
- Docker or Docker Desktop for Windows
- [Postman](https://www.postman.com/downloads/) to make the API call

## Setting up the environment

The CDK code in this repository creates the target architecture as shown in the above diagram. These include IAM roles, REST API on Amazon API Gateway, DynamoDB tables, Amazon EventBridge event buses and Lambda functions.

1. You need an AWS access key ID and secret access key for configuring the AWS Command Line Interface (AWS CLI).
2. Clone the repo:
```bash
git clone https://github.com/aws-samples/saga-choreography-pattern.git
```
3. Start Docker or Docker Desktop.
4. Build the source code using npm command and bootstrap CDK in your chosen AWS region.
5. The cdk synth command causes the resources defined in this repository to be translated into an AWS CloudFormation template. The cdk deploy command deploys the stacks into your AWS account. Run:
```bash
cdk synth 
cdk deploy
```
6. CDK deploys the physical environment to AWS (including the microservices). You can monitor the progress using the CloudFormation console. The stack name shall be SagaChoreographyStack.

7. Once the physical deployment of environment is completed, familiarize yourself with the REST endpoints and microservices in AWS Console. Use the Postman collection given in the repository to connect to the REST Endpoints and invoke APIs to intitate the transactions.
8. You may use the DELETE API to invoke compensating transactions.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

