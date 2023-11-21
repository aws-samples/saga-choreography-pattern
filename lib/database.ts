import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, ITable, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class Database extends Construct {

    public readonly inventoryTable: ITable;
    public readonly paymentTable: ITable;
    public readonly orderTable: ITable;

    constructor(scope: Construct, id: string) {
        super(scope, id);
      
         //inventory table
         this.inventoryTable = this.createInventoryTable();
         //payment table
         this.paymentTable = this.createPaymentTable();
         //order table
         this.orderTable = this.createOrderTable(); 
    }

    // Inventory DynamoDb Table Creation
    // PK: id
    private createInventoryTable() : ITable {
      const inventoryTable = new Table(this, 'inventory', {
        partitionKey: {
          name: 'id',
          type: AttributeType.STRING
        },
        tableName: 'inventory',
        removalPolicy: RemovalPolicy.DESTROY,
        billingMode: BillingMode.PAY_PER_REQUEST
      });
      return inventoryTable;
    }

    // Payment DynamoDb Table Creation
    // PK: userName -- items (SET-MAP object) 
    private createPaymentTable() : ITable {
      const paymentTable = new Table(this, 'payment', {
        partitionKey: {
          name: 'userName',
          type: AttributeType.STRING,
        },
        tableName: 'payment',
        removalPolicy: RemovalPolicy.DESTROY,
        billingMode: BillingMode.PAY_PER_REQUEST
      });
      return paymentTable;
    }

    // Order DynamoDb Table Creation
    // PK: userName - SK: orderDate
    private createOrderTable() : ITable {
      const orderTable = new Table(this, 'order', {
          partitionKey: {
            name: 'userName',
            type: AttributeType.STRING,
          },
          sortKey: {
            name: 'orderDate',
            type: AttributeType.STRING,
          },
          tableName: 'order',
          removalPolicy: RemovalPolicy.DESTROY,
          billingMode: BillingMode.PAY_PER_REQUEST
      });
      return orderTable;
    }

}