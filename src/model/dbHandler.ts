import {
  DynamoDBClient,
  ListTablesCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export const userGithubMap = {};

export class DbHandler {
  client: DynamoDBClient;
  constructor() {
    this.client = new DynamoDBClient({
      region: "us-west-2",
      //@ts-ignore
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      //@ts-ignore
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

  async addRecord(tableName, PK, SK, value) {
    try {
      const record = {
        PK: {
          S: PK,
        },
        ...(SK && { SK: { S: SK } }),
        ...value,
      };
      const command = new PutItemCommand({
        TableName: tableName,
        Item: record,
        ReturnConsumedCapacity: "TOTAL",
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error("Error setting record:", error);
      throw error;
    }
  }

  async fetchRecord(tableName, PK, SK) {
    try {
      const command = new GetItemCommand({
        TableName: tableName,
        Key: {
          PK: {
            S: PK,
          },
          SK: {
            S: SK,
          },
        },
      });

      const response = await this.client.send(command);

      if (response.Item) {
        return unmarshall(response.Item);
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error getting item:", error);
      throw error;
    }
  }

  async fetchRecordsByPKAndAttendeeDiscordId(tableName, PK, attendeeDiscordId) {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: "PK-discordId-index",
        KeyConditionExpression: "PK = :PK AND discordId = :discordId",
        ExpressionAttributeValues: {
          ":PK": {
            S: PK
          },
          ":discordId": {
            S: attendeeDiscordId
          },
        },
      });

      const response = await this.client.send(command);

      if (response.Items) {
        return response.Items.map((item) => unmarshall(item));
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error getting item:", error);
      throw error;
    }
  }

  async fetchRecordsByPK(tableName, PK) {
    try {
      const command = new ScanCommand({
        TableName: tableName,
        FilterExpression: "PK = :PK",
        ExpressionAttributeValues: {
          ":PK": {
            S: PK,
          },
        },
      });

      const response = await this.client.send(command);

      if (response.Items) {
        return response.Items.map((item) => unmarshall(item));
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error getting item:", error);
      throw error;
    }
  }

  async deleteRecord(tableName, PK, SK) {
    try {
      const command = new DeleteItemCommand({
        TableName: tableName,
        Key: {
          PK: {
            S: PK,
          },
          SK: {
            S: SK,
          },
        },
      });

      const response = await this.client.send(command);

      return response;
    } catch (error) {
      console.error("Error deleting item:", error);
      throw error;
    }
  }

  async bulkAddRecords(tableName, records) {
    try {
      const chunkSize = 20;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);

        const command = new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: chunk.map((record) => ({
              PutRequest: {
                Item: record,
              },
            })),
          },
        });

        await this.client.send(command);
      }

      return;
    } catch (error) {
      console.error("Error bulk adding records:", error);
      throw error;
    }
  }

  async updateRecord(tableName, PK, SK, value) {
    try {
      const attributeNames = {};
      const attributeValues = {};
      let updateExpression = "SET";

      Object.entries(value).forEach(([key, val], index) => {
        // Use 'attr' as prefix for attribute names and values
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;

        attributeNames[attrName] = key;
        attributeValues[attrValue] = val;

        // Add to update expression
        if (index > 0) updateExpression += ",";
        updateExpression += ` ${attrName} = ${attrValue}`;
      });

      const command = new UpdateItemCommand({
        TableName: tableName,
        Key: {
          PK: {
            S: PK
          },
          SK: {
            S: SK
          },
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributeValues,
      });

      const response = await this.client.send(command);
      Promise.resolve(response);
    } catch (error) {
      console.error("Error updating record:", error);
      throw error;
    }
  }

  async bulkUpdateRecords(tableName, records) {
    try {
      const promises = [];
      for (let record of records) {
        const { PK, SK, ...value } = record;
        promises.push(this.updateRecord(tableName, PK, SK, value));
      }

      await Promise.all(promises);
    } catch (error) {
      console.error("Error bulk updating records:", error);
      throw error;
    }
  }
}

export const dbHandler = new DbHandler();
