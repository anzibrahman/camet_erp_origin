import test from "node:test";
import assert from "node:assert/strict";
import { saleReturnRows, creditNoteItemsFromSale, combineSaleReturnItems } from "./creditNoteSaleItems.js";
const saleItems=[{_id:"p1",product_name:"Chair",igst:5,cgst:2.5,sgst:2.5,cess:0,addl_cess:0,hasGodownOrBatch:true,GodownList:[{godown_id:"shop",batch:"A",count:4,actualCount:4,selectedPriceRate:100,added:true},{godown_id:"store",batch:"B",count:2,actualCount:2,selectedPriceRate:80,added:true},{godown_id:"unused",count:9,added:false}]}];
test("Qty All copies original rates, taxes and stock identities without mutating the sale",()=>{
 const before=JSON.stringify(saleItems),result=creditNoteItemsFromSale(saleItems);
 assert.equal(result[0].totalCount,6);assert.equal(result[0].total,588);assert.equal(result[0].totalIgstAmt,28);
 assert.equal(result[0].GodownList[0].batch,"A");assert.equal(result[0].GodownList[1].selectedPriceRate,80);
 assert.equal(JSON.stringify(saleItems),before);assert.equal(saleReturnRows(saleItems).length,2);
});
test("partial return quantities recalculate amounts and preserve actual/billed ratios",()=>{
 const items=[{...saleItems[0],GodownList:[{...saleItems[0].GodownList[0],actualCount:8,discountType:"amount",discountAmount:40}]}];
 const result=creditNoteItemsFromSale(items,{"0:0":1});
 assert.equal(result[0].totalCount,1);assert.equal(result[0].totalActualCount,2);assert.equal(result[0].total,94.5);assert.equal(result[0].GodownList[0].discountAmount,10);
});
test("zero quantity rows are excluded from selected credit quantities",()=>{
 const result=creditNoteItemsFromSale(saleItems,{"0:0":0,"0:1":1});
 assert.equal(result[0].totalCount,1);assert.equal(result[0].GodownList[0].added,false);assert.equal(result[0].total,84);
});
test("negative and non-finite return quantities are rejected",()=>{
 for(const quantity of [-1,NaN,Infinity])assert.throws(()=>creditNoteItemsFromSale(saleItems,{"0:0":quantity}),/Return quantity/);
});
test("inclusive-tax sale rate remains inclusive in the credit note",()=>{
 const result=creditNoteItemsFromSale([{...saleItems[0],isTaxInclusive:true,GodownList:[{...saleItems[0].GodownList[0],selectedPriceRate:105}]}],{"0:0":1});
 assert.equal(result[0].total,105);assert.equal(result[0].totalIgstAmt,5);assert.equal(result[0].isTaxInclusive,true);
});

const single = (overrides = {}, rowOverrides = {}) => ({ items: [{ ...saleItems[0], ...overrides,
 GodownList: [{ ...saleItems[0].GodownList[0], ...rowOverrides }] }] });
test("multiple sales combine matching rows and preserve total and actual quantities", () => {
 const sales = [single(), single({}, { count: 2, actualCount: 2 })];
 const before = JSON.stringify(sales);
 const result = combineSaleReturnItems(sales);
 assert.equal(result.length, 1); assert.equal(result[0].GodownList.length, 1);
 assert.equal(result[0].totalCount, 6); assert.equal(result[0].totalActualCount, 6);
 assert.equal(result[0].total, 630); assert.equal(JSON.stringify(sales), before);
});
test("any differing rate, discount, tax, or inclusive setting remains separate", () => {
 for (const variant of [single({}, {selectedPriceRate: 90}),
 single({}, {discountType: 'percentage', discountPercentage: 5}),
 single({igst: 12}), single({cgst: 6}), single({cess: 1}),
 single({addl_cess: 2}), single({isTaxInclusive: true})]) {
 assert.equal(combineSaleReturnItems([single(), variant]).length, 2);
 }
});
test("equal amount discounts accumulate without changing the returned value", () => {
 const sale = single({}, {discountType: 'amount', discountAmount: 40});
 const result = combineSaleReturnItems([sale, sale]);
 assert.equal(result.length, 1); assert.equal(result[0].GodownList[0].discountAmount, 80);
 assert.equal(result[0].total, 756);
 assert.equal(creditNoteItemsFromSale(result, {'0:0': 2})[0].total, 189);
 assert.equal(combineSaleReturnItems([sale, single({}, {discountType: 'amount', discountAmount: 20})]).length, 2);
});
test("matching items retain separate godown and batch destinations", () => {
 const result = combineSaleReturnItems([single(), single({}, {godown_id: 'other', batch: 'B'})]);
 assert.equal(result.length, 1); assert.equal(result[0].GodownList.length, 2);
 assert.equal(result[0].totalCount, 8);
});

test("returns can exceed original quantity without changing source history", () => {
 const source=[{...saleItems[0],GodownList:[{...saleItems[0].GodownList[0],count:1,actualCount:1}]}];
 const before=JSON.stringify(source);
 const result=creditNoteItemsFromSale(source,{'0:0':5});
 assert.equal(result[0].totalCount,5);assert.equal(result[0].totalActualCount,5);
 assert.equal(result[0].total,525);assert.equal(JSON.stringify(source),before);
});
