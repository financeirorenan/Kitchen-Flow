import { useState, useMemo } from "react";
import {
  FinancialRecord,
  Order,
  Customer,
  Courier,
  CashClosingReport,
  BankAccount,
  Product,
  AdminSettings,
  CashSession,
} from "../types";
import { parseCurrency } from "../utils/masks";

export interface UseFinanceDataProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  couriers: Courier[];
  manualRecords: FinancialRecord[];
  cashClosings: CashClosingReport[];
  bankAccounts: BankAccount[];
  adminSettings: AdminSettings;
  cashSession: CashSession;
  onAddRecord: (record: Partial<FinancialRecord>) => void;
  onUpdateRecord: (id: string, updates: Partial<FinancialRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
  onAddBank: (bank: Partial<BankAccount>) => void;
  onUpdateBank: (id: string, updates: Partial<BankAccount>) => void;
  onDeleteBank: (id: string) => void;
  onSettleOrders: (orderIds: string[]) => void;
  onUpdateAdminSettings: (settings: Partial<AdminSettings>) => void;
}

export function useFinanceData({
  orders,
  products,
  customers,
  couriers,
  manualRecords,
  cashClosings,
  bankAccounts,
  adminSettings,
  cashSession,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onUpdateCustomer,
  onAddBank,
  onUpdateBank,
  onDeleteBank,
  onSettleOrders,
  onUpdateAdminSettings,
}: UseFinanceDataProps) {
  const [activeView, setActiveView] = useState<
    | "overview"
    | "transactions"
    | "agenda"
    | "closings"
    | "banks"
    | "items-report"
    | "payment-methods"
    | "fees-report"
  >("overview");
  const [itemsReportFilter, setItemsReportFilter] = useState<"day" | "week" | "month">("day");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBank, setNewBank] = useState<Partial<BankAccount>>({
    name: "",
    bankName: "",
    initialBalance: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid">("all");
  const [selectedFiado, setSelectedFiado] = useState<Customer | null>(null);
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [manualTransactionAmount, setManualTransactionAmount] = useState("");
  const [manualTransactionDescription, setManualTransactionDescription] = useState("");
  const [manualTransactionType, setManualTransactionType] = useState<"credit" | "debit">("debit");
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showFiadoDateModal, setShowFiadoDateModal] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [selectedClosing, setSelectedClosing] = useState<CashClosingReport | null>(null);
  const [predictionDate, setPredictionDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    return d;
  });
  const [agendaFilterDate, setAgendaFilterDate] = useState<{
    month: number;
    year: number;
  } | null>(null);
  const [agendaSearch, setAgendaSearch] = useState("");
  const [agendaTab, setAgendaTab] = useState<"all" | "payable" | "receivable" | "overdue">("all");

  const [showCourierSettleModal, setShowCourierSettleModal] = useState(false);
  const [selectedCourierDebt, setSelectedCourierDebt] = useState<any>(null);
  const [amountReturned, setAmountReturned] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [operatorSearch, setOperatorSearch] = useState("");

  const [statementStartDate, setStatementStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [statementEndDate, setStatementEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("Fornecedores");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<"pending" | "paid">("paid");
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState("1");
  const [formPaymentMethod, setFormPaymentMethod] = useState("dinheiro");

  // State for Lançamento Expresso
  const [quickType, setQuickType] = useState<"income" | "expense">("expense");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState("Fornecedores");
  const [quickPaymentMethod, setQuickPaymentMethod] = useState("dinheiro");
  const [quickDesc, setQuickDesc] = useState("");

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const confirmAction = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: "danger" | "warning" | "info" = "danger",
  ) => {
    setConfirmConfig({ title, message, onConfirm, type });
    setShowConfirmModal(true);
  };

  const handleQuickTypeChange = (type: "income" | "expense") => {
    setQuickType(type);
    setQuickCategory(type === "expense" ? "Fornecedores" : "Suprimento");
  };

  const formatCurrency = (value: number) => {
    const val = value ?? 0;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const incomeFromOrders = useMemo(
    () =>
      orders.map((order) => ({
        id: `order-${order.id}`,
        tenantId: order.tenantId,
        type: "income" as const,
        amount: order.total,
        category: "Vendas PDV",
        description: `Pedido #${order.id.slice(-4)} (${order.type})`,
        date: order.createdAt,
        status: "paid" as const,
        dueDate: order.createdAt,
        orderId: order.id,
      })),
    [orders],
  );

  const allRecords = useMemo(
    () =>
      [
        ...incomeFromOrders,
        ...manualRecords.filter(
          (r) => !(r.category || "").toLowerCase().startsWith("venda"),
        ),
      ].sort((a, b) => {
        const dateA = (a as any).dueDate || a.date;
        const dateB = (b as any).dueDate || b.date;
        return dateB.getTime() - dateA.getTime();
      }),
    [incomeFromOrders, manualRecords],
  );

  const courierDebts = useMemo(() => {
    return couriers.map((c) => {
      const courierOrders = orders.filter(
        (o) =>
          o.courierId === c.id &&
          o.status === "delivered" &&
          o.type === "delivery" &&
          !o.isSettled,
      );
      const totalFees = courierOrders.reduce(
        (acc, o) => acc + (o.deliveryFee || 0),
        0,
      );
      const totalDaily = c.dailyFee || 0;
      const cashHand = courierOrders
        .filter((o) => o.paymentMethod === "dinheiro")
        .reduce((acc, o) => acc + (o.changeFor || o.total), 0);

      const balance = totalFees + totalDaily - cashHand;
      return {
        courier: c,
        balance,
        orderCount: courierOrders.length,
        totalFees,
        totalDaily,
        cashHand,
      };
    });
  }, [couriers, orders]);

  const financialProjection = useMemo(() => {
    const totalFiadoReceivable = customers.reduce(
      (acc, c) => acc + (c.balance > 0 ? c.balance : 0),
      0,
    );
    const totalCourierPayable = courierDebts.reduce(
      (acc, d) => acc + (d.balance > 0 ? d.balance : 0),
      0,
    );
    const totalCourierToReceive = courierDebts.reduce(
      (acc, d) => acc + (d.balance < 0 ? Math.abs(d.balance) : 0),
      0,
    );
    const totalPendingExpenses = manualRecords
      .filter((r) => r.type === "expense" && r.status === "pending")
      .reduce((acc, r) => acc + r.amount, 0);
    const totalPendingIncome = manualRecords
      .filter((r) => r.type === "income" && r.status === "pending")
      .reduce((acc, r) => acc + r.amount, 0);

    return {
      fiado: totalFiadoReceivable,
      courierPagar: totalCourierPayable,
      courierReceber: totalCourierToReceive,
      fornecedores: totalPendingExpenses,
      totalPayable: totalCourierPayable + totalPendingExpenses,
      totalReceivable:
        totalFiadoReceivable + totalCourierToReceive + totalPendingIncome,
    };
  }, [customers, courierDebts, manualRecords]);

  const dailyRevenue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders
      .filter(
        (o) =>
          new Date(o.createdAt) >= today &&
          (o.status === "delivered" || o.status === "finished"),
      )
      .reduce((acc, o) => acc + o.total, 0);
  }, [orders]);

  const stats = useMemo(() => {
    const totalIncome = allRecords
      .filter(
        (r) =>
          r.type === "income" &&
          r.status === "paid" &&
          !(r.category || "").toLowerCase().includes("abertura"),
      )
      .reduce((acc, r) => acc + r.amount, 0);
    const totalExpense = allRecords
      .filter((r) => r.type === "expense" && r.status === "paid")
      .reduce((acc, r) => acc + r.amount, 0);
    const netProfit = totalIncome - totalExpense;
    return { totalIncome, totalExpense, netProfit };
  }, [allRecords]);

  const dailyCashFlowChartData = useMemo(() => {
    const data = [];
    const today = new Date();

    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateLabel = d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayIncome = allRecords
        .filter((r) => {
          const rDate = r.dueDate || r.date;
          const convertedDate = new Date(rDate);
          return (
            r.type === "income" &&
            r.status === "paid" &&
            convertedDate >= dayStart &&
            convertedDate <= dayEnd
          );
        })
        .reduce((acc, r) => acc + r.amount, 0);

      const dayExpense = allRecords
        .filter((r) => {
          const rDate = r.dueDate || r.date;
          const convertedDate = new Date(rDate);
          return (
            r.type === "expense" &&
            r.status === "paid" &&
            convertedDate >= dayStart &&
            convertedDate <= dayEnd
          );
        })
        .reduce((acc, r) => acc + r.amount, 0);

      data.push({
        name: dateLabel,
        income: dayIncome,
        expense: dayExpense,
      });
    }
    return data;
  }, [allRecords]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    const nextMonth = predictionDate.getMonth();
    const nextYear = predictionDate.getFullYear();

    const getMonthData = (month: number, year: number) => {
      const records = allRecords.filter((r) => {
        const rDate = r.dueDate || r.date;
        return rDate.getMonth() === month && rDate.getFullYear() === year;
      });

      const fiadoPredictions = customers.reduce((acc, c) => {
        if (c.balance <= 0) return acc;
        const latestDebit = c.history?.find((t) => t.type === "debit");
        if (latestDebit?.expectedPaymentDate) {
          const d = latestDebit.expectedPaymentDate;
          if (d.getMonth() === month && d.getFullYear() === year) {
            return acc + c.balance;
          }
        }
        return acc;
      }, 0);

      const income = records
        .filter(
          (r) =>
            r.type === "income" &&
            r.status === "paid" &&
            !(r.category || "").toLowerCase().includes("abertura"),
        )
        .reduce((acc, r) => acc + r.amount, 0);
      const expense = records
        .filter((r) => r.type === "expense" && r.status === "paid")
        .reduce((acc, r) => acc + r.amount, 0);
      const pendingIncome =
        records
          .filter((r) => r.type === "income" && r.status === "pending")
          .reduce((acc, r) => acc + r.amount, 0) + fiadoPredictions;
      const pendingExpense = records
        .filter((r) => r.type === "expense" && r.status === "pending")
        .reduce((acc, r) => acc + r.amount, 0);

      return {
        income,
        expense,
        balance: income - expense,
        pendingIncome,
        pendingExpense,
        totalPredicted: income + pendingIncome - (expense + pendingExpense),
      };
    };

    return {
      prev: getMonthData(prevMonth, prevYear),
      current: getMonthData(currentMonth, currentYear),
      next: getMonthData(nextMonth, nextYear),
    };
  }, [allRecords, predictionDate, customers]);

  const pieData = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const currentMonthExpenses = allRecords.filter((r) => {
      const rDate = r.dueDate || r.date;
      return (
        r.type === "expense" &&
        rDate.getMonth() === month &&
        rDate.getFullYear() === year
      );
    });

    const categoryMap: Record<string, number> = {};
    currentMonthExpenses.forEach((r) => {
      categoryMap[r.category] = (categoryMap[r.category] || 0) + r.amount;
    });

    const colors = [
      "#6366f1",
      "#f43f5e",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#64748b",
    ];

    return Object.entries(categoryMap)
      .map(([name, value], i) => ({
        name,
        value,
        color: colors[i % colors.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [allRecords]);

  const paymentMethodStats = useMemo(() => {
    const methodCounts: Record<
      string,
      { count: number; total: number; fees: number }
    > = {};

    orders
      .filter((o) => o.status === "delivered" || o.status === "finished")
      .forEach((order) => {
        const method = order.paymentMethod || "dinheiro";
        if (!methodCounts[method]) {
          methodCounts[method] = { count: 0, total: 0, fees: 0 };
        }

        methodCounts[method].count += 1;
        methodCounts[method].total += order.total;

        const config = adminSettings.paymentMethods?.find(
          (p) =>
            p.id === method ||
            p.name.toLowerCase() === method.toLowerCase() ||
            p.type === method,
        );
        if (config) {
          const fee =
            order.total * (config.feePercentage / 100) +
            (config.fixedFee || 0);
          methodCounts[method].fees += fee;
        } else {
          let fee = 0;
          if (method === "cartao_credito") fee = order.total * 0.032;
          else if (method === "cartao_debito") fee = order.total * 0.019;
          else if (method === "vale_refeicao") fee = order.total * 0.05;
          methodCounts[method].fees += fee;
        }
      });

    return Object.entries(methodCounts)
      .map(([id, data]) => {
        const config = adminSettings.paymentMethods?.find(
          (p) =>
            p.id === id ||
            p.name.toLowerCase() === id.toLowerCase() ||
            p.type === id,
        );
        const name = config
          ? config.name
          : id.charAt(0).toUpperCase() + id.slice(1).replace("_", " ");
        return {
          id,
          name,
          value: data.count,
          total: data.total,
          fees: data.fees,
          balance: data.total - data.fees,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [orders, adminSettings.paymentMethods]);

  const currentMonthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(new Date());
  const nextMonthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));

  return {
    activeView,
    setActiveView,
    itemsReportFilter,
    setItemsReportFilter,
    showAddModal,
    setShowAddModal,
    editingRecord,
    setEditingRecord,
    editingBank,
    setEditingBank,
    showAddBankModal,
    setShowAddBankModal,
    newBank,
    setNewBank,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    selectedFiado,
    setSelectedFiado,
    showCustomerDetailModal,
    setShowCustomerDetailModal,
    manualTransactionAmount,
    setManualTransactionAmount,
    manualTransactionDescription,
    setManualTransactionDescription,
    manualTransactionType,
    setManualTransactionType,
    expectedDate,
    setExpectedDate,
    showFiadoDateModal,
    setShowFiadoDateModal,
    formType,
    setFormType,
    selectedClosing,
    setSelectedClosing,
    predictionDate,
    setPredictionDate,
    agendaFilterDate,
    setAgendaFilterDate,
    agendaSearch,
    setAgendaSearch,
    agendaTab,
    setAgendaTab,
    showCourierSettleModal,
    setShowCourierSettleModal,
    selectedCourierDebt,
    setSelectedCourierDebt,
    amountReturned,
    setAmountReturned,
    showConfirmModal,
    setShowConfirmModal,
    confirmConfig,
    setConfirmConfig,
    toast,
    setToast,
    operatorSearch,
    setOperatorSearch,
    statementStartDate,
    setStatementStartDate,
    statementEndDate,
    setStatementEndDate,
    formAmount,
    setFormAmount,
    formCategory,
    setFormCategory,
    formDesc,
    setFormDesc,
    formStatus,
    setFormStatus,
    formDueDate,
    setFormDueDate,
    isRecurring,
    setIsRecurring,
    installments,
    setInstallments,
    formPaymentMethod,
    setFormPaymentMethod,
    quickType,
    setQuickType,
    quickAmount,
    setQuickAmount,
    quickCategory,
    setQuickCategory,
    quickPaymentMethod,
    setQuickPaymentMethod,
    quickDesc,
    setQuickDesc,
    showToast,
    confirmAction,
    handleQuickTypeChange,
    formatCurrency,
    incomeFromOrders,
    allRecords,
    courierDebts,
    financialProjection,
    dailyRevenue,
    stats,
    dailyCashFlowChartData,
    monthlyStats,
    pieData,
    paymentMethodStats,
    currentMonthName,
    nextMonthName,
  };
}
