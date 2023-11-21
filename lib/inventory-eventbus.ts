import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
const AWSXRay = require('aws-xray-sdk');

interface InventoryEventBusProps {
    publisherFuntion: IFunction;
    targetFunction: IFunction;
    compensatingTargetFunction: IFunction;
}

export class InventoryEventBus extends Construct {

    constructor(scope: Construct, id: string, props: InventoryEventBusProps) {
        super(scope, id);

        //eventbus
        const bus = new EventBus(this, 'InventoryEventBusProps', {
            eventBusName: 'InventoryEventBus'
        });
    
        const inventoryUpdatedRule = new Rule(this, 'inventoryUpdatedRule', {
            eventBus: bus,
            enabled: true,
            description: 'Publish updation of inventory',
            eventPattern: {
                source: ['com.inventory.updated'],
                detailType: ['UpdateInventory']
            },
            ruleName: 'InventoryUpdatedRule'
        });
        
        inventoryUpdatedRule.addTarget(new LambdaFunction(props.targetFunction));

        const inventoryRevertedRule = new Rule(this, 'inventoryRevertedRule', {
            eventBus: bus,
            enabled: true,
            description: 'Publish revert of inventory',
            eventPattern: {
                source: ['com.inventory.reverted'],
                detailType: ['RevertInventory']
            },
            ruleName: 'inventoryRevertedRule'
        });

        // need to pass target to Lambda service
        inventoryRevertedRule.addTarget(new LambdaFunction(props.compensatingTargetFunction));
        bus.grantPutEventsTo(props.publisherFuntion);

        
    }

}