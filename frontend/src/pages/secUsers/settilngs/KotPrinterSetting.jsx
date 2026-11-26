import { useEffect, useRef, useState } from "react";
import { useSelector , useDispatch } from "react-redux";
import qz from "qz-tray";
import { toast } from "sonner";
import api from "@/api/api";
import { setSecSelectedOrganization } from "../../../../slices/secSelectedOrgSlice";
import { configureQzSecurity } from "@/pages/Restuarant/Helper/qzSecurity";
export default function KotPrinterSetting() {
  const dispatch = useDispatch()
  const {_id : companyId  , configurations } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );

  const savedPrinter = configurations?.[0]?.kotPrinter || "";

  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(savedPrinter);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const busy = loading || saving || removing;

  const dropdownRef = useRef(null);

  useEffect(() => {
    setSelectedPrinter(savedPrinter);
    setDropdownOpen(false);
  }, [companyId, savedPrinter]);

  // Load saved printer
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadPrinters = async () => {
    if (busy) return;
    setLoading(true);
    setLoaded(false);

    try {
      configureQzSecurity();
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }

      const result = await qz.printers.find();

      const names = Array.isArray(result) ? result : result ? [result] : [];

      const uniquePrinters = [...new Set(names)].sort();

      setPrinters(uniquePrinters);
      setLoaded(true);

      if (!uniquePrinters.length) {
        toast.info("No printers found on this computer.");
      }
    } catch (error) {
      console.error("QZ Tray connection error:", error);

      toast.error("Start QZ Tray and allow the connection, then try again.");
    } finally {
      setLoading(false);
    }
  };

  const persistPrinter = async (remove = false) => {
    if (busy) return;
    if (!companyId) {
      toast.error("Please select a company first.");
      return;
    }
    if (!remove && !selectedPrinter) {
      toast.error("Please select a printer.");
      return;
    }

    if (remove) setRemoving(true);
    else setSaving(true);
    setDropdownOpen(false);
    try {
      const response = await api.post(
        `/api/sUsers/savePrinter/${companyId}`,
        { printer: remove ? "" : selectedPrinter, printerType: "kot", remove },
        { withCredentials: true },
      );

      if (!response?.data?.success || !response?.data?.data) {
        throw new Error("Printer settings were not saved.");
      }
      dispatch(setSecSelectedOrganization(response?.data?.data));
      setSelectedPrinter(response.data.data.configurations?.[0]?.kotPrinter || "");

      toast.success(response?.data?.message);
    } catch (error) {
      toast.error(error.response?.data?.message || (remove ? "Could not remove the printer." : "Could not save the printer."));
    } finally {
      setSaving(false);
      setRemoving(false);
    }
  };

  const unavailable =
    loaded && selectedPrinter && !printers.includes(selectedPrinter);

  const selectPrinter = (printer) => {
    setSelectedPrinter(printer);
    setDropdownOpen(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f7f9fc] p-4 sm:p-6">
      <div className="w-full max-w-4xl">
        {/* Main Card */}
        <div className="overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Printer icon */}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#012a4a] text-white shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 9V3h12v6"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 14h12v7H6z"
                  />
                </svg>
              </div>

              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  KOT Printer
                </h1>

                <p className="mt-0.5 text-sm text-slate-500">
                  Select a printer available on this computer. The selection is saved for this company.
                </p>
              </div>
            </div>

            {/* Status */}
            {loaded && (
              <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Connected
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6">
            <div className="grid gap-5 md:grid-cols-[180px_1fr]">
              {/* Connect */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Printer Connection
                </label>

                <button
                  type="button"
                  onClick={loadPrinters}
                  disabled={busy}
                  className="
                    flex h-11 w-full items-center justify-center gap-2
                    rounded-xl bg-[#012a4a]
                    px-4 text-sm font-medium text-white
                    shadow-sm
                    transition-all duration-200
                    hover:bg-[#023d6b]
                    hover:shadow-md
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="opacity-25"
                        />

                        <path
                          d="M21 12a9 9 0 0 0-9-9"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"
                        />
                      </svg>

                      {loaded ? "Refresh" : "Connect"}
                    </>
                  )}
                </button>
              </div>

              {/* Custom Printer Dropdown */}
              <div ref={dropdownRef} className="relative">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  KOT Printer
                </label>

                <button
                  type="button"
                  onClick={() => {
                    if (!busy) {
                      setDropdownOpen((prev) => !prev);
                    }
                  }}
                  disabled={busy}
                  className={`
                    flex h-11 w-full items-center justify-between
                    rounded-xl border bg-white px-4
                    text-left text-sm
                    outline-none
                    transition-all duration-200
                    ${
                      dropdownOpen
                        ? "border-[#1479b8] ring-4 ring-[#1479b8]/10"
                        : "border-slate-300 hover:border-slate-400"
                    }
                  `}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5 shrink-0 text-slate-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"
                      />
                    </svg>

                    <span
                      className={`truncate ${
                        selectedPrinter
                          ? "font-medium text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {selectedPrinter || "Select KOT printer"}
                    </span>
                  </div>

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                    {!loaded ? (
                      <div className="px-4 py-5 text-center">
                        <p className="text-sm font-medium text-slate-700">
                          Connect printers first
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Click Connect to load available printers
                        </p>
                      </div>
                    ) : printers.length === 0 ? (
                      <div className="px-4 py-5 text-center text-sm text-slate-500">
                        No printers available
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto p-1.5">
                        {printers.map((printer) => {
                          const selected = selectedPrinter === printer;

                          return (
                            <button
                              key={printer}
                              type="button"
                              onClick={() => selectPrinter(printer)}
                              className={`
                                flex w-full items-center justify-between
                                rounded-lg px-3 py-2.5
                                text-left text-sm
                                transition
                                ${
                                  selected
                                    ? "bg-[#edf7fd] font-medium text-[#05679d]"
                                    : "text-slate-700 hover:bg-slate-50"
                                }
                              `}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div
                                  className={`
                                    flex h-8 w-8 shrink-0 items-center justify-center
                                    rounded-lg
                                    ${
                                      selected
                                        ? "bg-[#d9effb] text-[#05679d]"
                                        : "bg-slate-100 text-slate-500"
                                    }
                                  `}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-4 w-4"
                                  >
                                    <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
                                  </svg>
                                </div>

                                <span className="truncate">{printer}</span>
                              </div>

                              {selected && (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  className="h-4 w-4 shrink-0 text-[#05679d]"
                                >
                                  <path
                                    d="m5 12 4 4L19 6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {unavailable && (
                  <p className="mt-2 text-xs font-medium text-amber-600">
                    This printer is currently unavailable.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom area */}
            <p className="mt-4 text-xs text-slate-500">
              Removing the saved printer switches KOT printing back to browser print preview for this company.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="hidden text-xs text-slate-400 sm:block">
                {loaded
                  ? `${printers.length} printer${
                      printers.length !== 1 ? "s" : ""
                    } detected`
                  : "Connect to QZ Tray to detect printers"}
              </p>

              <button
                type="button"
                onClick={() => persistPrinter(true)}
                disabled={!companyId || !savedPrinter || busy}
                className="flex h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {removing && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {removing ? "Removing…" : "Remove Printer"}
              </button>
              <button
                type="button"
                onClick={() => persistPrinter()}
                disabled={
                  !companyId || !selectedPrinter || busy || unavailable
                }
                className="
                  ml-auto flex h-10 items-center gap-2
                  rounded-xl bg-[#012a4a]
                  px-5 text-sm font-semibold text-white
                  shadow-sm
                  transition-all duration-200
                  hover:bg-[#023d6b]
                  hover:shadow-md
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12l4 4L19 6"
                  />
                </svg>
                {saving && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {saving ? "Saving…" : "Save Printer"}
              </button>
            </div>
          </div>
        </div>
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="qz-install-heading">
          <h2 id="qz-install-heading" className="text-base font-semibold text-slate-900">Install and connect QZ Tray</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li><a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer" className="font-medium text-[#05679d] underline">Download QZ Tray from the official website</a> for your operating system.</li>
            <li>Run the installer and follow its prompts using the default options. Install QZ Tray on each computer that will print KOTs.</li>
            <li>Open QZ Tray and keep it running. On Windows, look for its icon in the system tray near the clock.</li>
            <li>Install your printer driver and print a test page from your computer’s printer settings.</li>
            <li>Return here, click Connect, and allow this app’s connection when QZ Tray asks.</li>
            <li>Select your kitchen printer and click Save Printer.</li>
          </ol>
          <p className="mt-3 text-sm text-slate-500">If connection fails, check that QZ Tray is running, then click Connect again. <a href="https://qz.io/docs/using-qz-tray" target="_blank" rel="noopener noreferrer" className="text-[#05679d] underline">Official setup guide</a></p>
        </section>
      </div>
    </div>
  );
}
