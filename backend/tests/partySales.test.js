import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Sales from "../models/salesModel.js";
import Organization from "../models/OragnizationModel.js";
import User from "../models/secondaryUserModel.js";
import { getPartySales } from "../controllers/partySalesController.js";
const company=String(new mongoose.Types.ObjectId()),party=String(new mongoose.Types.ObjectId()),owner=new mongoose.Types.ObjectId();
const request=()=>({params:{cmp_id:company,partyId:party},owner,sUserId:new mongoose.Types.ObjectId(),query:{page:2}});
const response=()=>({status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
const query=value=>({select(){return this;},sort(){return this;},skip(value){this.skipped=value;return this;},limit(){return this;},async lean(){return value;}});
test("party sales query is scoped to company, owner and customer, excludes cancelled sales and paginates",async t=>{
 t.mock.method(Organization,"findOne",filter=>{assert.equal(filter.owner,owner);return query({});});
 t.mock.method(User,"findById",()=>query({configurations:[{organization:company}]}));
 const salesQuery=query([{_id:"sale",items:[]}]);let filter;
 t.mock.method(Sales,"find",value=>{filter=value;return salesQuery;});t.mock.method(Sales,"countDocuments",async()=>65);
 const res=response();await getPartySales(request(),res);
 assert.deepEqual(filter,{cmp_id:company,Primary_user_id:owner,"party._id":party,isCancelled:{$ne:true}});
 assert.equal(salesQuery.skipped,30);assert.equal(res.data.hasMore,true);assert.equal(res.data.total,65);
});
test("unassigned account cannot inspect party sales",async t=>{
 t.mock.method(Organization,"findOne",()=>query({}));t.mock.method(User,"findById",()=>query({configurations:[]}));
 t.mock.method(Sales,"find",()=>{throw Error("Unexpected access");});const res=response();await getPartySales(request(),res);assert.equal(res.code,403);
});
test("invalid party identifier is rejected",async()=>{
 const req=request();req.params.partyId="invalid";const res=response();await getPartySales(req,res);assert.equal(res.code,400);
});

test("organization-array assignment allows access with empty configurations", async t => {
 t.mock.method(Organization,"findOne",()=>query({}));
 t.mock.method(User,"findById",()=>query({organization:[new mongoose.Types.ObjectId(company)],configurations:[]}));
 t.mock.method(Sales,"find",()=>query([]));t.mock.method(Sales,"countDocuments",async()=>0);
 const res=response();await getPartySales(request(),res);assert.equal(res.code,undefined);assert.deepEqual(res.data.data,[]);
});
test("another organization assignment does not allow access", async t => {
 t.mock.method(Organization,"findOne",()=>query({}));
 t.mock.method(User,"findById",()=>query({organization:[new mongoose.Types.ObjectId()],configurations:[]}));
 t.mock.method(Sales,"find",()=>{throw Error("Unexpected access");});
 const res=response();await getPartySales(request(),res);assert.equal(res.code,403);
});
test("assignment cannot bypass company ownership or blocked-company check", async t => {
 t.mock.method(Organization,"findOne",filter=>{assert.equal(filter.owner,owner);assert.equal(filter.isBlocked,false);return query(null);});
 t.mock.method(User,"findById",()=>query({organization:[company],configurations:[]}));
 t.mock.method(Sales,"find",()=>{throw Error("Unexpected access");});
 const res=response();await getPartySales(request(),res);assert.equal(res.code,403);
});
