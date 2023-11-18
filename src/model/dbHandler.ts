import {
  DynamoDBClient,
  ListTablesCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

export const userGithubMap = {};

export class DbHandler {
  constructor() {
    this.client = new DynamoDBClient({
      region: "us-west-2",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async listTables() {
    try {
      const command = new ListTablesCommand({});
      const response = await this.client.send(command);
      return response.TableNames;
    } catch (error) {
      console.error("Error listing tables:", error);
      throw error;
    }
  }

  async getAllRecords(tableName) {
    try {
      const command = new ScanCommand({
        TableName: tableName,
      });
      const response = await this.client.send(command);
      return response.Items;
    } catch (error) {
      console.error("Error getting all records:", error);
      throw error;
    }
  }

  async getItem(tableName, key) {
    try {
      const command = new GetItemCommand({
        TableName: tableName,
        Key: {
          PK: {
            S: key,
          },
          SK: {
            S: key,
          },
        },
      });

      const response = await this.client.send(command);

      if (response.Item) {
        return response.Item;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error getting item:", error);
      throw error;
    }
  }

  async getRecord(tableName, key) {
    const item = await this.getItem(tableName, key);
    return item;
  }

  async setRecord(tableName, key, value) {
    try {
      const command = new PutItemCommand({
        TableName: "rocket",
        Item: value,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error("Error setting record:", error);
      throw error;
    }
  }
}
