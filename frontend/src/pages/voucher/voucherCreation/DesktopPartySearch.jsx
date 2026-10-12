import DebitNotePartyPurchases from "./DebitNotePartyPurchases";
import CreditNotePartySales from "./CreditNotePartySales";
/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import CreatableSelect from "react-select/creatable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "../../../api/api";
import { createDesktopCustomer } from "./createDesktopCustomer";
import { addParty, addBillToParty, addShipToParty, removeParty } from "../../../../slices/voucherSlices/commonVoucherSlice";

export default function DesktopPartySearch({ cmpId, party, locked, voucherType = "sales" }) {
  const isPurchase = ["purchase", "debitNote"].includes(voucherType);
  const billToVoucher = voucherType === "debitNote" ? "DebitNote" : isPurchase ? "Purchase" : voucherType === "creditNote" ? "CreditNote" : voucherType === "saleOrder" ? "SalesOrder" : "Sales";
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const creatingRef = useRef(false);
  const partySelectRef = useRef(null);
  const [creating, setCreating] = useState(false);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input), 250);
    return () => clearTimeout(timer);
  }, [input]);
  const { data = [], isFetching, isError } = useQuery({
    queryKey: ["desktop-sale-parties", cmpId, voucherType, search],
    queryFn: async ({ signal }) => {
      const response = await api.get(`/api/sUsers/PartyList/${cmpId}`, {
        params: { voucher: isPurchase ? "purchase" : "sale", page: 1, limit: 60, search },
        withCredentials: true, signal,
      });
      return response.data.partyList || [];
    },
    enabled: !!cmpId,
  });
  const selectParty = selected => {
    dispatch(selected ? addParty(selected) : removeParty());
    dispatch(addBillToParty(selected || {}));
    dispatch(addShipToParty(selected || {}));
    if (selected) {
      setTimeout(() => document.getElementById("desktop-sale-product")?.focus(), 0);
    }
  };
  const createCustomer = async enteredName => {
    if (creatingRef.current || locked || isPurchase) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const customer = await createDesktopCustomer(api, cmpId, enteredName);
      selectParty(customer);
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["desktop-sale-parties", cmpId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardCounts", cmpId] });
      toast.success("Customer added under Sundry Debtors");
    } catch (error) {
      setInput(enteredName);
      toast.error(error.response?.data?.message || error.message || "Unable to add customer.");
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };
  return <div className="sales-party-search">
    <label htmlFor="desktop-sale-party">{isPurchase ? "Supplier" : "Customer"}</label>
    <div className="sales-party-control">
    <div className="credit-note-party-picker">
    {voucherType === "creditNote" && party?._id && <CreditNotePartySales key={party?._id || "none"} cmpId={cmpId} party={party} locked={locked} />}
    {voucherType === "debitNote" && party?._id && <DebitNotePartyPurchases key={party?._id || "none"} cmpId={cmpId} party={party} locked={locked} />}
    <div className="credit-note-party-select"><CreatableSelect ref={partySelectRef} inputId="desktop-sale-party" instanceId="desktop-sale-party"
      placeholder={creating ? "Adding customer…" : isPurchase ? "Search supplier…" : "Search or add customer…"} isClearable isDisabled={locked || creating}
      value={party?._id ? party : null} options={input === search ? data : []}
      getOptionLabel={option => option.__isNew__ ? option.label : option.partyName} getOptionValue={option => option.__isNew__ ? option.value : option._id}
      inputValue={input} filterOption={null} onInputChange={setInput} isLoading={creating || isFetching || input !== search}
      isValidNewOption={isPurchase ? () => false : (name => !!name.trim() && !creating && !isFetching && !isError && input === search && !data.some(customer => customer.partyName?.trim().toLowerCase() === name.trim().toLowerCase()))}
      createOptionPosition="last" formatCreateLabel={name => `+ Add customer “${name.trim()}” · Sundry Debtors`}

      onCreateOption={createCustomer}
      noOptionsMessage={() => isError ? "Unable to load parties. Try searching again." : isPurchase ? "No suppliers found" : "No customers found"}
      onChange={selectParty}
      menuPortalTarget={document.body} menuPosition="fixed" maxMenuHeight={240}
      styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, fontSize: 12, minHeight: 30 }), valueContainer: base => ({ ...base, padding: "0 6px" }), indicatorsContainer: base => ({ ...base, height: 28 }), option: base => ({ ...base, fontSize: 12, padding: "7px 10px" }) }}
    />
    </div></div>
    {party?._id && <div className="desktop-party-actions">
      <Link to={`/sUsers/billTo${billToVoucher}/${party._id}`}><span>Bill To address</span></Link>
    </div>}
    </div>
  </div>;
}
