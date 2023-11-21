import { DeleteItemCommand, GetItemCommand, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient";
import { ebClient } from "./eventBridgeClient";

exports.handler = async function(event) {
    console.log("request:", JSON.stringify(event, undefined, 2));

    if (event['detail-type'] !== undefined) {
      // EventBridge Invocation
      await eventBridgeInvocation(event);
      return;
    } 
   
    let body;

    try {
      switch (event.httpMethod) {
        case "GET":
          if (event.pathParameters != null) {
            body = await getPayment(event.pathParameters.userName); // GET /payment/{userName}
            } else {
            body = await getAllPayments(); // GET /payment
          }
          break;
        case "POST":
          
          body = await createPayment(event); // POST /payment
          break;
        case "DELETE":
          body = await deletePayment(event.pathParameters.userName); // DELETE /payment/{userName}
          body = await publishPaymentCancellationEvent(event);
          break;
        default:
          throw new Error(`Unsupported route: "${event.httpMethod}"`);
      }

      console.log(body);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Successfully finished operation: "${event.httpMethod}"`,
          body: body
        })
      };

    } catch (e) {
      console.error(e);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to perform operation.",
          errorMsg: e.message,
          errorStack: e.stack,
        })
      };
    }
};

const getPayment = async (userName) => {
  console.log("getPayment");
  try {
      const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: marshall({ userName: userName })
      };
   
      const { Item } = await ddbClient.send(new GetItemCommand(params));
  
      console.log(Item);
      return (Item) ? unmarshall(Item) : {};
  
    } catch(e) {
      console.error(e);
      throw e;
  }
}

const getAllPayments = async () => {
  console.log("getAllPayments");
  try {
    const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const { Items } = await ddbClient.send(new ScanCommand(params));

    console.log(Items);
    return (Items) ? Items.map((item) => unmarshall(item)) : {};

  } catch(e) {
      console.error(e);
      throw e;
  }
}

const createPayment = async (event) => {
  console.log(`createPayment function. event : "${event}"`);
  try {
    const requestBody = JSON.parse(event.body);
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(requestBody || {})
    };  

    const createResult = await ddbClient.send(new PutItemCommand(params));
    console.log(createResult);
    return createResult;

  } catch(e) {
    console.error(e);
    throw e;
  }
}

const deletePayment = async (userName) => {
  console.log(`deletePayment function. userName : "${userName}"`);
  try {    
    const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: marshall({ userName: userName }),
    };   

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
    console.log(deleteResult);
    return deleteResult;

  } catch(e) {
    console.error(e);
    throw e;
  }   
}

const eventBridgeInvocation = async (event) => {
  console.log(`eventBridgeInvocation of payment service by inventory service: "${event}"`);

  // create payment into db
  try {

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(event.detail || {})
    };  

    const createResult = await ddbClient.send(new PutItemCommand(params));
    console.log("Payment created ",createResult);
    return createResult;

  } catch(e) {
    console.error("Error while creating payment in DB",e);
    throw e;
  }
}

const publishPaymentCancellationEvent = async (event) => {
  console.log(`Publish Payment Cancellation Event: "${event}"`);
  try {
    // eventbridge parameters for setting event to target system
    const params = {
        Entries: [
            {
                Source: process.env.CANCEL_PAYMENT_EVENT_SOURCE,
                Detail: event.body,
                DetailType: process.env.CANCEL_PAYMENT_EVENT_DETAILTYPE,
                Resources: [ ],
                EventBusName: process.env.EVENT_BUSNAME
            },
        ],
    };
 
    const data = await ebClient.send(new PutEventsCommand(params));

    console.log("Success, event sent; requestID:", data);
    return data;

  } catch(e) {
    console.error("Error while publishing payment cancel event ", e);
    throw e;
  }

}  
