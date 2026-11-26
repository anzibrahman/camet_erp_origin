import React, { useEffect, useMemo, useState } from "react";

import api from "@/api/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useSelector, useDispatch } from "react-redux";
import { setPaxReportDate } from "../../../../slices/dateSlice";
import TitleDiv from "@/components/common/TitleDiv";
const getToday = () => new Date().toISOString().slice(0, 10);

const get29DaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
};

const TouristReport = () => {
  const dispatch = useDispatch();

  const paxReportDate = useSelector(
    (state) => state.selectedDate.paxReportDate,
  );

  const { start, end, autoFetch } = paxReportDate;
  const [filters, setFilters] = useState({
    fromDate: start || get29DaysAgo(), // ✅ 29 days ago
    toDate: end || getToday(),
  });
  const cmp_id = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg._id,
  );

  useEffect(() => {
    if (autoFetch && cmp_id) {
      fetchReport(start, end);

      dispatch(
        setPaxReportDate({
          autoFetch: true,
          start: start,
          end: end,
        }),
      );
    }
  }, [autoFetch, cmp_id]);

  const [rows, setRows] = useState([]);
  const [stateRows, setStateRows] = useState([]);
  const [summary, setSummary] = useState({
    totalPax: 0,
    totalNations: 0,
    totalBookings: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const printMeta = useMemo(() => {
    const now = new Date();
    return {
      date: now.toLocaleDateString("en-GB"),
      time: now.toLocaleTimeString("en-GB"),
    };
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");

      // replace with your existing API endpoint
      const response = await api.get(`/api/sUsers/tourist-report/${cmp_id}`, {
        params: {
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        },
        withCredentials: true,
      });

      const result = response?.data;
      setStateRows(Array.isArray(result?.stateData) ? result.stateData : []);

      if (result?.data && Array.isArray(result.data)) {
        setRows(result.data);
        setSummary({
          totalPax:
            result?.summary?.totalPax ??
            result.data.reduce((sum, item) => sum + Number(item.pax || 0), 0),
          totalNations: result?.summary?.totalNations ?? result.data.length,
          totalBookings: result?.summary?.totalBookings ?? 0,
        });
      } else if (Array.isArray(result)) {
        setRows(result);
        setSummary({
          totalPax: result.reduce(
            (sum, item) => sum + Number(item.pax || 0),
            0,
          ),
          totalNations: result.length,
          totalBookings: 0,
        });
      } else {
        setRows([]);
        setSummary({
          totalPax: 0,
          totalNations: 0,
          totalBookings: 0,
        });
      }
    } catch (err) {
      setStateRows([]);
      setError(err?.response?.data?.message || "Failed to fetch report");
      setRows([]);
      setSummary({
        totalPax: 0,
        totalNations: 0,
        totalBookings: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters.fromDate, filters.toDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "fromDate") {
      dispatch(
        setPaxReportDate({
          start: value,
          end: filters.toDate,
          autoFetch: false,
        }),
      );
    } else {
      dispatch(
        setPaxReportDate({
          start: filters.fromDate,
          end: value,
          autoFetch: false,
        }),
      );
    }

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!rows.length && !stateRows.length) return;

    const excelRows = rows.map((item, index) => ({
      "Sl No": index + 1,
      Nation: item.nation || item.country || "UNKNOWN",
      Pax: Number(item.pax || 0),
    }));

    excelRows.push({});
    excelRows.push({
      "Sl No": "",
      Nation: "TOTAL",
      Pax: Number(summary.totalPax || 0),
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows, { origin: "A5" });

    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        ["Tourist Report"],

        [`Generated On ${printMeta.date} ${printMeta.time}`],
      ],
      { origin: "A1" },
    );

    worksheet["!cols"] = [{ wch: 10 }, { wch: 35 }, { wch: 15 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tourist Report");

    const stateExcelRows = stateRows.map((item, index) => ({
      "Sl No": index + 1,
      State: item.state || "UNKNOWN",
      Pax: Number(item.pax || 0),
    }));
    stateExcelRows.push({ State: "TOTAL", Pax: stateRows.reduce((sum, item) => sum + Number(item.pax || 0), 0) });
    const stateWorksheet = XLSX.utils.json_to_sheet(stateExcelRows, { origin: "A5" });
    XLSX.utils.sheet_add_aoa(stateWorksheet, [["State Wise Tourist Report"], ["Generated On " + printMeta.date + " " + printMeta.time]], { origin: "A1" });
    stateWorksheet["!cols"] = [{ wch: 10 }, { wch: 35 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, stateWorksheet, "State Wise Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    // ✅ this actually starts the download
    saveAs(
      fileData,
      `tourist-report-${filters.fromDate}-to-${filters.toDate}.xlsx`,
    );
  };
  return (
    <>
      <TitleDiv title="Tourist Pax Report" />
      <div className="min-h-screen bg-slate-100 p-3 md:p-5 print:bg-white print:p-0">
        <div className="w-full print:max-w-full">
          {/* Filter Card */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm print:hidden md:p-4">
            <form
              onSubmit={handleSubmit}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-[160px]">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">
                  Tourist Report
                </h1>
              </div>

              <div className="flex-1" />

              <div className="w-32">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  From Date
                </label>
                <input
                  type="date"
                  name="fromDate"
                  value={filters.fromDate}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-teal-600"
                />
              </div>

              <div className="w-32">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  To Date
                </label>
                <input
                  type="date"
                  name="toDate"
                  value={filters.toDate}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-teal-600"
                />
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-teal-700 px-3 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Loading..." : "Get Report"}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-300"
                >
                  Print
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={!rows.length && !stateRows.length}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Export Excel
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 print:hidden">
              {error}
            </div>
          )}

          {/* Report Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none md:p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-green-700 md:text-2xl">
                  Tourist Report
                </h2>
                <p className="text-[11px] text-slate-500">
                  Country wise and state wise pax report
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-[11px] font-medium text-slate-500">
                  Print Date & Time
                </p>
                <p className="text-xs font-semibold text-slate-800">
                  {printMeta.date} {printMeta.time}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 print:grid-cols-2">
              <section>
            <h3 className="mb-2 font-semibold text-slate-800">Country Wise</h3>
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-y-2 border-[#7b1e1e]">
                    <th className="px-2 py-2 text-left font-semibold tracking-wide text-slate-800">
                      NATION
                    </th>
                    <th className="w-20 px-2 py-2 text-right font-semibold tracking-wide text-slate-800 md:w-24">
                      PAX
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="2"
                        className="px-2 py-6 text-center text-xs text-slate-500"
                      >
                        Loading report...
                      </td>
                    </tr>
                  ) : rows.length > 0 ? (
                    rows.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-dashed border-slate-300"
                      >
                        <td className="px-2 py-2 text-slate-800 break-words whitespace-normal">
                          {item.nation || item.country || "UNKNOWN"}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-slate-900 whitespace-nowrap">
                          {item.pax || 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="2"
                        className="px-2 py-6 text-center text-xs text-slate-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>

                {!loading && rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-900">
                      <td className="px-2 py-2.5 text-xs font-bold text-slate-900 md:text-sm">
                        TOTAL
                      </td>
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-slate-900 whitespace-nowrap md:text-sm">
                        {summary.totalPax}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
              </section>
              <section>
            <h3 className="mb-2 font-semibold text-slate-800">State Wise</h3>
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-y-2 border-[#7b1e1e]">
                    <th className="px-2 py-2 text-left font-semibold tracking-wide text-slate-800">
                      STATE
                    </th>
                    <th className="w-20 px-2 py-2 text-right font-semibold tracking-wide text-slate-800 md:w-24">
                      PAX
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="2"
                        className="px-2 py-6 text-center text-xs text-slate-500"
                      >
                        Loading report...
                      </td>
                    </tr>
                  ) : stateRows.length > 0 ? (
                    stateRows.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-dashed border-slate-300"
                      >
                        <td className="px-2 py-2 text-slate-800 break-words whitespace-normal">
                          {item.state || "UNKNOWN"}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-slate-900 whitespace-nowrap">
                          {item.pax || 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="2"
                        className="px-2 py-6 text-center text-xs text-slate-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>

                {!loading && stateRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-900">
                      <td className="px-2 py-2.5 text-xs font-bold text-slate-900 md:text-sm">
                        TOTAL
                      </td>
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-slate-900 whitespace-nowrap md:text-sm">
                        {stateRows.reduce((sum, item) => sum + Number(item.pax || 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TouristReport;
