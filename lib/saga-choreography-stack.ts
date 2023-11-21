import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiGateway } from './apigateway';
import { Database } from './database';
import { PaymentEventBus } from './payment-eventbus';
import { OrdersEventBus } from './orders-eventbus';
import { InventoryEventBus } from './inventory-eventbus';
import { Microservices } from './microservice';

export class SagaChoreogarphyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const database = new Database(this, 'Database');    

    const microservices = new Microservices(this, 'Microservices', {
      inventoryTable: database.inventoryTable,
      paymentTable: database.paymentTable,
      orderTable: database.orderTable
    });

    const apigateway = new ApiGateway(this, 'ApiGateway', {
      inventoryService: microservices.inventoryService,
      paymentService: microservices.paymentService,
      orderService: microservices.orderService
    });
    
    const eventbus = new PaymentEventBus(this, 'PaymentEventBus', {
      publisherFuntion: microservices.paymentService,
      targetFunction: microservices.inventoryService   
    });   

    const orderseventbus = new OrdersEventBus(this, 'OrdersEventBus', {
      publisherFuntion: microservices.orderService,
      targetFunction: microservices.inventoryService  
    });

    const inventoryeventbus = new InventoryEventBus(this, 'InventoryEventBus', {
      publisherFuntion: microservices.inventoryService,
      targetFunction: microservices.paymentService,
      compensatingTargetFunction: microservices.orderService  
    });
  }
}