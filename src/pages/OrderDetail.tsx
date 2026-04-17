// ─── Order Detail / Bill View Page ───────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Download, Printer, XCircle, IndianRupee, CreditCard, X,
} from "lucide-react";
import { orderApi, paymentApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { useShopConfig } from "../context/ShopConfigContext";
import { Order } from "../types";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function OrderDetail() {
  const { t } = useLang();
  const { shop: shopConfig } = useShopConfig();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState<"cash" | "upi">("cash");
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => { loadOrder(); }, [id]);

  const loadOrder = async () => {
    try {
      const res = await orderApi.getById(Number(id));
      setOrder(res.data);
    } catch {
      toast.error("Failed to load order");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!order || !confirm("Cancel this order? Stock will be restored.")) return;
    try {
      await orderApi.cancel(order.id);
      toast.success("Order cancelled");
      loadOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Cancel failed");
    }
  };

  const openPaymentModal = () => {
    if (!order) return;
    setPayAmount(Number(order.dueAmount));
    setPayMode("cash");
    setPayNotes("");
    setShowPayment(true);
  };

  const handleRecordPayment = async () => {
    if (!order || payAmount <= 0) return;
    setPaySubmitting(true);
    try {
      await paymentApi.recordPayment(order.id, {
        amount: payAmount,
        paymentMode: payMode,
        notes: payNotes || undefined,
      });
      toast.success(t.paymentRecorded);
      setShowPayment(false);
      loadOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Payment failed");
    } finally {
      setPaySubmitting(false);
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  // ─── PDF Bill Generation ───────────────────────────────
  const generateBillPDF = (o: Order, format: "a4" | "receipt" = "a4") => {
    const isReceipt = format === "receipt";
    const doc = new jsPDF({
      orientation: isReceipt ? "portrait" : "landscape",
      unit: "mm",
      format: isReceipt ? [80, 250] : "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = isReceipt ? 5 : 15;
    const innerLeft = margin + (isReceipt ? 0 : 3);
    const innerRight = pageWidth - margin - (isReceipt ? 0 : 3);
    const contentWidth = innerRight - innerLeft;
    const fontSize = isReceipt ? 7 : 10;
    let y = margin;

    if (!isReceipt) {
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.6);
      doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
      y = margin + 8;
    }

    const getTextHeight = (text: string, maxW: number) => {
      const lines = doc.splitTextToSize(text, maxW);
      return lines.length * doc.getLineHeight() / doc.internal.scaleFactor;
    };

    doc.setFontSize(isReceipt ? 12 : 13);
    doc.setFont("helvetica", "bold");
    doc.text(shopConfig.name, pageWidth / 2, y, { align: "center", maxWidth: contentWidth });
    y += getTextHeight(shopConfig.name, contentWidth) + 2;

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    doc.text(shopConfig.address, pageWidth / 2, y, { align: "center", maxWidth: contentWidth });
    y += getTextHeight(shopConfig.address, contentWidth) + 2;

    doc.text(`Phone: ${shopConfig.phone}  |  ${shopConfig.altPhone}`, pageWidth / 2, y, { align: "center" });
    y += isReceipt ? 3 : 5;
    doc.text(`Email: ${shopConfig.email}`, pageWidth / 2, y, { align: "center" });
    y += isReceipt ? 3 : 5;
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${shopConfig.gst}`, pageWidth / 2, y, { align: "center" });
    y += isReceipt ? 5 : 8;

    doc.setFontSize(isReceipt ? 10 : 12);
    doc.text("TAX INVOICE", pageWidth / 2, y, { align: "center" });
    y += isReceipt ? 4 : 6;

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.line(innerLeft, y, innerRight, y);
    y += isReceipt ? 4 : 7;

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");

    const infoLeftX = innerLeft;
    const infoRightX = pageWidth / 2 + 10;

    const billY = y;
    doc.setFont("helvetica", "bold");
    doc.text("Bill No:", infoLeftX, y);
    doc.setFont("helvetica", "normal");
    doc.text(o.orderNo, infoLeftX + 22, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", infoLeftX, y);
    doc.setFont("helvetica", "normal");
    const customerName = o.customer?.name || o.customerName || "Walk-in Customer";
    doc.text(customerName, infoLeftX + 22, y);
    y += 5;

    const customerPhone = o.customer?.phone || "";
    if (customerPhone) {
      doc.setFont("helvetica", "bold");
      doc.text("Phone:", infoLeftX, y);
      doc.setFont("helvetica", "normal");
      doc.text(customerPhone, infoLeftX + 22, y);
      y += 5;
    }

    let ry = billY;
    if (!isReceipt) {
      doc.setFont("helvetica", "bold");
      doc.text("Date:", infoRightX, ry);
      doc.setFont("helvetica", "normal");
      doc.text(new Date(o.createdAt).toLocaleString("en-IN"), infoRightX + 22, ry);
      ry += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Payment:", infoRightX, ry);
      doc.setFont("helvetica", "normal");
      doc.text(o.paymentMode.toUpperCase(), infoRightX + 22, ry);
    } else {
      doc.text(`Date: ${new Date(o.createdAt).toLocaleString("en-IN")}`, infoLeftX, y);
      y += 4;
      doc.text(`Payment: ${o.paymentMode.toUpperCase()}`, infoLeftX, y);
      y += 4;
    }

    y = Math.max(y, ry) + (isReceipt ? 2 : 6);
    doc.setLineWidth(0.3);
    doc.line(innerLeft, y, innerRight, y);
    y += isReceipt ? 3 : 4;

    const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-IN") : "-";

    const items = isReceipt
      ? o.items.map((item, idx) => {
          const name = item.product?.name || `Product #${item.productId}`;
          const details = [
            item.hsnCode ? `HSN:${item.hsnCode}` : "",
            item.mfgDate ? `MFG:${fmtDate(item.mfgDate)}` : "",
            item.expiryDate ? `EXP:${fmtDate(item.expiryDate)}` : "",
          ].filter(Boolean).join(" | ");
          return [
            (idx + 1).toString(),
            details ? `${name}\n${details}` : name,
            item.batchNo || "-",
            Number(item.quantity).toString(),
            Number(item.price).toLocaleString("en-IN"),
            Number(item.total).toLocaleString("en-IN"),
          ];
        })
      : o.items.map((item, idx) => [
          (idx + 1).toString(),
          item.product?.name || `Product #${item.productId}`,
          item.batchNo || "-",
          item.hsnCode || "-",
          fmtDate(item.mfgDate),
          fmtDate(item.expiryDate),
          Number(item.quantity).toString(),
          Number(item.price).toLocaleString("en-IN"),
          Number(item.total).toLocaleString("en-IN"),
        ]);

    const tableHead = isReceipt
      ? [["#", "Item", "Batch", "Qty", "Rate", "Total"]]
      : [["S.No", "Item", "Batch", "HSN", "MFG", "Expiry", "Qty", "Rate", "Total"]];

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: items,
      theme: isReceipt ? "plain" : "grid",
      styles: { fontSize: isReceipt ? 6 : 8, cellPadding: isReceipt ? 1 : 2, lineColor: [180, 180, 180], lineWidth: 0.3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: isReceipt ? 6 : 8, halign: "center" },
      bodyStyles: { fontSize: isReceipt ? 6 : 8 },
      columnStyles: isReceipt
        ? { 0: { cellWidth: 4 }, 1: { cellWidth: 28 }, 2: { cellWidth: 10 }, 3: { cellWidth: 6, halign: "center" }, 4: { cellWidth: 10, halign: "right" }, 5: { cellWidth: 12, halign: "right" } }
        : { 0: { cellWidth: 12, halign: "center" }, 1: { cellWidth: 'auto' }, 6: { halign: "center" }, 7: { halign: "right" }, 8: { halign: "right" } },
      margin: { left: innerLeft, right: pageWidth - innerRight },
    });

    y = (doc as any).lastAutoTable.finalY + (isReceipt ? 3 : 8);

    const totalsX = isReceipt ? innerLeft : pageWidth / 2 + 5;
    const valuesX = innerRight;

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", totalsX, y);
    doc.text(`Rs.${Number(o.subtotal).toLocaleString("en-IN")}`, valuesX, y, { align: "right" });
    y += 5;

    const taxable = Number(o.subtotal);
    const cgst = Math.round(taxable * 0.09 * 100) / 100;
    const sgst = Math.round(taxable * 0.09 * 100) / 100;

    doc.text("Taxable Amount:", totalsX, y);
    doc.text(`Rs.${taxable.toLocaleString("en-IN")}`, valuesX, y, { align: "right" });
    y += 5;
    doc.text("CGST (9%):", totalsX, y);
    doc.text(`Rs.${cgst.toLocaleString("en-IN")}`, valuesX, y, { align: "right" });
    y += 5;
    doc.text("SGST (9%):", totalsX, y);
    doc.text(`Rs.${sgst.toLocaleString("en-IN")}`, valuesX, y, { align: "right" });
    y += 6;

    doc.setLineWidth(0.4);
    doc.line(totalsX, y, valuesX, y);
    y += 5;

    doc.setFontSize(isReceipt ? 10 : 12);
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL:", totalsX, y);
    doc.text(`Rs.${Number(o.total).toLocaleString("en-IN")}`, valuesX, y, { align: "right" });
    y += isReceipt ? 5 : 8;

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    doc.text("Paid:", totalsX, y);
    doc.text(`Rs.${Number(o.paidAmount).toLocaleString("en-IN")}`, valuesX, y, { align: "right" });
    y += 5;

    if (Number(o.dueAmount) > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("Due:", totalsX, y);
      doc.text(`Rs.${Number(o.dueAmount).toLocaleString("en-IN")}`, valuesX, y, { align: "right" });
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += 5;
    }

    y += isReceipt ? 2 : 4;

    if (o.payments && o.payments.length > 0) {
      doc.setLineWidth(0.2);
      doc.line(innerLeft, y, innerRight, y);
      y += isReceipt ? 3 : 5;
      doc.setFont("helvetica", "bold");
      doc.text("Payment Transactions:", innerLeft, y);
      y += isReceipt ? 3 : 5;
      doc.setFont("helvetica", "normal");

      for (const p of o.payments) {
        const pDate = new Date(p.createdAt).toLocaleString("en-IN");
        doc.text(`${p.paymentMode.toUpperCase()} - Rs.${Number(p.amount).toLocaleString("en-IN")}`, innerLeft, y);
        doc.text(pDate, valuesX, y, { align: "right" });
        y += isReceipt ? 3 : 4;
      }
      y += isReceipt ? 2 : 4;
    }

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");

    if (!isReceipt) {
      doc.setLineWidth(0.2);
      doc.line(innerLeft, y, innerRight, y);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Terms & Conditions:", innerLeft, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text("Goods once sold will not be taken back. Subject to local jurisdiction.", innerLeft, y);
      y += 15;
      doc.setFont("helvetica", "bold");
      doc.text("Authorized Signatory", innerRight, y, { align: "right" });
      doc.setLineWidth(0.3);
      doc.line(innerRight - 45, y + 2, innerRight, y + 2);
      y += 12;
    }

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your business!", pageWidth / 2, y, { align: "center" });
    y += isReceipt ? 3 : 5;
    doc.text("Visit again!", pageWidth / 2, y, { align: "center" });

    return doc;
  };

  const downloadPDF = (format: "a4" | "receipt" = "a4") => {
    if (!order) return;
    const doc = generateBillPDF(order, format);
    doc.save(`Bill_${order.orderNo}.pdf`);
  };

  const printBill = () => {
    if (!order) return;
    const doc = generateBillPDF(order, "receipt");
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!order) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/orders")} className="p-1.5 rounded-md hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">{order.orderNo}</h1>
            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-10 sm:ml-0">
          {order.status === "cancelled" ? (
            <span className="px-2 py-1 text-xs rounded font-medium bg-red-100 text-red-700">{t.cancelled}</span>
          ) : order.paymentStatus === "partial" ? (
            <span className="px-2 py-1 text-xs rounded font-medium bg-amber-100 text-amber-700">{t.partial}</span>
          ) : order.paymentStatus === "unpaid" ? (
            <span className="px-2 py-1 text-xs rounded font-medium bg-red-100 text-red-700">{t.unpaid}</span>
          ) : (
            <span className="px-2 py-1 text-xs rounded font-medium bg-emerald-100 text-emerald-700">{t.completed}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── Left: Invoice Detail ───────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {/* Shop Header */}
          <div className="text-center px-5 py-3 border-b border-gray-100 bg-slate-50">
            <h2 className="text-base font-bold text-primary-800">{shopConfig.name}</h2>
            <p className="text-[11px] text-gray-500">{shopConfig.nameTe}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{shopConfig.address}</p>
            <p className="text-[10px] text-gray-400">{t.phone}: {shopConfig.phone} | {shopConfig.altPhone}</p>
            <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{t.gstin}: {shopConfig.gst}</p>
            <p className="text-xs font-bold text-primary-700 mt-1.5 tracking-wider uppercase">{t.invoice}</p>
          </div>

          {/* Order & Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 sm:px-5 py-3 border-b border-gray-100 text-xs">
            <div className="space-y-0.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t.billTo}</p>
              <p className="font-semibold text-gray-800">{order.customer?.name || order.customerName || "Walk-in Customer"}</p>
              {order.customer?.phone && (
                <p className="text-gray-500">{t.phone}: {order.customer.phone}</p>
              )}
            </div>
            <div className="sm:text-right space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-500">{t.orderNo}:</span>
                <span className="font-semibold">{order.orderNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t.date}:</span>
                <span>{new Date(order.createdAt).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t.paymentMode}:</span>
                <span className="capitalize">{order.paymentMode}</span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="p-3 sm:p-5">
            <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px] mb-4">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50">
                  <th className="text-left py-2 px-2">{t.slNo}</th>
                  <th className="text-left py-2 px-2">{t.item}</th>
                  <th className="text-left py-2 px-2">Batch</th>
                  <th className="text-left py-2 px-2">HSN</th>
                  <th className="text-center py-2 px-2">MFG</th>
                  <th className="text-center py-2 px-2">Expiry</th>
                  <th className="text-center py-2 px-2">{t.quantity}</th>
                  <th className="text-right py-2 px-2">{t.rate}</th>
                  <th className="text-right py-2 px-2">{t.total}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2 px-2">{idx + 1}</td>
                    <td className="py-2 px-2">{item.product?.name}</td>
                    <td className="py-2 px-2 text-[10px] text-gray-600">{item.batchNo || "-"}</td>
                    <td className="py-2 px-2 text-[10px] text-gray-600">{item.hsnCode || "-"}</td>
                    <td className="py-2 px-2 text-center text-[10px] text-gray-600">{item.mfgDate ? new Date(item.mfgDate).toLocaleDateString("en-IN") : "-"}</td>
                    <td className="py-2 px-2 text-center text-[10px] text-gray-600">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-IN") : "-"}</td>
                    <td className="py-2 px-2 text-center">{Number(item.quantity)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(Number(item.price))}</td>
                    <td className="py-2 px-2 text-right font-medium">{formatCurrency(Number(item.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Totals with GST */}
            <div className="space-y-1.5 bg-slate-50 rounded-md p-4">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{t.subtotal}</span>
                <span className="font-medium text-gray-700">{formatCurrency(Number(order.subtotal))}</span>
              </div>
              {(() => {
                const taxable = Number(order.subtotal);
                const cgstVal = taxable * 0.09;
                const sgstVal = taxable * 0.09;
                return (
                  <>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t.taxableAmount}</span>
                      <span>{formatCurrency(taxable)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t.cgst}</span>
                      <span>{formatCurrency(Math.round(cgstVal * 100) / 100)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t.sgst}</span>
                      <span>{formatCurrency(Math.round(sgstVal * 100) / 100)}</span>
                    </div>
                  </>
                );
              })()}
              <div className="flex justify-between text-sm font-bold text-primary-800 border-t border-primary-200 pt-2">
                <span>{t.grandTotal}</span>
                <span>{formatCurrency(Number(order.total))}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-400 mt-4">
              <p>{t.thankYou}</p>
            </div>
          </div>
        </div>

        {/* ─── Right: Sidebar (Payment, Actions) ─────────── */}
        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">{t.paymentStatus}</h3>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{t.paidAmount}</span>
              <span className="font-medium text-emerald-700">{formatCurrency(Number(order.paidAmount))}</span>
            </div>
            {Number(order.dueAmount) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-red-500 font-medium">{t.dueAmount}</span>
                <span className="font-bold text-red-600">{formatCurrency(Number(order.dueAmount))}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{t.paymentMode}</span>
              <span className="capitalize font-medium">{order.paymentMode}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{t.status}</span>
              <span className={`font-medium capitalize ${
                order.paymentStatus === "paid" ? "text-emerald-700" :
                order.paymentStatus === "partial" ? "text-amber-700" : "text-red-700"
              }`}>{(t as any)[order.paymentStatus] || order.paymentStatus}</span>
            </div>
          </div>

          {/* Payment History */}
          {order.payments && order.payments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> {t.paymentHistory}
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {order.payments.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded px-2.5 py-1.5 text-xs">
                    <div>
                      <span className="text-gray-500">#{idx + 1}</span>
                      <span className="ml-1.5 capitalize text-gray-600">{p.paymentMode}</span>
                      <span className="ml-1.5 text-gray-400">{new Date(p.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                    <span className="font-semibold text-emerald-700">{formatCurrency(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">{t.actions}</h3>
            <button onClick={() => downloadPDF("a4")}
              className="w-full py-2 rounded-md bg-primary-600 text-white font-medium hover:bg-primary-700 transition flex items-center justify-center gap-1.5 text-xs shadow-sm">
              <Download className="w-3.5 h-3.5" /> A4 PDF
            </button>
            <button onClick={() => downloadPDF("receipt")}
              className="w-full py-2 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700 transition flex items-center justify-center gap-1.5 text-xs shadow-sm">
              <Download className="w-3.5 h-3.5" /> Receipt PDF
            </button>
            <button onClick={printBill}
              className="w-full py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 text-xs shadow-sm">
              <Printer className="w-3.5 h-3.5" /> {t.print}
            </button>
            {order.status === "completed" && Number(order.dueAmount) > 0 && (
              <button onClick={openPaymentModal}
                className="w-full py-2 rounded-md bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition flex items-center justify-center gap-1.5 text-xs border border-amber-200">
                <IndianRupee className="w-3.5 h-3.5" /> {t.recordPayment}
              </button>
            )}
            {order.status === "completed" && (
              <button onClick={handleCancel}
                className="w-full py-2 rounded-md bg-red-50 text-red-600 font-medium hover:bg-red-100 transition flex items-center justify-center gap-1.5 text-xs">
                <XCircle className="w-3.5 h-3.5" /> {t.cancelOrder}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Record Payment Modal ─────────────────────────── */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPayment(false)}>
          <div className="bg-white rounded-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-sm font-bold text-gray-800">{t.recordPayment}</h2>
                <p className="text-xs text-gray-500">
                  {order.orderNo} — {t.dueAmount}: <span className="font-bold text-red-600">{formatCurrency(Number(order.dueAmount))}</span>
                </p>
              </div>
              <button onClick={() => setShowPayment(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.paidAmount} (₹)</label>
                <input type="number" value={payAmount}
                  onChange={(e) => setPayAmount(Math.min(parseFloat(e.target.value) || 0, Number(order.dueAmount)))}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                  min="1" max={Number(order.dueAmount)} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.paymentMode}</label>
                <div className="flex gap-1.5">
                  {(["cash", "upi"] as const).map((mode) => (
                    <button key={mode} onClick={() => setPayMode(mode)}
                      className={`flex-1 py-1.5 rounded-md font-medium transition-all text-xs ${
                        payMode === mode
                          ? "bg-primary-600 text-white shadow-sm"
                          : "bg-slate-50 text-gray-600 hover:bg-slate-100 border border-gray-200"
                      }`}>
                      {(t as any)[mode]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.notes}</label>
                <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Optional notes..." />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button onClick={() => setShowPayment(false)} className="flex-1 py-2 rounded-md border border-gray-200 text-gray-600 text-sm font-medium">{t.cancel}</button>
                <button onClick={handleRecordPayment} disabled={paySubmitting || payAmount <= 0}
                  className="flex-1 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow-sm disabled:opacity-50">
                  {paySubmitting ? "..." : t.recordPayment}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
