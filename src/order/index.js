import { DeleteItemCommand, PutItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient";
import { ebClient } from "./eventBridgeClient";
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";

exports.handler = async function(event) {
    console.log("request:", JSON.stringify(event, undefined, 2));

   if (event['detail-type'] == 'RevertInventory') {
      await eventInvocationRevertInventory(event);
      return;
    }
    else {
      return await apiGatewayInvocation(event);
    }
};

const apiGatewayInvocation = async (event) => {
  // GET /order	
	// GET /order/{userName}
  let body;

  try {
    switch (event.httpMethod) {
        case "POST":
          body = await createNewOrder(event); // POST /basket
        case "GET":
            if (event.pathParameters != null) {
            body = await getOrder(event);
            } else {
            body = await getAllOrders();
            }
            break;
        case "DELETE":
          body = await cancelOrder(event); // DELETE /basket/{userName}?orderDate=
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
  }
  catch(e) {
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
}

const createNewOrder = async (event) => {
  try {
    console.log(`createNewOrder function. event : "${event}"`);
    const orderRequest = JSON.parse(event.body);
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(orderRequest || {})
    };
    console.log("Before create new order in DB.");
    console.log(params);
    const createResult = await ddbClient.send(new PutItemCommand(params));
    console.log("After order record creation: ",createResult);
    
    // publish an event to eventbridge - this will subscribe by order microservice and start ordering process.
    const publishedEvent = await publishCreateOrderEvent(orderRequest);

    return publishedEvent;

  } catch(e) {
    console.error("Error in New Order Creation", e);
    throw e;
  }
}

const publishCreateOrderEvent = async (orderRequest) => {
  console.log("publishCreateOrderEvent with payload :", orderRequest);
  try {
      // eventbridge parameters for setting event to target system
      const params = {
          Entries: [
              {
                  Source: process.env.CREATE_ORDER_EVENT_SOURCE,
                  Detail: JSON.stringify(orderRequest),
                  //Detail: "{ \"userName\": \"swn\"}",
                  DetailType: process.env.CREATE_ORDER_EVENT_DETAILTYPE,
                  Resources: [ ],
                  EventBusName: process.env.EVENT_BUSNAME
              },
          ],
      };
   
      const data = await ebClient.send(new PutEventsCommand(params));
  
      console.log("Success, event sent; requestID:", data);
      return data;
  
    } catch(e) {
      console.error(e);
      throw e;
    }
}

const getOrder = async (event) => {
  console.log("getOrder");
    
  try {
    // expected request : xxx/order/swn?orderDate=timestamp
    const userName = event.pathParameters.userName;  
    const orderDate = event.queryStringParameters.orderDate; 

    const params = {
      KeyConditionExpression: "userName = :userName and orderDate = :orderDate",
      ExpressionAttributeValues: {
        ":userName": { S: userName },
        ":orderDate": { S: orderDate }
      },
      TableName: process.env.DYNAMODB_TABLE_NAME
    };
 
    const { Items } = await ddbClient.send(new QueryCommand(params));

    console.log(Items);
    return Items.map((item) => unmarshall(item));
  } catch(e) {
    console.error(e);
    throw e;
  }
}

const getAllOrders = async () => {  
  console.log("getAllOrders");    
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

const cancelOrder = async (event) => {
  console.log(`Enetring cancelOrder function`);
  try {    

    const userName = event.pathParameters.userName;  
    const orderDate = event.queryStringParameters.orderDate;
    
    console.log(`cancelOrder function. userName : "${userName}"`);
    console.log(`cancelOrder function. orderDate : "${orderDate}"`);

    const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: {
          "userName": {"S": userName},
          "orderDate": {"S": orderDate}
          //userName: userName,
          //orderDate: orderDate
        },
        //Key: "userName = :userName and orderDate = :orderDate",
        //ExpressionAttributeValues: {
          //":userName": { S: userName },
          //":orderDate": { S: orderDate }
        //},
    };   

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
    console.log(deleteResult);

    // 3- publish an event to eventbridge - this will subscribe by order microservice and start ordering process.
    const publishedEvent = await publishCancelOrderEvent(userName);
    console.log("Return of event publcih", publishedEvent);
    return deleteResult;

  } catch(e) {
    console.error("Error in Cancel Order: ",e);
    throw e;
  }   
}

const publishCancelOrderEvent = async (user) => {
  console.log("publishCancelOrderEvent with payload :", user);
  try {
      // eventbridge parameters for setting event to target system
      const params = {
          Entries: [
              {
                  Source: process.env.CANCEL_ORDER_EVENT_SOURCE,
                  //Detail: JSON.stringify('userName: "${user}"'),
                  Detail: "{ \"userName\": \"swn\"}",
                  DetailType: process.env.CANCEL_ORDER_EVENT_DETAILTYPE,
                  Resources: [ ],
                  EventBusName: process.env.EVENT_BUSNAME
              },
          ],
      };
   
      const data = await ebClient.send(new PutEventsCommand(params));
  
      console.log("Success, event sent; requestID:", data);
      return data;
  
    } catch(e) {
      console.error(e);
      throw e;
    }

}

const eventInvocationRevertInventory = async (event) => {
  console.log('Method eventInvocationRevertInventory with payload :", "${event}"');
  try {
    console.log("Revert Order.");
  
    const userName = event.detail.userName;  
    const orderDate = event.detail.orderDate;
    
    console.log(`cancelOrder function. userName : "${userName}"`);
    console.log(`cancelOrder function. orderDate : "${orderDate}"`);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        "userName": {"S": userName},
        "orderDate": {"S": orderDate}
      },
    };
    
    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
    console.log(deleteResult);
      
  } catch(e) {
      console.error("Error in revert order ",e);
      throw e;
  }

}