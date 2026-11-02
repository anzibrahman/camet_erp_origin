import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Party from "../models/partyModel.js";
import { getBankAndCashSources } from "../controllers/secondaryUserController.js";
const company=new mongoose.Types.ObjectId(), owner=new mongoose.Types.ObjectId();
const req={params:{cmp_id:String(company)},owner};
const response=()=>({status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
test("cash/bank loader includes local ledgers without import IDs and scopes company/owner",async t=>{
 const filters=[];const cash=new mongoose.Types.ObjectId(),bank=new mongoose.Types.ObjectId();
 t.mock.method(Party,"find",filter=>{filters.push(filter);return {select:async()=>filter.partyType==="cash"?[{_id:cash,partyName:"Cash"}]:[{_id:bank,partyName:"Bank"}]};});
 const res=response();await getBankAndCashSources(req,res);
 assert.equal(res.code,200);assert.equal(res.data.data.cashs[0].cash_ledname,"Cash");assert.equal(res.data.data.banks[0].bank_ledname,"Bank");
 for(const filter of filters){assert.equal(filter.cmp_id,String(company));assert.equal(filter.Primary_user_id,owner);assert.equal(filter.party_master_id,undefined);}
});
test("company without payment ledgers returns explicit empty lists",async t=>{
 t.mock.method(Party,"find",()=>({select:async()=>[]}));const res=response();await getBankAndCashSources(req,res);
 assert.deepEqual(res.data.data,{banks:[],cashs:[]});
});
test("payment source loading failures return errors rather than empty success",async t=>{
 t.mock.method(Party,"find",()=>({select:async()=>{throw Error("database unavailable");}}));const res=response();await getBankAndCashSources(req,res);
 assert.equal(res.code,500);assert.equal(res.data.details,"database unavailable");
});
