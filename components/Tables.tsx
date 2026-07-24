import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  memo,
} from "react";
import {
  Table,
  Product,
  OrderItem,
  PaymentMethod,
  Order,
  Customer,
  ProductOption,
  AdminSettings,
  DigitalMenuSettings,
  FinancialRecord,
} from "../types";
import { getObservationSuggestions } from "../services/gemini";
import {
  handlePrintOrder,
  generateReceiptHtml,
  printTestReceipt,
} from "../services/printService";
import { maskCurrency, parseCurrency, maskPhone } from "../utils/masks";
import {
  Users,
  CreditCard,
  Utensils,
  X,
  Plus,
  Trash2,
  Receipt,
  Wallet,
  Smartphone,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Search,
  Edit3,
  User as UserIcon,
  MessageSquare,
  Save,
  Minus,
  Sparkles,
  Loader2,
  Send,
  ChefHat,
  Lock,
  Unlock,
  Coins,
  History,
  DollarSign,
  ArrowRightLeft,
  PieChart,
  UserCircle,
  UserPlus,
  Store,
  ShoppingBag,
  CreditCard as CardIcon,
  Landmark,
  AlertTriangle,
  Calculator,
  ListChecks,
  ArrowRight,
  Check,
  Bike,
  Ticket,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
  Clock,
} from "lucide-react";

interface TablesProps {
  tables: Table[];
  counterOrders: Table[];
  products: Product[];
  orders: Order[];
  financialRecords: FinancialRecord[];
  customers: Customer[];
  adminSettings: AdminSettings;
  digitalMenuSettings: DigitalMenuSettings;
  cashSession: {
    isOpen: boolean;
    openingValue: number;
    openedAt: Date | null;
  };
  onUpdateTable: (
    tableId: number | string,
    items: OrderItem[],
    status: Table["status"],
    isCounter?: boolean,
  ) => void;
  onAddTable: () => Promise<void>;
  onDeleteTable: (tableId: number | string) => Promise<void>;
  onCloseTable: (
    tableId: number | string,
    paymentMethod: PaymentMethod,
    isFiscal: boolean,
    customerId?: string,
    isCounter?: boolean,
    deliveryInfo?: {
      address: string;
      fee: number;
      name?: string;
      phone?: string;
    },
    customerDocument?: string,
    payments?: {
      method: PaymentMethod;
      amount: number;
      customerId?: string;
      isFiscalIssued?: boolean;
      fiscalKey?: string;
      customerDocument?: string;
    }[],
    changeFor?: number,
    additionalFee?: number,
    additionalFeeReason?: string,
    discount?: number,
  ) => void;
  onSendToKitchen: (
    tableId: number | string,
    items: OrderItem[],
    isCounter?: boolean,
  ) => void;
  onOpenCash: (value: number) => void;
  onCloseCash: (actualValue: number, observations?: string) => Promise<any>;
  onAddCounterOrder: () => Promise<number | string>;
  onCancelTable: (
    tableId: number | string,
    isCounter?: boolean,
  ) => Promise<void>;
  onTransferTable: (
    fromTableId: number | string,
    toTableId: number | string,
    isCounter?: boolean,
  ) => Promise<boolean>;
  onAddCustomer: (customer: Partial<Customer>) => Promise<any> | any;
  onAddFinancialRecord?: (record: Partial<FinancialRecord>) => void;
  tenantId: string;
  defaultDeliveryFee?: number;
  pdvEditOrder?: Order | null;
  onCancelPdvEdit?: () => void;
  onUpdateOrder?: (id: string, updates: Partial<Order>) => void;
  onNavigate?: (tab: string) => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

interface SplitPart {
  id: string;
  amount: number;
  method: PaymentMethod;
  isPaid: boolean;
  customerId?: string;
  isFiscalIssued?: boolean;
  fiscalKey?: string;
  customerDocument?: string;
  items?: OrderItem[];
}

const Tables: React.FC<TablesProps> = memo(
  ({
    tables,
    counterOrders,
    products,
    orders,
    financialRecords,
    customers,
    adminSettings,
    digitalMenuSettings,
    cashSession,
    onUpdateTable,
    onAddTable,
    onDeleteTable,
    onCloseTable,
    onSendToKitchen,
    onOpenCash,
    onCloseCash,
    onAddCounterOrder,
    onCancelTable,
    onTransferTable,
    onAddCustomer,
    onAddFinancialRecord,
    tenantId,
    defaultDeliveryFee = 0,
    pdvEditOrder,
    onCancelPdvEdit,
    onUpdateOrder,
    onNavigate,
    showToast,
  }) => {
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [isCounterContext, setIsCounterContext] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showCashModal, setShowCashModal] = useState(false);
    const [showCustomerSelection, setShowCustomerSelection] = useState(false);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Split logic states
    const [isSplitting, setIsSplitting] = useState(false);
    const [splitMode, setSplitMode] = useState<"value" | "items" | null>(null);
    const [selectedSplitItems, setSelectedSplitItems] = useState<number[]>([]);
    const [customSplitValue, setCustomSplitValue] = useState("");
    const [splitParts, setSplitParts] = useState<SplitPart[]>([]);
    const [remainingBalance, setRemainingBalance] = useState(0);
    const [additionalFee, setAdditionalFee] = useState<number>(0);
    const [additionalFeeReason, setAdditionalFeeReason] = useState<string>("");
    const [showReasonInput, setShowReasonInput] = useState<boolean>(false);
    const [discount, setDiscount] = useState<number>(0);
    const [paidItemIndices, setPaidItemIndices] = useState<number[]>([]);

    // Extra states for partial fiscal coupon emission
    const [issuingPartId, setIssuingPartId] = useState<string | null>(null);
    const [partDocumentInputs, setPartDocumentInputs] = useState<
      Record<string, string>
    >({});
    const [showPartDocumentSection, setShowPartDocumentSection] = useState<
      Record<string, boolean>
    >({});
    const [autoCloseAfterPayment, setAutoCloseAfterPayment] = useState(true);

    const [isFiscalEmission, setIsFiscalEmission] = useState(
      adminSettings.fiscal?.autoIssueNfce || false,
    );
    const [customerDocumentInput, setCustomerDocumentInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferToTableId, setTransferToTableId] = useState<
      number | string | null
    >(null);
    const [isTransferring, setIsTransferring] = useState(false);
    const [showKitchenSuccess, setShowKitchenSuccess] = useState(false);
    const [showManageTablesModal, setShowManageTablesModal] = useState(false);
    const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
    const [tableSearch, setTableSearch] = useState("");

    // Sangria/Suprimento States
    const [showMovementsModal, setShowMovementsModal] = useState(false);
    const [movementType, setMovementType] = useState<"income" | "expense">(
      "income",
    );
    const [movementAmount, setMovementAmount] = useState("");
    const [movementReason, setMovementReason] = useState("");

    const [productSearch, setProductSearch] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");

    const filteredTables = useMemo(() => {
      if (!tableSearch) return tables.sort((a, b) => a.number - b.number);
      return tables
        .filter((t) => t.number.toString().includes(tableSearch))
        .sort((a, b) => a.number - b.number);
    }, [tables, tableSearch]);

    const [openingValueInput, setOpeningValueInput] = useState("0");
    const [closingValueInput, setClosingValueInput] = useState("0");
    const [closingObservations, setClosingObservations] = useState("");
    const [isClosingCash, setIsClosingCash] = useState(false);
    const [lastClosingReport, setLastClosingReport] = useState<any>(null);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // Sales breakdown order report modal state
    const [selectedMethodReport, setSelectedMethodReport] = useState<{
      id: string;
      label: string;
      icon?: any;
      color?: string;
      bg?: string;
    } | null>(null);
    const [methodReportSearch, setMethodReportSearch] = useState("");

    // Change calculation states
    const [amountReceived, setAmountReceived] = useState("");
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] =
      useState<PaymentMethod | null>(null);

    // Delivery states for counter
    const [isDeliveryOrder, setIsDeliveryOrder] = useState(
      adminSettings.isDeliveryEnabled && !adminSettings.isPickupEnabled,
    );
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [deliveryFeeInput, setDeliveryFeeInput] = useState("0");

    // Sync isDeliveryOrder with adminSettings
    useEffect(() => {
      if (!adminSettings.isDeliveryEnabled && isDeliveryOrder) {
        setIsDeliveryOrder(false);
      } else if (
        !adminSettings.isPickupEnabled &&
        !isDeliveryOrder &&
        adminSettings.isDeliveryEnabled
      ) {
        setIsDeliveryOrder(true);
      }
    }, [adminSettings.isDeliveryEnabled, adminSettings.isPickupEnabled]);

    const formatCurrency = maskCurrency;

