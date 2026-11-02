/* eslint-disable react/prop-types */
import { useState, forwardRef } from "react";
import { MdDateRange } from "react-icons/md";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import VoucherSeriesModal from "./VoucherSeriesModal";
import VoucherSubmitButton from "./VoucherSubmitButton";

// Custom input component for the date picker - wrapped with forwardRef
const CustomInput = forwardRef(({ onClick }, ref) => (
  <div
    ref={ref}
    className="flex items-center cursor-pointer hover:text-violet-500 transition-colors"
    onClick={onClick}
  >
    <MdDateRange className="text-gray-500 hover:text-violet-500 text-xl cursor-pointer mt-1" />
  </div>
));

// Add display name for better debugging
CustomInput.displayName = "CustomInput";

function HeaderTile({
  title,
  selectedDate,
  setSelectedDate,
  dispatch,
  changeDate,
  submitHandler,
  removeAll,
  loading,
  mode,
  voucherSeries,
  addSelectedVoucherSeries,
  number,
  selectedVoucherSeriesFromRedux = {}, // Default to null if not provided
  tab,
  enablePaymentSplittingAsCompulsory,
  openAdditionalTile
}) {
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);

  const titleText =
    title.split("")[0]?.toUpperCase()?.concat(title.slice(1)) || "Title";



  // Handle date change
  const handleDateChange = (date) => {
    const dateString = date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
    setSelectedDate(dateString);
    dispatch(changeDate(dateString));
  };

  // Handle series selection
  const handleSeriesSelect = (series) => {
    setSelectedSeries(series);
  };

  return (
    <div>
      <div className="flex justify-between p-4 bg-white drop-shadow-lg items-center text-xs md:text-base">
        <div className="flex flex-col gap-1 justify-center">
          <p
            className="flex flex-col text-sm font-semibold text-violet-400 cursor-pointer hover:text-violet-600 transition-colors"
            onClick={() => setIsSeriesModalOpen(true)}
          >
            <span className="text-[10.5px] text-gray-500">
              {selectedVoucherSeriesFromRedux?.seriesName || "Voucher series"}
            </span>
            {titleText} No:#{number || "—"}
          </p>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-500 text-xs md:text-base">{new Date(selectedDate).toDateString()}</p>
            <DatePicker
              selected={new Date(selectedDate)} onChange={handleDateChange} customInput={<CustomInput />}
              dateFormat="yyyy-MM-dd" className="cursor-pointer mt-10" popperClassName="!z-[9999]"
              showPopperArrow={false} portalId="date-picker-portal" withPortal
              popperModifiers={[{ name: "offset", options: { offset: [0, 8] } }, { name: "preventOverflow", options: { rootBoundary: "viewport", tether: false, altAxis: true } }]}
            />
          </div>
        </div>
        {tab !== "booking" && (
          <div className="">
            <div className="flex gap-5 items-center">
              <div className="hidden sm:block">
                {/* <button
                  className={`${
                    loading && "pointer-events-none opacity-80"
                  } bottom-0 text-white bg-violet-700 w-full rounded-md p-2 flex items-center justify-center gap-2 hover_scale cursor-pointer`}
                >
                  <IoIosAddCircle className="text-2xl" />
                  {title === "Stock Transfer" ? (
                    <p onClick={submitHandler}>
                      {mode === "create" ? "Transfer Stock" : "Edit Transfer"}
                    </p>
                  ) : title === "Sales" &&
                    enablePaymentSplittingAsCompulsory ? (
                    <Link to="/sUsers/sales/paymentSplitting">
                      Receive Payment
                    </Link>
                  ) : (
                    <p onClick={submitHandler}>
                      {mode === "create"
                        ? `Generate ${titleText}`
                        : `Edit ${titleText}`}
                    </p>
                  )}
                </button> */}

                <VoucherSubmitButton
                  title={title}
                  mode={mode}
                  submitHandler={submitHandler}
                  loading={loading}
                  titleText={titleText}
                  enablePaymentSplittingAsCompulsory={enablePaymentSplittingAsCompulsory}
                  openAdditionalTile={openAdditionalTile}
                />
              </div>
              <div>
                <button
                  onClick={() => {
                    dispatch(removeAll());
                  }}
                  className="text-red-500 text-xs p-1 px-3 border border-1 border-gray-300 rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voucher Series Modal */}
      <VoucherSeriesModal
        isOpen={isSeriesModalOpen}
        onClose={() => setIsSeriesModalOpen(false)}
        voucherType={title}
        onSeriesSelect={handleSeriesSelect}
        currentSelectedSeries={selectedSeries}
        voucherSeries={voucherSeries}
        addSelectedVoucherSeries={addSelectedVoucherSeries}
      />

      {/* Add portal div for date picker */}
      <div id="date-picker-portal"></div>

      {/* Custom styles for the date picker */}
      <style>{`
        .react-datepicker-popper {
          z-index: 9999 !important;
        }

        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 9999 !important;
        }

        .react-datepicker__header {
          background-color: #6d28d9;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 0.5rem 0.5rem 0 0;
        }

        .react-datepicker__current-month {
          color: white;
          font-weight: 600;
        }

        .react-datepicker__day-name {
          color: white;
          font-weight: 500;
        }

        .react-datepicker__navigation {
          top: 12px;
        }

        .react-datepicker__navigation--previous {
          border-right-color: white;
        }

        .react-datepicker__navigation--next {
          border-left-color: white;
        }

        .react-datepicker__day:hover {
          background-color: #f3f4f6;
        }

        .react-datepicker__day--selected {
          background-color: #4f46e5;
          color: white;
        }

        .react-datepicker__day--today {
          background-color: #e0e7ff;
          color: #3730a3;
          font-weight: 600;
        }

        .react-datepicker__day--keyboard-selected {
          background-color: #c7d2fe;
        }

        @media (max-width: 640px) {
          .react-datepicker {
            transform: scale(0.9);
            transform-origin: top left;
          }
        }
      `}</style>
    </div>
  );
}

export default HeaderTile;
