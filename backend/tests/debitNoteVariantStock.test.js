import test from 'node:test';
import assert from 'node:assert/strict';
import Product from '../models/productModel.js';
import { handleDebitNoteStockUpdates, revertDebitNoteStockUpdates } from '../helpers/debitNoteHelper.js';
test('debit note saves, edits and cancels all pricing variants without losing stock quantities', async t => {
 let stock=100;
 t.mock.method(Product,'findOne',()=>({session:async()=>({_id:'product',balance_stock:stock,GodownList:[{balance_stock:stock}]})}));
 t.mock.method(Product,'bulkWrite',async operations=>{
  for(const operation of operations){const values=operation.updateOne.update.$set;
   if(values.balance_stock!==undefined)stock=values.balance_stock;
   if(values.GodownList)assert.equal(values.GodownList[0].balance_stock,stock);
  }
 });
 const rows=(quantities)=>quantities.map((count,index)=>({_id:'product',hasGodownOrBatch:false,
 totalCount:count,totalActualCount:count,GodownList:[{count,actualCount:count,selectedPriceRate:100-index*20,added:true}]}));
 const initial=rows([2,3]);
 await handleDebitNoteStockUpdates(initial,{});assert.equal(stock,95);
 await revertDebitNoteStockUpdates(initial,{});assert.equal(stock,100);
 const edited=rows([1,2]);
 await handleDebitNoteStockUpdates(edited,{});assert.equal(stock,97);
 await revertDebitNoteStockUpdates(edited,{});assert.equal(stock,100);
});
