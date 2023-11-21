import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
const AWSXRay = require('aws-xray-sdk');

interface OrdersEventBusProps {
    publisherFuntion: IFunction;
    targetFunction: IFunction;
}

export class OrdersEventBus extends Construct {

    constructor(scope: Construct, id: string, props: OrdersEventBusProps) {
        super(scope, id);

        //eventbus
        const bus = new EventBus(this, 'OrdersEventBusProps', {
            eventBusName: 'OrdersEventBus'
        });
    
        const createOrderRule = new Rule(this, 'createOrderRule', {
            eventBus: bus,
            enabled: true,
            description: 'Publish creation of new order',
            eventPattern: {
                source: ['com.order.createorder'],
                detailType: ['CreateOrder']
            },
            ruleName: 'CreateOrderRule'
        });
        
        // need to pass target to Lambda service
        createOrderRule.addTarget(new LambdaFunction(props.targetFunction));
        bus.grantPutEventsTo(props.publisherFuntion);

        const cancelOrderRule = new Rule(this, 'cancelOrderRule', {
            eventBus: bus,
            enabled: true,
            description: 'Compensating Transaction to cancel order',
            eventPattern: {
                source: ['com.order.cancelorder'],
                detailType: ['CancelOrder']
            },
            ruleName: 'CancelOrderRule'
        });
    }

}