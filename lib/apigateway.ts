import { Duration } from "aws-cdk-lib";
import { AuthorizationType, LambdaRestApi, TokenAuthorizer } from "aws-cdk-lib/aws-apigateway";
import { IFunction} from "aws-cdk-lib/aws-lambda";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from "constructs";
import { NagSuppressions } from 'cdk-nag';

interface ApiGatewayProps {
    inventoryService: IFunction,
    paymentService: IFunction,
    orderService: IFunction
}

export class ApiGateway extends Construct {    

    constructor(scope: Construct, id: string, props: ApiGatewayProps) {
        super(scope, id);

        // Inventory api
        this.createInventoryApi(props.inventoryService);
        // Payment api
        this.createPaymentApi(props.paymentService);
        // Order api
        this.createOrderApi(props.orderService);

    }

    private createInventoryApi(inventoryService: IFunction) {
      // GET /product
      // POST /product

      // Single product with id parameter
      // GET /product/{id}
      // PUT /product/{id}
      // DELETE /product/{id}
      const authorizerFn = new lambda.Function(this, 'InventoryAuthorizerFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'lambdaCodeAuth.handler',
        code: lambda.AssetCode.fromAsset('src')
      });

      const authorizer = new TokenAuthorizer(this, 'InventoryAuthorizer', {
        handler: authorizerFn,
        identitySource:'method.request.header.AuthorizeToken',
        resultsCacheTtl: Duration.minutes(0)
      });

      const apigw = new LambdaRestApi(this, 'inventoryApi', {
        restApiName: 'Inventory Service',
        handler: inventoryService,
        proxy: false,
        deployOptions: {
            dataTraceEnabled: true,
            tracingEnabled: true
        },
        defaultMethodOptions: {
            authorizationType: AuthorizationType.CUSTOM,
            authorizer: authorizer
        }

      });

      const product = apigw.root.addResource('product');
      product.addMethod('GET'); // GET /product
      product.addMethod('POST');  // POST /product
      
      const singleProduct = product.addResource('{id}'); // product/{id}
      singleProduct.addMethod('GET'); // GET /product/{id}
      singleProduct.addMethod('PUT'); // PUT /product/{id}
      singleProduct.addMethod('DELETE'); // DELETE /product/{id}

      NagSuppressions.addResourceSuppressions(
        apigw,
        [
          {
            id: 'AwsSolutions-APIG2',
            reason:
            "It is by design that validation method is not implemented in this construct so that Users can plug-in their own validation method."
          },
          {
            id: 'AwsSolutions-COG4',
            reason:
            "It is by design that Cognito is not chosen for authorisation so that Users can use their own authoriser."
          },
          {
            id: 'AwsSolutions-APIG1',
            reason:
            "It is by design that it is left to users to decide on enbaling access logging."
          },
          {
            id: 'AwsSolutions-APIG6',
            reason:
            "It is by design that it is left to users to decide if they want to use CloudWatch logging or a custom logging"
          }
        ],
        true
      )

