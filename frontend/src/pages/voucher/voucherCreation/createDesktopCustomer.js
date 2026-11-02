export async function createDesktopCustomer(api, cmpId, enteredName) {
  const partyName = enteredName.trim();
  if (!partyName) throw new Error("Enter a customer name.");
  const groups = await api.get(`/api/sUsers/getAccountGroups/${cmpId}`, { withCredentials: true });
  const debtors = groups.data.data?.find(group => group.accountGroup === "Sundry Debtors");
  if (!debtors?._id) throw new Error("Sundry Debtors is not configured for this company.");
  const response = await api.post("/api/sUsers/addParty", {
    cpm_id: cmpId, partyName, accountGroup: debtors._id,
    openingBalanceAmount: 0, isHotelAgent: false,
  }, { withCredentials: true });
  if (!response.data.result?._id) throw new Error("The server did not return the new customer. Search the name again before retrying.");
  return { ...response.data.result, accountGroup_id: debtors._id, accountGroupName: debtors.accountGroup, partyType: response.data.result.partyType || "party", totalOutstanding: 0 };
}
