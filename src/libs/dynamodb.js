import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export default {
    query: (params) => dynamoDb.query(params).promise(),
};