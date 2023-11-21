import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

interface MicroservicesProps {
    inventoryTable: ITable;
    paymentTable: ITable;
    orderTable: ITable;
}

export class Microservices extends Construct {

  public readonly inventoryService: NodejsFunction;
  public readonly paymentService: NodejsFunction;
  public readonly orderService: NodejsFunction;

  constructor(scope: Construct, id: string, props: MicroservicesProps) {
    super(scope, id);

    // inventory service
    this.inventoryService = this.createInventoryFunction(props.inventoryTable);
    // basket microservices
    this.paymentService = this.createPaymentFunction(props.paymentTable);
    // order Service
    this.orderService = this.createOrderFunction(props.orderTable);
  }

  private createInventoryFunction(inventoryTable: ITable) : NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk'
        ]
      },
      environment: {
        PRIMARY_KEY: 'id',
        DYNAMODB_TABLE_NAME: inventoryTable.tableName,
        UPDATE_INVENTORY_EVENT_SOURCE: "com.inventory.updated",
        UPDATE_INVENTORY_EVENT_DETAILTYPE: "UpdateInventory",
        REVERT_INVENTORY_EVENT_SOURCE: "com.inventory.reverted",
        REVERT_INVENTORY_EVENT_DETAILTYPE: "RevertInventory",
        EVENT_BUSNAME: "InventoryEventBus"
      },
      runtime: Runtime.NODEJS_18_X,
    }

    // Product microservices lambda function
    const inventoryFunction = new NodejsFunction(this, 'inventoryService', {
      tracing: Tracing.ACTIVE,
      entry: join(__dirname, `/../src/inventory/index.js`),
      ...nodeJsFunctionProps,
    });

    inventoryTable.grantReadWriteData(inventoryFunction); 
    
    return inventoryFunction;
  }

  private createPaymentFunction(paymentTable: ITable) : NodejsFunction {
    const paymentFunctionProps: NodejsFunctionProps = {
      bundling: {
          externalModules: [
              'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          ],
      },
      environment: {
          PRIMARY_KEY: 'userName',
          DYNAMODB_TABLE_NAME: paymentTable.tableName,
          CANCEL_PAYMENT_EVENT_SOURCE: "com.payment.cancelPayment",
          CANCEL_PAYMENT_EVENT_DETAILTYPE: "PaymentCancellation",
          EVENT_BUSNAME: "PaymentEventBus"
      },
      runtime: Runtime.NODEJS_18_X,
    }

    const paymentFunction = new NodejsFunction(this, 'paymentService', {
      tracing: Tracing.ACTIVE,
      entry: join(__dirname, `/../src/payment/index.js`),
      ...paymentFunctionProps,
    });

    paymentTable.grantReadWriteData(paymentFunction);
    return paymentFunction;
  }

  private createOrderFunction(orderTable: ITable) : NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
        bundling: {
            externalModules: [
                'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
            ],
        },      
        environment: {
            PRIMARY_KEY: 'userName',
            SORT_KEY: 'orderDate',
            DYNAMODB_TABLE_NAME: orderTable.tableName,
            CREATE_ORDER_EVENT_SOURCE: "com.order.createorder",
            CREATE_ORDER_EVENT_DETAILTYPE: "CreateOrder",
            CANCEL_ORDER_EVENT_SOURCE: "com.order.cancelorder",
            CANCEL_ORDER__DETAILTYPE: "CancelOrder",
            EVENT_BUSNAME: "OrdersEventBus"
        },
        runtime: Runtime.NODEJS_18_X,
    }

    const orderFunction = new NodejsFunction(this, 'orderService', {
        tracing: Tracing.ACTIVE,
        entry: join(__dirname, `/../src/order/index.js`),
        ...nodeJsFunctionProps,
    });

    orderTable.grantReadWriteData(orderFunction);
    return orderFunction;
  }

}