import mongoose from "mongoose";
import dns from "node:dns";
import { installMongoTransferMetrics } from "../utils/mongoTransferMetrics.js";
const connectDB = async () => {
  try {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      monitorCommands: process.env.MONGO_TRANSFER_METRICS_ENABLED === "true",
    });
    installMongoTransferMetrics(conn.connection.getClient());
    console.log(`MongoDB Connected ${conn.connection.host}`);
    
  } catch (error) {
    console.log(`Error : ${error.message}`);
    process.exit(1)
  }
};

export default connectDB;
