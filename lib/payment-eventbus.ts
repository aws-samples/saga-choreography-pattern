import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction, SqsQueue } from "aws-cdk-lib/aws-events-targets";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
const AWSXRay = require('aws-xray-sdk');

interface PaymentEventBusProps {
    publisherFuntion: IFunction;
    targetFunction: IFunction;
}

export class PaymentEventBus extends Construct {

    constructor(scope: Construct, id: string, props: PaymentEventBusProps) {
        super(scope, id);

        //eventbus
        const bus = new EventBus(this, 'PaymentEventBus', {
            eventBusName: 'PaymentEventBus'
        });
    
        const paymentCancellationRule = new Rule(this, 'PaymentCancellationRule', {
            eventBus: bus,
            enabled: true,
            description: 'Publish cancellation of payment',
            eventPattern: {
                source: ['com.payment.cancelPayment'],
                detailType: ['PaymentCancellation']
            },
            ruleName: 'PaymentCancellationRule'
        });
    
        paymentCancellationRule.addTarget(new LambdaFunction(props.targetFunction));
        
        bus.grantPutEventsTo(props.publisherFuntion);
        
    }

}