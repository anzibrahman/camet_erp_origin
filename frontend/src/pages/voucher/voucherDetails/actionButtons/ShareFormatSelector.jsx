/* eslint-disable react/prop-types */
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { HiDocument } from "react-icons/hi2";
import { IoDocumentTextSharp } from "react-icons/io5";
import { formatVoucherType } from "../../../../../utils/formatVoucherType";
import { BookText } from "lucide-react";

export function ShareFormatSelector({ open, setOpen, voucherId, voucherType,data  }) {
  const [selectedFormat, setSelectedFormat] = useState("tax-invoice");
  const navigate = useNavigate();

  const formats = [
    {
      id: "tax-invoice",
      label: voucherType === "performaInvoice" ? "Proforma Invoice" : "Tax Invoice",
      icon: <IoDocumentTextSharp size={20} />,
    },
  ];

  if (voucherType === "performaInvoice") {
    formats.push({ id: "pos", label: "POS Format", icon: <HiDocument size={20} /> });
  }

  if (
    voucherType === "sales" ||
    voucherType === "vanSale" ||
    voucherType === "saleOrder"
  ) {
    formats.push(
      {
        id: "pos",
        label: "POS Format1",
        icon: <HiDocument size={20} />,
      },
       {
        id: "pos2",
        label: "POS Format2 ",
        icon: <HiDocument size={20} />,
      },
      
      {
        id: "warrantyCard",
        label: "Warranty Card",
        icon: <BookText fill="white" size={20} />,
      }
    );
  }

 const handleContinue = () => {
  if (selectedFormat === "tax-invoice") {
    navigate(`/sUsers/share${voucherType}/${voucherId}`);
  } else if (selectedFormat === "pos") {
    navigate(`/sUsers/share${voucherType}ThreeInch/${voucherId}`);
  } else if (selectedFormat === "pos2") {
    navigate(`/sUsers/share${voucherType}ThreeInch2/${true}`, { state: data }); // ✅ correct syntax
  } else if (selectedFormat === "warrantyCard") {
    navigate(`/sUsers/share${voucherType}WarrantyCard/${voucherId}`);
  }
  setOpen(false);
};

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md bg-gray-900 text-white border-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-white">
            Share {formatVoucherType(voucherType)}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Choose the format
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-6 space-y-6">
          {/* Format Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-200 mb-3 block">
              Select Format
            </Label>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Choose format" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {formats.map((format) => (
                  <SelectItem
                    key={format.id}
                    value={format.id}
                    className="text-white hover:bg-gray-700 focus:bg-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      {format.icon}
                      <span>{format.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-red-600 hover:bg-red-700 text-white hover:text-white border border-red-500">
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleContinue}
            className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500"
          >
            Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