      NagSuppressions.addResourceSuppressions(
        authorizerFn,
        [
          {
            id: 'AwsSolutions-IAM4',
            reason:
            "Suppress AwsSolutions-IAM4 as per design. Users can implement their own custom policy as per their specific need.",
            appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
          },
        ],
        true
      )
      
    }

    private createPaymentApi(paymentService: IFunction) {
        // POST /payment
        // GET /payment
        // GET /payment/{userName}
        // DELETE /payment/{userName}

        const authorizerFn = new lambda.Function(this, 'PaymentAuthorizerFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'lambdaCodeAuth.handler',
            code: lambda.AssetCode.fromAsset('src')
        });
    
        const authorizer = new TokenAuthorizer(this, 'Paymentuthorizer', {
            handler: authorizerFn,
            identitySource:'method.request.header.AuthorizeToken',
            resultsCacheTtl: Duration.minutes(0)
        });


        const apigw = new LambdaRestApi(this, 'paymentApi', {
            restApiName: 'Payment Service',
            handler: paymentService,
            proxy: false,
            deployOptions: {
                dataTraceEnabled: true,
                tracingEnabled: true
            },
            defaultMethodOptions: {
                authorizationType: AuthorizationType.CUSTOM,
                authorizer: authorizer
            }
        });

        const basket = apigw.root.addResource('payment');
        basket.addMethod('GET');  // GET /payment
        basket.addMethod('POST');  // POST /payment

        const singleBasket = basket.addResource('{userName}');
        singleBasket.addMethod('GET');  // GET /payment/{userName}
        singleBasket.addMethod('DELETE'); // DELETE /payment/{userName}

        NagSuppressions.addResourceSuppressions(
            apigw,
            [
              {
                id: 'AwsSolutions-APIG2',
                reason:
                "It is by design that validation method is not implemented in this construct so that Users can plug-in their own validation method."
              },
              {
                id: 'AwsSolutions-COG4',
                reason:
                "It is be design that Cognito is not chosen for authorisation so that Users can use their own authoriser."
              },
              {
                id: 'AwsSolutions-APIG1',
                reason:
                "It is by design that it is left to users to decide on enbaling access logging."
              },
              {
                id: 'AwsSolutions-APIG6',
                reason:
                "It is by design that it is left to users to decide if they want to use CloudWatch logging or a custom logging"
              }
            ],
            true
        )

        NagSuppressions.addResourceSuppressions(
          authorizerFn,
          [
            {
              id: 'AwsSolutions-IAM4',
              reason:
              "Suppress AwsSolutions-IAM4 as per design. Users can implement their own custom policy as per their specific need.",
              appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
            },
          ],
          true
        )
    }

    private createOrderApi(orderService: IFunction) {
        // GET /order
        // POST /order
	    // GET /order/{userName}
        // expected request : xxx/order/swn?orderDate=timestamp
        const authorizerFn = new lambda.Function(this, 'OrderAuthorizerFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'lambdaCodeAuth.handler',
            code: lambda.AssetCode.fromAsset('src')
        });
    
        const authorizer = new TokenAuthorizer(this, 'OrderAuthorizer', {
            handler: authorizerFn,
            identitySource:'method.request.header.AuthorizeToken',
            resultsCacheTtl: Duration.minutes(0)
        });

        const apigw = new LambdaRestApi(this, 'orderApi', {
            restApiName: 'Order Service',
            handler: orderService,
            proxy: false,
            deployOptions: {
                dataTraceEnabled: true,
                tracingEnabled: true
            },
            defaultMethodOptions: {
                authorizationType: AuthorizationType.CUSTOM,
                authorizer: authorizer
            }
        });
    
        const order = apigw.root.addResource('order');
        order.addMethod('GET');  // GET /order        
        order.addMethod('POST');  // POST /order
        const singleOrder = order.addResource('{userName}');
        singleOrder.addMethod('GET');  // GET /order/{userName}
            // expected request : xxx/order/swn?orderDate=timestamp
        singleOrder.addMethod('DELETE'); // DEL /order/{userName}

        NagSuppressions.addResourceSuppressions(
            apigw,
            [
              {
                id: 'AwsSolutions-APIG2',
                reason:
                "It is by design that validation method is not implemented in this construct so that Users can plug-in their own validation method."
              },
              {
                id: 'AwsSolutions-COG4',
                reason:
                "It is be design that Cognito is not chosen for authorisation so that Users can use their own authoriser."
              },
              {
                id: 'AwsSolutions-APIG1',
                reason:
                "It is by design that it is left to users to decide on enbaling access logging."
              },
              {
                id: 'AwsSolutions-APIG6',
                reason:
                "It is by design that it is left to users to decide if they want to use CloudWatch logging or a custom logging"
              }
            ],
            true
        )
        NagSuppressions.addResourceSuppressions(
          authorizerFn,
          [
            {
              id: 'AwsSolutions-IAM4',
              reason:
              "Suppress AwsSolutions-IAM4 as per design. Users can implement their own custom policy as per their specific need.",
              appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
            },
          ],
          true
        )

        return singleOrder;
    }
}