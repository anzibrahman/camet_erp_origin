import test from 'node:test';
import assert from 'node:assert/strict';
import { creditNoteStockItems } from '../helpers/creditNoteStockItems.js';
test('pricing variants add stock once with combined billed and actual quantities', () => {
 const items = [100, 80].map(rate => ({_id:'p1', totalCount:2, totalActualCount:4,
  hasGodownOrBatch:true, gdnEnabled:true, batchEnabled:true,
  GodownList:[{godownMongoDbId:'g1', batch:'A', count:2, actualCount:4, selectedPriceRate:rate, added:true}]}));
 const before=JSON.stringify(items), result=creditNoteStockItems(items);
 assert.equal(result.length,1); assert.equal(result[0].totalActualCount,8);
 assert.equal(result[0].GodownList.length,1);assert.equal(result[0].GodownList[0].actualCount,8);
 assert.equal(JSON.stringify(items),before);
});
test('different destinations remain separate and disabled rows do not affect stock', () => {
 const result=creditNoteStockItems([{_id:'p1',totalCount:3,gdnEnabled:true,batchEnabled:true,
 GodownList:[{godownMongoDbId:'g1',batch:'A',count:1},{godownMongoDbId:'g2',batch:'A',count:2},
 {godownMongoDbId:'g1',batch:'A',count:10,added:false}]}]);
 assert.equal(result[0].GodownList.length,2);assert.equal(result[0].GodownList[0].actualCount,1);
 assert.equal(result[0].totalActualCount,3);
});

// Use actual Mongoose documents: plain-object fixtures miss the _doc boundary.
import mongoose from 'mongoose';
import CreditNote from '../models/creditNoteModel.js';
test('saved Mongoose items retain product IDs, stock flags and quantities', () => {
 const productId=new mongoose.Types.ObjectId(), godownId=new mongoose.Types.ObjectId();
 const note=new CreditNote({items:[100,80].map(rate=>({
  _id:productId,totalCount:2,totalActualCount:3,hasGodownOrBatch:true,gdnEnabled:true,batchEnabled:true,
  GodownList:[{godownMongoDbId:godownId,batch:'A',count:2,actualCount:3,added:true,selectedPriceRate:rate}]
 }))});
 const original=JSON.stringify(note.items);
 const [item]=creditNoteStockItems(note.items);
 assert.equal(String(item._id),String(productId));
 assert.equal(item.totalCount,4); assert.equal(item.totalActualCount,6);
 assert.equal(item.hasGodownOrBatch,true); assert.equal(item.gdnEnabled,true); assert.equal(item.batchEnabled,true);
 assert.equal(item.GodownList.length,1);
 assert.equal(String(item.GodownList[0].godownMongoDbId),String(godownId));
 assert.equal(item.GodownList[0].actualCount,6);
 assert.equal(JSON.stringify(note.items),original);
});
test('missing product identity is rejected before any stock lookup', () => {
 assert.throws(()=>creditNoteStockItems([{totalCount:1}]),/missing its product ID/);
});
