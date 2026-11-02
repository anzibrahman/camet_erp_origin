import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Sales from "../models/salesModel.js";
import Credit from "../models/creditNoteModel.js";
import Debit from "../models/debitNoteModel.js";
import Order from "../models/invoiceModel.js";
import Tally from "../models/TallyData.js";
import Settlement from "../models/settlementModel.js";
import Primary from "../models/primaryUserModel.js";
import { editSale, cancelSale } from "../controllers/saleController.js";
import { editCreditNote, cancelCreditNote } from "../controllers/creditNoteController.js";
import { editDebitNote, cancelDebitNote } from "../controllers/debitNoteController.js";
import { editInvoice, cancelSalesOrder } from "../controllers/saleOrderController.js";
import { voucherEditError } from "../helpers/voucherLifecycleHelper.js";
const id = () => new mongoose.Types.ObjectId();
const owner=id(), company=id(), party=id(), group=id();
const query=value=>({session(){return this;},then(resolve,reject){return Promise.resolve(value).then(resolve,reject);}});
function response(){return {count:0,status(code){this.code=code;return this;},json(data){this.count++;this.data=data;return this;}};}
function request(){return {params:{id:String(id())},query:{},owner,sUserId:id(),body:{orgId:company,party:{_id:party,partyName:"Customer",accountGroup_id:group}}};}
function setup(t,model,document){
 const events=[];let active=false;
 t.mock.method(mongoose,"startSession",async()=>({startTransaction(){active=true;},inTransaction(){return active;},async abortTransaction(){active=false;events.push("abort");},async commitTransaction(){active=false;events.push("commit");},endSession(){events.push("end");}}));
 t.mock.method(model,"findById",()=>query(document));
 // Any data mutation means a rejected request has crossed the guard.
 for(const m of Object.values(mongoose.models)) {
  t.mock.method(m,"updateOne",()=>{throw Error("Unexpected write");});
  t.mock.method(m,"findByIdAndUpdate",()=>{throw Error("Unexpected write");});
  t.mock.method(m,"deleteMany",()=>{throw Error("Unexpected write");});
  t.mock.method(m.prototype,"save",()=>{throw Error("Unexpected write");});
 }
 return events;
}
const types=[{name:"sales",model:Sales,edit:editSale,cancel:cancelSale},{name:"credit note",model:Credit,edit:editCreditNote,cancel:cancelCreditNote},{name:"debit note",model:Debit,edit:editDebitNote,cancel:cancelDebitNote},{name:"sale order",model:Order,edit:editInvoice,cancel:cancelSalesOrder}];
for(const type of types){
 test(type.name+": cancelled voucher cannot be edited",async t=>{
  const events=setup(t,type.model,{_id:id(),isCancelled:true});const res=response();
  await type.edit(request(),res);assert.equal(res.code,409);assert.match(res.data.message,/Cancelled/);assert.ok(events.includes("abort"));assert.ok(!events.includes("commit"));
 });
 test(type.name+": repeated cancellation performs no writes",async t=>{
  const events=setup(t,type.model,{_id:id(),isCancelled:true});const res=response();
  await type.cancel(request(),res);assert.ok([200,400].includes(res.code));assert.match(res.data.message,/already cancelled/);assert.ok(!events.includes("commit"));
 });
 if(type.model!==Order)for(const field of ["appliedReceipts","appliedPayments"]){
  test(type.name+": edit is blocked when "+field+" exist",async t=>{
   setup(t,type.model,{_id:id(),cmp_id:company,Primary_user_id:owner});t.mock.method(Tally,"findOne",()=>query({[field]:[{settledAmount:20}]}));const res=response();
   await type.edit(request(),res);assert.equal(res.code,409);assert.match(res.data.message,/payments applied/);
  });
 }
}
test("converted order cannot be edited or cancelled",async t=>{
 setup(t,Order,{_id:id(),isConverted:true});const editRes=response(),cancelRes=response();
 await editInvoice(request(),editRes);await cancelSalesOrder(request(),cancelRes);
 assert.equal(editRes.code,409);assert.equal(cancelRes.code,409);
});
test("eligible unpaid voucher passes edit guard with scoped outstanding lookup",async t=>{
 const record={_id:id(),cmp_id:company,Primary_user_id:owner};let filter;
 t.mock.method(Tally,"findOne",value=>{filter=value;return query({appliedReceipts:[],appliedPayments:[]});});
 assert.equal(await voucherEditError(record,{}),null);assert.deepEqual(filter,{billId:String(record._id),cmp_id:company,Primary_user_id:owner});
});
test("sale cancellation without owner email returns success exactly once",async t=>{
 const record={_id:id(),items:[],convertedFrom:[],cmp_id:company,Primary_user_id:owner,salesNumber:"S1"};
 const events=setup(t,Sales,record);
 t.mock.method(Tally,"findOne",()=>query(null));
 t.mock.method(Settlement,"deleteMany",async()=>({}));
 t.mock.method(Sales,"findByIdAndUpdate",async()=>record);
 t.mock.method(Primary,"findById",async()=>null);
 const res=response();await cancelSale(request(),res);
 assert.equal(res.code,200);assert.equal(res.count,1);assert.equal(record.isCancelled,true);assert.ok(events.includes("commit"));
});

test("notification failure after committed sale cancellation still returns success",async t=>{
 const record={_id:id(),items:[],convertedFrom:[],cmp_id:company,Primary_user_id:owner,salesNumber:"S1"};
 const events=setup(t,Sales,record);
 t.mock.method(Tally,"findOne",()=>query(null));
 t.mock.method(Settlement,"deleteMany",async()=>({}));
 t.mock.method(Sales,"findByIdAndUpdate",async()=>record);
 t.mock.method(Primary,"findById",async()=>{throw Error("Notification lookup unavailable");});
 const res=response();await cancelSale(request(),res);
 assert.equal(res.code,200);assert.equal(res.count,1);assert.ok(events.includes("commit"));assert.ok(!events.includes("abort"));
});
