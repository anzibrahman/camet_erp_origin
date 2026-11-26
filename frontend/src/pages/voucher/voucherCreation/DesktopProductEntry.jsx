/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { addItem, resetPaymentSplit } from "../../../../slices/voucherSlices/commonVoucherSlice";
import { addDesktopStockRow, priceLevelRate, desktopTaxInclusive, matchingSaleRateItem } from "./desktopSaleItemState";

export default function DesktopProductEntry({ locked }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const company = useSelector(state => state.secSelectedOrganization.secSelectedOrg);
  const { party, items, selectedPriceLevel, priceLevels, voucherType } = useSelector(state => state.commonVoucherSlice);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState(null);
  const [stockIndex, setStockIndex] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  useEffect(() => {
    const existing = items.find(item => item._id === product?._id);
    setIsTaxInclusive(desktopTaxInclusive(product, existing, stockIndex));
  }, [product, stockIndex, items]);
  const [error, setError] = useState("");
  const focusNext = id => setTimeout(() => document.getElementById(id)?.focus(), 0);
  const usesManualRate = voucherType === "purchase" || voucherType === "debitNote";
  const disabled = locked || !party?._id || (!usesManualRate && priceLevels === null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input), 250);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (!product) {
      setRate("");
      return;
    }
    if (usesManualRate) {
      const selectedRate = product.GodownList?.[stockIndex]?.selectedPriceRate;
      setRate(selectedRate === undefined || selectedRate === null || selectedRate === "" ? "" : String(selectedRate));
      return;
    }
    setRate(String(priceLevelRate(product, selectedPriceLevel)));
  }, [product, stockIndex, selectedPriceLevel, voucherType, usesManualRate]);
  useEffect(() => {
    setProduct(null); setStockIndex(""); setError("");
  }, [company._id, party?._id]);
  useEffect(() => {
    const pending = window.sessionStorage.getItem("desktopPurchasePendingBatch");
    if (!pending) return;
    try {
      const { item, batchName } = JSON.parse(pending);
      const newBatchIndex = item?.GodownList?.findIndex((row) => row?.newBatch && row?.batch === batchName);
      if (!item || newBatchIndex < 0) return;
      setProduct(item);
      setStockIndex(String(newBatchIndex));
      setQuantity(String(item.GodownList[newBatchIndex]?.count || 1));
      setRate("");
      setError("");
      setTimeout(() => document.getElementById("desktop-product-rate")?.focus(), 0);
    } catch { /* A stale draft should not block product entry. */ } finally {
      window.sessionStorage.removeItem("desktopPurchasePendingBatch");
    }
  }, []);
  const { data, isFetching, isError, fetchNextPage, hasNextPage, refetch } = useInfiniteQuery({
    queryKey: ["desktop-sale-products", company._id, voucherType, search],
    initialPageParam: 1,
    queryFn: async ({ signal, pageParam }) => {
      const response = await api.get(`/api/sUsers/getProducts/${company._id}`, {
        params: { voucherType: usesManualRate ? voucherType : "sales", page: pageParam, limit: 30, search }, withCredentials: true, signal,
      });
      return response.data;
    },
    getNextPageParam: (last, pages) => last.pagination?.hasMore ? pages.length + 1 : undefined,
    enabled: !!company._id && !disabled,
  });
  const options = data?.pages.flatMap(page => page.productData || []) || [];
  const productOptions = input === search ? [...options, { _id: "__add_product__", product_name: "+ Add new product", product_code: "" }] : [];
  const stock = product?.GodownList?.[stockIndex];
  const valid = product && stock && Number(quantity) > 0 && rate !== "" && Number(rate) >= 0;
  const canAddBatch = voucherType === "purchase" && product && stockIndex !== "" && (product.batchEnabled === true || product.GodownList?.some((row) => Boolean(row?.batch)));
  const preview = valid ? addDesktopStockRow(product, null, Number(stockIndex), Number(quantity), Number(rate), isTaxInclusive).total : 0;
  const selectStockRow = (event) => {
    const value = event.target.value;
    if (value === "__add_batch__") {
      if (!stock) return;
      navigate(`/sUsers/addBatchPurchase/${product._id}`, { state: { item: product, selectedGodownId: stock.godownMongoDbId || stock.godown_id || "", returnToDesktopEntry: true } });
      return;
    }
    setStockIndex(value);
  };
  const submit = event => {
    event.preventDefault();
    if (!valid || disabled) return;
    if (!Number.isFinite(Number(quantity)) || !Number.isFinite(Number(rate))) {
      setError("Enter a valid quantity and rate."); return;
    }
    const existing = matchingSaleRateItem(items, product, Number(stockIndex), rate, isTaxInclusive);
    const added = addDesktopStockRow(product, existing, Number(stockIndex), Number(quantity), Number(rate), isTaxInclusive);
    added._voucherLineId = existing?._voucherLineId || "voucher-line-" + crypto.randomUUID();
    dispatch(addItem({ payload: added, moveToTop: false }));
    dispatch(resetPaymentSplit());
    setProduct(null); setStockIndex(""); setQuantity("1"); setError("");
    searchRef.current?.focus();
  };
  return <form className="sales-product-entry" onSubmit={submit}>
    <div className="sales-product-fields">
      <div className="sales-product-search"><label htmlFor="desktop-sale-product">Code / Product</label>
        <Select ref={searchRef} inputId="desktop-sale-product" instanceId="desktop-sale-product" value={product}
          options={productOptions} filterOption={null} isClearable isDisabled={disabled}
          getOptionLabel={item => `${item.product_code || ""} ${item.product_name}`.trim()}
          getOptionValue={item => item._id} placeholder="Search code or name…"
          onInputChange={setInput} isLoading={isFetching || input !== search}
          onChange={value => { if (value?._id === "__add_product__") { navigate("/sUsers/addProduct"); return; } setProduct(value); setStockIndex(value?.GodownList?.length === 1 ? "0" : ""); setError(""); focusNext("desktop-stock-row"); }}
          onMenuScrollToBottom={() => { if (hasNextPage && !isFetching) fetchNextPage(); }}
          noOptionsMessage={() => isError ? "Unable to load products" : "No products found"}
          menuPortalTarget={document.body} menuPosition="fixed" maxMenuHeight={230}
          styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 30, fontSize: 12 }), valueContainer: base => ({ ...base, padding: "0 6px" }), indicatorsContainer: base => ({ ...base, height: 28 }), option: (base, state) => ({ ...base, fontSize: 12, padding: "7px 10px", color: state.data?._id === "__add_product__" ? "#2563eb" : base.color, fontWeight: state.data?._id === "__add_product__" ? 600 : base.fontWeight }) }}
        />
      </div>
      <div className="sales-product-stock"><label htmlFor="desktop-stock-row">Godown / Batch</label><select id="desktop-stock-row" value={stockIndex} disabled={disabled || !product} required onChange={selectStockRow} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); focusNext("desktop-product-qty"); } }}>
        <option value="">Select godown</option>
        {product?.GodownList?.map((row, index) => <option key={index} value={index}>{[row.godown, row.batch].filter(Boolean).join(" / ") || "Default"}</option>)}
        {canAddBatch && <option value="__add_batch__">+ Add batch in this Godown</option>}
      </select></div>
      <div><label htmlFor="desktop-product-qty">Qty{product?.unit ? ` (${product.unit})` : ""}</label><input id="desktop-product-qty" type="number" min="0.001" step="0.001" required value={quantity} disabled={disabled || !product} onChange={event => setQuantity(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); focusNext("desktop-product-rate"); } }} /></div>
      <div><label htmlFor="desktop-product-rate">Rate</label><input id="desktop-product-rate" type="number" min="0" step="any" required value={rate} disabled={disabled || !product} onChange={event => setRate(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /></div>
      <label className="sales-tax-inclusive" htmlFor="desktop-product-tax-inclusive">
      <input id="desktop-product-tax-inclusive" type="checkbox" checked={isTaxInclusive} disabled={disabled || !product} onChange={event => setIsTaxInclusive(event.target.checked)} />
      Tax Inclusive
    </label>
      <div><label htmlFor="desktop-product-amount">Amount</label><output id="desktop-product-amount">{preview.toFixed(2)}</output></div>
      <button type="submit" className="sales-product-add" disabled={disabled || !valid} aria-label="Add product to sale"><Plus size={18} />Add</button>
    </div>
    {(error || stock || isError) && <div className="sales-product-hint" aria-live="polite">{error || (stock ? `Available stock: ${stock.balance_stock ?? 0} ${product.unit || ""}` : "")}
      {isError && <button type="button" onClick={() => refetch()}>Retry products</button>}
    </div>}
  </form>;
}
