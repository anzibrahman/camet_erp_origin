/* eslint-disable react/prop-types */
import VoucherSubmitButton from "./VoucherSubmitButton";

function FooterButton({
  submitHandler,
  title,
  loading,
  mode,
  enablePaymentSplittingAsCompulsory,
  openAdditionalTile,
  desktopLabel,
  onReceivePayment,
}) {
  const titleText =
    title.split("")[0]?.toUpperCase()?.concat(title.slice(1)) || "Title";

  return (
    <div>
      <div className="  sm:hidden  fixed bottom-0 left-0 w-full bg-white shadow-lg z-50  ">
        {/* <button
            className={`${
              loading && "pointer-events-none opacity-80"
            } bottom-0 text-white bg-violet-700 w-full  p-2 flex items-center justify-center gap-2 hover_scale cursor-pointer`}
          >
            <IoIosAddCircle className="text-2xl" />
            {title === "Stock Transfer" ? (
              <p onClick={submitHandler}>
                {mode === "create" ? "Transfer Stock" : "Edit Transfer"}
              </p>
            ) : title === "Sales" && enablePaymentSplittingAsCompulsory ? (
              <Link to="/sUsers/sales/paymentSplitting">Receive Payment</Link>
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
          enablePaymentSplittingAsCompulsory={
            enablePaymentSplittingAsCompulsory
          }
          openAdditionalTile={openAdditionalTile}
          label={desktopLabel}
          onReceivePayment={onReceivePayment}
        />
      </div>
    </div>
  );
}

export default FooterButton;
