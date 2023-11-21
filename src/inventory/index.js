import { DeleteItemCommand, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient";
import { v4 as uuidv4 } from 'uuid';
import { ebClient } from "./eventBridgeClient";
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";

exports.handler = async function(event) {
    console.log("request:", JSON.stringify(event, undefined, 2));

    let body;
    
    if (event['detail-type'] == 'CreateOrder') {
      // EventBridge Invocation
      await eventBridgeInvocation(event);
      return;
    } 
    else if (event['detail-type'] == 'PaymentCancellation') {
      await eventInvocationPaymentCancellation(event);
      return;
    }
      
    try {
      switch (event.httpMethod) {
        case "GET":
          if(event.queryStringParameters != null) {
            body = await getProductsByCategory(event); // GET product/1234?category=Phone
          }
          else if (event.pathParameters != null) {
            body = await getProduct(event.pathParameters.id); // GET product/{id}
          } else {
            body = await getAllProducts(); // GET product
          }
          break;
        case "POST":
          body = await createProduct(event); // POST /product
          break;
        case "DELETE":
          body = await deleteProduct(event.pathParameters.id); // DELETE /product/{id}
          break;
        case "PUT":
            body = await updateProduct(event); // PUT /product/{id}
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
  //}
};

const getProduct = async (productId) => {
  console.log("getProduct");

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: productId })
    };

    const { Item } = await ddbClient.send(new GetItemCommand(params));

    console.log(Item);
    return (Item) ? unmarshall(Item) : {};

  } catch(e) {
    console.error(e);
    throw e;
  }
}

const getAllProducts = async () => {
  console.log("getAllProducts");
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

const createProduct = async (event) => {
  console.log(`createProduct function. event : "${event}"`);
  try {
    const productRequest = JSON.parse(event.body);
    // set productid
    const productId = uuidv4();
    productRequest.id = productId;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(productRequest || {})
    };

    const createResult = await ddbClient.send(new PutItemCommand(params));

    console.log(createResult);
    return createResult;

  } catch(e) {
    console.error(e);
    throw e;
  }
}

const deleteProduct = async (productId) => {
  console.log(`deleteProduct function. productId : "${productId}"`);

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: productId }),
    };

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));

    console.log(deleteResult);
    return deleteResult;
  } catch(e) {
    console.error(e);
    throw e;
  }
}

const updateProduct = async (event) => {
  console.log(`updateProduct function. event : "${event}"`);
  try {
    const requestBody = JSON.parse(event.body);
    const objKeys = Object.keys(requestBody);
    console.log(`updateProduct function. requestBody : "${requestBody}", objKeys: "${objKeys}"`);    

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: event.pathParameters.id }),
      UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join(", ")}`,
      ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
          ...acc,
          [`#key${index}`]: key,
      }), {}),
      ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
          ...acc,
          [`:value${index}`]: requestBody[key],
      }), {})),
    };

    const updateResult = await ddbClient.send(new UpdateItemCommand(params));

    console.log(updateResult);
    return updateResult;
  } catch(e) {
    console.error(e);
    throw e;
  }

}

