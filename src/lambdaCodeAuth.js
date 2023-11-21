// @ts-ignore
exports.handler = async function(event){
    console.log(event)
    console.log("Headers: ",event.headers)
    console.log("authorizationToken: ",event.authorizationToken)
      let token = event.authorizationToken
      let effect = 'Deny'
  
      if(token == "abc"){
          effect = 'Allow'
      }else{
          effect = 'Deny'
      }
  
      let policy = {
        "principalId": "user",
        "policyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Action": "execute-api:Invoke",
              "Effect": effect,
              "Resource": event.methodArn
            }
          ]
        }
      }
      return policy
        
  }