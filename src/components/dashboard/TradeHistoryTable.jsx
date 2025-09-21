import React, { useEffect, useMemo, useState } from "react";
import { fetchBrokerOrders } from "@/api/functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Download,
  Settings,
  RefreshCw,
  Clock
} from "lucide-react";
import { format } from "date-fns";

const initialColumns = {
  date: { label: "Date & Time", visible: true },
  symbol: { label: "Symbol", visible: true },
  side: { label: "Side", visible: true },
  quantity: { label: "Filled / Total", visible: true },
  price: { label: "Price", visible: true },
  status: { label: "Status", visible: true },
  product: { label: "Product", visible: true },
  orderType: { label: "Order Type", visible: false }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd MMM yyyy, HH:mm:ss");
  } catch (error) {
    return value;
  }
};

const getOrderSymbol = (order) => {
  if (!order) return "—";
  return order.tradingsymbol || order.symbol || order.instrument_token || order.order_id || "—";
};

const formatAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "—";
  }
  return num.toFixed(2);
};

const getSideBadgeClass = (side) => {
  const normalized = (side || "").toUpperCase();
  if (normalized === "BUY") {
    return "bg-green-100 text-green-700 border border-green-200";
  }
  if (normalized === "SELL") {
    return "bg-red-100 text-red-700 border border-red-200";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200";
};

const statusBadgeClasses = {
  COMPLETE: "bg-green-100 text-green-700 border border-green-200",
  COMPLETED: "bg-green-100 text-green-700 border border-green-200",
  FILLED: "bg-green-100 text-green-700 border border-green-200",
  CANCELLED: "bg-slate-200 text-slate-700 border border-slate-300",
  CANCELLED_AMO: "bg-slate-200 text-slate-700 border border-slate-300",
  OPEN: "bg-blue-100 text-blue-700 border border-blue-200",
  PENDING: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  REJECTED: "bg-red-100 text-red-700 border border-red-200",
  DEFAULT: "bg-slate-100 text-slate-700 border border-slate-200"
};

const getStatusBadgeClass = (status) => {
  if (!status) return statusBadgeClasses.DEFAULT;
  const normalized = status.toUpperCase();
  return statusBadgeClasses[normalized] || statusBadgeClasses.DEFAULT;
};

const toLower = (value) => (value || "").toString().toLowerCase();

export default function TradeHistoryTable() {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sideFilter, setSideFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(initialColumns);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);

  useEffect(() => {
    loadTradeHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, searchTerm, statusFilter, sideFilter, productFilter]);

  const statusOptions = useMemo(() => {
    const unique = new Set(trades.map((trade) => trade.status).filter(Boolean));
    return Array.from(unique).sort();
  }, [trades]);

  const sideOptions = useMemo(() => {
    const unique = new Set(
      trades
        .map((trade) => (trade.side || trade.transaction_type || "").toUpperCase())
        .filter(Boolean)
    );
    return Array.from(unique).sort();
  }, [trades]);

  const productOptions = useMemo(() => {
    const unique = new Set(trades.map((trade) => trade.product).filter(Boolean));
    return Array.from(unique).sort();
  }, [trades]);

  const loadTradeHistory = async ({ bypassCache = false } = {}) => {
    if (bypassCache) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setNeedsAuth(false);

    try {
      const result = await fetchBrokerOrders({ bypassCache });
      if (result?.success && result?.data) {
        const orders = result.data.orders || [];
        setTrades(orders);
        setLastUpdated(result.data.lastUpdated || null);
        setCacheInfo({ cached: result.data.cached || false });
      } else {
        setTrades([]);
        setLastUpdated(null);
        setCacheInfo(null);
        const shouldPromptAuth = ["unauthorized", "forbidden", "no_connection"].includes(result?.status) || result?.needsAuth;
        setNeedsAuth(shouldPromptAuth);
        setError(
          result?.message ||
            (shouldPromptAuth
              ? "Your Zerodha session appears to be inactive. Please reconnect to view order history."
              : "Unable to load order history.")
        );
      }
    } catch (err) {
      console.error("❌ [TradeHistoryTable] Failed to load orders:", err);
      setTrades([]);
      setLastUpdated(null);
      setCacheInfo(null);
      setError(err.message || "Failed to load order history");
      if (err.message && err.message.toLowerCase().includes("token")) {
        setNeedsAuth(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filterTrades = () => {
    let temp = [...trades];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      temp = temp.filter((trade) =>
        toLower(getOrderSymbol(trade)).includes(lowerSearch) ||
        toLower(trade.order_id).includes(lowerSearch)
      );
    }

    if (statusFilter !== "all") {
      temp = temp.filter((trade) => trade.status === statusFilter);
    }

    if (sideFilter !== "all") {
      temp = temp.filter(
        (trade) => (trade.side || trade.transaction_type || "").toUpperCase() === sideFilter
      );
    }

    if (productFilter !== "all") {
      temp = temp.filter((trade) => trade.product === productFilter);
    }

    setFilteredTrades(temp);
  };

  const toggleColumnVisibility = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible }
    }));
  };

  const toggleRow = (orderId) => {
    setExpandedRow((prev) => (prev === orderId ? null : orderId));
  };

  const exportToCSV = () => {
    const headers = Object.keys(visibleColumns)
      .filter((key) => visibleColumns[key].visible)
      .map((key) => visibleColumns[key].label);

    const rows = filteredTrades.map((trade) => {
      const cells = [];

      if (visibleColumns.date.visible) {
        cells.push(formatDateTime(trade.timestamp || trade.order_timestamp));
      }
      if (visibleColumns.symbol.visible) {
        cells.push(getOrderSymbol(trade));
      }
      if (visibleColumns.side.visible) {
        cells.push(trade.transaction_type || trade.side || "—");
      }
      if (visibleColumns.quantity.visible) {
        cells.push(`${trade.filled_quantity || 0}/${trade.quantity || 0}`);
      }
      if (visibleColumns.price.visible) {
        cells.push(`${formatAmount(trade.price)} (avg ${formatAmount(trade.average_price)})`);
      }
      if (visibleColumns.status.visible) {
        cells.push(trade.status || "—");
      }
      if (visibleColumns.product.visible) {
        cells.push(trade.product || "—");
      }
      if (visibleColumns.orderType.visible) {
        cells.push(trade.order_type || "—");
      }

      return cells.join(",");
    });

    const headerRow = headers.join(",");
    const csvContent = [headerRow, ...rows].join("\n");
    const encodedUri = `data:text/csv;charset=utf-8,${encodeURI(csvContent)}`;
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "orders.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = () => loadTradeHistory({ bypassCache: true });

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border border-white/10">
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Trade History</h2>
              <p className="text-slate-400">Live order history pulled from Zerodha Kite Connect</p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              {lastUpdated && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Last updated {formatDateTime(lastUpdated)}</span>
                  {cacheInfo?.cached && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-slate-300 border-slate-600/60">
                      Cached
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  className="border-slate-600/50 hover:bg-slate-700/50 text-slate-200"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
                <Button
                  onClick={exportToCSV}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-100">
              <AlertDescription>
                {error}
                {needsAuth && (
                  <span className="block mt-2 text-sm">
                    You may need to reconnect your broker account to continue viewing live data.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search symbol or order ID"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100 w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sideFilter} onValueChange={setSideFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100 w-[130px]">
                  <SelectValue placeholder="Side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sides</SelectItem>
                  {sideOptions.map((side) => (
                    <SelectItem key={side} value={side}>{side}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100 w-[150px]">
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {productOptions.map((product) => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-slate-600/50 text-slate-200">
                    <Settings className="w-4 h-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-slate-200">
                  {Object.keys(visibleColumns).map((key) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={visibleColumns[key].visible}
                      onCheckedChange={() => toggleColumnVisibility(key)}
                    >
                      {visibleColumns[key].label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading order history...</div>
          ) : filteredTrades.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              {needsAuth
                ? "Live data is unavailable because your broker session has expired. Please reconnect to continue."
                : "No orders found for the selected filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    {visibleColumns.date.visible && <TableHead className="text-slate-300">Date & Time</TableHead>}
                    {visibleColumns.symbol.visible && <TableHead className="text-slate-300">Symbol</TableHead>}
                    {visibleColumns.side.visible && <TableHead className="text-slate-300">Side</TableHead>}
                    {visibleColumns.quantity.visible && <TableHead className="text-slate-300 text-right">Filled / Total</TableHead>}
                    {visibleColumns.price.visible && <TableHead className="text-slate-300 text-right">Price</TableHead>}
                    {visibleColumns.status.visible && <TableHead className="text-slate-300">Status</TableHead>}
                    {visibleColumns.product.visible && <TableHead className="text-slate-300">Product</TableHead>}
                    {visibleColumns.orderType.visible && <TableHead className="text-slate-300">Order Type</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade, index) => {
                    const orderKey = trade.order_id || `${getOrderSymbol(trade)}-${index}`;
                    const tradeSide = (trade.side || trade.transaction_type || "").toUpperCase();
                    const completedQty = trade.filled_quantity || 0;
                    const totalQty = trade.quantity || 0;

                    return (
                      <React.Fragment key={orderKey}>
                        <TableRow
                          className="border-slate-800 hover:bg-slate-800/60 cursor-pointer"
                          onClick={() => toggleRow(orderKey)}
                        >
                          {visibleColumns.date.visible && (
                            <TableCell className="text-slate-200">
                              {formatDateTime(trade.timestamp || trade.order_timestamp)}
                            </TableCell>
                          )}

                          {visibleColumns.symbol.visible && (
                            <TableCell className="text-slate-200">
                              <div className="font-semibold text-white">{getOrderSymbol(trade)}</div>
                              <div className="text-xs text-slate-400 flex items-center gap-2">
                                <span>{trade.exchange || "—"}</span>
                                <span className="text-slate-500">•</span>
                                <span>Order ID: {trade.order_id || "—"}</span>
                              </div>
                            </TableCell>
                          )}

                          {visibleColumns.side.visible && (
                            <TableCell>
                              <Badge className={`${getSideBadgeClass(tradeSide)} font-semibold px-3 py-1 text-xs`}>{tradeSide || "—"}</Badge>
                            </TableCell>
                          )}

                          {visibleColumns.quantity.visible && (
                            <TableCell className="text-right text-slate-200">
                              <div className="font-semibold">{completedQty.toLocaleString()} / {totalQty.toLocaleString()}</div>
                              <div className="text-xs text-slate-400">Pending: {(totalQty - completedQty).toLocaleString()}</div>
                            </TableCell>
                          )}

                          {visibleColumns.price.visible && (
                            <TableCell className="text-right text-slate-200">
                              <div className="font-semibold">₹{formatAmount(trade.price)}</div>
                              <div className="text-xs text-slate-400">Avg ₹{formatAmount(trade.average_price)}</div>
                            </TableCell>
                          )}

                          {visibleColumns.status.visible && (
                            <TableCell>
                              <Badge className={`${getStatusBadgeClass(trade.status)} font-semibold px-3 py-1 text-xs`}>
                                {trade.status || "—"}
                              </Badge>
                            </TableCell>
                          )}

                          {visibleColumns.product.visible && (
                            <TableCell className="text-slate-200">{trade.product || "—"}</TableCell>
                          )}

                          {visibleColumns.orderType.visible && (
                            <TableCell className="text-slate-200">{trade.order_type || "—"}</TableCell>
                          )}
                        </TableRow>

                        {expandedRow === orderKey && (
                          <TableRow className="bg-slate-900/60">
                            <TableCell colSpan={Object.values(visibleColumns).filter((col) => col.visible).length}>
                              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-200">
                                <div>
                                  <span className="text-slate-400 block text-xs">Order ID</span>
                                  <span className="font-semibold">{trade.order_id || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-xs">Product</span>
                                  <span className="font-semibold">{trade.product || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-xs">Order Type</span>
                                  <span className="font-semibold">{trade.order_type || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-xs">Validity</span>
                                  <span className="font-semibold">{trade.validity || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-xs">Exchange Timestamp</span>
                                  <span className="font-semibold">{formatDateTime(trade.exchange_timestamp)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-xs">Instrument Token</span>
                                  <span className="font-semibold">{trade.instrument_token || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-xs">Tag</span>
                                  <span className="font-semibold">{trade.tag || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-xs">Placed By</span>
                                  <span className="font-semibold">{trade.placed_by || "—"}</span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