const getProductsByCategory = async (event) => {
  console.log("getProductsByCategory");
  try {
    // GET product/1234?category=Phone
    const productId = event.pathParameters.id;
    const category = event.queryStringParameters.category;

    const params = {
      KeyConditionExpression: "id = :productId",
      FilterExpression: "contains (category, :category)",
      ExpressionAttributeValues: {
        ":productId": { S: productId },
        ":category": { S: category }
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

const eventBridgeInvocation = async (event) => {
  console.log(`Inventory eventBridgeInvocation function. event : "${event}"`);

  // update inventory in db
  await updateInventory(event);
}

const updateInventory = async (event) => {
  console.log(`updateInventory function. event : "${event.detail.items}"`);
  try {
    //const requestBody = JSON.parse(event.detail);
  
    event.detail.items.forEach(item => updateInventoryQuantity(item));

    const publishedEvent = await publishInventoryUpdateEvent(event.detail);

    return publishedEvent;
  
  } catch(e) {
    console.error("Error in updateInventory",e);
    throw e;
  }

}

const updateInventoryQuantity = async (item) => {
  try {
    console.log(`update inventory quantity function.`);
    console.log("Product ID: ", item.productId);
    console.log("Quantity: ", item.quantity);
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { id: { S: item.productId } },
      UpdateExpression: `SET quantity = quantity - :quantity`,
      ExpressionAttributeValues: {
        ":quantity": { N: item.quantity + "" }
      },
      ReturnValues: "ALL_NEW"
    };

    const updateResult = ddbClient.send(new UpdateItemCommand(params));
    console.log("Inventory quantity updated: ",updateResult);
    return updateResult;

  } catch(e) {
    console.error("Error updateInventoryQuantity",e);
    throw e;
  }

}

const publishInventoryUpdateEvent = async (inventoryUpdateEvent) => {
  console.log('publishInventoryUpdateEvent with payload :", "${inventoryUpdateEvent}"');
  try {
      // eventbridge parameters for setting event to target system
      const params = {
          Entries: [
              {
                  Source: process.env.UPDATE_INVENTORY_EVENT_SOURCE,
                  Detail: JSON.stringify(inventoryUpdateEvent),
                  //Detail: "{ \"userName\": \"swn\"}",
                  DetailType: process.env.UPDATE_INVENTORY_EVENT_DETAILTYPE,
                  Resources: [ ],
                  EventBusName: process.env.EVENT_BUSNAME
              },
          ],
      };
   
      const data = await ebClient.send(new PutEventsCommand(params));
  
      console.log("Success, event sent; requestID:", data);
      return data;
  
    } catch(e) {
      console.error("Error in publish inventory update ",e);
      throw e;
    }
}

const eventInvocationPaymentCancellation = async (event) => {
  console.log('publishInventoryCancellationEvent with payload :", "${event}"');
  try {

      // update inventory in db
      event.detail.items.forEach(item => revertInventoryQuantity(item));
      
      const publishedEvent = await publishInventoryRevertEvent(event.detail);

      return publishedEvent;
      
      
    } catch(e) {
      console.error("Error in publish inventory update ",e);
      throw e;
    }
}

const publishInventoryRevertEvent = async (inventoryRevertEvent) => {
  console.log('publishInventoryRevertEvent with payload :, "${inventoryRevertEvent}"');
  try {
      // eventbridge parameters for setting event to target system
      const params = {
          Entries: [
              {
                  Source: process.env.REVERT_INVENTORY_EVENT_SOURCE,
                  Detail: JSON.stringify(inventoryRevertEvent),
                  //Detail: "{ \"userName\": \"swn\"}",
                  DetailType: process.env.REVERT_INVENTORY_EVENT_DETAILTYPE,
                  Resources: [ ],
                  EventBusName: process.env.EVENT_BUSNAME
              },
          ],
      };
   
      const data = await ebClient.send(new PutEventsCommand(params));
  
      console.log("Success, event sent; requestID:", data);
      return data;
  
    } catch(e) {
      console.error("Error in publish inventory update ",e);
      throw e;
    }
}

const revertInventoryQuantity = async (item) => {
  try {
    console.log(`revertInventoryQuantity function.`);
    console.log("Product ID: ", item.productId);
    console.log("Quantity: ", item.quantity);
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { id: { S: item.productId } },
      UpdateExpression: `SET quantity = quantity + :quantity`,
      ExpressionAttributeValues: {
        ":quantity": { N: item.quantity + "" }
      },
      ReturnValues: "ALL_NEW"
    };

    const updateResult = await ddbClient.send(new UpdateItemCommand(params));
    console.log("Inventory quantity reverted: ",updateResult);
    return updateResult;

  } catch(e) {
    console.error("Error revertInventoryQuantity",e);
    throw e;
  }

}