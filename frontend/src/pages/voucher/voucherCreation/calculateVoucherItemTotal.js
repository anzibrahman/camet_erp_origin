export const calculateVoucherItemTotal = (item, selectedPriceLevel, situation = "normal") => {
    let priceRate = 0;
    if (situation === "priceLevelChange") {
      priceRate =
        item.Priceleveles.find((level) => level._id === selectedPriceLevel?._id)
          ?.pricerate || 0;
    }

    let subtotal = 0;
    let individualTotals = [];
    let totalCessAmt = 0; // Track total standard cess amount
    let totalAdditionalCessAmt = 0; // Track total additional cess amount
    let totalCgstAmt = 0; // Track total CGST amount
    let totalSgstAmt = 0; // Track total SGST amount
    let totalIgstAmt = 0; // Track total IGST amount
    let totalTaxableAmount = 0; // Track total taxable amount (before tax)

    item.GodownList.forEach((godownOrBatch, index) => {
      if (situation === "normal" && godownOrBatch.selectedPriceRate) {
        priceRate = godownOrBatch.selectedPriceRate;
      }
      const quantity = Number(godownOrBatch.count) || 0;
      const igstValue = Math.max(item.igst || 0, 0);
      const cgstValue = Math.max(item.cgst || 0, 0);
      const sgstValue = Math.max(item.sgst || 0, 0);

      // Calculate base price based on tax inclusivity
      let basePrice = priceRate * quantity;
      let taxBasePrice = basePrice;

      // For tax inclusive prices, calculate the base price without tax
      // in the end of this function we are adding is tax inclusive in the godown also ,so add that for further references
      if (item?.isTaxInclusive || godownOrBatch.isTaxInclusive) {
        // Use total tax rate (IGST or CGST+SGST)
        const totalTaxRate = igstValue || 0;
        taxBasePrice = Number(basePrice / (1 + totalTaxRate / 100));
      }

      // Calculate discount based on discountType
      let discountedPrice = taxBasePrice;
      let discountAmount = 0;
      let discountPercentage = 0;
      let discountType = godownOrBatch.discountType || "none";

      if (discountType === "percentage" && godownOrBatch.discountPercentage) {
        // Percentage discount - the percentage stays the same, amount is calculated
        discountPercentage = Number(godownOrBatch.discountPercentage) || 0;
        discountAmount = Number((taxBasePrice * discountPercentage) / 100);
      } else if (discountType === "amount" && godownOrBatch.discountAmount) {
        // Fixed amount discount - the amount stays the same, percentage is calculated
        discountAmount = Number(godownOrBatch.discountAmount) || 0;
        // Calculate the equivalent percentage
        discountPercentage =
          taxBasePrice > 0 ? Number((discountAmount / taxBasePrice) * 100) : 0;
      }

      discountedPrice = taxBasePrice - discountAmount;

      // This is the taxable amount (price after discount, before tax)
      const taxableAmount = discountedPrice;
      totalTaxableAmount += taxableAmount;

      // Calculate cess amounts
      let cessAmount = 0;
      let additionalCessAmount = 0;

      // Standard cess calculation
      if (item.cess && item.cess > 0) {
        cessAmount = Number(taxableAmount * (item.cess / 100));
      }

      // Additional cess calculation - calculated as quantity * addl_cess
      if (item.addl_cess && item.addl_cess > 0) {
        additionalCessAmount = Number(quantity * item.addl_cess);
      }

      // Combine cess amounts
      const totalCessAmount = Number(cessAmount + additionalCessAmount);

      // Calculate tax amounts
      let cgstAmt = 0;
      let sgstAmt = 0;
      let igstAmt = 0;

      igstAmt = Number(taxableAmount * (igstValue / 100));
      cgstAmt = Number(taxableAmount * (cgstValue / 100));
      sgstAmt = Number(taxableAmount * (sgstValue / 100));

      // Calculate total tax amount
      // const taxAmount = Number((cgstAmt + sgstAmt + igstAmt).toFixed(2));

      // Calculate total including tax and cess
      const individualTotal = Math.max(
        Number((taxableAmount + igstAmt + totalCessAmount).toFixed(2)),
        0
      );
      

      subtotal += individualTotal;
      totalCessAmt += cessAmount;
      totalAdditionalCessAmt += additionalCessAmount;
      totalCgstAmt += cgstAmt;
      totalSgstAmt += sgstAmt;
      totalIgstAmt += igstAmt;

      individualTotals.push({
        index,
        basePrice: Number(taxBasePrice?.toFixed(2)),
        discountAmount: Number(discountAmount?.toFixed(2)),
        discountPercentage: Number(discountPercentage?.toFixed(2)),
        discountType:
          godownOrBatch.discountType ||
          (godownOrBatch.discount
            ? "amount"
            : godownOrBatch.discountPercentage
            ? "percentage"
            : "none"),
        taxableAmount: Number(taxableAmount?.toFixed(2)),
        cgstValue: Number(cgstValue?.toFixed(2)),
        sgstValue: Number(sgstValue?.toFixed(2)),
        igstValue: Number(igstValue?.toFixed(2)),
        cessValue: Number((item.cess || 0).toFixed(2)),
        addlCessValue: Number((item.addl_cess || 0).toFixed(2)),
        cgstAmount: Number(cgstAmt?.toFixed(2)),
        sgstAmount: Number(sgstAmt?.toFixed(2)),
        igstAmount: Number(igstAmt?.toFixed(2)),
        cessAmount: Number(cessAmount?.toFixed(2)),
        additionalCessAmount: Number(additionalCessAmount?.toFixed(2)),
        individualTotal: Number(individualTotal?.toFixed(2)),
        quantity: Number(quantity?.toFixed(2)),
        isTaxInclusive: Boolean(item?.isTaxInclusive) || false,
      });
    });

    subtotal = Math.max(parseFloat(subtotal.toFixed(2)), 0);
    totalCgstAmt = parseFloat(totalCgstAmt.toFixed(2));
    totalSgstAmt = parseFloat(totalSgstAmt.toFixed(2));
    totalIgstAmt = parseFloat(totalIgstAmt.toFixed(2));
    totalCessAmt = parseFloat(totalCessAmt.toFixed(2));
    totalAdditionalCessAmt = parseFloat(totalAdditionalCessAmt.toFixed(2));
    totalTaxableAmount = parseFloat(totalTaxableAmount.toFixed(2));

    return {
      individualTotals, // Detailed breakdown of each godown/batch
      total: subtotal, // Grand total including all taxes and cess
      totalTaxableAmount, // Total amount on which tax is calculated
      totalCessAmt, // Total standard cess amount
      totalAdditionalCessAmt, // Total additional cess amount
      // totalCessAmount: totalCessAmt + totalAdditionalCessAmt, // Combined total cess
      totalCgstAmt, // Total CGST amount
      totalSgstAmt, // Total SGST amount
      totalIgstAmt, // Total IGST amount
      totalTaxAmount: totalCgstAmt + totalSgstAmt + totalIgstAmt, // Total tax amount (convenience field)
    };
  };