    // Item Edit States
    const [activeSeat, setActiveSeat] = useState<string>("Geral");
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(
      null,
    );
    const [tempObs, setTempObs] = useState("");
    const [tempSeat, setTempSeat] = useState("");
    const [tempQty, setTempQty] = useState<number>(1);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [selectedProductForOptions, setSelectedProductForOptions] =
      useState<Product | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
    const [optionsModalQty, setOptionsModalQty] = useState<number>(1);
    const [optionsModalObs, setOptionsModalObs] = useState<string>("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [showDeliveryCustomerResults, setShowDeliveryCustomerResults] =
      useState(false);
    const [selectedDeliveryCustomer, setSelectedDeliveryCustomer] =
      useState<Customer | null>(null);
    const [showAddressSelector, setShowAddressSelector] = useState(false);

    // Helper to handle order completion (new or update)
    const handleOrderCompletion = (
      method: PaymentMethod,
      isFiscal: boolean,
      customerId?: string,
      isCounter: boolean = false,
      deliveryInfo?: {
        address: string;
        fee: number;
        name: string;
        phone: string;
      },
      customerDocument?: string,
      payments?: {
        method: PaymentMethod;
        amount: number;
        customerId?: string;
      }[],
      receivedAmount?: number,
    ) => {
      if (pdvEditOrder && onUpdateOrder) {
        onUpdateOrder(pdvEditOrder.id, {
          items: selectedTable!.items,
          total:
            selectedTable!.total +
            (isDeliveryOrder && isCounterContext
              ? parseCurrency(deliveryFeeInput)
              : 0) +
            (additionalFee || 0) -
            (discount || 0),
          additionalFee: additionalFee || 0,
          additionalFeeReason: additionalFeeReason || "",
          discount: discount || 0,
          paymentMethod: method,
          payments: payments?.map((p) => ({ ...p, timestamp: new Date() })) || [
            {
              method,
              amount:
                selectedTable!.total +
                (isDeliveryOrder && isCounterContext
                  ? parseCurrency(deliveryFeeInput)
                  : 0) +
                (additionalFee || 0) -
                (discount || 0),
              timestamp: new Date(),
            },
          ],
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          customerAddress: deliveryAddress || undefined,
          deliveryFee: isDeliveryOrder
            ? parseCurrency(deliveryFeeInput)
            : undefined,
          type: isDeliveryOrder
            ? "delivery"
            : isCounterContext
              ? "takeout"
              : "table",
          customerId: customerId || undefined,
        });
        if (onCancelPdvEdit) onCancelPdvEdit();
      } else {
        onCloseTable(
          selectedTable!.id,
          method,
          isFiscal,
          customerId,
          isCounter,
          deliveryInfo,
          customerDocument,
          payments,
          receivedAmount,
          additionalFee,
          additionalFeeReason,
          discount,
        );
      }
    };

    // Effect to handle PDV Edit Order from KDS/Delivery
    useEffect(() => {
      if (pdvEditOrder) {
        setIsCounterContext(pdvEditOrder.type !== "table");
        // Create a mock table from the order
        const mockTable: Table = {
          id:
            pdvEditOrder.tableNumber || 1000 + Math.floor(Math.random() * 9000),
          number: Number(pdvEditOrder.tableNumber) || 0,
          items: pdvEditOrder.items,
          total: pdvEditOrder.total - (pdvEditOrder.deliveryFee || 0),
          status: "occupied",
          tenantId: pdvEditOrder.tenantId,
          currentOrderId: pdvEditOrder.id,
        };
        setSelectedTable(mockTable);
        setCustomerName(pdvEditOrder.customerName || "");
        setCustomerPhone(pdvEditOrder.customerPhone || "");
        setDeliveryAddress(pdvEditOrder.customerAddress || "");
        setDeliveryFeeInput(
          (pdvEditOrder.deliveryFee || 0).toString().replace(".", ","),
        );
        setIsDeliveryOrder(pdvEditOrder.type === "delivery");
        setSelectedPaymentMethod(pdvEditOrder.paymentMethod || null);
        if (pdvEditOrder.customerId) {
          setSelectedCustomerId(pdvEditOrder.customerId);
        }
      }
    }, [pdvEditOrder]);

    const handleConfirmMovement = () => {
      const amount = parseCurrency(movementAmount);
      if (amount <= 0) {
        alert("Por favor, informe um valor válido.");
        return;
      }

      if (!movementReason.trim()) {
        alert("Por favor, informe o motivo do lançamento.");
        return;
      }

      if (onAddFinancialRecord) {
        onAddFinancialRecord({
          type: movementType,
          amount,
          description: `${movementType === "income" ? "Suprimento" : "Sangria"}: ${movementReason || (movementType === "income" ? "Entrada manual" : "Retirada manual")}`,
          category: movementType === "income" ? "Suprimento" : "Sangria",
          status: "paid",
          paymentMethod: "dinheiro",
        });
      }

      setShowMovementsModal(false);
      setMovementAmount("");
      setMovementReason("");
    };

    const handleFullCloseCash = async () => {
      // Se a confirmação não estiver visível, mostrá-la primeiro
      if (!showCloseConfirm) {
        setShowCloseConfirm(true);
        return;
      }

      // Se já estiver processando, não fazer nada
      if (isClosingCash) return;

      setShowCloseConfirm(false);
      setIsClosingCash(true);

      try {
        const finalActualValue = parseCurrency(closingValueInput);
        console.log("Iniciando fechamento com valor real:", finalActualValue);

        const report = await onCloseCash(finalActualValue, closingObservations);

        if (report) {
          setLastClosingReport(report);
          setClosingValueInput("");
          setClosingObservations("");
          showToast("Turno encerrado com sucesso!", "success");
        } else {
          // Se retornar nulo, algo foi cancelado ou falhou
          console.warn("Fechamento retornou vazio.");
        }
      } catch (err) {
        console.error("Erro fatal no processo de fechamento:", err);
        showToast("Não foi possível fechar o caixa. Tente novamente.", "error");
      } finally {
        setIsClosingCash(false);
      }
    };

    const getPaymentMethodLabel = (id: string) => {
      const labels: any = {
        dinheiro: "Dinheiro",
        pix: "PIX",
        cartao_credito: "C. Crédito",
        cartao_debito: "C. Débito",
        vale_refeicao: "Ticket / VR",
        conta_cliente: "Fiado",
      };
      return labels[id] || id;
    };

    const cashReport = useMemo(() => {
      if (!cashSession.openedAt) return null;

      const parseToDate = (val: any): Date => {
        if (!val) return new Date(0);
        if (val instanceof Date) return val;
        if (typeof val.toDate === "function") return val.toDate();
        if (val.seconds !== undefined) return new Date(val.seconds * 1000);
        const parsed = new Date(val);
        return isNaN(parsed.getTime()) ? new Date(0) : parsed;
      };

      const getStandardPaymentMethod = (method: string): string => {
        if (!method) return "dinheiro";
        const cleanMethod = String(method).trim().toLowerCase();

        const standardKeys = [
          "dinheiro",
          "cartao_credito",
          "cartao_debito",
          "pix",
          "vale_refeicao",
          "conta_cliente",
        ];
        if (standardKeys.includes(cleanMethod)) return cleanMethod;

        if (cleanMethod === "cash") return "dinheiro";
        if (cleanMethod === "credit") return "cartao_credito";
        if (cleanMethod === "debit") return "cartao_debito";
        if (cleanMethod === "voucher") return "vale_refeicao";
        if (cleanMethod === "account") return "conta_cliente";
        if (cleanMethod === "fiado") return "conta_cliente";

        if (adminSettings && adminSettings.paymentMethods) {
          const config = adminSettings.paymentMethods.find(
            (m) =>
              m.id === method ||
              m.name.trim().toLowerCase() === cleanMethod ||
              m.type.trim().toLowerCase() === cleanMethod,
          );
          if (config) {
            switch (config.type) {
              case "cash":
                return "dinheiro";
              case "credit":
                return "cartao_credito";
              case "debit":
                return "cartao_debito";
              case "pix":
                return "pix";
              case "voucher":
                return "vale_refeicao";
              case "account":
                return "conta_cliente";
            }
          }
        }

        if (
          cleanMethod.includes("dinheiro") ||
          cleanMethod.includes("money") ||
          cleanMethod.includes("efetivo") ||
          cleanMethod.includes("cedula")
        )
          return "dinheiro";
        if (cleanMethod.includes("credito") || cleanMethod.includes("crédito"))
          return "cartao_credito";
        if (cleanMethod.includes("debito") || cleanMethod.includes("débito"))
          return "cartao_debito";
        if (cleanMethod.includes("pix")) return "pix";
        if (
          cleanMethod.includes("vale") ||
          cleanMethod.includes("refeicao") ||
          cleanMethod.includes("refeição") ||
          cleanMethod.includes("ticket") ||
          cleanMethod.includes("sodexo") ||
          cleanMethod.includes("vr")
        )
          return "vale_refeicao";
        if (
          cleanMethod.includes("fiado") ||
          cleanMethod.includes("cliente") ||
          cleanMethod.includes("carteira") ||
          cleanMethod.includes("conta")
        )
          return "conta_cliente";

        return "dinheiro";
      };

      const sessionOpenedAt = parseToDate(cashSession.openedAt);

      const sessionRecords = financialRecords.filter((r) => {
        const date = parseToDate(r.date);
        return (
          date >= sessionOpenedAt &&
          r.status === "paid" &&
          getStandardPaymentMethod(r.paymentMethod || "") === "dinheiro"
        );
      });

      const sessionOrders = orders.filter((o) => {
        const createdAt = parseToDate(o.createdAt);
        return createdAt >= sessionOpenedAt && o.status !== "cancelled";
      });

      // Monetary sums should exclude automated sale records (which already exist in sessionOrders)
      // and also exclude the opening cash record itself to avoid double counting
      const extraIncomes = sessionRecords
        .filter((r) => r.category === "Suprimento")
        .reduce((acc, r) => acc + (r.type === "income" ? r.amount : 0), 0);

      const extraExpenses = sessionRecords
        .filter((r) => r.category === "Sangria")
        .reduce((acc, r) => acc + (r.type === "expense" ? r.amount : 0), 0);

      const totalsByMethod = {
        dinheiro: 0,
        cartao_credito: 0,
        cartao_debito: 0,
        pix: 0,
        vale_refeicao: 0,
        conta_cliente: 0,
      };

      sessionOrders.forEach((o) => {
        if (o.payments && o.payments.length > 0) {
          o.payments.forEach((p) => {
            const method = getStandardPaymentMethod(p.method);
            if (totalsByMethod.hasOwnProperty(method)) {
              (totalsByMethod as any)[method] += p.amount;
            }
          });
        } else if (o.paymentMethod) {
          const method = getStandardPaymentMethod(o.paymentMethod);
          if (totalsByMethod.hasOwnProperty(method)) {
            (totalsByMethod as any)[method] += o.total;
          }
        }
      });

      const totalSales = Object.values(totalsByMethod).reduce(
        (a, b) => a + b,
        0,
      );
      const electronicTotal =
        totalsByMethod.cartao_credito +
        totalsByMethod.cartao_debito +
        totalsByMethod.pix +
        totalsByMethod.vale_refeicao;

      return {
        totalsByMethod,
        totalSales,
        electronicTotal,
        cashIncomes: extraIncomes,
        cashExpenses: extraExpenses,
        sessionRecords,
        sessionOrders,
        expectedFinalValue:
          totalsByMethod.dinheiro +
          cashSession.openingValue +
          extraIncomes -
          extraExpenses,
        count: sessionOrders.length,
      };
    }, [orders, financialRecords, cashSession]);

    const getStandardPaymentMethodKey = (method: string): string => {
      if (!method) return "dinheiro";
      const cleanMethod = String(method).trim().toLowerCase();

      const standardKeys = [
        "dinheiro",
        "cartao_credito",
        "cartao_debito",
        "pix",
        "vale_refeicao",
        "conta_cliente",
      ];
      if (standardKeys.includes(cleanMethod)) return cleanMethod;

      if (cleanMethod === "cash") return "dinheiro";
      if (cleanMethod === "credit") return "cartao_credito";
      if (cleanMethod === "debit") return "cartao_debito";
      if (cleanMethod === "voucher") return "vale_refeicao";
      if (cleanMethod === "account" || cleanMethod === "fiado") return "conta_cliente";

      if (adminSettings && adminSettings.paymentMethods) {
        const config = adminSettings.paymentMethods.find(
          (m) =>
            m.id === method ||
            m.name.trim().toLowerCase() === cleanMethod ||
            m.type.trim().toLowerCase() === cleanMethod,
        );
        if (config) {
          switch (config.type) {
            case "cash":
              return "dinheiro";
            case "credit":
              return "cartao_credito";
            case "debit":
              return "cartao_debito";
            case "pix":
              return "pix";
            case "voucher":
              return "vale_refeicao";
            case "account":
              return "conta_cliente";
          }
        }
      }

      if (
        cleanMethod.includes("dinheiro") ||
        cleanMethod.includes("money") ||
        cleanMethod.includes("efetivo") ||
        cleanMethod.includes("cedula")
      )
        return "dinheiro";
      if (cleanMethod.includes("credito") || cleanMethod.includes("crédito"))
        return "cartao_credito";
      if (cleanMethod.includes("debito") || cleanMethod.includes("débito"))
        return "cartao_debito";
      if (cleanMethod.includes("pix")) return "pix";
      if (
        cleanMethod.includes("vale") ||
        cleanMethod.includes("refeicao") ||
        cleanMethod.includes("refeição") ||
        cleanMethod.includes("ticket") ||
        cleanMethod.includes("sodexo") ||
        cleanMethod.includes("vr")
      )
        return "vale_refeicao";
      if (
        cleanMethod.includes("fiado") ||
        cleanMethod.includes("cliente") ||
        cleanMethod.includes("carteira") ||
        cleanMethod.includes("conta")
      )
        return "conta_cliente";

      return "dinheiro";
    };

    const getOrderMethodContribution = (order: Order, targetMethodId: string): number => {
      if (targetMethodId === "all") return order.total || 0;

      if (targetMethodId === "electronic") {
        const electronicKeys = ["pix", "cartao_credito", "cartao_debito", "vale_refeicao"];
        if (order.payments && order.payments.length > 0) {
          return order.payments.reduce((acc, p) => {
            const std = getStandardPaymentMethodKey(p.method);
            return electronicKeys.includes(std) ? acc + p.amount : acc;
          }, 0);
        } else if (order.paymentMethod) {
          const std = getStandardPaymentMethodKey(order.paymentMethod);
          return electronicKeys.includes(std) ? order.total || 0 : 0;
        }
        return 0;
      }

      if (order.payments && order.payments.length > 0) {
        return order.payments.reduce((acc, p) => {
          const std = getStandardPaymentMethodKey(p.method);
          return std === targetMethodId ? acc + p.amount : acc;
        }, 0);
      } else if (order.paymentMethod) {
        const std = getStandardPaymentMethodKey(order.paymentMethod);
        return std === targetMethodId ? order.total || 0 : 0;
      }
      return 0;
    };

    const matchingOrdersForReport = useMemo(() => {
      if (!selectedMethodReport) return [];

      let sourceOrders: Order[] = [];
      if (cashReport && cashReport.sessionOrders && cashReport.sessionOrders.length > 0) {
        sourceOrders = cashReport.sessionOrders;
      } else if (lastClosingReport) {
        const openedAt = new Date(lastClosingReport.openedAt);
        const closedAt = new Date(lastClosingReport.closedAt);
        sourceOrders = orders.filter((o) => {
          const created = new Date(o.createdAt);
          return created >= openedAt && created <= closedAt && o.status !== "cancelled";
        });
      } else if (cashSession.openedAt) {
        const openedAt = new Date(cashSession.openedAt);
        sourceOrders = orders.filter((o) => {
          const created = new Date(o.createdAt);
          return created >= openedAt && o.status !== "cancelled";
        });
      } else {
        sourceOrders = orders.filter((o) => o.status !== "cancelled");
      }

      return sourceOrders
        .map((o) => {
          const contribution = getOrderMethodContribution(o, selectedMethodReport.id);
          return { order: o, contribution };
        })
        .filter((item) => item.contribution > 0)
        .filter(({ order }) => {
          if (!methodReportSearch.trim()) return true;
          const term = methodReportSearch.toLowerCase().trim();
          const nameMatch = (order.customerName || "").toLowerCase().includes(term);
          const tableMatch = order.tableNumber ? String(order.tableNumber).includes(term) : false;
          const numberMatch = order.dailyNumber ? String(order.dailyNumber).includes(term) : false;
          const idMatch = (order.id || "").toLowerCase().includes(term);
          const itemsMatch = order.items.some((i) => i.name.toLowerCase().includes(term));
          return nameMatch || tableMatch || numberMatch || idMatch || itemsMatch;
        });
    }, [selectedMethodReport, cashReport, lastClosingReport, cashSession.openedAt, orders, methodReportSearch]);

    const reportTotalContribution = useMemo(() => {
      return matchingOrdersForReport.reduce((acc, curr) => acc + curr.contribution, 0);
    }, [matchingOrdersForReport]);

    const filteredCustomerList = useMemo(
      () =>
        customers.filter((c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()),
        ),
      [customers, customerSearch],
    );

    const deliveryFilteredCustomers = useMemo(() => {
      const searchPhone = customerPhone.replace(/\D/g, "");
      const searchName = customerName.toLowerCase();
      if (!searchPhone && !searchName) return [];
      return customers.filter(
        (c) =>
          (searchPhone && c.phone.replace(/\D/g, "").includes(searchPhone)) ||
          (searchName && c.name.toLowerCase().includes(searchName)),
      );
    }, [customers, customerPhone, customerName]);

    const getTableStatusColor = (status: Table["status"]) => {
      switch (status) {
        case "available":
          return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "occupied":
          return "bg-rose-50 text-rose-700 border-rose-200";
        case "billing":
          return "bg-amber-50 text-amber-700 border-amber-200";
        case "cleaning":
          return "bg-slate-100 text-slate-500 border-slate-200";
      }
    };

    // Sincronizar selectedTable com as props para evitar dados obsoletos
    useEffect(() => {
      if (!selectedTable) return;

      // Se estivermos editando um pedido do PDV vindo de KDS/Delivery, não limpamos o selectedTable
      // se ele não estiver nas listas ativas (pois ele já é um pedido finalizado/em andamento)
      if (pdvEditOrder && selectedTable.currentOrderId === pdvEditOrder.id) {
        return;
      }

      const source = isCounterContext ? counterOrders : tables;
      const updatedTable = source.find((t) => t.id === selectedTable.id);

      if (updatedTable) {
        // Só atualiza se houver mudança real para evitar loops
        if (
          JSON.stringify(updatedTable.items) !==
            JSON.stringify(selectedTable.items) ||
          updatedTable.status !== selectedTable.status ||
          updatedTable.total !== selectedTable.total
        ) {
          setSelectedTable(updatedTable);
        }
      } else if (isCounterContext) {
        // Se for balcão e não estiver mais na lista, fecha o modal
        setSelectedTable(null);
      }
    }, [
      tables,
      counterOrders,
      isCounterContext,
      selectedTable?.id,
      pdvEditOrder,
    ]);

    const openTable = (table: Table) => {
      if (!cashSession.isOpen) {
        alert("Por favor, abra o caixa antes de realizar atendimentos.");
        setShowCashModal(true);
        return;
      }
      setIsCounterContext(false);
      setIsDeliveryOrder(false);
      if (table.status === "available") {
        onUpdateTable(table.id, [], "occupied");
        setSelectedTable({ ...table, status: "occupied", items: [], total: 0 });
      } else {
        setSelectedTable(table);
      }
      setActiveSeat("Geral");
    };

    const openCounterOrder = (order: Table) => {
      setIsCounterContext(true);
      setSelectedTable(order);
      setActiveSeat("Geral");
    };

    const handleNewCounter = async () => {
      if (!cashSession.isOpen) {
        alert("Abra o caixa primeiro.");
        setShowCashModal(true);
        return;
      }
      const newId = await onAddCounterOrder();
      setIsCounterContext(true);
      setSelectedTable({
        id: newId,
        number: counterOrders.length + 1,
        status: "occupied",
        items: [],
        total: 0,
        tenantId,
      });
    };

    const addToTable = useCallback(
      (
        product: Product,
        qty: number = 1,
        options?: ProductOption[],
        observation?: string,
      ) => {
        if (!selectedTable) return;

        // Se o produto tem categorias de opcionais e não foram passados (primeiro clique), abre o modal
        const hasOptionCategories =
          product.optionCategories && product.optionCategories.length > 0;
        const hasLegacyOptions = product.options && product.options.length > 0;

        if (
          (hasOptionCategories || hasLegacyOptions) &&
          options === undefined
        ) {
          setSelectedProductForOptions(product);
          setSelectedOptions([]);
          setOptionsModalQty(qty);
          setOptionsModalObs("");
          setShowOptionsModal(true);
          return;
        }

        const finalOptions = options || [];
        const optionNames = finalOptions
          .map((o) => o.name)
          .sort()
          .join(", ");
        const existingIndex = selectedTable.items.findIndex(
          (i) =>
            i.productId === product.id &&
            i.seat === activeSeat &&
            !i.sentToKitchen &&
            (i.observation || "") === (observation || "") &&
            (i.selectedOptions
              ?.map((o) => o.name)
              .sort()
              .join(", ") || "") === optionNames,
        );

        let newItems: OrderItem[];
        const itemPrice =
          product.price + finalOptions.reduce((acc, o) => acc + o.price, 0);

        if (existingIndex > -1) {
          newItems = [...selectedTable.items];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + qty,
          };
        } else {
          // Validate category conflict
          const nameConflict = selectedTable.items.find((item) => {
            const otherProduct = products.find((p) => p.id === item.productId);
            return (
              otherProduct &&
              otherProduct.name.toLowerCase().trim() === product.name.toLowerCase().trim() &&
              otherProduct.category !== product.category
            );
          });
          if (nameConflict) {
            const otherCat = products.find((p) => p.id === nameConflict.productId)?.category || "Outra";
            const confirmAdd = window.confirm(
              `Atenção: Você está lançando "${product.name}" da categoria "${product.category}", mas já existe um item com o mesmo nome na categoria "${otherCat}" no pedido. Deseja realmente lançar este item?`
            );
            if (!confirmAdd) return;
          }

          newItems = [
            ...selectedTable.items,
            {
              productId: product.id,
              name:
                product.name +
                (finalOptions.length > 0
                  ? ` (${finalOptions.map((o) => o.name).join(", ")})`
                  : ""),
              price: itemPrice,
              quantity: qty,
              category: product.category,
              seat: activeSeat,
              selectedOptions:
                finalOptions.length > 0 ? finalOptions : undefined,
              observation: observation || undefined,
            },
          ];
        }
        const newTotal = newItems.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0,
        );
        const updated = { ...selectedTable, items: newItems, total: newTotal };
        setSelectedTable(updated);
        onUpdateTable(selectedTable.id, newItems, "occupied", isCounterContext);

        if (showOptionsModal) {
          setShowOptionsModal(false);
          setSelectedProductForOptions(null);
          setSelectedOptions([]);
          setOptionsModalQty(1);
          setOptionsModalObs("");
        }
      },
      [
        selectedTable,
        activeSeat,
        isCounterContext,
        onUpdateTable,
        showOptionsModal,
        products,
      ],
    );

    const confirmOptions = () => {
      if (selectedProductForOptions) {
        // Verificar se categorias obrigatórias foram selecionadas
        if (
          selectedProductForOptions.optionCategories &&
          selectedProductForOptions.optionCategories.length > 0
        ) {
          for (const cat of selectedProductForOptions.optionCategories) {
            const selectedInCat = selectedOptions.filter(
              (o) => o.category === cat.name,
            );
            if (selectedInCat.length < cat.min) {
              alert(
                `Por favor, selecione pelo menos ${cat.min} opção(ões) para: ${cat.name}`,
              );
              return;
            }
            if (cat.max > 0 && selectedInCat.length > cat.max) {
              alert(
                `Você pode selecionar no máximo ${cat.max} opção(ões) para: ${cat.name}`,
              );
              return;
            }
          }
        } else if (
          selectedProductForOptions.requiredOptionCategories &&
          selectedProductForOptions.requiredOptionCategories.length > 0
        ) {
          // Fallback para o sistema antigo de categorias obrigatórias se não houver optionCategories estruturado
          const missingCategories =
            selectedProductForOptions.requiredOptionCategories.filter(
              (cat) => !selectedOptions.some((opt) => opt.category === cat),
            );

          if (missingCategories.length > 0) {
            alert(
              `Por favor, selecione pelo menos uma opção para: ${missingCategories.join(", ")}`,
            );
            return;
          }
        }
        addToTable(selectedProductForOptions, optionsModalQty, selectedOptions, optionsModalObs);
      }
    };

    const toggleOption = (option: ProductOption) => {
      if (!selectedProductForOptions) return;

      setSelectedOptions((prev) => {
        const isSelected = prev.find((o) => o.id === option.id);

        if (isSelected) {
          return prev.filter((o) => o.id !== option.id);
        } else {
          // Se houver categorias estruturadas, verificar o limite máximo
          if (selectedProductForOptions.optionCategories) {
            const category = selectedProductForOptions.optionCategories.find(
              (c) => c.name === option.category,
            );
            if (category && category.max > 0) {
              const selectedInCat = prev.filter(
                (o) => o.category === option.category,
              );

              // Se o máximo for 1, substitui a seleção anterior na mesma categoria
              if (category.max === 1) {
                return [
                  ...prev.filter((o) => o.category !== option.category),
                  option,
                ];
              }

              // Se já atingiu o máximo, não permite adicionar mais
              if (selectedInCat.length >= category.max) {
                alert(
                  `Limite máximo de ${category.max} opções atingido para ${category.name}`,
                );
                return prev;
              }
            }
          }
          return [...prev, option];
        }
      });
    };

    const removeItem = useCallback(
      (index: number) => {
        if (!selectedTable) return;
        const newItems = selectedTable.items.filter((_, i) => i !== index);
        const newTotal = newItems.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0,
        );
        const updated = { ...selectedTable, items: newItems, total: newTotal };
        setSelectedTable(updated);
        onUpdateTable(selectedTable.id, newItems, "occupied", isCounterContext);
      },
      [selectedTable, isCounterContext, onUpdateTable],
    );

    const startEditItem = async (index: number) => {
      const item = selectedTable!.items[index];
      setEditingItemIndex(index);
      setTempObs(item.observation || "");
      setTempSeat(item.seat || "Geral");
      setTempQty(item.quantity);
      setLoadingSuggestions(true);
      try {
        const res = await getObservationSuggestions(item.name);
        setSuggestions(res);
      } catch (err) {
        setSuggestions([
          "Sem cebola",
          "Bem passado",
          "Ponto da casa",
          "Sem gelo",
        ]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const saveItemEdit = () => {
      if (!selectedTable || editingItemIndex === null) return;
      const newItems = [...selectedTable.items];
      newItems[editingItemIndex] = {
        ...newItems[editingItemIndex],
        observation: tempObs.trim(),
        seat: tempSeat.trim() || "Geral",
        quantity: tempQty > 0 ? tempQty : 1,
        sentToKitchen: false, // Reset so it can be sent to the kitchen again if edited
      };
      const newTotal = newItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );
      const updated = { ...selectedTable, items: newItems, total: newTotal };
      setSelectedTable(updated);
      onUpdateTable(selectedTable.id, newItems, "occupied", isCounterContext);
      setEditingItemIndex(null);
    };

    const handleCreateCustomer = async () => {
      if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;

      const newCustomer: Partial<Customer> = {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        balance: 0,
        history: [],
        createdAt: new Date(),
      };

      try {
        const created = await onAddCustomer(newCustomer);
        if (created && created.id) {
          setSelectedCustomerId(created.id);
          if (showToast)
            showToast(
              `Cliente ${created.name} selecionado automaticamente!`,
              "success",
            );
        }
      } catch (e) {
        console.error("Erro ao cadastrar cliente inline:", e);
      }

      setNewCustomerName("");
      setNewCustomerPhone("");
      setShowNewCustomerForm(false);
    };

    const handleTransfer = async () => {
      if (!selectedTable || !transferToTableId) return;
      setIsTransferring(true);
      const success = await onTransferTable(
        selectedTable.id,
        transferToTableId,
        isCounterContext,
      );
      if (success) {
        setShowTransferModal(false);
        setTransferToTableId(null);
        setSelectedTable(null);
      }
      setIsTransferring(false);
    };

    const handleSendToKitchenLocal = useCallback(() => {
      if (!selectedTable || selectedTable.items.length === 0) return;

      const unsentItems = selectedTable.items.filter((i) => !i.sentToKitchen);
      if (unsentItems.length === 0) {
        alert("Todos os itens já foram enviados para a cozinha.");
        return;
      }

      setIsSendingToKitchen(true);
      setTimeout(() => {
        onSendToKitchen(selectedTable.id, unsentItems, isCounterContext);

        // Marcar itens como enviados no estado local
        const updatedItems = selectedTable.items.map((item) => ({
          ...item,
          sentToKitchen: true,
        }));

        onUpdateTable(
          selectedTable.id,
          updatedItems,
          "occupied",
          isCounterContext,
        );
        setSelectedTable((prev) =>
          prev ? { ...prev, items: updatedItems } : null,
        );

        setIsSendingToKitchen(false);
        setShowKitchenSuccess(true);
        setTimeout(() => setShowKitchenSuccess(false), 3000);
      }, 1000);
    }, [selectedTable, isCounterContext, onSendToKitchen, onUpdateTable]);

    const openPayment = useCallback(() => {
      if (!selectedTable) return;
      const existingParts = selectedTable.partialPayments || [];
      const totalPaidSoFar = existingParts.reduce((acc, p) => acc + p.amount, 0);
      const baseTotal = selectedTable.total + (isDeliveryOrder && isCounterContext ? parseCurrency(deliveryFeeInput) : 0);

      setSplitParts(existingParts);
      if (existingParts.length > 0) {
        setIsSplitting(true);
      } else {
        setIsSplitting(false);
      }

      setRemainingBalance(Math.max(0, baseTotal - totalPaidSoFar));
      setAdditionalFee(0);
      setAdditionalFeeReason("");
      setShowReasonInput(false);
      setDiscount(0);
      setPaidItemIndices([]);
      setSplitMode(null);
      setIsFiscalEmission(adminSettings.fiscal?.autoIssueNfce || false);
      setAutoCloseAfterPayment(true);
      setShowPaymentModal(true);
    }, [
      selectedTable,
      isDeliveryOrder,
      isCounterContext,
      deliveryFeeInput,
      adminSettings.fiscal?.autoIssueNfce,
    ]);

    const handleSetAdditionalFeeValue = (valStr: string) => {
      const val = parseFloat(valStr) || 0;
      const diff = val - additionalFee;
      setAdditionalFee(val);
      setRemainingBalance((prev) => Math.max(0, prev + diff));
    };

    const handleSetDiscountValue = (valStr: string) => {
      const val = parseFloat(valStr) || 0;
      const diff = val - discount;
      setDiscount(val);
      setRemainingBalance((prev) => Math.max(0, prev - diff));
    };

    useEffect(() => {
      if (
        isDeliveryOrder &&
        (deliveryFeeInput === "0" || deliveryFeeInput === "0,00") &&
        defaultDeliveryFee > 0
      ) {
        setDeliveryFeeInput(defaultDeliveryFee.toFixed(2).replace(".", ","));
      }
    }, [isDeliveryOrder, defaultDeliveryFee, deliveryFeeInput]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (showCustomerSelection) setShowCustomerSelection(false);
          else if (showChangeModal) setShowChangeModal(false);
          else if (showPaymentModal) setShowPaymentModal(false);
          else if (editingItemIndex !== null) setEditingItemIndex(null);
          else if (showCashModal) setShowCashModal(false);
          else if (selectedTable) {
            setSelectedTable(null);
          }
          return;
        }

        if (!selectedTable) return;

        if (e.key === "F1") {
          e.preventDefault();
          if (selectedTable.items.length > 0 && !showPaymentModal)
            openPayment();
        }
        if (e.key === "F2") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        if (e.key === "F4") {
          e.preventDefault();
          if (selectedTable.items.length > 0 && !isSendingToKitchen)
            handleSendToKitchenLocal();
        }
        if (e.key === "F9") {
          e.preventDefault();
          if (selectedTable.items.length > 0 && !showPaymentModal)
            openPayment();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
      selectedTable,
      showPaymentModal,
      editingItemIndex,
      showCashModal,
      showChangeModal,
      showCustomerSelection,
      openPayment,
    ]);

    const handleProcessPayment = (method: PaymentMethod) => {
      if (!selectedTable || isProcessing) return;

      // Encontrar configuração para esta forma de pagamento
      const config = adminSettings.paymentMethods?.find(
        (m) => m.name === method || m.id === method,
      );
      const methodType = config?.type;

      // Determinar o valor a ser pago nesta etapa
      const amountToPay = isSplitting
        ? splitMode === "value"
          ? parseFloat(customSplitValue) || remainingBalance
          : splitMode === "items"
            ? selectedSplitItems.reduce(
                (acc, idx) =>
                  acc +
                  selectedTable.items[idx].price *
                    selectedTable.items[idx].quantity,
                0,
              )
            : remainingBalance
        : (customSplitValue && parseFloat(customSplitValue) > 0 && parseFloat(customSplitValue) < remainingBalance - 0.01)
          ? parseFloat(customSplitValue)
          : remainingBalance;

      if (method === "dinheiro" || methodType === "cash") {
        setSelectedPaymentMethod(method);
        setAmountReceived("");
        setShowChangeModal(true);
        return;
      }

      if (method === "conta_cliente" || methodType === "account") {
        setShowCustomerSelection(true);
        return;
      }

      // Se o valor for menor que o saldo remanescente OU se autoCloseAfterPayment estiver desativado (apenas para mesas), tratar como pagamento parcial/fração
      if (amountToPay < remainingBalance - 0.01 || (!autoCloseAfterPayment && !isCounterContext)) {
        const newPart: SplitPart = {
          id: Math.random().toString(36).substr(2, 9),
          amount: amountToPay,
          method: method,
          isPaid: true,
          items:
            splitMode === "items"
              ? selectedSplitItems.map((idx) => selectedTable.items[idx])
              : undefined,
        };
        const newRemaining = Math.max(0, remainingBalance - amountToPay);
        const updatedParts = [...splitParts, newPart];

        if (!isSplitting) setIsSplitting(true);

        setSplitParts(updatedParts);
        setRemainingBalance(newRemaining);

        if (splitMode === "items") {
          setPaidItemIndices([...paidItemIndices, ...selectedSplitItems]);
        }

        setSplitMode(null);
        setSelectedSplitItems([]);
        setCustomSplitValue("");

        // Persistir pagamento parcial no objeto da mesa
        const updatedTable = { ...selectedTable, partialPayments: updatedParts };
        setSelectedTable(updatedTable);
        onUpdateTable(selectedTable.id, selectedTable.items, "occupied", isCounterContext, updatedParts);

        if (newRemaining <= 0.01) {
          if (autoCloseAfterPayment || isCounterContext) {
            finishSplitPayment(updatedParts);
          } else {
            if (showToast)
              showToast(
                "Pagamento registrado! Mesa mantida aberta para emissão de cupons.",
                "success",
              );
          }
        } else {
          if (showToast) {
            showToast(`Pagamento parcial de R$ ${amountToPay.toFixed(2)} registrado! Mesa mantida aberta (Saldo rest: R$ ${newRemaining.toFixed(2)}).`, "success");
          }
        }
        return;
      }

      // Pagamento total (ou última parte)
      setIsProcessing(true);
      const deliveryInfo = isCounterContext
        ? {
            address: isDeliveryOrder ? deliveryAddress : "",
            fee: isDeliveryOrder ? parseCurrency(deliveryFeeInput) : 0,
            name: customerName,
            phone: customerPhone,
          }
        : undefined;

      setTimeout(() => {
        const finalPayments = isSplitting
          ? [
              ...splitParts.map((p) => ({
                method: p.method,
                amount: p.amount,
                customerId: p.customerId,
              })),
              { method, amount: amountToPay },
            ]
          : [
              {
                method,
                amount:
                  selectedTable.total +
                  (isDeliveryOrder && isCounterContext
                    ? parseCurrency(deliveryFeeInput)
                    : 0) +
                  additionalFee -
                  discount,
              },
            ];

        handleOrderCompletion(
          method,
          isFiscalEmission,
          undefined,
          isCounterContext,
          deliveryInfo,
          isFiscalEmission ? customerDocumentInput : undefined,
          finalPayments,
        );
        setIsProcessing(false);
        setShowPaymentModal(false);
        setSelectedTable(null);
        setIsDeliveryOrder(false);
        setDeliveryAddress("");
        setDeliveryFeeInput("0");
        setCustomerName("");
        setCustomerPhone("");
        setIsSplitting(false);
        setSplitParts([]);
      }, 1500);
    };

    const finishCashPayment = () => {
      if (!selectedTable || !selectedPaymentMethod || isProcessing) return;
      const received = parseCurrency(amountReceived);
      const amountToPay = isSplitting
        ? splitMode === "value"
          ? parseFloat(customSplitValue) || remainingBalance
          : splitMode === "items"
            ? selectedSplitItems.reduce(
                (acc, idx) =>
                  acc +
                  selectedTable.items[idx].price *
                    selectedTable.items[idx].quantity,
                0,
              )
            : remainingBalance
        : selectedTable.total +
          (isDeliveryOrder && isCounterContext
            ? parseCurrency(deliveryFeeInput)
            : 0) +
          additionalFee -
          discount;

      if (received < amountToPay) {
        alert("Valor recebido é menor que o total!");
        return;
      }

      if (amountToPay < remainingBalance - 0.01 || (!autoCloseAfterPayment && !isCounterContext)) {
        const newPart: SplitPart = {
          id: Math.random().toString(36).substr(2, 9),
          amount: amountToPay,
          method: "dinheiro",
          isPaid: true,
          items:
            splitMode === "items"
              ? selectedSplitItems.map((idx) => selectedTable.items[idx])
              : undefined,
        };
        const newRemaining = Math.max(0, remainingBalance - amountToPay);
        const updatedParts = [...splitParts, newPart];
        setSplitParts(updatedParts);
        setRemainingBalance(newRemaining);

        if (splitMode === "items") {
          setPaidItemIndices([...paidItemIndices, ...selectedSplitItems]);
        }

        setSplitMode(null);
        setSelectedSplitItems([]);
        setCustomSplitValue("");
        setShowChangeModal(false);

        if (!isSplitting) setIsSplitting(true);

        // Persistir pagamento parcial na mesa
        const updatedTable = { ...selectedTable, partialPayments: updatedParts };
        setSelectedTable(updatedTable);
        onUpdateTable(selectedTable.id, selectedTable.items, "occupied", isCounterContext, updatedParts);

        if (newRemaining <= 0.01) {
          if (autoCloseAfterPayment || isCounterContext) {
            finishSplitPayment(updatedParts);
          } else {
            if (showToast)
              showToast(
                "Pagamento em dinheiro registrado! Mesa mantida aberta para emissão de cupons.",
                "success",
              );
          }
        } else {
          if (showToast) {
            showToast(`Pagamento em dinheiro de R$ ${amountToPay.toFixed(2)} registrado! Mesa mantida aberta (Saldo rest: R$ ${newRemaining.toFixed(2)}).`, "success");
          }
        }
        return;
      }

      setIsProcessing(true);
      const deliveryInfo = isCounterContext
        ? {
            address: isDeliveryOrder ? deliveryAddress : "",
            fee: isDeliveryOrder ? parseCurrency(deliveryFeeInput) : 0,
            name: customerName,
            phone: customerPhone,
          }
        : undefined;
      setTimeout(() => {
        handleOrderCompletion(
          "dinheiro",
          isFiscalEmission,
          undefined,
          isCounterContext,
          deliveryInfo,
          isFiscalEmission ? customerDocumentInput : undefined,
          undefined,
          received,
        );
        setIsProcessing(false);
        setShowChangeModal(false);
        setShowPaymentModal(false);
        setSelectedTable(null);
        setIsDeliveryOrder(false);
        setDeliveryAddress("");
        setDeliveryFeeInput("0");
      }, 1000);
    };

    const finishSplitPayment = (finalParts?: SplitPart[]) => {
      if (isProcessing) return;
      setIsProcessing(true);
      const partsToUse = finalParts || splitParts;
      if (partsToUse.length === 0) return;

      const mainMethod = [...partsToUse].sort((a, b) => b.amount - a.amount)[0]
        .method;
      const deliveryInfo = isCounterContext
        ? {
            address: isDeliveryOrder ? deliveryAddress : "",
            fee: isDeliveryOrder ? parseCurrency(deliveryFeeInput) : 0,
            name: customerName,
            phone: customerPhone,
          }
        : undefined;
      setTimeout(() => {
        handleOrderCompletion(
          mainMethod,
          isFiscalEmission,
          selectedCustomerId || undefined,
          isCounterContext,
          deliveryInfo,
          isFiscalEmission ? customerDocumentInput : undefined,
          partsToUse.map((p) => ({
            method: p.method,
            amount: p.amount,
            customerId: p.customerId,
            isFiscalIssued: p.isFiscalIssued,
            fiscalKey: p.fiscalKey,
            customerDocument: p.customerDocument,
          })),
        );
        setIsProcessing(false);
        setShowPaymentModal(false);
        setSelectedTable(null);
        setIsSplitting(false);
        setSplitParts([]);
        setIsDeliveryOrder(false);
        setDeliveryAddress("");
        setDeliveryFeeInput("0");
        setSelectedCustomerId("");
      }, 2000);
    };

    const handleEmitPartialFiscal = async (partId: string) => {
      if (!selectedTable) return;
      const part = splitParts.find((p) => p.id === partId);
      if (!part) return;

      setIssuingPartId(partId);
      const doc = partDocumentInputs[partId] || "";

      try {
        const virtualOrder = {
          id: `${selectedTable.id}-${partId}`,
          tableNumber: selectedTable.number,
          items: part.items || [
            {
              productId: "consumo-parcial",
              name: "Consumo Parcial de Mesa",
              price: part.amount,
              quantity: 1,
              total: part.amount,
            },
          ],
          total: part.amount,
          type: "table" as const,
          status: "delivered" as const,
          paymentMethod: part.method,
          tenantId: tenantId || "t1",
          createdAt: new Date(),
        };

        const response = await fetch("/api/fiscal/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order: virtualOrder,
            settings: adminSettings.fiscal,
            customerDocument: doc || undefined,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const key = result.nfeKey || result.accessKey;
            setSplitParts((prev) =>
              prev.map((p) => {
                if (p.id === partId) {
                  return {
                    ...p,
                    isFiscalIssued: true,
                    fiscalKey: key,
                    customerDocument: doc,
                  };
                }
                return p;
              }),
            );
            if (showToast) {
              showToast(
                `NFC-e parcial emitida com sucesso: ${key.substring(0, 10)}...`,
                "success",
              );
            }
          } else {
            alert(
              `Erro SEFAZ ao emitir nota da parte: ${result.error || "Erro desconhecido"}`,
            );
          }
        } else {
          alert("Erro ao se conectar com o serviço fiscal.");
        }
      } catch (err: any) {
        console.error(err);
        alert(
          "Erro inesperado ao gerar a nota fiscal da parte: " + err.message,
        );
      } finally {
        setIssuingPartId(null);
      }
    };

    const finishFiadoPayment = () => {
      if (!selectedTable || !selectedCustomerId || isProcessing) return;

      const amountToPay = isSplitting
        ? splitMode === "value"
          ? parseFloat(customSplitValue) || remainingBalance
          : splitMode === "items"
            ? selectedSplitItems.reduce(
                (acc, idx) =>
                  acc +
                  selectedTable.items[idx].price *
                    selectedTable.items[idx].quantity,
                0,
              )
            : remainingBalance
        : remainingBalance;

      if (amountToPay < remainingBalance - 0.01 || !autoCloseAfterPayment) {
        const newPart: SplitPart = {
          id: Math.random().toString(36).substr(2, 9),
          amount: amountToPay,
          method: "conta_cliente",
          isPaid: true,
          customerId: selectedCustomerId,
          items:
            splitMode === "items"
              ? selectedSplitItems.map((idx) => selectedTable.items[idx])
              : undefined,
        };
        const newRemaining = Math.max(0, remainingBalance - amountToPay);
        const updatedParts = [...splitParts, newPart];

        setSplitParts(updatedParts);
        setRemainingBalance(newRemaining);

        if (splitMode === "items") {
          setPaidItemIndices([...paidItemIndices, ...selectedSplitItems]);
        }

        setSplitMode(null);
        setSelectedSplitItems([]);
        setCustomSplitValue("");
        setShowCustomerSelection(false);

        if (!isSplitting) setIsSplitting(true);

        // Persistir pagamento parcial na mesa
        const updatedTable = { ...selectedTable, partialPayments: updatedParts };
        setSelectedTable(updatedTable);
        onUpdateTable(selectedTable.id, selectedTable.items, "occupied", isCounterContext, updatedParts);

        if (newRemaining <= 0.01) {
          if (autoCloseAfterPayment) {
            finishSplitPayment(updatedParts);
          } else {
            if (showToast)
              showToast(
                "Lançamento fiado registrado! Mesa mantida aberta para emissão de cupons.",
                "success",
              );
          }
        } else {
          if (showToast) {
            showToast(`Lançamento de R$ ${amountToPay.toFixed(2)} registrado! Mesa mantida aberta (Saldo rest: R$ ${newRemaining.toFixed(2)}).`, "success");
          }
        }
        return;
      }

      setIsProcessing(true);
      const deliveryInfo = isCounterContext
        ? {
            address: isDeliveryOrder ? deliveryAddress : "",
            fee: isDeliveryOrder ? parseCurrency(deliveryFeeInput) : 0,
            name: customerName,
            phone: customerPhone,
          }
        : undefined;
      setTimeout(() => {
        const finalPayments = isSplitting
          ? [
              ...splitParts.map((p) => ({
                method: p.method,
                amount: p.amount,
                customerId: p.customerId,
              })),
              {
                method: "conta_cliente" as PaymentMethod,
                amount: amountToPay,
                customerId: selectedCustomerId,
              },
            ]
          : undefined;

        handleOrderCompletion(
          "conta_cliente",
          isFiscalEmission,
          selectedCustomerId,
          isCounterContext,
          deliveryInfo,
          isFiscalEmission ? customerDocumentInput : undefined,
          finalPayments,
        );
        setIsProcessing(false);
        setShowCustomerSelection(false);
        setShowPaymentModal(false);
        setSelectedTable(null);
        setSelectedCustomerId("");
        setCustomerSearch("");
        setIsDeliveryOrder(false);
        setDeliveryAddress("");
        setDeliveryFeeInput("0");
        setIsSplitting(false);
        setSplitParts([]);
      }, 1500);
    };

    const toggleSplitItem = (idx: number) => {
      setSelectedSplitItems((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
      );
    };

    const filteredProducts = useMemo(() => {
      return products.filter((p) => {
        if (p.active === false) return false;

        // Filter by channel
        if (!isCounterContext) {
          if (p.isAvailableDineIn === false) return false;
        } else {
          if (isDeliveryOrder) {
            if (p.isAvailableDelivery === false) return false;
          } else {
            // Pickup/Counter
            if (p.isAvailableOnline === false) return false;
          }
        }

        // Hide products of hidden categories
        const hidden = digitalMenuSettings.hiddenCategories || [];
        if (hidden.includes(p.category)) return false;

        const matchesSearch = p.name
          .toLowerCase()
          .includes(productSearch.toLowerCase());
        if (selectedCategory === "FAVORITOS") {
          // Simula favoritos pegando os primeiros 8 produtos ou os que tem estoque baixo
          return matchesSearch && products.indexOf(p) < 8;
        }
        const matchesCategory = p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });
    }, [
      products,
      productSearch,
      selectedCategory,
      isCounterContext,
      isDeliveryOrder,
      digitalMenuSettings.hiddenCategories,
    ]);

    const categories = useMemo(() => {
      const cats = Array.from(new Set(products.map((p) => p.category)));
      const order = digitalMenuSettings.categoryOrder || [];
      const hidden = digitalMenuSettings.hiddenCategories || [];

      // Sort categories based on categoryOrder, then add any remaining ones
      const sortedCats = [...order.filter((c) => cats.includes(c))];
      cats.forEach((c) => {
        if (!sortedCats.includes(c)) sortedCats.push(c);
      });

      // Filtra as categorias ocultadas pelo marcador
      const filteredCats = sortedCats.filter((c) => !hidden.includes(c));

      const finalCats = ["FAVORITOS", ...filteredCats];

      if (
        finalCats.length > 0 &&
        (!selectedCategory || hidden.includes(selectedCategory))
      ) {
        setSelectedCategory(finalCats[0]);
      }

      return finalCats;
    }, [
      products,
      digitalMenuSettings.categoryOrder,
      digitalMenuSettings.hiddenCategories,
    ]);

    return (
      <div className="space-y-2">
        {/* Barra de Gestão Superior */}
        <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-2 rounded-xl border shadow-sm gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCashModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all shadow-md ${cashSession.isOpen ? "bg-emerald-500 text-white shadow-emerald-100" : "bg-rose-500 text-white shadow-rose-100"}`}
            >
              {cashSession.isOpen ? <Unlock size={14} /> : <Lock size={14} />}
              Caixa {cashSession.isOpen ? "Aberto" : "Fechado"}
            </button>

            {cashSession.isOpen && (
              <div className="hidden sm:flex gap-2">
                <div className="text-left border-l pl-2">
                  <p className="text-[7px] font-black text-slate-400 uppercase">
                    Fundo Inicial
                  </p>
                  <p className="font-black text-slate-700 text-[10px]">
                    R$ {cashSession.openingValue.toFixed(2)}
                  </p>
                </div>
                <div className="text-left border-l pl-2">
                  <p className="text-[7px] font-black text-slate-400 uppercase">
                    Vendas Atual
                  </p>
                  <p className="font-black text-indigo-600 text-[10px]">
                    R$ {(cashReport?.totalSales || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-1.5 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-36">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={12}
              />
              <input
                type="text"
                placeholder="Pesquisar mesa..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-[10px]"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowManageTablesModal(true)}
              className="flex items-center gap-1.5 bg-white text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm"
            >
              <Users size={12} /> Gerenciar Mesas
            </button>
            <button
              onClick={handleNewCounter}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
              <Store size={12} /> Novo Balcão
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1.5 flex items-center gap-1.5">
              <Utensils size={10} /> Mapa de Mesas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
              {filteredTables.map((table) => (
                <button
                  key={
                    (table as any).docId ||
                    (table as any)._firestoreId ||
                    table.id
                  }
                  onClick={() => openTable(table)}
                  disabled={table.status === "cleaning"}
                  className={`aspect-square p-1.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-0.5 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${getTableStatusColor(table.status)} shadow-sm`}
                >
                  <div className="text-current">
                    {table.status === "available" ? (
                      <Utensils size={16} />
                    ) : table.status === "occupied" ? (
                      <Users size={16} />
                    ) : table.status === "billing" ? (
                      <CreditCard size={16} />
                    ) : (
                      <Utensils size={16} className="animate-spin" />
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-black">Mesa {table.number}</h3>
                    <p className="text-[6px] uppercase font-black tracking-widest opacity-60">
                      {table.status}
                    </p>
                  </div>
                  {table.total > 0 && (
                    <div className="mt-0.5 text-[8px] font-black bg-white/60 px-1 py-0.5 rounded-md shadow-sm">
                      R$ {table.total.toFixed(2)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {counterOrders.length > 0 && (
            <div>
              <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1.5 flex items-center gap-1.5">
                <Store size={10} /> Comandas de Balcão Ativas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
                {counterOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => openCounterOrder(order)}
                    className="flex items-center justify-between p-1.5 bg-white rounded-lg border-2 border-slate-100 hover:border-indigo-600 transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 bg-indigo-50 text-indigo-600 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <ShoppingBag size={14} />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-800 text-[10px]">
                          Balcão #{order.id.toString().slice(-4)}
                        </p>
                        <p className="text-[6px] font-bold text-slate-400 uppercase">
                          {order.items.length} itens
                        </p>
                      </div>
                    </div>
                    <p className="font-black text-indigo-600 text-[10px]">
                      R$ {order.total.toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal: Caixa */}
        {showCashModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div
                className={`p-4 border-b flex justify-between items-center text-white shrink-0 ${cashSession.isOpen ? "bg-indigo-600" : lastClosingReport ? "bg-emerald-600" : "bg-rose-500"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl shadow-inner">
                    {cashSession.isOpen ? (
                      <Unlock size={20} />
                    ) : lastClosingReport ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Lock size={20} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-black">
                      {cashSession.isOpen
                        ? "Fechamento de Caixa"
                        : lastClosingReport
                          ? "Resumo do Fechamento"
                          : "Abertura de Caixa"}
                    </h2>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                      {cashSession.isOpen
                        ? "Conferência de Vendas"
                        : lastClosingReport
                          ? "Turno Encerrado com Sucesso"
                          : "Fundo de troco"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCashModal(false);
                    setLastClosingReport(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                {isClosingCash ? (
                  <div className="h-full flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">
                      Processando Fechamento...
                    </p>
                  </div>
                ) : lastClosingReport ? (
                  <div className="space-y-6 py-4">
                    <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 text-center space-y-2">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        Saldo Final em Dinheiro
                      </p>
                      <h3 className="text-4xl font-black text-emerald-700 tracking-tighter">
                        R$ {lastClosingReport.actualValue.toFixed(2)}
                      </h3>
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase ${lastClosingReport.difference >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {lastClosingReport.difference >= 0 ? "Sobra" : "Quebra"}
                        : R$ {Math.abs(lastClosingReport.difference).toFixed(2)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Resumo por Método
                      </p>
                      <div className="bg-white border rounded-2xl overflow-hidden divide-y divide-slate-100">
                        {Object.entries(
                          lastClosingReport.salesByMethod || {},
                        ).map(([method, amount]: [any, any]) => (
                            <div
                              key={method}
                              onClick={() => {
                                setSelectedMethodReport({
                                  id: method,
                                  label: getPaymentMethodLabel(method),
                                });
                                setMethodReportSearch("");
                              }}
                              className="flex justify-between items-center p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
                              title="Clique para ver os pedidos"
                            >
                              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                                {getPaymentMethodLabel(method)}
                                <ChevronRight size={12} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                              </span>
                              <span className="text-[11px] font-black text-slate-800">
                                R$ {Number(amount).toFixed(2)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-[10px] font-bold text-slate-500">
                      <div className="flex justify-between">
                        <span>Aberto em:</span>
                        <span className="text-slate-700">
                          {lastClosingReport.openedAt instanceof Date
                            ? lastClosingReport.openedAt.toLocaleString()
                            : new Date(
                                lastClosingReport.openedAt,
                              ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fechado em:</span>
                        <span className="text-slate-700">
                          {lastClosingReport.closedAt instanceof Date
                            ? lastClosingReport.closedAt.toLocaleString()
                            : new Date(
                                lastClosingReport.closedAt,
                              ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Operador:</span>
                        <span className="text-slate-700">
                          {lastClosingReport.closedBy}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowCashModal(false);
                        setLastClosingReport(null);
                        if (onNavigate) onNavigate("finance");
                      }}
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center"
                    >
                      Concluir e Ir para o Menu Caixa{" "}
                      <ArrowRight size={14} className="ml-2" />
                    </button>
                  </div>
                ) : !cashSession.isOpen ? (
                  <div className="space-y-4 text-center py-6">
                    <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">
                      Valor de Fundo Inicial / Troco
                    </p>
                    <div className="relative max-w-[240px] mx-auto">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-3xl font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-center"
                        value={openingValueInput}
                        onChange={(e) =>
                          setOpeningValueInput(formatCurrency(e.target.value))
                        }
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => {
                        const numVal = parseCurrency(openingValueInput);
                        onOpenCash(numVal || 0);
                        setShowCashModal(false);
                      }}
                      className="w-full max-w-[240px] bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all"
                    >
                      Confirmar Abertura
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => {
                          setSelectedMethodReport({
                            id: "all",
                            label: "Todas as Vendas do Turno",
                            icon: ShoppingBag,
                          });
                          setMethodReportSearch("");
                        }}
                        className="bg-slate-50 hover:bg-indigo-50/50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group"
                        title="Clique para ver os pedidos"
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">
                            Total Vendido
                          </p>
                          <ChevronRight size={12} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tighter">
                          R$ {(cashReport?.totalSales || 0).toFixed(2)}
                        </h4>
                        <p className="text-[8px] font-bold text-indigo-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          Clique para ver {cashReport?.count || 0} pedido(s)
                        </p>
                      </div>

                      <div
                        onClick={() => {
                          setSelectedMethodReport({
                            id: "dinheiro",
                            label: "Dinheiro (Vendas do Turno)",
                            icon: Banknote,
                            color: "text-emerald-500",
                            bg: "bg-emerald-50",
                          });
                          setMethodReportSearch("");
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100/60 p-4 rounded-2xl border border-emerald-100 hover:border-emerald-200 transition-all cursor-pointer group"
                        title="Clique para ver os pedidos em dinheiro"
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                            Saldo em Dinheiro (Gaveta)
                          </p>
                          <ChevronRight size={12} className="text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <h4 className="text-lg font-black text-emerald-700 tracking-tighter">
                          R$ {(cashReport?.expectedFinalValue || 0).toFixed(2)}
                        </h4>
                        <p className="text-[8px] font-bold text-emerald-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          Clique para ver os pedidos em dinheiro
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          Resumo da Gaveta
                        </p>
                        <span className="text-[9px] font-bold text-slate-400">
                          Abertura: R$ {cashSession.openingValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div
                          onClick={() => {
                            setSelectedMethodReport({
                              id: "dinheiro",
                              label: "Vendas em Dinheiro",
                              icon: Banknote,
                              color: "text-emerald-500",
                              bg: "bg-emerald-50",
                            });
                            setMethodReportSearch("");
                          }}
                          className="flex justify-between text-[11px] font-bold hover:bg-slate-100/80 p-1 rounded-lg cursor-pointer transition-colors group"
                          title="Clique para ver os pedidos em dinheiro"
                        >
                          <span className="text-slate-500 flex items-center gap-1 group-hover:text-indigo-600">
                            Vendas em Dinheiro:
                            <ChevronRight size={10} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                          </span>
                          <span className="text-slate-800 font-black">
                            R$ {(cashReport?.totalsByMethod?.dinheiro || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-emerald-600">
                            Suprimentos (+):
                          </span>
                          <span className="text-emerald-700">
                            R$ {(cashReport?.cashIncomes || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-rose-600">Sangrias (-):</span>
                          <span className="text-rose-700">
                            R$ {(cashReport?.cashExpenses || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setMovementType("income");
                          setMovementAmount("");
                          setMovementReason("");
                          setShowMovementsModal(true);
                        }}
                        className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                      >
                        <ArrowDownCircle size={14} /> Suprimento (+)
                      </button>
                      <button
                        onClick={() => {
                          setMovementType("expense");
                          setMovementAmount("");
                          setMovementReason("");
                          setShowMovementsModal(true);
                        }}
                        className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 transition-all"
                      >
                        <ArrowUpCircle size={14} /> Sangria (-)
                      </button>
                    </div>

                    {cashReport && cashReport.sessionRecords.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                          <History size={14} /> Movimentações do Turno
                        </h3>
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100 max-h-[120px] overflow-y-auto custom-scrollbar">
                          {cashReport.sessionRecords
                            .filter(
                              (r) =>
                                r.category === "Suprimento" ||
                                r.category === "Sangria",
                            )
                            .map((record) => (
                              <div
                                key={record.id}
                                className="p-3 flex justify-between items-center bg-white/50"
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${record.type === "income" ? "bg-emerald-500" : "bg-rose-500"}`}
                                    />
                                    <span className="text-[10px] font-black text-slate-800 truncate max-w-[200px]">
                                      {record.description}
                                    </span>
                                  </div>
                                  <span className="text-[8px] font-bold text-slate-400 ml-3.5">
                                    {record.date instanceof Date
                                      ? record.date.toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : new Date(
                                          record.date,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}{" "}
                                    •
                                    <span className="uppercase ml-1">
                                      {record.category}
                                    </span>
                                  </span>
                                </div>
                                <span
                                  className={`text-[10px] font-black ${record.type === "income" ? "text-emerald-500" : "text-rose-500"}`}
                                >
                                  {record.type === "income" ? "+" : "-"} R${" "}
                                  {record.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                        <PieChart size={14} /> Detalhamento por Meio de
                        Pagamento
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          {
                            id: "dinheiro",
                            label: "Dinheiro",
                            icon: Banknote,
                            color: "text-emerald-500",
                            bg: "bg-emerald-50",
                          },
                          {
                            id: "pix",
                            label: "PIX",
                            icon: Smartphone,
                            color: "text-indigo-500",
                            bg: "bg-indigo-50",
                          },
                          {
                            id: "cartao_credito",
                            label: "C. Crédito",
                            icon: CardIcon,
                            color: "text-blue-500",
                            bg: "bg-blue-50",
                          },
                          {
                            id: "cartao_debito",
                            label: "C. Débito",
                            icon: CardIcon,
                            color: "text-sky-500",
                            bg: "bg-sky-50",
                          },
                          {
                            id: "vale_refeicao",
                            label: "Ticket / VR",
                            icon: Landmark,
                            color: "text-amber-500",
                            bg: "bg-amber-50",
                          },
                          {
                            id: "conta_cliente",
                            label: "Fiado",
                            icon: UserCircle,
                            color: "text-rose-500",
                            bg: "bg-rose-50",
                          },
                        ].map((method) => (
                          <div
                            key={method.id}
                            onClick={() => {
                              setSelectedMethodReport({
                                id: method.id,
                                label: method.label,
                                icon: method.icon,
                                color: method.color,
                                bg: method.bg,
                              });
                              setMethodReportSearch("");
                            }}
                            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-300 hover:bg-slate-50/80 transition-all cursor-pointer group active:scale-[0.99]"
                            title={`Clique para ver os pedidos pagos com ${method.label}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-xl ${method.bg} ${method.color} group-hover:scale-110 transition-transform`}
                              >
                                <method.icon size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 text-xs flex items-center gap-1">
                                  {method.label}
                                  <ChevronRight size={12} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                                </p>
                                <span className="text-[9px] font-semibold text-slate-400">
                                  Ver pedidos
                                </span>
                              </div>
                            </div>
                            <p className="font-black text-slate-800 text-sm">
                              R${" "}
                              {cashReport?.totalsByMethod[
                                method.id as keyof typeof cashReport.totalsByMethod
                              ].toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-white rounded-2xl shadow-sm border">
                          <DollarSign className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">
                            Fundo Inicial de Troco
                          </p>
                          <p className="font-black text-slate-800">
                            R$ {cashSession.openingValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div
                        onClick={() => {
                          setSelectedMethodReport({
                            id: "electronic",
                            label: "Meios Eletrônicos (PIX + Cartões + VR)",
                            icon: CardIcon,
                            color: "text-indigo-600",
                            bg: "bg-indigo-50",
                          });
                          setMethodReportSearch("");
                        }}
                        className="text-right cursor-pointer group hover:bg-indigo-50/60 p-2.5 rounded-xl transition-all"
                        title="Clique para ver os pedidos em meios eletrônicos"
                      >
                        <p className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 uppercase flex items-center justify-end gap-1">
                          Meios Eletrônicos
                          <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-all" />
                        </p>
                        <p className="font-black text-slate-800">
                          R$ {(cashReport?.electronicTotal || 0).toFixed(2)}
                        </p>
                        <p className="text-[8px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          Clique para ver
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Valor em Dinheiro para Fechamento (Conferido)
                      </label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">
                          R$
                        </span>
                        <input
                          type="text"
                          className="w-full pl-16 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all"
                          value={closingValueInput}
                          onChange={(e) =>
                            setClosingValueInput(formatCurrency(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Observações do Fechamento (Opcional)
                      </label>
                      <textarea
                        className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all resize-none text-sm"
                        rows={2}
                        placeholder="Ex: Diferença de R$ 2,00 devido a troco..."
                        value={closingObservations}
                        onChange={(e) => setClosingObservations(e.target.value)}
                      />
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-700">
                      <AlertTriangle size={20} className="shrink-0" />
                      <p className="text-[10px] font-bold leading-tight uppercase">
                        Confira os valores na gaveta e no terminal de cartão
                        antes de confirmar o encerramento. Divergências devem
                        ser justificadas no log.
                      </p>
                    </div>

                    <button
                      onClick={handleFullCloseCash}
                      className="w-full bg-rose-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock size={18} /> Encerrar Turno e Gerar Resumo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Relatório de Pedidos por Meio de Pagamento */}
        {selectedMethodReport && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] border border-slate-100 animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm text-indigo-400">
                    {selectedMethodReport.icon ? (
                      <selectedMethodReport.icon size={22} />
                    ) : (
                      <Receipt size={22} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black tracking-tight">
                        Relatório de Pedidos — {selectedMethodReport.label}
                      </h3>
                      <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-500/30">
                        {matchingOrdersForReport.length} {matchingOrdersForReport.length === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                      Conferência detalhada das vendas do turno
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMethodReport(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Summary Banner & Search */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex-1 sm:flex-initial">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Montante Acumulado
                    </p>
                    <p className="text-lg font-black text-emerald-600 tracking-tight">
                      R$ {reportTotalContribution.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, mesa, item..."
                    value={methodReportSearch}
                    onChange={(e) => setMethodReportSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  />
                  {methodReportSearch && (
                    <button
                      onClick={() => setMethodReportSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Orders List Content */}
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                {matchingOrdersForReport.length > 0 ? (
                  matchingOrdersForReport.map(({ order, contribution }) => {
                    const createdDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
                    const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const typeLabel = order.type === 'table' ? `Mesa ${order.tableNumber || ''}` : order.type === 'delivery' ? 'Delivery' : 'Balcão';
                    const typeIcon = order.type === 'table' ? Utensils : order.type === 'delivery' ? Bike : ShoppingBag;
                    const TypeIconComp = typeIcon;

                    return (
                      <div
                        key={order.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all space-y-3"
                      >
                        {/* Header line of Order Card */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                              <TypeIconComp size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                  {typeLabel} {order.customerName ? `• ${order.customerName}` : ''}
                                </span>
                                {order.dailyNumber && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-mono font-bold rounded">
                                    #{order.dailyNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock size={10} /> {timeStr} • ID: {order.id.slice(-6).toUpperCase()}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                              Contribuição ({selectedMethodReport.label.split(' ')[0]})
                            </p>
                            <p className="text-sm font-black text-emerald-600">
                              R$ {contribution.toFixed(2)}
                            </p>
                            {order.total !== contribution && (
                              <p className="text-[8px] font-bold text-slate-400">
                                Total do pedido: R$ {order.total.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Items summary */}
                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Itens do Pedido ({order.items.length})
                          </p>
                          <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px]">
                                <span className="font-bold text-slate-700">
                                  <span className="text-indigo-600 font-black mr-1">{item.quantity}x</span> {item.name}
                                </span>
                                <span className="font-mono text-slate-500 text-[10px]">
                                  R$ {(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payments Breakdown if multiple payments */}
                        {order.payments && order.payments.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                              Pagamentos:
                            </span>
                            {order.payments.map((p, pIdx) => (
                              <span
                                key={pIdx}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                                  getStandardPaymentMethodKey(p.method) === selectedMethodReport.id
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {p.method}: R$ {p.amount.toFixed(2)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Receipt size={40} className="mx-auto opacity-30 animate-pulse" />
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Nenhum pedido encontrado
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 max-w-xs mx-auto">
                      {methodReportSearch
                        ? "Nenhum resultado corresponde à sua pesquisa."
                        : `Não há vendas registradas para "${selectedMethodReport.label}" neste turno.`}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="text-[10px] font-bold text-slate-500">
                  Exibindo <span className="font-black text-slate-800">{matchingOrdersForReport.length}</span> pedido(s)
                </div>
                <button
                  onClick={() => setSelectedMethodReport(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Voltar ao Fechamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmação de Fechamento */}
        {showCloseConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  Confirmar Fechamento?
                </h3>
                <p className="text-sm font-bold text-slate-500 mt-2 leading-relaxed">
                  O caixa será encerrado e todas as mesas serão liberadas. Esta
                  ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleFullCloseCash}
                  disabled={isClosingCash}
                  className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                >
                  {isClosingCash ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Sim, Encerrar Turno
                </button>
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Não, Continuar Aberto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Sangria e Suprimento */}
        {showMovementsModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div
                className={`p-8 border-b flex justify-between items-center ${movementType === "income" ? "bg-emerald-50/50" : "bg-rose-50/50"}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-2xl text-white shadow-lg ${movementType === "income" ? "bg-emerald-600" : "bg-rose-600"}`}
                  >
                    {movementType === "income" ? (
                      <ArrowDownCircle size={24} />
                    ) : (
                      <ArrowUpCircle size={24} />
                    )}
                  </div>
                  <div>
                    <h2
                      className={`text-xl font-black ${movementType === "income" ? "text-emerald-700" : "text-rose-700"}`}
                    >
                      {movementType === "income" ? "Suprimento" : "Sangria"}
                    </h2>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      {movementType === "income"
                        ? "Entrada de Dinheiro na Gaveta"
                        : "Retirada de Dinheiro da Gaveta"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMovementsModal(false)}
                  className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Valor do Movimento
                  </label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">
                      R$
                    </span>
                    <input
                      type="text"
                      className="w-full pl-16 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-3xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all"
                      value={movementAmount}
                      onChange={(e) =>
                        setMovementAmount(formatCurrency(e.target.value))
                      }
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Motivo / Descrição
                  </label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder={
                      movementType === "income"
                        ? "Ex: Troco inicial extra"
                        : "Ex: Pagamento fornecedor"
                    }
                  />
                </div>

                <div
                  className={`p-4 rounded-2xl flex gap-3 text-xs font-bold ${movementType === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                >
                  <AlertTriangle size={16} className="shrink-0" />
                  <p>
                    Este valor será{" "}
                    {movementType === "income" ? "somado ao" : "subtraído do"}{" "}
                    saldo esperado em dinheiro na gaveta durante o fechamento de
                    caixa.
                  </p>
                </div>
              </div>

              <div className="p-8 border-t bg-slate-50 flex gap-4">
                <button
                  onClick={() => setShowMovementsModal(false)}
                  className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmMovement}
                  className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-2 ${movementType === "income" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-rose-600 hover:bg-rose-700 shadow-rose-100"}`}
                >
                  <Check size={18} /> Confirmar{" "}
                  {movementType === "income" ? "Entrada" : "Retirada"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Troco */}
        {showChangeModal && selectedTable && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b flex justify-between items-center bg-emerald-50/50">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg">
                    <Banknote size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">
                      Pagamento em Dinheiro
                    </h2>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      Cálculo de Troco
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!isProcessing) setShowChangeModal(false);
                  }}
                  disabled={isProcessing}
                  className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors disabled:opacity-30"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Valor a Pagar
                  </p>
                  <h3 className="text-3xl font-black text-slate-800">
                    R${" "}
                    {(isSplitting
                      ? splitMode === "value"
                        ? parseFloat(customSplitValue) || remainingBalance
                        : splitMode === "items"
                          ? selectedSplitItems.reduce(
                              (acc, idx) =>
                                acc +
                                selectedTable.items[idx].price *
                                  selectedTable.items[idx].quantity,
                              0,
                            )
                          : remainingBalance
                      : selectedTable.total +
                        (isDeliveryOrder && isCounterContext
                          ? parseCurrency(deliveryFeeInput)
                          : 0) +
                        additionalFee -
                        discount
                    ).toFixed(2)}
                  </h3>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Valor Recebido
                  </label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">
                      R$
                    </span>
                    <input
                      type="text"
                      className="w-full pl-16 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-3xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all"
                      value={amountReceived}
                      onChange={(e) =>
                        setAmountReceived(formatCurrency(e.target.value))
                      }
                      autoFocus
                    />
                  </div>
                </div>

                {parseCurrency(amountReceived) > 0 && (
                  <div className="p-6 bg-indigo-600 rounded-2xl text-white text-center animate-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                      Troco a Devolver
                    </p>
                    <h3 className="text-4xl font-black tracking-tighter">
                      R${" "}
                      {Math.max(
                        0,
                        parseCurrency(amountReceived) -
                          (isSplitting
                            ? splitMode === "value"
                              ? parseFloat(customSplitValue) || remainingBalance
                              : splitMode === "items"
                                ? selectedSplitItems.reduce(
                                    (acc, idx) =>
                                      acc +
                                      selectedTable.items[idx].price *
                                        selectedTable.items[idx].quantity,
                                    0,
                                  )
                                : remainingBalance
                            : selectedTable.total +
                              (isDeliveryOrder && isCounterContext
                                ? parseCurrency(deliveryFeeInput)
                                : 0) +
                              additionalFee -
                              discount),
                      ).toFixed(2)}
                    </h3>
                  </div>
                )}
              </div>

              <div className="p-8 border-t bg-slate-50 flex gap-4">
                <button
                  onClick={() => {
                    if (!isProcessing) setShowChangeModal(false);
                  }}
                  disabled={isProcessing}
                  className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs disabled:opacity-30"
                >
                  Cancelar
                </button>
                <button
                  onClick={finishCashPayment}
                  disabled={
                    isProcessing ||
                    parseCurrency(amountReceived) <
                      (isSplitting
                        ? splitMode === "value"
                          ? parseFloat(customSplitValue) || remainingBalance
                          : splitMode === "items"
                            ? selectedSplitItems.reduce(
                                (acc, idx) =>
                                  acc +
                                  selectedTable.items[idx].price *
                                    selectedTable.items[idx].quantity,
                                0,
                              )
                            : remainingBalance
                        : selectedTable.total +
                          (isDeliveryOrder && isCounterContext
                            ? parseCurrency(deliveryFeeInput)
                            : 0) +
                          additionalFee -
                          discount)
                  }
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Check size={18} />
                  )}
                  {isProcessing ? "Processando..." : "Confirmar Recebimento"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirmação de Cancelamento */}
        {showTransferModal && selectedTable && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <ArrowRightLeft size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">
                      Transferir Mesa
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Mesa {selectedTable.id} para...
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1 custom-scrollbar">
                {tables
                  .filter((t) => t.id !== selectedTable.id)
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTransferToTableId(t.id)}
                      disabled={t.status !== "available"}
                      className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                        transferToTableId === t.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-100"
                          : t.status === "available"
                            ? "border-slate-100 bg-white text-slate-600 hover:border-indigo-200"
                            : "border-slate-50 bg-slate-50 text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase opacity-60">
                        Mesa
                      </span>
                      <span className="text-lg font-black leading-none">
                        {t.id}
                      </span>
                      {t.status !== "available" && (
                        <Lock size={10} className="mt-1" />
                      )}
                    </button>
                  ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={!transferToTableId || isTransferring}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isTransferring ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Confirmar Transferência
                </button>
              </div>
            </div>
          </div>
        )}

        {showCancelModal && selectedTable && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b flex justify-between items-center bg-rose-50/50">
                <div className="flex items-center gap-4">
                  <div className="bg-rose-600 p-3 rounded-2xl text-white shadow-lg shadow-rose-100">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-rose-600">
                      Cancelar Venda?
                    </h2>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      {isCounterContext
                        ? "O pedido será excluído permanentemente"
                        : `A Mesa ${selectedTable.id} será liberada`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors"
                  disabled={isCancelling}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Resumo do Pedido
                  </p>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                    {selectedTable.items.length}{" "}
                    {selectedTable.items.length === 1 ? "Item" : "Itens"}
                  </h3>
                  <p className="text-xl font-black text-rose-600 mt-1">
                    R$ {selectedTable.total.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-700">
                  <AlertTriangle size={20} className="shrink-0" />
                  <p className="text-[10px] font-bold leading-tight uppercase">
                    Esta ação não pode ser desfeita.{" "}
                    {isCounterContext
                      ? "O pedido e todos os itens enviados para a cozinha serão removidos."
                      : "A mesa será limpa e ficará disponível para novos clientes."}
                  </p>
                </div>
              </div>

              <div className="p-8 border-t bg-slate-50 flex gap-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs"
                  disabled={isCancelling}
                >
                  Manter Venda
                </button>
                <button
                  onClick={async () => {
                    setIsCancelling(true);
                    try {
                      await onCancelTable(selectedTable.id, isCounterContext);
                      setShowCancelModal(false);
                      setSelectedTable(null);
                    } catch (error) {
                      console.error("Erro ao cancelar:", error);
                    } finally {
                      setIsCancelling(false);
                    }
                  }}
                  disabled={isCancelling}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-100 flex items-center justify-center gap-2 hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {isCancelling ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Comanda (Mesa ou Balcão) - NOVO LAYOUT PDV */}
        {selectedTable && !showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#f8fafc] w-full h-full lg:h-[95vh] lg:w-[98vw] lg:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              {/* Header Superior Estilo Imagem */}
              <div className="bg-white border-b px-4 lg:px-6 py-3 lg:py-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 lg:gap-4">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-600 rounded-lg lg:rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <Store size={20} className="lg:hidden" />
                    <Store size={24} className="hidden lg:block" />
                  </div>
                  <div>
                    <h2 className="text-sm lg:text-xl font-black text-slate-800 flex items-center gap-2">
                      Vender{" "}
                      <span className="bg-indigo-100 text-indigo-700 px-2 lg:px-3 py-0.5 rounded-full text-[8px] lg:text-xs uppercase tracking-widest">
                        {isCounterContext
                          ? "PDV BALCÃO"
                          : `MESA ${selectedTable.id}`}
                      </span>
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-4 lg:gap-8">
                  <div className="hidden sm:flex gap-4 lg:gap-6">
                    <div className="text-center">
                      <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Produtos
                      </p>
                      <p className="text-xs lg:text-base font-black text-slate-700">
                        R$ {selectedTable.total.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center border-l pl-4 lg:pl-6">
                      <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Taxa Serviço
                      </p>
                      <p className="text-xs lg:text-base font-black text-slate-700">
                        R$ 0,00
                      </p>
                    </div>
                  </div>
                  <div className="text-right sm:text-center sm:border-l sm:pl-4 lg:pl-6">
                    <p className="text-[8px] lg:text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      Valor Final
                    </p>
                    <p className="text-sm lg:text-xl font-black text-indigo-600">
                      R${" "}
                      {(
                        selectedTable.total +
                        (isDeliveryOrder ? parseCurrency(deliveryFeeInput) : 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (pdvEditOrder && onCancelPdvEdit) {
                        onCancelPdvEdit();
                      }
                      setSelectedTable(null);
                      setIsCounterContext(false);
                    }}
                    className="p-1 lg:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                  >
                    <X size={20} className="lg:hidden" />
                    <X size={24} className="hidden lg:block" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Coluna Esquerda: Itens do Pedido */}
                <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r flex flex-col shadow-sm h-[200px] sm:h-[250px] lg:h-auto">
                  {isCounterContext &&
                    (adminSettings.isDeliveryEnabled ||
                      adminSettings.isPickupEnabled) && (
                      <div className="p-4 border-b bg-slate-50/50 flex gap-2">
                        {adminSettings.isDeliveryEnabled && (
                          <button
                            onClick={() => setIsDeliveryOrder(true)}
                            className={`flex-1 py-2 border rounded-lg text-[10px] font-black uppercase transition-all ${isDeliveryOrder ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                          >
                            Delivery
                          </button>
                        )}
                        {adminSettings.isPickupEnabled && (
                          <button
                            onClick={() => setIsDeliveryOrder(false)}
                            className={`flex-1 py-2 border rounded-lg text-[10px] font-black uppercase transition-all ${!isDeliveryOrder ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                          >
                            Retirada
                          </button>
                        )}
                      </div>
                    )}

                  {isCounterContext && (
                    <div
                      className={`p-3 lg:p-4 border-b space-y-2 lg:space-y-3 animate-in slide-in-from-top-2 transition-all duration-300 ${isDeliveryOrder ? "bg-indigo-50/50" : "bg-slate-50 border-double border-slate-200"}`}
                    >
                      <div className="grid grid-cols-2 gap-2 relative">
                        <div className="space-y-1">
                          <label
                            className={`text-[8px] font-black uppercase tracking-widest ml-1 ${isDeliveryOrder ? "text-indigo-600" : "text-slate-500"}`}
                          >
                            Nome Cliente
                          </label>
                          <input
                            type="text"
                            className={`w-full px-2 lg:px-3 py-1.5 lg:py-2 bg-white border rounded-lg lg:rounded-xl text-[10px] font-bold outline-none transition-all ${isDeliveryOrder ? "border-indigo-100 focus:border-indigo-500" : "border-slate-200 focus:border-slate-400"}`}
                            placeholder="Nome..."
                            value={customerName}
                            onChange={(e) => {
                              setCustomerName(e.target.value);
                              setShowDeliveryCustomerResults(true);
                              setSelectedDeliveryCustomer(null);
                            }}
                            onFocus={() => setShowDeliveryCustomerResults(true)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label
                            className={`text-[8px] font-black uppercase tracking-widest ml-1 ${isDeliveryOrder ? "text-indigo-600" : "text-slate-500"}`}
                          >
                            Telefone
                          </label>
                          <input
                            type="text"
                            className={`w-full px-2 lg:px-3 py-1.5 lg:py-2 bg-white border rounded-lg lg:rounded-xl text-[10px] font-bold outline-none transition-all ${isDeliveryOrder ? "border-indigo-100 focus:border-indigo-500" : "border-slate-200 focus:border-slate-400"}`}
                            placeholder="(00) 00000-0000"
                            value={customerPhone}
                            onChange={(e) => {
                              setCustomerPhone(maskPhone(e.target.value));
                              setShowDeliveryCustomerResults(true);
                              setSelectedDeliveryCustomer(null);
                            }}
                            onFocus={() => setShowDeliveryCustomerResults(true)}
                          />
                        </div>

                        {/* Resultados da Pesquisa de Cliente */}
                        {showDeliveryCustomerResults &&
                          (customerName || customerPhone) &&
                          !selectedDeliveryCustomer && (
                            <div
                              className={`absolute top-full left-0 right-0 z-[60] bg-white border rounded-xl shadow-xl mt-1 max-h-62 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 ${isDeliveryOrder ? "border-indigo-100" : "border-slate-200"}`}
                            >
                              {deliveryFilteredCustomers.length > 0 ? (
                                <>
                                  {deliveryFilteredCustomers.map((c) => (
                                    <button
                                      key={c.id}
                                      onClick={() => {
                                        setCustomerName(c.name);
                                        setCustomerPhone(c.phone);
                                        setSelectedDeliveryCustomer(c);
                                        setShowDeliveryCustomerResults(false);
                                        if (isDeliveryOrder) {
                                          if (
                                            c.addresses &&
                                            c.addresses.length > 0
                                          ) {
                                            setShowAddressSelector(true);
                                            setDeliveryAddress(c.addresses[0]);
                                          } else if (c.address) {
                                            setDeliveryAddress(c.address);
                                          }
                                        }
                                      }}
                                      className={`w-full text-left px-4 py-2 border-b last:border-0 transition-colors text-slate-700 ${isDeliveryOrder ? "hover:bg-indigo-50/50 border-indigo-50" : "hover:bg-slate-50 border-slate-100"}`}
                                    >
                                      <p className="text-[10px] font-black text-slate-800">
                                        {c.name}
                                      </p>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                        {c.phone || "Sem celular"}
                                      </p>
                                    </button>
                                  ))}
                                  <div className="p-2 bg-slate-50 border-t">
                                    <button
                                      onClick={() =>
                                        setShowDeliveryCustomerResults(false)
                                      }
                                      className={`w-full py-2 text-[8px] font-black uppercase tracking-widest hover:bg-white rounded-lg transition-all ${isDeliveryOrder ? "text-indigo-600" : "text-slate-600"}`}
                                    >
                                      Continuar com dados atuais
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="p-4 text-center">
                                  <p className="text-[10px] font-bold text-slate-400 mb-2">
                                    Nenhum cliente encontrado
                                  </p>
                                  <button
                                    onClick={() =>
                                      setShowDeliveryCustomerResults(false)
                                    }
                                    className={`w-full text-white py-2 rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg ${isDeliveryOrder ? "bg-indigo-600 shadow-indigo-100" : "bg-slate-700"}`}
                                  >
                                    Usar Dados Digitados
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                      </div>

                      {isDeliveryOrder && (
                        <div className="space-y-2 lg:space-y-3 animate-in slide-in-from-top-1">
                          <div className="space-y-1 relative">
                            <div className="flex justify-between items-center">
                              <label className="text-[8px] font-black text-indigo-600 uppercase tracking-widest ml-1">
                                Endereço de Entrega
                              </label>
                              {selectedDeliveryCustomer &&
                                selectedDeliveryCustomer.addresses &&
                                selectedDeliveryCustomer.addresses.length >
                                  0 && (
                                  <button
                                    onClick={() =>
                                      setShowAddressSelector(
                                        !showAddressSelector,
                                      )
                                    }
                                    className="text-[8px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                  >
                                    {showAddressSelector
                                      ? "Fechar Lista"
                                      : "Ver Endereços Salvos"}
                                  </button>
                                )}
                            </div>

                            <textarea
                              className="w-full px-2 lg:px-3 py-1.5 lg:py-2 bg-white border border-indigo-100 rounded-lg lg:rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500 transition-all resize-none"
                              rows={1}
                              placeholder="Rua, número, bairro..."
                              value={deliveryAddress}
                              onChange={(e) =>
                                setDeliveryAddress(e.target.value)
                              }
                            />

                            {/* Seletor de Endereços Salvos */}
                            {showAddressSelector &&
                              selectedDeliveryCustomer &&
                              selectedDeliveryCustomer.addresses && (
                                <div className="absolute top-full left-0 right-0 z-[60] bg-white border border-indigo-100 rounded-xl shadow-xl mt-1 max-h-32 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1">
                                  {selectedDeliveryCustomer.addresses.map(
                                    (addr, idx) => (
                                      <button
                                        key={`addr-${idx}-${addr.substring(0, 5)}`}
                                        onClick={() => {
                                          setDeliveryAddress(addr);
                                          setShowAddressSelector(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b border-indigo-50 last:border-0 transition-colors"
                                      >
                                        <p className="text-[10px] font-bold text-slate-700">
                                          {addr}
                                        </p>
                                      </button>
                                    ),
                                  )}
                                  <button
                                    onClick={() => {
                                      setDeliveryAddress("");
                                      setShowAddressSelector(false);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-indigo-600 font-black text-[8px] uppercase tracking-widest"
                                  >
                                    + Novo Endereço
                                  </button>
                                </div>
                              )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-indigo-600 uppercase tracking-widest ml-1">
                              Taxa de Entrega (R$)
                            </label>
                            <input
                              type="text"
                              className="w-full px-2 lg:px-3 py-1.5 lg:py-2 bg-white border border-indigo-100 rounded-lg lg:rounded-xl text-[10px] font-black outline-none focus:border-indigo-500 transition-all"
                              value={deliveryFeeInput}
                              onChange={(e) =>
                                setDeliveryFeeInput(
                                  formatCurrency(e.target.value),
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {selectedTable.items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40">
                        <div className="p-6 border-2 border-dashed rounded-full border-slate-200">
                          <ShoppingBag size={40} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">
                          Nenhum item lançado
                        </p>
                      </div>
                    ) : (
                      selectedTable.items.map((item, index) => (
                        <div
                          key={`titem-${selectedTable.id}-${item.productId}-${index}`}
                          onClick={() => startEditItem(index)}
                          className="group relative bg-slate-50 rounded-2xl border border-slate-100 p-3 hover:border-indigo-200 transition-all cursor-pointer hover:bg-indigo-50/30"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-black text-slate-800 text-xs leading-tight pr-6">
                              {item.name}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(index);
                              }}
                              className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">
                                {item.quantity}x
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                R$ {item.price.toFixed(2)}
                              </span>
                              {item.observation && (
                                <span className="flex items-center gap-1 text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  <MessageSquare size={8} /> Obs
                                </span>
                              )}
                            </div>
                            <p className="font-black text-indigo-600 text-xs">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t bg-slate-50 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Subtotal
                      </span>
                      <span className="font-black text-slate-700">
                        R$ {selectedTable.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-black text-slate-800">
                      <span>Total</span>
                      <span className="text-indigo-600">
                        R${" "}
                        {(
                          selectedTable.total +
                          (isDeliveryOrder
                            ? parseCurrency(deliveryFeeInput)
                            : 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Coluna Central: Busca e Grid de Produtos */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="p-3 lg:p-4 bg-white border-b">
                    <div className="relative">
                      <Search
                        className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="(F2) Nome/código"
                        className="w-full pl-10 lg:pl-12 pr-4 lg:pr-6 py-2.5 lg:py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl lg:rounded-2xl outline-none transition-all font-bold text-slate-700 text-xs lg:text-base"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 lg:p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6 custom-scrollbar content-start">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToTable(product)}
                        className="bg-white rounded-2xl lg:rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-500 hover:-translate-y-1 transition-all text-left flex flex-col overflow-hidden group h-full min-h-[160px] lg:min-h-[200px]"
                      >
                        <div className="flex-1 p-3 lg:p-5 flex flex-col items-center justify-center text-center gap-2 lg:gap-3 relative">
                          {product.stock !== undefined &&
                            product.stock <= (product.minStock || 5) && (
                              <div
                                className="absolute top-3 right-3 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-200"
                                title="Estoque Baixo"
                              ></div>
                            )}
                          <div className="w-14 h-14 lg:w-20 lg:h-20 bg-slate-50 rounded-xl lg:rounded-2xl overflow-hidden mb-1 shadow-inner flex items-center justify-center">
                            {product.image ? (
                              <img
                                src={product.image}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package size={24} className="text-slate-200" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-black text-slate-800 text-[10px] lg:text-[12px] uppercase tracking-tight line-clamp-2 leading-tight">
                              {product.name}
                            </h4>
                            <div className="flex flex-wrap gap-1 justify-center items-center mt-1">
                              <span className="text-[6px] lg:text-[8px] font-extrabold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded tracking-wide uppercase">
                                {product.category}
                              </span>
                              <span className="text-[6px] lg:text-[8px] font-extrabold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded tracking-wide">
                                #{product.id.slice(-4)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-50 group-hover:bg-indigo-600 py-2.5 lg:py-4 px-3 lg:px-5 flex justify-center items-center transition-colors border-t border-slate-100">
                          <p className="font-black text-slate-700 group-hover:text-white text-xs lg:text-sm">
                            R$ {product.price.toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coluna Direita: Categorias */}
                <div className="hidden lg:flex w-56 bg-white border-l flex-col shrink-0">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full py-4 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all text-center ${
                          selectedCategory === cat
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "bg-white border-slate-50 text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categorias Mobile */}
                <div className="lg:hidden bg-white border-t p-2 overflow-x-auto flex gap-2 shrink-0 custom-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                        selectedCategory === cat
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                          : "bg-white border-slate-100 text-slate-500"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barra de Ações Inferior */}
              <div className="bg-white border-t p-3 lg:p-4 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-3 lg:gap-4">
                <div className="flex gap-2 lg:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 sm:px-8 py-3 lg:py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
                  >
                    Cancelar Venda
                  </button>
                  <button
                    onClick={() => setShowTransferModal(true)}
                    disabled={
                      isCounterContext || selectedTable.items.length === 0
                    }
                    className="flex-1 sm:px-8 py-3 lg:py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ArrowRightLeft size={14} />
                    Transferir
                  </button>
                  <button
                    onClick={handleSendToKitchenLocal}
                    disabled={
                      isSendingToKitchen || selectedTable.items.length === 0
                    }
                    className="flex-1 sm:px-6 py-3 lg:py-4 bg-amber-500 text-white rounded-xl lg:rounded-2xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-100 disabled:opacity-50"
                  >
                    {isSendingToKitchen ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ChefHat size={14} />
                    )}
                    Cozinha
                  </button>
                </div>

                <div className="flex gap-2 lg:gap-3 items-center w-full sm:w-auto">
                  {showKitchenSuccess && (
                    <div className="hidden md:flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase animate-in fade-in slide-in-from-right-2">
                      <CheckCircle2 size={16} /> Pedido Enviado!
                    </div>
                  )}
                  <button
                    onClick={() => {
                      handlePrintOrder(
                        {
                          id: selectedTable.currentOrderId || "TEMP",
                          items: selectedTable.items,
                          total:
                            selectedTable.total +
                            (isDeliveryOrder
                              ? parseCurrency(deliveryFeeInput)
                              : 0),
                          tableNumber: isCounterContext
                            ? undefined
                            : selectedTable.id,
                          type: isDeliveryOrder
                            ? "delivery"
                            : isCounterContext
                              ? "takeout"
                              : "table",
                          customerName: customerName || undefined,
                          customerPhone: customerPhone || undefined,
                          customerAddress: deliveryAddress || undefined,
                          deliveryFee: isDeliveryOrder
                            ? parseCurrency(deliveryFeeInput)
                            : undefined,
                          createdAt: new Date(),
                          tenantId: selectedTable.tenantId || "",
                          status: "pending",
                        } as Order,
                        adminSettings,
                        { isFiscal: false }
                      );
                    }}
                    className="hidden sm:block px-4 py-4 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Printer size={24} />
                  </button>
                  <button
                    disabled={selectedTable.items.length === 0}
                    onClick={openPayment}
                    className="flex-1 sm:px-10 py-3 lg:py-4 bg-indigo-600 text-white rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 lg:gap-3 disabled:opacity-50 disabled:grayscale"
                  >
                    Pagar <ArrowRight size={16} className="lg:hidden" />
                    <ArrowRight size={20} className="hidden lg:block" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOVO Modal: Edição de Detalhes do Item (Observação) */}
        {editingItemIndex !== null && selectedTable && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-6 lg:p-8 border-b flex justify-between items-center bg-indigo-50/50">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 p-2 lg:p-3 rounded-2xl text-white shadow-lg">
                    <Edit3 size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg lg:text-xl font-black">
                      Detalhes do Item
                    </h2>
                    <p className="text-[9px] lg:text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      {selectedTable.items[editingItemIndex].name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingItemIndex(null)}
                  className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 lg:p-8 space-y-6 lg:space-y-8">
                {/* Observações com IA */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <MessageSquare size={12} /> Observações de Preparo
                    </label>
                    {loadingSuggestions && (
                      <Loader2
                        size={12}
                        className="animate-spin text-indigo-500"
                      />
                    )}
                  </div>
                  <textarea
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none text-sm"
                    rows={3}
                    placeholder="Ex: Sem cebola, bem passado..."
                    value={tempObs}
                    onChange={(e) => setTempObs(e.target.value)}
                    autoFocus
                  />

                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-1">
                        <Sparkles size={10} /> Sugestões KitchenFlow AI
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => setTempObs(sug)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ajustes de Assento e Quantidade */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Para quem?
                    </label>
                    <input
                      type="text"
                      className="w-full px-5 py-3 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500"
                      value={tempSeat}
                      onChange={(e) => setTempSeat(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Quantidade
                    </label>
                    <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border">
                      <button
                        onClick={() => setTempQty(Math.max(1, tempQty - 1))}
                        className="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center shadow-sm"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="flex-1 text-center font-black text-slate-800">
                        {tempQty}
                      </span>
                      <button
                        onClick={() => setTempQty(tempQty + 1)}
                        className="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center shadow-sm"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t bg-slate-50 flex gap-4">
                <button
                  onClick={() => setEditingItemIndex(null)}
                  className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs"
                >
                  Descartar
                </button>
                <button
                  onClick={saveItemEdit}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  <Save size={18} /> Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Opcionais */}
        {showOptionsModal && selectedProductForOptions && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-6 lg:p-8 border-b flex justify-between items-center bg-indigo-50/50">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 p-2 lg:p-3 rounded-2xl text-white shadow-lg">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg lg:text-xl font-black">Opcionais</h2>
                    <p className="text-[9px] lg:text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      {selectedProductForOptions.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOptionsModal(false)}
                  className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 lg:p-8 space-y-4 lg:space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {selectedProductForOptions.optionCategories &&
                selectedProductForOptions.optionCategories.length > 0 ? (
                  selectedProductForOptions.optionCategories.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <div className="flex justify-between items-end border-b pb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          {category.name}
                        </label>
                        <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">
                          {category.min > 0
                            ? `Mín: ${category.min}`
                            : "Opcional"}
                          {category.max > 0 ? ` • Máx: ${category.max}` : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {category.options
                          .filter((option) => {
                            if (option.active === false) return false;
                            if (!isCounterContext) {
                              if (option.isAvailableDineIn === false)
                                return false;
                            } else {
                              if (isDeliveryOrder) {
                                if (option.isAvailableDelivery === false)
                                  return false;
                              } else {
                                if (option.isAvailableOnline === false)
                                  return false;
                              }
                            }
                            return true;
                          })
                          .map((option) => (
                            <button
                              key={option.id}
                              onClick={() =>
                                toggleOption({
                                  ...option,
                                  category: category.name,
                                })
                              }
                              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedOptions.find((o) => o.id === option.id) ? "border-indigo-600 bg-indigo-50" : "bg-white border-slate-50 hover:border-slate-200"}`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedOptions.find((o) => o.id === option.id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200"}`}
                                >
                                  {selectedOptions.find(
                                    (o) => o.id === option.id,
                                  ) && <Check size={14} strokeWidth={4} />}
                                </div>
                                <p className="text-xs font-black text-slate-700">
                                  {option.name}
                                </p>
                              </div>
                              <p className="font-black text-slate-800 text-sm">
                                {option.price > 0
                                  ? `+ R$ ${option.price.toFixed(2)}`
                                  : "Grátis"}
                              </p>
                            </button>
                          ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Escolha os Adicionais
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {selectedProductForOptions.options?.map((option, idx) => {
                        const isRequired =
                          selectedProductForOptions.requiredOptionCategories?.includes(
                            option.category || "",
                          );
                        return (
                          <button
                            key={`opt-${idx}-${option.name.substring(0, 5)}`}
                            onClick={() => toggleOption(option)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedOptions.find((o) => o.name === option.name) ? "border-indigo-600 bg-indigo-50" : "bg-white border-slate-50 hover:border-slate-200"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedOptions.find((o) => o.name === option.name) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200"}`}
                              >
                                {selectedOptions.find(
                                  (o) => o.name === option.name,
                                ) && <Check size={14} strokeWidth={4} />}
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-black text-slate-700">
                                  {option.name}
                                </p>
                                {option.category && (
                                  <p
                                    className={`text-[8px] font-bold uppercase tracking-widest ${isRequired ? "text-indigo-500" : "text-slate-400"}`}
                                  >
                                    {option.category}{" "}
                                    {isRequired && "• Obrigatório"}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="font-black text-slate-800 text-sm">
                              R$ {option.price.toFixed(2)}
                            </p>
                          </button>
                        );
                      })}
                      {(!selectedProductForOptions.options ||
                        selectedProductForOptions.options.length === 0) && (
                        <p className="text-center py-8 text-slate-400 font-bold text-xs">
                          Nenhum opcional disponível para este produto.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Seletor de Quantidade & Observações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Quantidade a Lançar
                    </label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => setOptionsModalQty((prev) => Math.max(1, prev - 1))}
                        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all text-lg shadow-sm"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-black text-slate-800 text-lg">
                        {optionsModalQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOptionsModalQty((prev) => prev + 1)}
                        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all text-lg shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Observação do Item
                    </label>
                    <textarea
                      value={optionsModalObs}
                      onChange={(e) => setOptionsModalObs(e.target.value)}
                      placeholder="Ex: Sem cebola, bem passado, molho à parte..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none h-[64px]"
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total do Item
                  </p>
                  <h3 className="text-2xl font-black text-indigo-600">
                    R${" "}
                    {(
                      (selectedProductForOptions.price +
                        selectedOptions.reduce((acc, o) => acc + o.price, 0)) *
                      optionsModalQty
                    ).toFixed(2)}
                  </h3>
                </div>
              </div>

              <div className="p-8 border-t bg-slate-50 flex gap-4">
                <button
                  onClick={() => setShowOptionsModal(false)}
                  className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmOptions}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  Confirmar e Adicionar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pagamento & Divisão de Conta */}
        {showPaymentModal && selectedTable && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[90vh]">
              <div className="p-8 border-b flex justify-between items-center bg-emerald-600 text-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">
                      Finalizar{" "}
                      {isCounterContext ? "Balcão" : `Mesa ${selectedTable.id}`}
                    </h2>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
                      Total: R$ {selectedTable.total.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!isProcessing) setShowPaymentModal(false);
                  }}
                  disabled={isProcessing}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Esquerda: Status da Divisão / Saldo */}
                <div className="w-full lg:w-[400px] border-r bg-slate-50/50 p-4 lg:p-8 flex flex-col space-y-4 lg:space-y-8 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2 text-center bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[2rem] shadow-sm border">
                    <p className="text-slate-400 font-black uppercase text-[8px] lg:text-[10px] tracking-widest">
                      Saldo Remanescente
                    </p>
                    <h1
                      className={`text-3xl lg:text-5xl font-black tracking-tighter ${remainingBalance > 0 ? "text-slate-800" : "text-emerald-600"}`}
                    >
                      R$ {remainingBalance.toFixed(2)}
                    </h1>
                    {remainingBalance <= 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1 text-emerald-600 font-black text-[10px] uppercase">
                        <CheckCircle2 size={12} /> Conta Liquidada
                      </div>
                    )}
                  </div>

                  {/* Ajustes de Valor (Descontos e Acréscimos) */}
                  <div className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-50">
                      <Calculator size={16} className="text-slate-500" />
                      <p className="text-[10px] lg:text-xs font-black text-slate-800 uppercase tracking-tight">
                        Ajustes de Valor
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Desconto */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          Desconto (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={splitParts.length > 0}
                          value={discount || ""}
                          onChange={(e) => handleSetDiscountValue(e.target.value)}
                          placeholder="0,00"
                          className="w-full px-3 py-2 border rounded-xl font-bold text-rose-600 focus:ring-1 focus:ring-rose-500 outline-none text-xs bg-slate-50/50"
                        />
                      </div>

                      {/* Acréscimo */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          Acréscimo (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={splitParts.length > 0}
                          value={additionalFee || ""}
                          onChange={(e) => handleSetAdditionalFeeValue(e.target.value)}
                          placeholder="0,00"
                          className="w-full px-3 py-2 border rounded-xl font-bold text-emerald-600 focus:ring-1 focus:ring-emerald-500 outline-none text-xs bg-slate-50/50"
                        />
                      </div>
                    </div>

                    {/* Botão de motivo do acréscimo (Não obrigatório) */}
                    {additionalFee > 0 && (
                      <div className="animate-in slide-in-from-top-2 duration-300 space-y-2">
                        {!showReasonInput && !additionalFeeReason ? (
                          <button
                            type="button"
                            onClick={() => setShowReasonInput(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 rounded-xl text-[10px] font-bold uppercase transition-all"
                          >
                            <MessageSquare size={13} strokeWidth={2} />
                            Adicionar Motivo
                          </button>
                        ) : (
                          <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase">
                              <span>Motivo do Acréscimo</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReasonInput(false);
                                  setAdditionalFeeReason("");
                                }}
                                className="text-rose-500 hover:text-rose-700 text-[8px]"
                              >
                                Limpar
                              </button>
                            </div>
                            <input
                              type="text"
                              value={additionalFeeReason}
                              onChange={(e) => setAdditionalFeeReason(e.target.value)}
                              placeholder="Ex: Embalagem viagem, taxa..."
                              className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <p className="text-[8px] text-slate-400 font-medium uppercase italic">Opcional</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Opção para manter mesa aberta */}
                  <div className="bg-white p-4 rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <div className="pt-0.5">
                        <div
                          className={`w-10 h-5 rounded-full relative transition-all ${!autoCloseAfterPayment ? "bg-indigo-600" : "bg-slate-200"}`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={!autoCloseAfterPayment}
                            onChange={(e) =>
                              setAutoCloseAfterPayment(!e.target.checked)
                            }
                          />
                          <div
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${!autoCloseAfterPayment ? "left-[22px]" : "left-0.5"}`}
                          />
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] lg:text-xs font-black text-slate-800 uppercase tracking-tight">
                          Manter Mesa Aberta
                        </p>
                        <p className="text-[8px] lg:text-[9px] text-slate-400 font-bold leading-normal uppercase">
                          Permite gerar múltiplos cupons fiscais antes de
                          desocupar a mesa.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3 lg:space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] lg:text-xs font-black uppercase text-slate-400 tracking-widest ml-2">
                        Pagamentos Efetuados
                      </p>
                      <span className="text-[8px] lg:text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {splitParts.length} partes
                      </span>
                    </div>
                    <div className="space-y-2">
                      {splitParts.map((part) => {
                        const isBeingIssued = issuingPartId === part.id;
                        const isDocOpen =
                          showPartDocumentSection[part.id] || false;
                        return (
                          <div
                            key={part.id}
                            className="bg-white p-3 lg:p-4 rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-left-2 flex flex-col gap-2"
                          >
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-2 lg:gap-3">
                                <div className="p-1.5 lg:p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                  <Check size={14} strokeWidth={4} />
                                </div>
                                <div>
                                  <p className="text-[10px] lg:text-xs font-black text-slate-700 uppercase">
                                    {part.method.replace("_", " ")}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-medium">
                                    Pago Parcial
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-800 text-xs lg:text-sm">
                                  R$ {part.amount.toFixed(2)}
                                </p>
                                {!part.isFiscalIssued && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Remover este pagamento parcial de R$ ${part.amount.toFixed(2)} (${part.method})?`)) {
                                        const updatedParts = splitParts.filter(p => p.id !== part.id);
                                        setSplitParts(updatedParts);
                                        setRemainingBalance(prev => prev + part.amount);
                                        if (updatedParts.length === 0) {
                                          setIsSplitting(false);
                                        }
                                        if (selectedTable) {
                                          const updatedTable = { ...selectedTable, partialPayments: updatedParts };
                                          setSelectedTable(updatedTable);
                                          onUpdateTable(selectedTable.id, selectedTable.items, "occupied", isCounterContext, updatedParts);
                                        }
                                      }
                                    }}
                                    className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                                    title="Remover pagamento parcial"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Painel Fiscal Desta Parte */}
                            <div className="border-t pt-2 mt-1">
                              {part.isFiscalIssued ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                      <ShieldCheck
                                        size={11}
                                        className="text-emerald-500 fill-emerald-500"
                                      />{" "}
                                      NFC-e Autorizada
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      Sincronizado
                                    </span>
                                  </div>
                                  {part.fiscalKey && (
                                    <p className="text-[8px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded border overflow-x-auto select-all">
                                      Chave: {part.fiscalKey}
                                    </p>
                                  )}
                                  <button
                                    onClick={() => {
                                      alert(`NFC-e de R$ ${part.amount.toFixed(2)}:
                                             \nChave de Acesso: ${part.fiscalKey}
                                             \nEmitida para: ${part.customerDocument || "Consumidor Geral"}
                                             \n\nImpressão enviada para a impressora padrão!`);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-colors"
                                  >
                                    <Printer size={12} /> Imprimir Cupom da
                                    Parte
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {!isDocOpen ? (
                                    <button
                                      onClick={() =>
                                        setShowPartDocumentSection((prev) => ({
                                          ...prev,
                                          [part.id]: true,
                                        }))
                                      }
                                      className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 rounded-[#10px] text-[9px] font-bold tracking-wider uppercase transition-all"
                                    >
                                      <Receipt size={12} /> Gerar Cupom Fiscal
                                      (R$ {part.amount.toFixed(2)})
                                    </button>
                                  ) : (
                                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-2 animate-in slide-in-from-top-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                                          CPF/CNPJ na Nota (Opcional)
                                        </span>
                                        <button
                                          onClick={() =>
                                            setShowPartDocumentSection(
                                              (prev) => ({
                                                ...prev,
                                                [part.id]: false,
                                              }),
                                            )
                                          }
                                          className="text-slate-400 hover:text-slate-600 text-[9px]"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="CPF ou CNPJ..."
                                        value={
                                          partDocumentInputs[part.id] || ""
                                        }
                                        onChange={(e) =>
                                          setPartDocumentInputs((prev) => ({
                                            ...prev,
                                            [part.id]: e.target.value,
                                          }))
                                        }
                                        className="w-full px-2 py-1 text-[10px] border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                      />
                                      <button
                                        disabled={isBeingIssued}
                                        onClick={() =>
                                          handleEmitPartialFiscal(part.id)
                                        }
                                        className="w-full flex items-center justify-center gap-1 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[9px] tracking-wider uppercase transition-all disabled:opacity-50"
                                      >
                                        {isBeingIssued ? (
                                          <>
                                            <Loader2
                                              size={10}
                                              className="animate-spin animate-infinite duration-1000"
                                            />{" "}
                                            Emitindo...
                                          </>
                                        ) : (
                                          <>
                                            {" "}
                                            Emitir NFC-e de R${" "}
                                            {part.amount.toFixed(2)}
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {splitParts.length === 0 && (
                        <div className="py-6 lg:py-10 text-center opacity-30 grayscale flex flex-col items-center gap-2">
                          <History size={32} />
                          <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest">
                            Nenhum pagamento
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isSplitting && remainingBalance > 0 && (
                    <button
                      onClick={() => setIsSplitting(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 lg:py-4 bg-indigo-50 text-indigo-600 border-2 border-indigo-100 rounded-xl lg:rounded-2xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                    >
                      <Calculator size={16} /> Dividir Conta
                    </button>
                  )}
                </div>

                {/* Direita: Seleção de Valor / Método */}
                <div className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar">
                  {!showCustomerSelection ? (
                    remainingBalance <= 0.01 && splitParts.length > 0 ? (
                      <div className="space-y-8 animate-in zoom-in-95 duration-300 flex-1 flex flex-col justify-center items-center text-center p-6 lg:p-12">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center border-4 border-emerald-100 shadow-md animate-bounce">
                          <Check size={40} strokeWidth={4} />
                        </div>
                        <div className="space-y-2 max-w-md">
                          <h3 className="text-2xl font-black text-slate-800">
                            Conta Liquidada!
                          </h3>
                          <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full w-fit mx-auto uppercase">
                            Saldo Remanescente: R$ 0,00
                          </p>
                          <p className="text-xs text-slate-500 font-bold leading-relaxed pt-2 uppercase">
                            Todos os pagamentos foram registrados com sucesso.
                            Você pode emitir os cupons fiscais NFC-e individuais
                            para cada parte na coluna esquerda.
                          </p>
                        </div>

                        <div className="w-full max-w-sm space-y-4 pt-4">
                          <button
                            onClick={() => finishSplitPayment(splitParts)}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                            <ShieldCheck size={18} /> Concluir e Liberar Mesa
                          </button>

                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Deseja voltar para ajustar pagamentos?",
                                )
                              ) {
                                const totalPaid = splitParts.reduce(
                                  (acc, p) => acc + p.amount,
                                  0,
                                );
                                setRemainingBalance(
                                  selectedTable.total +
                                    (isDeliveryOrder && isCounterContext
                                      ? parseCurrency(deliveryFeeInput)
                                      : 0) +
                                    additionalFee -
                                    discount -
                                    totalPaid,
                                );
                              }
                            }}
                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition-colors block mx-auto pt-2"
                          >
                            Ajustar Pagamentos
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 h-full flex flex-col">
                        {isSplitting && !splitMode && (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            <h3 className="text-lg font-black text-slate-800">
                              Como deseja dividir?
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <button
                                onClick={() => setSplitMode("value")}
                                className="p-8 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-indigo-500 hover:shadow-lg transition-all text-left flex flex-col gap-4 group"
                              >
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl w-fit group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                  <DollarSign size={24} />
                                </div>
                                <div>
                                  <p className="font-black text-slate-800">
                                    Valor Específico
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    Defina o quanto pagar agora
                                  </p>
                                </div>
                              </button>
                              <button
                                onClick={() => setSplitMode("items")}
                                className="p-8 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-indigo-500 hover:shadow-lg transition-all text-left flex flex-col gap-4 group"
                              >
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                  <ListChecks size={24} />
                                </div>
                                <div>
                                  <p className="font-black text-slate-800">
                                    Por Itens
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    Selecione o que pagar
                                  </p>
                                </div>
                              </button>
                            </div>
                            <button
                              onClick={() => setIsSplitting(false)}
                              className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                            >
                              Voltar ao pagamento total
                            </button>
                          </div>
                        )}

                        {(!isSplitting || (isSplitting && splitMode)) && (
                          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                            <div className="flex justify-between items-end">
                              <div>
                                <h3 className="text-xl font-black text-slate-800">
                                  {isSplitting
                                    ? splitMode === "value"
                                      ? "Lançar Valor Manual"
                                      : "Pagar Itens Selecionados"
                                    : "Pagamento"}
                                </h3>
                                <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">
                                  {remainingBalance <
                                  selectedTable.total +
                                    (isDeliveryOrder && isCounterContext
                                      ? parseCurrency(deliveryFeeInput)
                                      : 0) +
                                    additionalFee -
                                    discount
                                    ? "Pagamento Parcial"
                                    : "Etapa final do despacho"}
                                </p>
                              </div>
                              {splitMode && (
                                <button
                                  onClick={() => setSplitMode(null)}
                                  className="text-xs font-bold text-slate-400 hover:text-indigo-600"
                                >
                                  Alterar Modo
                                </button>
                              )}
                            </div>

                            <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100">
                              {(splitMode === "value" || !isSplitting) && (
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                      Valor a Pagar Agora
                                    </label>
                                    {!isSplitting && (
                                      <button
                                        onClick={() => {
                                          setIsSplitting(true);
                                          setSplitMode("value");
                                        }}
                                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                      >
                                        Pagar Parcial
                                      </button>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300">
                                      R$
                                    </span>
                                    <input
                                      type="number"
                                      className="w-full pl-20 pr-8 py-6 bg-white border-2 border-indigo-100 rounded-[2rem] text-4xl font-black text-indigo-600 focus:border-indigo-500 outline-none transition-all"
                                      value={customSplitValue}
                                      onChange={(e) =>
                                        setCustomSplitValue(e.target.value)
                                      }
                                      placeholder={remainingBalance.toFixed(2)}
                                      autoFocus
                                    />
                                  </div>
                                </div>
                              )}

                              {splitMode === "items" && (
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      Marque os Itens
                                    </label>
                                    <p className="text-xs font-black text-indigo-600">
                                      Subtotal: R${" "}
                                      {selectedSplitItems
                                        .reduce(
                                          (acc, idx) =>
                                            acc +
                                            selectedTable.items[idx].price *
                                              selectedTable.items[idx].quantity,
                                          0,
                                        )
                                        .toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                    {selectedTable.items.map((item, idx) => {
                                      const isPaid =
                                        paidItemIndices.includes(idx);
                                      return (
                                        <button
                                          key={`split-item-${selectedTable.id}-${idx}`}
                                          disabled={isPaid}
                                          onClick={() => toggleSplitItem(idx)}
                                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isPaid ? "opacity-40 grayscale bg-slate-100 border-slate-200" : selectedSplitItems.includes(idx) ? "border-indigo-600 bg-indigo-50" : "bg-white border-slate-50"}`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div
                                              className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isPaid ? "bg-slate-400 border-slate-400 text-white" : selectedSplitItems.includes(idx) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200"}`}
                                            >
                                              {(isPaid ||
                                                selectedSplitItems.includes(
                                                  idx,
                                                )) && (
                                                <Check
                                                  size={14}
                                                  strokeWidth={4}
                                                />
                                              )}
                                            </div>
                                            <div className="text-left">
                                              <p className="text-xs font-black text-slate-700">
                                                {item.name}
                                              </p>
                                              <p className="text-[10px] font-bold text-slate-400">
                                                {item.quantity}x R${" "}
                                                {item.price.toFixed(2)}
                                              </p>
                                            </div>
                                          </div>
                                          <p className="font-black text-slate-800 text-sm">
                                            R${" "}
                                            {(
                                              item.price * item.quantity
                                            ).toFixed(2)}
                                          </p>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4 mt-auto pt-6">
                              <div className="flex items-center justify-between px-2">
                                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
                                  Selecione o Método para esta{" "}
                                  {isSplitting ? "parte" : "conta"}
                                </p>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <div
                                    className={`w-8 h-4 rounded-full relative transition-all ${isFiscalEmission ? "bg-emerald-500" : "bg-slate-200"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={isFiscalEmission}
                                      onChange={(e) =>
                                        setIsFiscalEmission(e.target.checked)
                                      }
                                    />
                                    <div
                                      className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isFiscalEmission ? "left-[18px]" : "left-0.5"}`}
                                    />
                                  </div>
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                    Emitir Cupom Fiscal
                                  </span>
                                </label>
                              </div>

                              {isFiscalEmission && (
                                <div className="px-2 animate-in slide-in-from-top-2 duration-300">
                                  <div className="relative">
                                    <ShieldCheck
                                      className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"
                                      size={16}
                                    />
                                    <input
                                      type="text"
                                      placeholder="CPF ou CNPJ no cupom (opcional)"
                                      className="w-full pl-12 pr-4 py-3 bg-white border-2 border-emerald-100 rounded-xl text-xs font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all"
                                      value={customerDocumentInput}
                                      onChange={(e) =>
                                        setCustomerDocumentInput(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {adminSettings.paymentMethods
                                  ?.filter((m) => m.active)
                                  .map((method) => {
                                    let Icon = Wallet;
                                    let color = "text-slate-500";

                                    switch (method.type) {
                                      case "cash":
                                        Icon = Banknote;
                                        color = "text-emerald-500";
                                        break;
                                      case "pix":
                                        Icon = Smartphone;
                                        color = "text-indigo-500";
                                        break;
                                      case "credit":
                                        Icon = CreditCard;
                                        color = "text-blue-600";
                                        break;
                                      case "debit":
                                        Icon = CreditCard;
                                        color = "text-indigo-400";
                                        break;
                                      case "voucher":
                                        Icon = Ticket;
                                        color = "text-amber-500";
                                        break;
                                      case "account":
                                        Icon = UserCircle;
                                        color = "text-rose-500";
                                        break;
                                    }

                                    return (
                                      <button
                                        key={method.id}
                                        disabled={
                                          isProcessing ||
                                          (splitMode === "items" &&
                                            selectedSplitItems.length === 0)
                                        }
                                        onClick={() =>
                                          handleProcessPayment(method.name)
                                        }
                                        className="p-6 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-indigo-500 hover:shadow-md transition-all text-center flex flex-col items-center gap-3 group active:scale-95 disabled:opacity-30 disabled:grayscale"
                                      >
                                        <div
                                          className={`p-4 bg-slate-50 shadow-sm border rounded-2xl w-fit ${color} group-hover:scale-110 transition-transform`}
                                        >
                                          <Icon size={28} />
                                        </div>
                                        <p className="font-black text-slate-800 text-[10px] uppercase tracking-tighter">
                                          {method.name}
                                        </p>
                                      </button>
                                    );
                                  })}
                                {(!adminSettings.paymentMethods ||
                                  adminSettings.paymentMethods.length ===
                                    0) && (
                                  <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <p className="text-xs font-bold text-slate-400">
                                      Nenhuma forma de pagamento configurada
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="animate-in slide-in-from-right-10 duration-300 flex flex-col h-full">
                      <div className="p-4 lg:p-5 border-b bg-rose-600 text-white flex justify-between items-center rounded-t-2xl shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-xl">
                            <UserCircle size={20} />
                          </div>
                          <div>
                            <h2 className="text-base font-black">
                              Selecionar Cliente
                            </h2>
                            <p className="text-[10px] font-bold uppercase opacity-80">
                              Lançamento em Conta Fiado
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (!isProcessing) {
                              setShowCustomerSelection(false);
                              setShowNewCustomerForm(false);
                            }
                          }}
                          disabled={isProcessing}
                          className="p-1.5 hover:bg-white/20 rounded-full disabled:opacity-30"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="p-4 lg:p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                        {showNewCustomerForm ? (
                          <div className="space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                Cadastrar Novo Cliente
                              </h3>
                              <button
                                onClick={() => setShowNewCustomerForm(false)}
                                className="text-[9px] font-bold text-rose-600 uppercase hover:underline"
                              >
                                Ver Lista
                              </button>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                  Nome Completo
                                </label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 transition-all"
                                  value={newCustomerName}
                                  onChange={(e) =>
                                    setNewCustomerName(e.target.value)
                                  }
                                  placeholder="Ex: João Silva"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                  Telefone / WhatsApp
                                </label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 transition-all"
                                  value={newCustomerPhone}
                                  onChange={(e) =>
                                    setNewCustomerPhone(maskPhone(e.target.value))
                                  }
                                  placeholder="(00) 00000-0000"
                                />
                              </div>
                              <button
                                onClick={handleCreateCustomer}
                                disabled={
                                  !newCustomerName.trim() ||
                                  !newCustomerPhone.trim()
                                }
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-emerald-100 disabled:opacity-50 transition-all cursor-pointer"
                              >
                                Salvar e Cadastrar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="relative flex-1">
                                <Search
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                  size={16}
                                />
                                <input
                                  type="text"
                                  placeholder="Nome do cliente..."
                                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 transition-all"
                                  value={customerSearch}
                                  onChange={(e) =>
                                    setCustomerSearch(e.target.value)
                                  }
                                />
                              </div>
                              <button
                                onClick={() => setShowNewCustomerForm(true)}
                                className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all"
                                title="Novo Cliente"
                              >
                                <UserPlus size={16} />
                              </button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 min-h-[150px]">
                              {filteredCustomerList.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => setSelectedCustomerId(c.id)}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selectedCustomerId === c.id ? "border-rose-600 bg-rose-50" : "border-slate-50 bg-white hover:border-slate-200"}`}
                                >
                                  <div className="text-left">
                                    <p className="font-bold text-slate-800 text-xs">
                                      {c.name}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                      {c.document || c.phone}
                                    </p>
                                  </div>
                                  {selectedCustomerId === c.id && (
                                    <CheckCircle2
                                      size={18}
                                      className="text-rose-600"
                                    />
                                  )}
                                </button>
                              ))}
                              {filteredCustomerList.length === 0 && (
                                <div className="py-8 text-center opacity-40">
                                  <p className="text-xs font-bold uppercase tracking-wider">
                                    Nenhum cliente encontrado
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="p-4 lg:p-5 border-t bg-slate-50 flex gap-3 shrink-0">
                        <button
                          onClick={() => {
                            if (isProcessing) return;
                            setShowCustomerSelection(false);
                            setShowNewCustomerForm(false);
                          }}
                          disabled={isProcessing}
                          className="flex-1 py-2.5 font-black text-slate-400 uppercase tracking-wider text-[10px] disabled:opacity-30 hover:text-slate-600 transition-colors"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={finishFiadoPayment}
                          disabled={
                            !selectedCustomerId ||
                            isProcessing ||
                            showNewCustomerForm
                          }
                          className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                        >
                          Lançar Fiado (R${" "}
                          {(isSplitting
                            ? splitMode === "value"
                              ? parseFloat(customSplitValue) || remainingBalance
                              : splitMode === "items"
                                ? selectedSplitItems.reduce(
                                    (acc, idx) =>
                                      acc +
                                      selectedTable.items[idx].price *
                                        selectedTable.items[idx].quantity,
                                    0,
                                  )
                                : remainingBalance
                            : remainingBalance
                          ).toFixed(2)}
                          )
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-[200] animate-in fade-in">
                  <div className="w-24 h-24 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-xl font-black text-slate-800">
                    Processando Pagamento...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Modal: Gerenciamento de Mesas */}
        {showManageTablesModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[80vh]">
              <div className="p-6 lg:p-8 border-b flex justify-between items-center bg-indigo-600 text-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-2 lg:p-3 rounded-2xl text-white shadow-lg">
                    <Utensils size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg lg:text-xl font-black">
                      Gerenciar Mesas
                    </h2>
                    <p className="text-[9px] lg:text-[10px] font-bold uppercase opacity-80 tracking-widest">
                      Adicione ou remova mesas do seu salão
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManageTablesModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  id="close-manage-tables-modal"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 lg:p-8 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-end">
                  <div className="space-y-4 flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Configuração rápida
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => onAddTable()}
                        className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                        id="add-table-button"
                      >
                        <Plus size={18} /> Adicionar 1 Mesa
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Mesas Atuais ({tables.length})
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                    {[...tables]
                      .filter((t) => t && t.id !== undefined && t.id !== null)
                      .sort(
                        (a, b) =>
                          (Number(a.number) || 0) - (Number(b.number) || 0),
                      )
                      .map((table, index) => (
                        <div
                          key={`${table.id}-${index}`}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${table.status === "available" ? "bg-white border-slate-100" : "bg-slate-50 border-slate-200 opacity-60"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${table.status === "available" ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-400"}`}
                            >
                              <Utensils size={20} />
                            </div>
                            <div>
                              <p className="font-black text-slate-800">
                                Mesa {table.number}
                              </p>
                              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                                {table.status}
                              </p>
                            </div>
                          </div>
                          {table.status === "available" && (
                            <button
                              onClick={() => setTableToDelete(table)}
                              className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              id={`delete-table-${table.id}`}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    {tables.length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed rounded-[2rem] border-slate-100">
                        <p className="text-slate-400 font-bold text-xs uppercase">
                          Nenhuma mesa cadastrada
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirmação de Exclusão */}
                {tableToDelete && (
                  <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 space-y-6">
                      <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
                        <AlertTriangle size={32} />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-black text-slate-800">
                          Excluir Mesa?
                        </h3>
                        <p className="text-sm text-slate-500 font-medium">
                          Tem certeza que deseja remover a{" "}
                          <span className="font-black text-slate-800">
                            Mesa {tableToDelete.number}
                          </span>
                          ? Esta ação não pode ser desfeita.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setTableToDelete(null)}
                          className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            const idToDelete =
                              (tableToDelete as any).docId ||
                              (tableToDelete as any)._firestoreId ||
                              tableToDelete.id;
                            await onDeleteTable(idToDelete);
                            setTableToDelete(null);
                          }}
                          className="flex-1 py-4 bg-rose-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t bg-slate-50">
                <button
                  onClick={() => setShowManageTablesModal(false)}
                  className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all hover:bg-slate-900"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default Tables;
