import { DynamoDBClient, ListTablesCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";

export const userGithubMap = {};

class DbHandler {
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

    async getItem(tableName, key) {
        try {
            const command = new GetItemCommand({
                TableName: tableName,
                Key: key,
            });
            const response = await this.client.send(command);
            return response.Item;
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
        const item = await this.getItem(tableName, key);
        if (item) {
            console.log("Record already exists");
            return;
        }
        try {
            const command = new PutItemCommand({
                TableName: tableName,
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
