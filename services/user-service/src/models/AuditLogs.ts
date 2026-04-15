import mongoose, { Document, Schema, model } from "mongoose";

const logSchema = new Schema({
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, 
  action: { type: String, required: true}, 
  targetUser: { type:Schema.Types.ObjectId, ref:"User"}, 
  timeStamp: { type:Date, default:Date.now }, 
})

export default model("AuditLog", logSchema)


