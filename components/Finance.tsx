import React, { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FinancialRecord,
  Order,
  Customer,
  Courier,
  CustomerTransaction,
  CashClosingReport,
  BankAccount,
  Product,
  AdminSettings,
  CardOperator,
  CashSession,
} from "../types";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Plus,
  Search,
  Calendar,
  PieChart,
  ArrowRightLeft,
  FileText,
  CheckCircle2,
  X,
  Save,
  Trash2,
  Bike,
  Truck,
  ArrowRight,
  History,
  Building2,
  UserCircle,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  ClipboardList,
  Info,
  AlertCircle,
  Landmark,
  Printer,
  CreditCard,
  Smartphone,
  ChevronRight,
  Clock,
  Utensils,
  ShoppingBag,
  Receipt,
} from "lucide-react";
import { generateReceiptHtml } from "../services/printService";
import { maskCurrency, parseCurrency } from "../utils/masks";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart as RePieChart,
  Pie,
} from "recharts";

interface FinanceProps {
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

const Finance: React.FC<FinanceProps> = memo(
  ({
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
  }) => {
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
    const [itemsReportFilter, setItemsReportFilter] = useState<
      "day" | "week" | "month"
    >("day");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(
      null,
    );
    const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
    const [showAddBankModal, setShowAddBankModal] = useState(false);
    const [newBank, setNewBank] = useState<Partial<BankAccount>>({
      name: "",
      bankName: "",
      initialBalance: 0,
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
      "all",
    );
    const [filterStatus, setFilterStatus] = useState<
      "all" | "pending" | "paid"
    >("all");
    const [selectedFiado, setSelectedFiado] = useState<Customer | null>(null);
    const [showCustomerDetailModal, setShowCustomerDetailModal] =
      useState(false);
    const [manualTransactionAmount, setManualTransactionAmount] = useState("");
    const [manualTransactionDescription, setManualTransactionDescription] =
      useState("");
    const [manualTransactionType, setManualTransactionType] = useState<
      "credit" | "debit"
    >("debit");
    const [expectedDate, setExpectedDate] = useState(
      new Date().toISOString().split("T")[0],
    );
    const [showFiadoDateModal, setShowFiadoDateModal] = useState(false);
    const [formType, setFormType] = useState<"income" | "expense">("income");
    const [selectedClosing, setSelectedClosing] =
      useState<CashClosingReport | null>(null);
    const [predictionDate, setPredictionDate] = useState(() => {
      const d = new Date();
      d.setDate(1); // Fix: set day to 1 first to avoid month skipping on the 31st
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

    const [formAmount, setFormAmount] = useState("");
    const [formCategory, setFormCategory] = useState("Fornecedores");
    const [formDesc, setFormDesc] = useState("");
    const [formStatus, setFormStatus] = useState<"pending" | "paid">("paid");
    const [formDueDate, setFormDueDate] = useState(
      new Date().toISOString().split("T")[0],
    );
    const [isRecurring, setIsRecurring] = useState(false);
    const [installments, setInstallments] = useState("1");
    const [formPaymentMethod, setFormPaymentMethod] = useState("dinheiro");

    // Drill-down report state for cash closings
    const [selectedClosingMethodReport, setSelectedClosingMethodReport] = useState<{
      id: string;
      label: string;
    } | null>(null);
    const [financeReportSearch, setFinanceReportSearch] = useState("");

    // State for Lançamento Expresso
    const [quickType, setQuickType] = useState<"income" | "expense">("expense");
    const [quickAmount, setQuickAmount] = useState("");
    const [quickCategory, setQuickCategory] = useState("Fornecedores");
    const [quickPaymentMethod, setQuickPaymentMethod] = useState("dinheiro");
    const [quickDesc, setQuickDesc] = useState("");

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

    // Cálculos de Projeção Reais
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

        // O que o restaurante DEVE ao entregador (se positivo) ou o que o entregador DEVE ao restaurante (se negativo)
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

        // Adicionar previsões de Fiado baseadas na data esperada
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

          // Calculate fees based on adminSettings.paymentMethods
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
            // Default fees if not configured (backwards compatibility)
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

    const handleSaveRecord = () => {
      if (!formAmount || parseCurrency(formAmount) === 0 || !formDesc) return;

      const amount = parseCurrency(formAmount);
      const numInstallments = isRecurring ? parseInt(installments) || 1 : 1;
      const recurringId = isRecurring ? `rec-${Date.now()}` : undefined;
      const baseDueDate = new Date(formDueDate + "T12:00:00");

      if (editingRecord) {
        onUpdateRecord(editingRecord.id, {
          type: formType,
          amount: amount,
          category: formCategory,
          description: formDesc,
          status: formStatus,
          paymentMethod: formPaymentMethod,
          dueDate: baseDueDate,
        });
        showToast("Registro atualizado com sucesso!");
      } else if (isRecurring && numInstallments > 1) {
        for (let i = 1; i <= numInstallments; i++) {
          const date = new Date();
          const dueDate = new Date(baseDueDate);
          const originalDay = dueDate.getDate();
          dueDate.setDate(1);
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          const daysInMonth = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth() + 1,
            0,
          ).getDate();
          dueDate.setDate(Math.min(originalDay, daysInMonth));

          onAddRecord({
            type: formType,
            amount: amount,
            category: formCategory,
            description: `${formDesc} (${i}/${numInstallments})`,
            status: i === 1 && formStatus === "paid" ? "paid" : "pending",
            date: date,
            dueDate: dueDate,
            paymentMethod: formPaymentMethod,
            isRecurring: true,
            installments: numInstallments,
            currentInstallment: i,
            recurringId: recurringId,
          });
        }
      } else {
        onAddRecord({
          type: formType,
          amount: amount,
          category: formCategory,
          description: formDesc,
          status: formStatus,
          date: new Date(),
          dueDate: baseDueDate,
          paymentMethod: formPaymentMethod,
          isRecurring: isRecurring,
          installments: 1,
          currentInstallment: 1,
        });
      }

      setShowAddModal(false);
      setEditingRecord(null);
      setFormAmount("");
      setFormDesc("");
      setIsRecurring(false);
      setInstallments("1");
    };

    const handleEditRecord = (record: FinancialRecord) => {
      setEditingRecord(record);
      setFormType(record.type);
      setFormAmount(maskCurrency((record.amount * 100).toFixed(0)));
      setFormCategory(record.category);
      setFormDesc(record.description);
      setFormStatus(record.status || "paid");
      setFormPaymentMethod(record.paymentMethod || "dinheiro");
      setFormDueDate(
        record.dueDate
          ? new Date(record.dueDate).toISOString().split("T")[0]
          : new Date(record.date).toISOString().split("T")[0],
      );
      setIsRecurring(record.isRecurring || false);
      setInstallments(record.installments?.toString() || "1");
      setShowAddModal(true);
    };

    const handleQuickSave = () => {
      if (!quickAmount || parseCurrency(quickAmount) === 0 || !quickDesc) {
        showToast(
          "Preencha o valor e descrição para o Lançamento Expresso.",
          "error",
        );
        return;
      }
      const amount = parseCurrency(quickAmount);
      onAddRecord({
        type: quickType,
        amount: amount,
        category: quickCategory,
        description: quickDesc,
        status: "paid",
        date: new Date(),
        dueDate: new Date(),
        paymentMethod: quickPaymentMethod,
        isRecurring: false,
        installments: 1,
        currentInstallment: 1,
      });
      showToast(
        `Lançamento de ${quickType === "income" ? "Receita" : "Despesa"} de R$ ${amount.toFixed(2)} registrado!`,
        "success",
      );
      setQuickAmount("");
      setQuickDesc("");
    };

    const handleDeleteRecord = (id: string) => {
      confirmAction(
        "Excluir Lançamento",
        "Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.",
        () => {
          onDeleteRecord(id);
          showToast("Lançamento excluído com sucesso!");
        },
      );
    };

    const handleAddBankAccount = () => {
      if (!newBank.name || !newBank.bankName) return;

      if (editingBank) {
        onUpdateBank(editingBank.id, {
          ...newBank,
          currentBalance: newBank.initialBalance || 0,
        });
        showToast("Banco atualizado com sucesso!");
      } else {
        onAddBank({
          ...newBank,
          currentBalance: newBank.initialBalance || 0,
          createdAt: new Date(),
        });
      }

      setShowAddBankModal(false);
      setEditingBank(null);
      setNewBank({ name: "", bankName: "", initialBalance: 0 });
    };

    const handleEditBank = (bank: BankAccount) => {
      setEditingBank(bank);
      setNewBank({
        name: bank.name,
        bankName: bank.bankName,
        initialBalance: bank.initialBalance,
      });
      setShowAddBankModal(true);
    };

    const handleDeleteBank = (id: string) => {
      confirmAction(
        "Excluir Conta Bancária",
        "Tem certeza que deseja excluir esta conta bancária? Todos os dados vinculados a ela permanecerão, mas a conta não estará mais disponível.",
        () => {
          onDeleteBank(id);
          showToast("Conta bancária excluída com sucesso!");
        },
      );
    };

    const handleSettlePending = (recordId: string) => {
      onUpdateRecord(recordId, { status: "paid", date: new Date() });
      showToast("Conta liquidada com sucesso!");
    };

    const handleSettleFiado = (customer: Customer) => {
      const amount = customer.balance;
      const transaction: CustomerTransaction = {
        id: `baixa-${Date.now()}`,
        type: "credit",
        amount: amount,
        description: `Liquidação total de fiado via Financeiro`,
        date: new Date(),
        paymentMethod: "dinheiro",
      };

      onUpdateCustomer(customer.id, {
        balance: 0,
        history: [transaction, ...(customer.history || [])],
      });

      onAddRecord({
        type: "income",
        amount: amount,
        category: "Recebimento Fiado",
        description: `Baixa Financeira: ${customer.name}`,
        status: "paid",
        date: new Date(),
      });
      showToast(`Recebimento de R$ ${amount.toFixed(2)} registrado.`);
    };

    const handleSettleCourier = (courierId: string) => {
      const debt = courierDebts.find((d) => d.courier.id === courierId);
      if (!debt || debt.orderCount === 0) return;

      setSelectedCourierDebt(debt);
      setAmountReturned(debt.cashHand.toFixed(2).replace(".", ","));
      setShowCourierSettleModal(true);
    };

    const confirmCourierSettle = () => {
      if (!selectedCourierDebt) return;

      const returned = parseCurrency(amountReturned);
      const { courier, cashHand, totalFees, totalDaily } = selectedCourierDebt;

      // Lógica solicitada:
      // Saldo Final = (Taxas + Diária) - (Dinheiro na Rua - Valor Devolvido)
      const remainingDebt = cashHand - returned;
      const finalBalance = totalFees + totalDaily - remainingDebt;

      const courierOrders = orders.filter(
        (o) =>
          o.courierId === courier.id &&
          o.status === "delivered" &&
          o.type === "delivery" &&
          !o.isSettled,
      );
      const orderIds = courierOrders.map((o) => o.id);

      onSettleOrders(orderIds);

      // Se finalBalance > 0: Restaurante paga ao entregador (Despesa)
      // Se finalBalance < 0: Entregador paga ao restaurante (Receita)
      if (Math.abs(finalBalance) > 0.01) {
        onAddRecord({
          type: finalBalance > 0 ? "expense" : "income",
          amount: Math.abs(finalBalance),
          category: "Acerto Entregador",
          description: `Acerto: ${courier.name} (${orderIds.length} entregas). Devolvido: R$ ${returned.toFixed(2)}`,
          status: "paid",
          date: new Date(),
        });
      }

      setShowCourierSettleModal(false);
      setSelectedCourierDebt(null);
      showToast(`Acerto de ${courier.name} realizado com sucesso!`);
    };

    const handleManualCustomerTransaction = () => {
      if (!selectedFiado || !manualTransactionAmount) return;
      const amount = parseCurrency(manualTransactionAmount);
      if (amount <= 0) return;

      const newTransaction: CustomerTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: manualTransactionType,
        amount,
        description:
          manualTransactionDescription ||
          (manualTransactionType === "credit"
            ? "Crédito Manual"
            : "Débito Manual"),
        date: new Date(),
      };

      const updatedHistory = [newTransaction, ...(selectedFiado.history || [])];
      const updatedBalance =
        manualTransactionType === "debit"
          ? selectedFiado.balance + amount
          : selectedFiado.balance - amount;

      onUpdateCustomer(selectedFiado.id, {
        history: updatedHistory,
        balance: updatedBalance,
      });

      // If it's a credit (payment), we should also record it in the financial records
      if (manualTransactionType === "credit") {
        onAddRecord({
          type: "income",
          amount,
          category: "Pagamento Fiado",
          description: `Pagamento manual de ${selectedFiado.name}: ${manualTransactionDescription}`,
          date: new Date(),
          status: "paid",
        });
      }

      setManualTransactionAmount("");
      setManualTransactionDescription("");
      showToast("Transação realizada com sucesso!");
    };

    const handleSetFiadoDate = () => {
      if (!selectedFiado) return;

      const updatedHistory = [...(selectedFiado.history || [])];
      let latestFiadoIndex = updatedHistory.findIndex(
        (t) => t.type === "debit",
      );

      if (latestFiadoIndex === -1 && selectedFiado.balance > 0) {
        const newDebit: CustomerTransaction = {
          id: `auto-debit-${Date.now()}`,
          type: "debit",
          amount: selectedFiado.balance,
          description: "Saldo Devedor Consolidado",
          date: new Date(),
        };
        updatedHistory.unshift(newDebit);
        latestFiadoIndex = 0;
      }

      if (latestFiadoIndex !== -1) {
        updatedHistory[latestFiadoIndex] = {
          ...updatedHistory[latestFiadoIndex],
          expectedPaymentDate: new Date(expectedDate + "T12:00:00"),
        };

        onUpdateCustomer(selectedFiado.id, {
          history: updatedHistory,
        });

        setShowFiadoDateModal(false);
        setSelectedFiado({
          ...selectedFiado,
          history: updatedHistory
        });
        showToast("Previsão de pagamento atualizada!");
      } else {
        setShowFiadoDateModal(false);
        showToast("Selecione um cliente com saldo devedor ou histórico de débitos.");
      }
    };

    const itemsReportData = useMemo(() => {
      const now = new Date();
      const startOfPeriod = new Date(now);

      if (itemsReportFilter === "day") {
        startOfPeriod.setHours(0, 0, 0, 0);
      } else if (itemsReportFilter === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startOfPeriod.setDate(diff);
        startOfPeriod.setHours(0, 0, 0, 0);
      } else if (itemsReportFilter === "month") {
        startOfPeriod.setDate(1);
        startOfPeriod.setHours(0, 0, 0, 0);
      }

      const filteredOrders = orders.filter(
        (o) =>
          (o.status === "delivered" || o.status === "finished") &&
          new Date(o.createdAt) >= startOfPeriod,
      );

      const report: Record<
        string,
        {
          name: string;
          quantity: number;
          totalSales: number;
          totalCost: number;
          unitPrice: number;
          unitCost: number;
        }
      > = {};

      filteredOrders.forEach((order) => {
        order.items.forEach((item) => {
          if (!report[item.productId]) {
            const product = products.find((p) => p.id === item.productId);
            report[item.productId] = {
              name: item.name,
              quantity: 0,
              totalSales: 0,
              totalCost: 0,
              unitPrice: item.price,
              unitCost: product?.cost || 0,
            };
          }
          const product = products.find((p) => p.id === item.productId);
          const cost = product?.cost || 0;

          report[item.productId].quantity += item.quantity;
          report[item.productId].totalSales += item.price * item.quantity;
          report[item.productId].totalCost += cost * item.quantity;
        });
      });

      return Object.entries(report)
        .map(([productId, data]) => ({
          productId,
          ...data,
        }))
        .sort((a, b) => b.totalSales - a.totalSales);
    }, [orders, products, itemsReportFilter]);

    const filteredRecords = allRecords.filter((r) => {
      const matchesSearch =
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === "all" || r.type === filterType;
      const matchesStatus = filterStatus === "all" || r.status === filterStatus;
      return matchesSearch && matchesFilter && matchesStatus;
    });

    return (
      <div className="space-y-2 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="flex bg-white p-1 rounded-xl border shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
            <div className="flex flex-nowrap min-w-max">
              {[
                { id: "overview", label: "Dashboard", icon: PieChart },
                { id: "agenda", label: "Contas Pagar/Receber", icon: Calendar },
                { id: "transactions", label: "Extrato", icon: ArrowRightLeft },
                { id: "banks", label: "Bancos", icon: Landmark },
                { id: "closings", label: "Caixa", icon: ClipboardList },
                { id: "payment-methods", label: "Taxas", icon: CreditCard },
                { id: "fees-report", label: "Relatório Taxas", icon: FileText },
                { id: "items-report", label: "Produtos", icon: FileText },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeView === tab.id
                      ? "text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {activeView === tab.id && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-indigo-600 rounded-xl"
                      transition={{
                        type: "spring",
                        bounce: 0.15,
                        duration: 0.5,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <tab.icon
                      size={13}
                      strokeWidth={activeView === tab.id ? 3.5 : 2}
                    />
                    {tab.label}
                    {activeView === tab.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-1 h-1 bg-white rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2"
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
          >
            <Plus size={16} strokeWidth={3} /> Novo Lançamento
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {activeView === "overview" && (
              <div className="space-y-4">
                {/* Top Hero Section: Projected Balance & Main KPIs */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Main Projected Balance Card */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="lg:col-span-7 xl:col-span-8 bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[300px]"
                  >
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]"></div>
                    <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-[80px]"></div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-10">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                              Balanço Projetado
                            </p>
                          </div>
                          <h2 className="text-4xl md:text-6xl font-black tracking-tighter tabular-nums leading-none">
                            {formatCurrency(
                              stats.netProfit +
                                financialProjection.totalReceivable -
                                financialProjection.totalPayable,
                            )}
                          </h2>
                        </div>
                        <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 hidden md:block">
                          <Wallet size={24} className="text-indigo-300" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                        <div className="flex items-center gap-4 group">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-all">
                            <ArrowDownCircle size={20} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Passivo Total
                            </p>
                            <p className="text-xl font-black text-white tabular-nums">
                              {formatCurrency(financialProjection.totalPayable)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            <ArrowUpCircle size={20} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Ativo Total
                            </p>
                            <p className="text-xl font-black text-white tabular-nums">
                              {formatCurrency(
                                financialProjection.totalReceivable,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Vertical KPI Group */}
                  <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                    {/* Revenue Card */}
                    <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex flex-col justify-between flex-1 group hover:border-emerald-200 transition-all hover:shadow-xl hover:shadow-emerald-50/50">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                              Faturamento (Mês)
                            </p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">
                              {formatCurrency(monthlyStats.current.income)}
                            </h3>
                          </div>
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:rotate-12 transition-transform">
                            <TrendingUp size={20} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min((monthlyStats.current.income / (monthlyStats.prev.income || 1)) * 100, 100)}%`,
                              }}
                              className="h-full bg-emerald-500"
                              transition={{ duration: 1, ease: "easeOut" }}
                            />
                          </div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tabular-nums">
                            {(
                              (monthlyStats.current.income /
                                (monthlyStats.prev.income || 1) -
                                1) *
                              100
                            ).toFixed(1)}
                            % ↑
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cash Status Card */}
                    <div
                      className={`p-6 rounded-[2.5rem] border-2 shadow-sm flex flex-col justify-between flex-1 group transition-all ${cashSession.isOpen ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p
                            className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${cashSession.isOpen ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            Status do Caixa
                          </p>
                          <h3
                            className={`text-2xl font-black tracking-tighter ${cashSession.isOpen ? "text-emerald-800" : "text-rose-800"}`}
                          >
                            {cashSession.isOpen ? "ABERTO" : "FECHADO"}
                          </h3>
                        </div>
                        <div
                          className={`p-3 rounded-2xl ${cashSession.isOpen ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"} shadow-lg`}
                        >
                          {cashSession.isOpen ? (
                            <TrendingUp size={20} />
                          ) : (
                            <X size={20} />
                          )}
                        </div>
                      </div>
                      <div>
                        {cashSession.isOpen ? (
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                              Desde{" "}
                              {new Date(
                                cashSession.openedAt!,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-sm font-black text-emerald-900 leading-none">
                              R$ {cashSession.openingValue.toFixed(2)} Inicial
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                            Aguardando Abertura
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Profit Card */}
                    <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex flex-col justify-between flex-1 group hover:border-indigo-100 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                            Margem de Lucro
                          </p>
                          <h3 className="text-3xl font-black text-slate-800 tracking-tighter tabular-nums">
                            {(
                              (stats.netProfit /
                                (monthlyStats.current.income || 1)) *
                              100
                            ).toFixed(1)}
                            %
                          </h3>
                        </div>
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl border">
                          <TrendingDown size={20} className="rotate-180" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-slate-400">
                          <span>Ponto de Equilíbrio</span>
                          <span className="text-slate-600 font-black">
                            {(
                              (monthlyStats.current.expense /
                                (monthlyStats.current.income || 1)) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(monthlyStats.current.expense / (monthlyStats.current.income || 1)) * 100}%`,
                            }}
                            className={`h-full ${monthlyStats.current.expense / monthlyStats.current.income < 0.7 ? "bg-indigo-400" : "bg-rose-400"}`}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lançamento Financeiro Expresso ⚡ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-6 md:p-8 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2 leading-none">
                        <span className="bg-indigo-600 p-2 rounded-2xl text-white shadow-xl shadow-indigo-100 flex items-center justify-center">
                          <TrendingUp size={16} />
                        </span>
                        Lançamento Expresso ⚡
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 ml-1">
                        Registre despesas ou receitas sem abrir modais com
                        apenas alguns cliques
                      </p>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-2xl border">
                      <button
                        type="button"
                        onClick={() => handleQuickTypeChange("expense")}
                        className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${quickType === "expense" ? "bg-rose-500 text-white shadow-lg shadow-rose-100" : "text-slate-400"}`}
                      >
                        Despesa 🔴
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickTypeChange("income")}
                        className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${quickType === "income" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" : "text-slate-400"}`}
                      >
                        Receita 🟢
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                    {/* Step 1: Valor */}
                    <div className="lg:col-span-3 space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                        1. Valor (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-black">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-black text-slate-800 text-lg shadow-inner"
                          value={quickAmount}
                          onChange={(e) =>
                            setQuickAmount(maskCurrency(e.target.value))
                          }
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    {/* Step 2: Categoria & Atalhos */}
                    <div className="lg:col-span-5 space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                        2. Atalhos Rápidos & Categoria
                      </label>
                      <div className="space-y-2">
                        {/* Quick click shortcuts */}
                        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          {(quickType === "expense"
                            ? [
                                {
                                  label: "Mercado 🛒",
                                  category: "Fornecedores",
                                  desc: "Mercado semanal",
                                },
                                {
                                  label: "Água/Luz 💡",
                                  category: "Utilidades",
                                  desc: "Conta utilidades",
                                },
                                {
                                  label: "Bebidas 🥤",
                                  category: "Fornecedores",
                                  desc: "Fornecedor de Bebidas",
                                },
                                {
                                  label: "Carnes 🥩",
                                  category: "Fornecedores",
                                  desc: "Fornecedor de Carnes",
                                },
                                {
                                  label: "Internet 🌐",
                                  category: "Utilidades",
                                  desc: "Internet do estabelecimento",
                                },
                                {
                                  label: "Embalagens 📦",
                                  category: "Fornecedores",
                                  desc: "Embalagens e descartáveis",
                                },
                              ]
                            : [
                                {
                                  label: "Suprimento 💵",
                                  category: "Suprimento",
                                  desc: "Aporte troco Inicial",
                                },
                                {
                                  label: "Aporte 💳",
                                  category: "Aportes",
                                  desc: "Aporte de Capital",
                                },
                                {
                                  label: "Reembolso 🔄",
                                  category: "Reembolsos",
                                  desc: "Reembolso recebido",
                                },
                                {
                                  label: "Venda Offline 🛍️",
                                  category: "Vendas PDV",
                                  desc: "Venda manual externa",
                                },
                              ]
                          ).map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setQuickCategory(item.category);
                                setQuickDesc(item.desc);
                              }}
                              className="bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-colors px-2 py-1 rounded-lg text-[8px] font-bold text-slate-600 border shadow-2xs"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        <select
                          className="w-full px-3 py-2 bg-slate-50 border rounded-2xl font-bold text-xs"
                          value={quickCategory}
                          onChange={(e) => setQuickCategory(e.target.value)}
                        >
                          {quickType === "expense"
                            ? [
                                "Fornecedores",
                                "Utilidades",
                                "Aluguel",
                                "Salários",
                                "Impostos",
                                "Sangria",
                                "Folha de Pagamento",
                                "Manutenção",
                                "Outros",
                              ].map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))
                            : [
                                "Vendas PDV",
                                "Suprimento",
                                "Fechamento de Caixa",
                                "Aportes",
                                "Reembolsos",
                              ].map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                        </select>
                      </div>
                    </div>

                    {/* Step 3: Descrição e Pagamento */}
                    <div className="lg:col-span-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                          3. O que é ou Quem?
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-xs shadow-inner"
                          value={quickDesc}
                          onChange={(e) => setQuickDesc(e.target.value)}
                          placeholder="Ex: Coca Cola Distribuidora"
                        />
                      </div>

                      <div className="flex gap-2">
                        <select
                          className="flex-1 px-2 py-2 bg-slate-50 border rounded-2xl font-bold text-[10px]"
                          value={quickPaymentMethod}
                          onChange={(e) =>
                            setQuickPaymentMethod(e.target.value)
                          }
                        >
                          <option value="dinheiro">Dinheiro (Caixa)</option>
                          <option value="pix">PIX / Transf.</option>
                          <option value="cartao_credito">Crédito</option>
                          <option value="cartao_debito">Débito</option>
                          <option value="vale_refeicao">Vale R.</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleQuickSave}
                          className={`px-4 py-2 rounded-2xl font-black uppercase text-[10px] tracking-wider text-white shadow-xl flex items-center justify-center gap-1 transition-all hover:scale-[1.03] ${quickType === "expense" ? "bg-rose-600 shadow-rose-100" : "bg-emerald-600 shadow-emerald-100"}`}
                        >
                          Lançar ⚡
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Middle Section: Cash Flow Chart & Attention List */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Cash Flow Area Chart */}
                  <div className="xl:col-span-2 bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 leading-none">
                          <Plus size={20} className="text-emerald-500" /> Fluxo
                          de Caixa Diário
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Visão dos últimos 15 dias de operação
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Receitas
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-200 border-2 border-white"></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Despesas
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyCashFlowChartData}>
                          <defs>
                            <linearGradient
                              id="colorIncome"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#10b981"
                                stopOpacity={0.15}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10b981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                            <linearGradient
                              id="colorExpense"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#f43f5e"
                                stopOpacity={0.05}
                              />
                              <stop
                                offset="95%"
                                stopColor="#f43f5e"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                          />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 10,
                              fontWeight: 900,
                              fill: "#94a3b8",
                            }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 10,
                              fontWeight: 900,
                              fill: "#94a3b8",
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "24px",
                              border: "none",
                              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
                              padding: "16px",
                            }}
                            itemStyle={{
                              fontSize: "12px",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="income"
                            stroke="#10b981"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorIncome)"
                            name="Receitas"
                          />
                          <Area
                            type="monotone"
                            dataKey="expense"
                            stroke="#f43f5e"
                            strokeWidth={2}
                            strokeDasharray="6 6"
                            fillOpacity={1}
                            fill="url(#colorExpense)"
                            name="Despesas"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Attention Needed & Health Score */}
                  <div className="flex flex-col gap-6">
                    {/* Health Score Card */}
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex-1 shadow-xl shadow-indigo-100">
                      <div className="absolute right-0 bottom-0 opacity-10 -rotate-12 translate-x-1/4 translate-y-1/4">
                        <TrendingUp size={200} />
                      </div>
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">
                            Score Financeiro
                          </p>
                          <div className="flex items-baseline gap-2">
                            <h4 className="text-6xl font-black tracking-tighter">
                              84
                            </h4>
                            <span className="text-xl font-black text-indigo-400">
                              / 100
                            </span>
                          </div>
                          <p className="text-xs font-bold text-indigo-100 mt-4 leading-relaxed opacity-80 uppercase tracking-widest">
                            Sua saúde financeira está excelente. Continue
                            monitorando as dependências.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Attention Card */}
                    <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex-1">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm shadow-amber-50">
                          <AlertCircle size={20} />
                        </div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">
                          Atenção Prioritária
                        </h4>
                      </div>

                      <div className="space-y-4">
                        {manualRecords.filter(
                          (r) =>
                            r.status === "pending" &&
                            r.dueDate &&
                            new Date(r.dueDate) < new Date(),
                        ).length > 0 ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveView("agenda")}
                            className="w-full bg-rose-50 p-4 rounded-3xl border border-rose-100 text-left group transition-all hover:bg-rose-100"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">
                                Contas Vencidas
                              </p>
                              <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-lg uppercase tracking-widest animate-pulse">
                                Crítico
                              </span>
                            </div>
                            <p className="text-xl font-black text-rose-900 tabular-nums">
                              {formatCurrency(
                                manualRecords
                                  .filter(
                                    (r) =>
                                      r.status === "pending" &&
                                      r.dueDate &&
                                      new Date(r.dueDate) < new Date(),
                                  )
                                  .reduce((acc, r) => acc + r.amount, 0),
                              )}
                            </p>
                          </motion.button>
                        ) : (
                          <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100">
                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">
                              Contas em Dia
                            </p>
                            <p className="text-xs font-bold text-emerald-600">
                              Não há contas vencidas hoje.
                            </p>
                          </div>
                        )}

                        {/* Latest Cash Closure Widget */}
                        {cashClosings.length > 0 && (
                          <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                              <History size={14} className="text-indigo-600" />
                              <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                                Último Fechamento
                              </h5>
                            </div>
                            {(() => {
                              const last = cashClosings.sort(
                                (a, b) =>
                                  new Date(b.closedAt).getTime() -
                                  new Date(a.closedAt).getTime(),
                              )[0];
                              return (
                                <button
                                  onClick={() => {
                                    setSelectedClosing(last);
                                    setActiveView("closings");
                                  }}
                                  className="w-full bg-slate-50 p-4 rounded-3xl border border-slate-100 text-left hover:bg-slate-100 transition-all group"
                                >
                                  <div className="flex justify-between mb-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">
                                      {new Date(
                                        last.closedAt,
                                      ).toLocaleDateString()}
                                    </p>
                                    <span
                                      className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${last.difference >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                                    >
                                      {last.difference >= 0
                                        ? "Sobra"
                                        : "Quebra"}
                                      :{" "}
                                      {formatCurrency(
                                        Math.abs(last.difference),
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <p className="text-base font-black text-slate-800">
                                      {formatCurrency(last.actualValue)}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">
                                      Vendas: {formatCurrency(last.totalSales)}
                                    </p>
                                  </div>
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Bike size={16} className="text-indigo-600" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Entregadores em Rota
                        </span>
                      </div>
                      <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-700 tracking-tighter">
                        {courierDebts.filter((d) => d.cashHand > 0).length}{" "}
                        ativos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Margins & Expenses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm group">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                          <Info size={16} className="text-indigo-600" /> Onde
                          seu dinheiro está indo
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Distribuição de custos mensal
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="w-full md:w-1/2 h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={8}
                              dataKey="value"
                              stroke="none"
                            >
                              {pieData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: "24px",
                                border: "none",
                                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                                fontWeight: "black",
                                fontSize: "10px",
                              }}
                            />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2 space-y-3">
                        {pieData.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-3 rounded-2xl hover:bg-slate-50 transition-all cursor-default"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full shadow-sm"
                                style={{ backgroundColor: item.color }}
                              ></div>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-slate-900 tabular-nums">
                              {formatCurrency(item.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute right-0 top-0 p-8 opacity-10 rotate-12 scale-150">
                      <PieChart size={120} className="text-indigo-400" />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-lg font-black text-white flex items-center gap-2 mb-2">
                        Margens do Cardápio
                      </h3>
                      <p className="text-xs font-bold text-indigo-300/60 uppercase tracking-widest mb-8">
                        Baseado no custo de produção vs preço de venda
                      </p>

                      <div className="space-y-6">
                        {products.slice(0, 3).map((product, i) => {
                          const marginPercent =
                            ((product.price - product.cost) / product.price) *
                            100;
                          return (
                            <div key={i} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {product.name}
                                </span>
                                <span className="text-[10px] font-black text-white">
                                  {marginPercent.toFixed(1)}% de margem
                                </span>
                              </div>
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${marginPercent}%` }}
                                  className={`h-full ${marginPercent > 60 ? "bg-emerald-500" : marginPercent > 30 ? "bg-indigo-500" : "bg-rose-500"}`}
                                  transition={{
                                    duration: 1,
                                    ease: "easeOut",
                                    delay: i * 0.1,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ x: 10 }}
                      onClick={() => setActiveView("items-report")}
                      className="relative z-10 mt-8 flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors"
                    >
                      Ver Relatório Completo <ArrowRight size={14} />
                    </motion.button>
                  </div>
                </div>

                {/* Report for Payment Methods */}
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Wallet size={16} className="text-indigo-600" />{" "}
                        Desempenho por Forma de Pagamento
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Análise de volume, taxas e saldo real
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={paymentMethodStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="total"
                            stroke="none"
                          >
                            {paymentMethodStats.map((entry, index) => (
                              <Cell
                                key={`cell-pm-${index}`}
                                fill={
                                  [
                                    "#6366f1",
                                    "#10b981",
                                    "#f59e0b",
                                    "#f43f5e",
                                    "#8b5cf6",
                                    "#ec4899",
                                  ][index % 6]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: "24px",
                              border: "none",
                              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                              fontWeight: "black",
                              fontSize: "10px",
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      {paymentMethodStats.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                              <DollarSign size={18} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                                {item.name}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">
                                {item.value} pedidos
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-900">
                              {formatCurrency(item.total)}
                            </p>
                            {item.fees > 0 && (
                              <p className="text-[8px] font-bold text-rose-500 uppercase">
                                -{formatCurrency(item.fees)} (Taxas)
                              </p>
                            )}
                            <p className="text-[9px] font-black text-emerald-600 uppercase mt-0.5">
                              Líquido: {formatCurrency(item.balance)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === "agenda" && (() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const getSafeDate = (d: any) => {
                if (!d) return null;
                const dObj = d instanceof Date ? d : new Date(d);
                return isNaN(dObj.getTime()) ? null : dObj;
              };

              // --- Dynamic Totals & Overdue Calculations ---
              
              // 1. Manual pending income/expense records
              const manualPendingIncomes = manualRecords.filter(r => r.type === "income" && r.status === "pending");
              const manualPendingExpenses = manualRecords.filter(r => r.type === "expense" && r.status === "pending");

              // 2. Customers with outstanding balances (Fiados)
              const outstandingCustomers = customers.filter(c => c.balance > 0);

              // 3. Courier bills (balance > 0 means company owes courier, balance < 0 means courier owes company)
              const activeCourierBills = courierDebts;

              // Overdue manual records
              const overdueIncomes = manualPendingIncomes.filter(r => {
                const d = getSafeDate(r.dueDate);
                return d && d < today;
              });

              const overdueExpenses = manualPendingExpenses.filter(r => {
                const d = getSafeDate(r.dueDate);
                return d && d < today;
              });

              // Overdue fiados
              const overdueCustomers = outstandingCustomers.filter(c => {
                const latestDebit = c.history?.find(t => t.type === "debit");
                if (!latestDebit?.expectedPaymentDate) return false;
                const d = getSafeDate(latestDebit.expectedPaymentDate);
                return d && d < today;
              });

              const overdueCount = overdueIncomes.length + overdueExpenses.length + overdueCustomers.length;
              const overdueAmount = 
                overdueIncomes.reduce((acc, r) => acc + r.amount, 0) + 
                overdueExpenses.reduce((acc, r) => acc + r.amount, 0) + 
                overdueCustomers.reduce((acc, c) => acc + c.balance, 0);

              // --- Filtered items by Search, Month, and agendaTab ---
              const matchesSearch = (text?: string) => {
                if (!agendaSearch) return true;
                return text?.toLowerCase().includes(agendaSearch.toLowerCase());
              };

              const matchesMonth = (dueDateVal: any) => {
                if (!agendaFilterDate) return true;
                const d = getSafeDate(dueDateVal);
                if (!d) return false;
                return d.getMonth() === agendaFilterDate.month && d.getFullYear() === agendaFilterDate.year;
              };

              // Map & Filter Receivables
              const filteredFiadosList = outstandingCustomers.filter(c => {
                const nameMatches = matchesSearch(c.name);
                const latestDebit = c.history?.find(t => t.type === "debit");
                const hasDate = latestDebit?.expectedPaymentDate;
                const dateMatches = hasDate ? matchesMonth(latestDebit.expectedPaymentDate) : !agendaFilterDate;
                
                // If tab is "overdue", only allow if really overdue
                if (agendaTab === "overdue") {
                  if (!hasDate) return false;
                  const dObj = getSafeDate(latestDebit.expectedPaymentDate);
                  if (!dObj || dObj >= today) return false;
                }

                return nameMatches && dateMatches;
              });

              const filteredCourierToReceive = agendaFilterDate ? [] : activeCourierBills.filter(d => d.balance < 0).filter(d => {
                if (agendaTab === "overdue") return false; 
                return matchesSearch(d.courier.name);
              });

              const filteredManualIncomes = manualPendingIncomes.filter(r => {
                const matchesText = matchesSearch(r.description) || matchesSearch(r.category);
                const matchesTime = matchesMonth(r.dueDate);
                
                if (agendaTab === "overdue") {
                  const d = getSafeDate(r.dueDate);
                  if (!d || d >= today) return false;
                }

                return matchesText && matchesTime;
              });

              // Map & Filter Payables
              const filteredCourierToPay = agendaFilterDate ? [] : activeCourierBills.filter(d => d.balance > 0).filter(d => {
                if (agendaTab === "overdue") return false;
                return matchesSearch(d.courier.name);
              });

              const filteredManualExpenses = manualPendingExpenses.filter(r => {
                const matchesText = matchesSearch(r.description) || matchesSearch(r.category);
                const matchesTime = matchesMonth(r.dueDate);

                if (agendaTab === "overdue") {
                  const d = getSafeDate(r.dueDate);
                  if (!d || d >= today) return false;
                }

                return matchesText && matchesTime;
              });

              // Dynamic totals of currently visible/filtered items
              const visibleReceivablesTotal = 
                filteredFiadosList.reduce((acc, c) => acc + (c.balance || 0), 0) +
                filteredCourierToReceive.reduce((acc, d) => acc + Math.abs(d.balance || 0), 0) +
                filteredManualIncomes.reduce((acc, r) => acc + (r.amount || 0), 0);

              const visiblePayablesTotal = 
                filteredCourierToPay.reduce((acc, d) => acc + (d.balance || 0), 0) +
                filteredManualExpenses.reduce((acc, r) => acc + (r.amount || 0), 0);

              const currentBalance = visibleReceivablesTotal - visiblePayablesTotal;
              
              // Filter lists based on selected Tab
              const showReceivables = agendaTab === "all" || agendaTab === "receivable" || agendaTab === "overdue";
              const showPayables = agendaTab === "all" || agendaTab === "payable" || agendaTab === "overdue";

              return (
                <div className="space-y-4 animate-in fade-in duration-300">
                  
                  {/* OVERVIEW CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* A Receber Card */}
                    <div 
                      onClick={() => setAgendaTab("receivable")}
                      className={`cursor-pointer group relative p-4 rounded-2xl border transition-all ${
                        agendaTab === "receivable" 
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-100" 
                          : "bg-white text-slate-800 hover:bg-emerald-50/40 hover:border-emerald-200 border-slate-100 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${agendaTab === "receivable" ? "text-emerald-100" : "text-slate-400 group-hover:text-emerald-600"}`}>
                            Compromissos a Receber
                          </p>
                          <h4 className="text-xl font-extrabold mt-1 tracking-tight">
                            R$ {(visibleReceivablesTotal ?? 0).toFixed(2)}
                          </h4>
                          <p className={`text-[8px] mt-0.5 font-bold ${agendaTab === "receivable" ? "text-emerald-200" : "text-slate-400"}`}>
                            Fiados, Entregadores e Entradas
                          </p>
                        </div>
                        <div className={`p-2 rounded-xl ${agendaTab === "receivable" ? "bg-emerald-500/30 text-white" : "bg-emerald-50 text-emerald-600"}`}>
                          <ArrowUpCircle size={18} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                    {/* A Pagar Card */}
                    <div 
                      onClick={() => setAgendaTab("payable")}
                      className={`cursor-pointer group relative p-4 rounded-2xl border transition-all ${
                        agendaTab === "payable" 
                          ? "bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-100" 
                          : "bg-white text-slate-800 hover:bg-rose-50/45 hover:border-rose-200 border-slate-100 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${agendaTab === "payable" ? "text-rose-100" : "text-slate-400 group-hover:text-rose-600"}`}>
                            Compromissos a Pagar
                          </p>
                          <h4 className="text-xl font-extrabold mt-1 tracking-tight">
                            R$ {(visiblePayablesTotal ?? 0).toFixed(2)}
                          </h4>
                          <p className={`text-[8px] mt-0.5 font-bold ${agendaTab === "payable" ? "text-rose-200" : "text-slate-400"}`}>
                            Fornecedores e Diárias
                          </p>
                        </div>
                        <div className={`p-2 rounded-xl ${agendaTab === "payable" ? "bg-rose-500/30 text-white" : "bg-rose-50 text-rose-600"}`}>
                          <ArrowDownCircle size={18} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                    {/* Saldo Líquido Card */}
                    <div 
                      onClick={() => setAgendaTab("all")}
                      className={`cursor-pointer group relative p-4 rounded-2xl border transition-all ${
                        agendaTab === "all" 
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100" 
                          : "bg-white text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-200 border-slate-100 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${agendaTab === "all" ? "text-indigo-100" : "text-slate-400 group-hover:text-indigo-600"}`}>
                            Saldo Estimado
                          </p>
                          <h4 className="text-xl font-extrabold mt-1 tracking-tight">
                            R$ {(currentBalance ?? 0).toFixed(2)}
                          </h4>
                          <p className={`text-[8px] mt-0.5 font-bold ${agendaTab === "all" ? "text-indigo-200" : "text-slate-400"}`}>
                            Diferença (Entradas - Saídas)
                          </p>
                        </div>
                        <div className={`p-2 rounded-xl ${agendaTab === "all" ? "bg-indigo-500/30 text-white" : "bg-indigo-50 text-indigo-600"}`}>
                          <DollarSign size={18} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                    {/* Contas Vencidas Card */}
                    <div 
                      onClick={() => setAgendaTab("overdue")}
                      className={`cursor-pointer group relative p-4 rounded-2xl border transition-all ${
                        agendaTab === "overdue" 
                          ? "bg-amber-600 text-white border-amber-700 shadow-lg shadow-amber-100" 
                          : "bg-white text-slate-800 hover:bg-rose-50/50 hover:border-rose-300 border-slate-100 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${agendaTab === "overdue" ? "text-amber-100" : "text-slate-400 group-hover:text-rose-600"}`}>
                              Contas Vencidas ⚠️
                            </p>
                            {overdueCount > 0 && (
                              <span className="flex h-1.5 w-1.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
                              </span>
                            )}
                          </div>
                          <h4 className={`text-xl font-extrabold mt-1 tracking-tight ${overdueCount > 0 && agendaTab !== "overdue" ? "text-rose-600" : ""}`}>
                            R$ {(overdueAmount ?? 0).toFixed(2)}
                          </h4>
                          <p className={`text-[8px] mt-0.5 font-bold ${agendaTab === "overdue" ? "text-amber-200" : "text-slate-400"}`}>
                            {overdueCount} {overdueCount === 1 ? "título inadimplente" : "títulos inadimplentes"}
                          </p>
                        </div>
                        <div className={`p-2 rounded-xl ${agendaTab === "overdue" ? "bg-amber-500/30 text-white" : "bg-rose-50 text-rose-600"}`}>
                          <AlertTriangle size={18} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* SEARCH AND FILTERS TOOLBAR */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 shadow-inner">
                    
                    {/* Direction Pilling */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border shadow-sm w-full md:w-auto overflow-x-auto">
                      {[
                        { id: "all", label: "Todas", color: "text-slate-700 bg-slate-100" },
                        { id: "receivable", label: "A Receber 🟢", color: "text-emerald-700 bg-emerald-50" },
                        { id: "payable", label: "A Pagar 🔴", color: "text-rose-700 bg-rose-50" },
                        { id: "overdue", label: "Apenas Vencidas ⚠️", color: "text-amber-800 bg-amber-50" }
                      ].map((pill) => (
                        <button
                          key={pill.id}
                          onClick={() => setAgendaTab(pill.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                            agendaTab === pill.id
                              ? "bg-slate-900 text-white shadow-sm"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>

                    {/* Right filters */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                      
                      {/* Search box */}
                      <div className="relative w-full sm:w-60">
                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={agendaSearch}
                          onChange={(e) => setAgendaSearch(e.target.value)}
                          placeholder="Buscar por nome, cupom ou descrição..."
                          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        />
                        {agendaSearch && (
                          <button
                            onClick={() => setAgendaSearch("")}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Month dropdown */}
                      <div className="w-full sm:w-auto">
                        <select
                          value={agendaFilterDate ? `${agendaFilterDate.year}-${agendaFilterDate.month}` : "all"}
                          onChange={(e) => {
                            if (e.target.value === "all") {
                              setAgendaFilterDate(null);
                            } else {
                              const [year, month] = e.target.value.split("-").map(Number);
                              setAgendaFilterDate({ year, month });
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="all">📅 Todos os Meses</option>
                          {Array.from({ length: 13 }).map((_, i) => {
                            const date = new Date();
                            date.setMonth(date.getMonth() - 6 + i);
                            const m = date.getMonth();
                            const y = date.getFullYear();
                            const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
                            return (
                              <option key={`${y}-${m}`} value={`${y}-${m}`}>
                                {label.charAt(0).toUpperCase() + label.slice(1)}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* ACTIVE MONTH ALERTS/INDICATORS */}
                  {agendaFilterDate && (
                    <div className="bg-indigo-50/50 border border-indigo-100 p-2 text-indigo-700 rounded-xl flex justify-between items-center text-[10px] uppercase font-black tracking-widest px-4 shadow-sm animate-in fade-in">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Visualizando: {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(agendaFilterDate.year, agendaFilterDate.month, 1))}
                      </div>
                      <button
                        onClick={() => setAgendaFilterDate(null)}
                        className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[8px] hover:bg-indigo-700 transition-all font-black uppercase tracking-wider"
                      >
                        Remover Filtro
                      </button>
                    </div>
                  )}

                  {/* GRID LIST LAYOUT */}
                  <div className={`grid grid-cols-1 ${agendaTab === "all" || agendaTab === "overdue" ? "lg:grid-cols-2" : "grid-cols-1"} gap-4`}>
                    
                    {/* COLUMN: CONTAS A RECEBER */}
                    {showReceivables && (
                      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col overflow-hidden">
                        
                        {/* Column Header */}
                        <div className="p-3 bg-emerald-50/30 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              A RECEBER (CRÉDITOS)
                            </h3>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              Fiados, compromissos manuais e repasses de entregadores
                            </p>
                          </div>
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                            R$ {(filteredFiadosList.reduce((acc, c) => acc + (c.balance || 0), 0) + filteredCourierToReceive.reduce((acc, d) => acc + Math.abs(d.balance || 0), 0) + filteredManualIncomes.reduce((acc, r) => acc + (r.amount || 0), 0)).toFixed(2)}
                          </span>
                        </div>

                        {/* List Roll */}
                        <div className="p-2 space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar flex-1 bg-slate-50/40">
                          
                          {/* Fiados (Customers with Outstanding Debts) */}
                          {filteredFiadosList.map(cust => {
                            const latestDebit = cust.history?.find(t => t.type === "debit");
                            const dueDate = latestDebit?.expectedPaymentDate ? getSafeDate(latestDebit.expectedPaymentDate) : null;
                            const isOverdue = dueDate && dueDate < today;

                            return (
                              <div 
                                key={cust.id}
                                className="flex items-center justify-between p-3 bg-white hover:bg-emerald-50/10 rounded-xl border border-slate-200/60 shadow-sm group transition-all"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div onClick={() => { setSelectedFiado(cust); setShowCustomerDetailModal(true); }} className="cursor-pointer w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm hover:scale-105 transition-all">
                                    <UserCircle size={18} />
                                  </div>
                                  <div>
                                    <h4 
                                      onClick={() => { setSelectedFiado(cust); setShowCustomerDetailModal(true); }}
                                      className="font-black text-slate-800 text-xs cursor-pointer hover:text-indigo-600 transition-colors"
                                    >
                                      {cust.name}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[7px] font-black uppercase tracking-wider rounded">
                                        Fiado
                                      </span>
                                      
                                      {dueDate ? (
                                        <span className={`text-[7px] font-black uppercase tracking-tight flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                                          isOverdue 
                                            ? "bg-rose-50 text-rose-600 border-rose-100" 
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                        }`}>
                                          {isOverdue && <AlertTriangle size={8} />}
                                          Prev: {dueDate.toLocaleDateString("pt-BR")}
                                        </span>
                                      ) : (
                                        <span className="text-[7px] font-normal italic text-slate-400">
                                          Expectativa de pagamento indefinida
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-extrabold text-slate-800 text-xs">
                                      R$ {(cust.balance ?? 0).toFixed(2)}
                                    </p>
                                    <p className="text-[7px] font-medium text-slate-400">
                                      Dívida ativa
                                    </p>
                                  </div>
                                  
                                  <button
                                    onClick={() => handleSettleFiado(cust)}
                                    className="p-1.5 md:p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-100 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                    title="Dar Baixa (Receber Tudo)"
                                  >
                                    <CheckCircle2 size={13} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Couriers owing cash back (balance < 0) */}
                          {filteredCourierToReceive.map(debt => (
                            <div 
                              key={debt.courier.id}
                              className="flex items-center justify-between p-3 bg-white hover:bg-indigo-50/10 rounded-xl border border-slate-200/60 shadow-sm group transition-all"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                  <Bike size={16} />
                                </div>
                                <div>
                                  <h4 className="font-black text-slate-800 text-xs">
                                    {debt.courier.name}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[7px] font-black uppercase tracking-wider rounded">
                                      Repasse Motoboy
                                    </span>
                                    <span className="text-[7px] text-slate-400 font-bold">
                                      Dinheiro das entregas em mãos
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="font-extrabold text-indigo-600 text-xs">
                                    R$ {Math.abs(debt.balance ?? 0).toFixed(2)}
                                  </p>
                                  <p className="text-[7px] font-medium text-slate-400">
                                    A restituir
                                  </p>
                                </div>
                                
                                <button
                                  onClick={() => handleSettleCourier(debt.courier.id)}
                                  className="p-1.5 md:p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                  title="Registrar devolução de valor"
                                >
                                  <CheckCircle2 size={13} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Manual Pending Incomes */}
                          {filteredManualIncomes.map(rec => {
                            const dueDate = getSafeDate(rec.dueDate);
                            const isOverdue = dueDate && dueDate < today;

                            return (
                              <div 
                                key={rec.id}
                                className="flex items-center justify-between p-3 bg-white hover:bg-emerald-50/10 rounded-xl border border-slate-200/60 shadow-sm group transition-all"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                                    <Plus size={16} strokeWidth={3} />
                                  </div>
                                  <div>
                                    <h4 className="font-black text-slate-800 text-xs">
                                      {rec.description}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="px-1.5 py-0.5 bg-slate-100 border text-slate-600 text-[7px] font-black uppercase tracking-wider rounded">
                                        {rec.category || "Faturamento"}
                                      </span>
                                      {dueDate && (
                                        <span className={`text-[7px] font-black uppercase tracking-tight flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                                          isOverdue 
                                            ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" 
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                        }`}>
                                          {isOverdue && <AlertTriangle size={8} />}
                                          Venc: {dueDate.toLocaleDateString("pt-BR")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-extrabold text-emerald-600 text-xs">
                                      R$ {(rec.amount ?? 0).toFixed(2)}
                                    </p>
                                    <p className="text-[7px] font-medium text-slate-400">
                                      Receita agendada
                                    </p>
                                  </div>
                                  
                                  {/* Hover utilities */}
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleEditRecord(rec)}
                                      className="p-1.5 bg-white text-indigo-600 rounded-lg border border-slate-200 hover:bg-slate-50 hover:scale-105 transition-all text-xs"
                                      title="Editar"
                                    >
                                      <FileText size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecord(rec.id)}
                                      className="p-1.5 bg-white text-rose-600 rounded-lg border border-slate-200 hover:bg-rose-50 hover:scale-105 transition-all text-xs"
                                      title="Excluir"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => handleSettlePending(rec.id)}
                                    className="p-1.5 md:p-2 bg-slate-200 hover:bg-emerald-500 text-slate-600 hover:text-white rounded-xl shadow-sm hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                    title="Receber e Liquidar"
                                  >
                                    <CheckCircle2 size={13} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {filteredFiadosList.length === 0 && filteredCourierToReceive.length === 0 && filteredManualIncomes.length === 0 && (
                            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                              <CheckCircle2 size={24} className="text-emerald-300 animate-bounce" />
                              <h5 className="text-xs font-black uppercase text-slate-500 tracking-wider">Tudo em ordem!</h5>
                              <p className="text-[9px] text-slate-400 max-w-[200px]">Nenhum valor pendente a ser recebido com estes filtros.</p>
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                    {/* COLUMN: CONTAS A PAGAR */}
                    {showPayables && (
                      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col overflow-hidden">
                        
                        {/* Column Header */}
                        <div className="p-3 bg-rose-50/30 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              A PAGAR (DÉBITOS)
                            </h3>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              Contas de fornecedores, impostos e diárias pendentes de motoboys
                            </p>
                          </div>
                          <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl">
                            R$ {(filteredCourierToPay.reduce((acc, d) => acc + (d.balance || 0), 0) + filteredManualExpenses.reduce((acc, r) => acc + (r.amount || 0), 0)).toFixed(2)}
                          </span>
                        </div>

                        {/* List Roll */}
                        <div className="p-2 space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar flex-1 bg-slate-50/40">
                          
                          {/* Couriers waiting compensation (balance > 0) */}
                          {filteredCourierToPay.map(debt => (
                            <div 
                              key={debt.courier.id}
                              className="flex items-center justify-between p-3 bg-white hover:bg-rose-50/10 rounded-xl border border-slate-200/60 shadow-sm group transition-all"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
                                  <Bike size={16} />
                                </div>
                                <div>
                                  <h4 className="font-black text-slate-800 text-xs">
                                    {debt.courier.name}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 text-[7px] font-black uppercase tracking-wider rounded">
                                      Diária / Taxa
                                    </span>
                                    <span className="text-[7px] text-slate-400 font-bold">
                                      Acerto de diária pendente
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="font-extrabold text-rose-600 text-xs">
                                    R$ {(debt.balance ?? 0).toFixed(2)}
                                  </p>
                                  <p className="text-[7px] font-medium text-slate-400">
                                    A pagar motoboy
                                  </p>
                                </div>
                                
                                <button
                                  onClick={() => handleSettleCourier(debt.courier.id)}
                                  className="p-1.5 md:p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-100 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                  title="Pagar diária e taxas ao motoboy"
                                >
                                  <CheckCircle2 size={13} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Manual Pending Expenses (Fornecedores, Contas normais) */}
                          {filteredManualExpenses.map(rec => {
                            const dueDate = getSafeDate(rec.dueDate);
                            const isOverdue = dueDate && dueDate < today;

                            return (
                              <div 
                                key={rec.id}
                                className="flex items-center justify-between p-3 bg-white hover:bg-rose-50/10 rounded-xl border border-slate-200/60 shadow-sm group transition-all"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                                    <Building2 size={16} />
                                  </div>
                                  <div>
                                    <h4 className="font-black text-slate-800 text-xs">
                                      {rec.description}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="px-1.5 py-0.5 bg-slate-100 border text-slate-600 text-[7px] font-black uppercase tracking-wider rounded">
                                        {rec.category || "Fornecedor"}
                                      </span>
                                      {dueDate && (
                                        <span className={`text-[7px] font-black uppercase tracking-tight flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                                          isOverdue 
                                            ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse font-black" 
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                        }`}>
                                          {isOverdue && <AlertTriangle size={8} />}
                                          Venc: {dueDate.toLocaleDateString("pt-BR")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-extrabold text-rose-600 text-xs">
                                      R$ {(rec.amount ?? 0).toFixed(2)}
                                    </p>
                                    <p className="text-[7px] font-medium text-slate-400">
                                      Despesa agendada
                                    </p>
                                  </div>
                                  
                                  {/* Hover actions */}
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleEditRecord(rec)}
                                      className="p-1.5 bg-white text-indigo-600 rounded-lg border border-slate-200 hover:bg-slate-50 hover:scale-105 transition-all text-xs"
                                      title="Editar despesa"
                                    >
                                      <FileText size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecord(rec.id)}
                                      className="p-1.5 bg-white text-rose-600 rounded-lg border border-slate-200 hover:bg-rose-50 hover:scale-105 transition-all text-xs"
                                      title="Excluir"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => handleSettlePending(rec.id)}
                                    className="p-1.5 md:p-2 bg-slate-200 hover:bg-emerald-500 text-slate-600 hover:text-white rounded-xl shadow-sm hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                    title="Pagar e Liquidar"
                                  >
                                    <CheckCircle2 size={13} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {filteredCourierToPay.length === 0 && filteredManualExpenses.length === 0 && (
                            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                              <CheckCircle2 size={24} className="text-emerald-300" />
                              <h5 className="text-xs font-black uppercase text-slate-500 tracking-wider font-extrabold">Sem contas a pagar!</h5>
                              <p className="text-[9px] text-slate-400 max-w-[200px]">Nenhum débito ou fornecedor futuro para quitar no momento.</p>
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                  </div>

                </div>
              );
            })()}

            {activeView === "payment-methods" && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border-2 border-slate-100 shadow-xl">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">
                        Operadoras de Cartão
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Gerencie suas operadoras (Stone, PagSeguro, etc)
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const currentOperators = adminSettings.operators || [];
                        const newOp: CardOperator = {
                          id: `op-${Date.now()}`,
                          name: "Nova Operadora",
                          active: true,
                        };
                        onUpdateAdminSettings({
                          operators: [...currentOperators, newOp],
                        });
                        showToast("Operadora adicionada!");
                      }}
                      className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      <Plus size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(adminSettings.operators || []).map((op, idx) => (
                      <div
                        key={op.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex justify-between items-center ${op.active ? "bg-white border-slate-100" : "bg-slate-50 border-slate-200 opacity-60"}`}
                      >
                        <div className="flex-1">
                          <input
                            className="font-black text-slate-800 bg-transparent border-none outline-none focus:ring-0 w-full text-sm"
                            value={op.name}
                            onChange={(e) => {
                              const newOps = [
                                ...(adminSettings.operators || []),
                              ];
                              newOps[idx] = {
                                ...newOps[idx],
                                name: e.target.value,
                              };
                              onUpdateAdminSettings({ operators: newOps });
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newOps = [
                                ...(adminSettings.operators || []),
                              ];
                              newOps[idx] = {
                                ...newOps[idx],
                                active: !newOps[idx].active,
                              };
                              onUpdateAdminSettings({ operators: newOps });
                            }}
                            className={`p-1.5 rounded-lg transition-all ${op.active ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-200"}`}
                            title={op.active ? "Desativar" : "Ativar"}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              const newOps = (
                                adminSettings.operators || []
                              ).filter((o) => o.id !== op.id);
                              onUpdateAdminSettings({ operators: newOps });
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border-2 border-slate-100 shadow-xl">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">
                        Taxas e Formas de Pagamento
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Configure as taxas cobradas por cartão e crie novas
                        opções
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const currentMethods =
                          adminSettings.paymentMethods || [];
                        const newId = `method-${Date.now()}`;
                        const newMethods: any[] = [
                          ...currentMethods,
                          {
                            id: newId,
                            name: "Nova Forma",
                            type: "credit",
                            feePercentage: 0,
                            active: true,
                          },
                        ];
                        onUpdateAdminSettings({ paymentMethods: newMethods });
                        showToast("Nova forma adicionada! Configure abaixo.");
                      }}
                      className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      <Plus size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {(adminSettings.paymentMethods || []).map((method, idx) => (
                      <div
                        key={method.id}
                        className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 hover:border-indigo-200 transition-all group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-2xl border flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              {method.type === "cash" ? (
                                <DollarSign />
                              ) : method.type === "pix" ? (
                                <Smartphone />
                              ) : (
                                <CreditCard />
                              )}
                            </div>
                            <div>
                              <input
                                className="font-black text-slate-800 bg-transparent border-none outline-none focus:ring-0 w-32"
                                value={method.name}
                                onChange={(e) => {
                                  const newMethods = [
                                    ...(adminSettings.paymentMethods || []),
                                  ];
                                  newMethods[idx] = {
                                    ...newMethods[idx],
                                    name: e.target.value,
                                  };
                                  onUpdateAdminSettings({
                                    paymentMethods: newMethods,
                                  });
                                }}
                              />
                              <select
                                className="text-[8px] font-bold uppercase text-slate-400 bg-transparent border-none outline-none block p-0"
                                value={method.type}
                                onChange={(e) => {
                                  const newMethods = [
                                    ...(adminSettings.paymentMethods || []),
                                  ];
                                  newMethods[idx] = {
                                    ...newMethods[idx],
                                    type: e.target.value as any,
                                  };
                                  onUpdateAdminSettings({
                                    paymentMethods: newMethods,
                                  });
                                }}
                              >
                                <option value="credit">Crédito</option>
                                <option value="debit">Débitos</option>
                                <option value="cash">Dinheiro</option>
                                <option value="pix">PIX</option>
                                <option value="voucher">Vale</option>
                                <option value="account">Conta Cliente</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const newMethods = [
                                  ...(adminSettings.paymentMethods || []),
                                ];
                                newMethods[idx] = {
                                  ...newMethods[idx],
                                  active: !newMethods[idx].active,
                                };
                                onUpdateAdminSettings({
                                  paymentMethods: newMethods,
                                });
                              }}
                              className={`p-2 rounded-lg transition-all ${method.active ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-200"}`}
                              title={method.active ? "Desativar" : "Ativar"}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                const newMethods = (
                                  adminSettings.paymentMethods || []
                                ).filter((m) => m.id !== method.id);
                                onUpdateAdminSettings({
                                  paymentMethods: newMethods,
                                });
                              }}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-white rounded-full transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200/50">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                              Taxa %
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={method.feePercentage
                                  .toString()
                                  .replace(".", ",")}
                                onChange={(e) => {
                                  const val = e.target.value.replace(",", ".");
                                  if (
                                    val === "" ||
                                    !isNaN(Number(val)) ||
                                    val === "."
                                  ) {
                                    const numVal = parseFloat(val) || 0;
                                    const newMethods = [
                                      ...(adminSettings.paymentMethods || []),
                                    ];
                                    newMethods[idx] = {
                                      ...newMethods[idx],
                                      feePercentage: numVal,
                                    };
                                    onUpdateAdminSettings({
                                      paymentMethods: newMethods,
                                    });
                                  }
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                              Taxa Fixa R$
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={(method.fixedFee || 0)
                                .toString()
                                .replace(".", ",")}
                              onChange={(e) => {
                                const val = e.target.value.replace(",", ".");
                                if (
                                  val === "" ||
                                  !isNaN(Number(val)) ||
                                  val === "."
                                ) {
                                  const numVal = parseFloat(val) || 0;
                                  const newMethods = [
                                    ...(adminSettings.paymentMethods || []),
                                  ];
                                  newMethods[idx] = {
                                    ...newMethods[idx],
                                    fixedFee: numVal,
                                  };
                                  onUpdateAdminSettings({
                                    paymentMethods: newMethods,
                                  });
                                }
                              }}
                            />
                          </div>

                          {(method.type === "credit" ||
                            method.type === "debit" ||
                            method.type === "pix") && (
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                Operadora
                              </label>
                              <select
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none h-9"
                                value={method.operatorId || ""}
                                onChange={(e) => {
                                  const newMethods = [
                                    ...(adminSettings.paymentMethods || []),
                                  ];
                                  newMethods[idx] = {
                                    ...newMethods[idx],
                                    operatorId: e.target.value,
                                  };
                                  onUpdateAdminSettings({
                                    paymentMethods: newMethods,
                                  });
                                }}
                              >
                                <option value="">Nenhuma</option>
                                {(adminSettings.operators || [])
                                  .filter((op) => op.active)
                                  .map((op) => (
                                    <option key={op.id} value={op.id}>
                                      {op.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeView === "fees-report" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <DollarSign size={24} className="text-indigo-600" />{" "}
                        Relatório Detalhado de Taxas
                      </h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Análise de custos operacionais por operadora e método
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Volume Total
                      </p>
                      <p className="text-3xl font-black text-slate-800 tabular-nums">
                        {formatCurrency(
                          paymentMethodStats.reduce(
                            (acc, s) => acc + s.total,
                            0,
                          ),
                        )}
                      </p>
                    </div>
                    <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100/50">
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">
                        Total de Taxas
                      </p>
                      <p className="text-3xl font-black text-rose-600 tabular-nums">
                        {formatCurrency(
                          paymentMethodStats.reduce(
                            (acc, s) => acc + s.fees,
                            0,
                          ),
                        )}
                      </p>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100/50">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
                        Saldo Líquido
                      </p>
                      <p className="text-3xl font-black text-emerald-600 tabular-nums">
                        {formatCurrency(
                          paymentMethodStats.reduce(
                            (acc, s) => acc + s.total - s.fees,
                            0,
                          ),
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Forma de Pagamento
                          </th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Operadora
                          </th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Volume
                          </th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Taxa Méd (%)
                          </th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Total Taxas
                          </th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Saldo Líquido
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {paymentMethodStats.map((stat, idx) => {
                          const config = adminSettings.paymentMethods?.find(
                            (p) =>
                              p.id === stat.id ||
                              p.name.toLowerCase() === stat.id.toLowerCase() ||
                              p.type === stat.id,
                          );
                          const operator = adminSettings.operators?.find(
                            (op) => op.id === config?.operatorId,
                          );
                          return (
                            <tr
                              key={stat.id}
                              className="hover:bg-slate-50 transition-colors group"
                            >
                              <td className="px-6 py-4">
                                <p className="font-black text-slate-800 text-sm uppercase">
                                  {stat.name}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                  {stat.value} transações
                                </p>
                              </td>
                              <td className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">
                                {operator?.name || "Direto / Própria"}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-700 text-sm">
                                {formatCurrency(stat.total)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500">
                                  {(config?.feePercentage || 0).toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-rose-600 text-sm">
                                -{formatCurrency(stat.fees)}
                              </td>
                              <td className="px-6 py-4 text-right font-black text-emerald-600">
                                {formatCurrency(stat.total - stat.fees)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeView === "items-report" && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="w-full md:w-auto">
                    <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tighter">
                      Relatório de Itens Vendidos
                    </h2>
                    <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Análise de lucratividade por produto
                    </p>
                  </div>
                  <div className="flex bg-white p-1 rounded-xl border shadow-sm w-full md:w-auto">
                    {[
                      { id: "day", label: "Hoje" },
                      { id: "week", label: "Semana" },
                      { id: "month", label: "Mês" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setItemsReportFilter(f.id as any)}
                        className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${itemsReportFilter === f.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse md:min-w-full">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-2 md:px-6 py-2 md:py-4 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Produto
                          </th>
                          <th className="px-2 md:px-6 py-2 md:py-4 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                            Qtd
                          </th>
                          <th className="hidden md:table-cell px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Custo Unit.
                          </th>
                          <th className="hidden md:table-cell px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Venda Unit.
                          </th>
                          <th className="px-2 md:px-6 py-2 md:py-4 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Lucro Unit.
                          </th>
                          <th className="px-2 md:px-6 py-2 md:py-4 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Lucro Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {itemsReportData.length > 0 ? (
                          itemsReportData.map((item, idx) => {
                            const unitProfit = item.unitPrice - item.unitCost;
                            const totalProfit =
                              item.totalSales - item.totalCost;
                            return (
                              <tr
                                key={`item-${item.productId}-${idx}`}
                                className="hover:bg-slate-50/50 transition-colors group"
                              >
                                <td className="px-2 md:px-6 py-2 md:py-4">
                                  <p className="font-black text-slate-800 text-[10px] md:text-sm leading-tight">
                                    {item.name}
                                  </p>
                                </td>
                                <td className="px-2 md:px-6 py-2 md:py-4 text-center">
                                  <span className="px-1 md:px-2 py-0.5 md:py-1 bg-slate-100 rounded-lg font-black text-[8px] md:text-[10px] text-slate-600">
                                    {item.quantity}x
                                  </span>
                                </td>
                                <td className="hidden md:table-cell px-6 py-4 text-right font-bold text-slate-500 text-sm">
                                  {formatCurrency(item.unitCost)}
                                </td>
                                <td className="hidden md:table-cell px-6 py-4 text-right font-bold text-slate-800 text-sm">
                                  {formatCurrency(item.unitPrice)}
                                </td>
                                <td className="px-2 md:px-6 py-2 md:py-4 text-right">
                                  <span
                                    className={`font-black text-[10px] md:text-sm ${unitProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                                  >
                                    {formatCurrency(unitProfit)}
                                  </span>
                                </td>
                                <td className="px-2 md:px-6 py-2 md:py-4 text-right">
                                  <div
                                    className={`inline-flex flex-col items-end p-1 md:p-2 rounded-xl ${totalProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                                  >
                                    <span className="text-[7px] md:text-xs font-black uppercase tracking-tighter">
                                      Total
                                    </span>
                                    <span className="text-[10px] md:text-base font-black tracking-tighter">
                                      {formatCurrency(totalProfit)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center gap-2 opacity-20 grayscale">
                                <FileText size={48} />
                                <p className="text-xs font-black uppercase tracking-widest">
                                  Nenhum item vendido no período
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {itemsReportData.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                            <td
                              colSpan={3}
                              className="md:table-cell hidden"
                            ></td>
                            <td
                              colSpan={3}
                              className="md:hidden px-2 py-2 text-right text-[8px] font-black uppercase tracking-widest"
                            >
                              Total de Custos:
                            </td>
                            <td
                              colSpan={2}
                              className="hidden md:table-cell px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest"
                            >
                              Total de Custos:
                            </td>
                            <td className="px-2 md:px-6 py-2 md:py-3 text-right">
                              <span className="text-[10px] md:text-sm font-black tracking-tighter">
                                {formatCurrency(
                                  itemsReportData.reduce(
                                    (acc, item) => acc + item.totalCost,
                                    0,
                                  ),
                                )}
                              </span>
                            </td>
                          </tr>
                          <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                            <td
                              colSpan={3}
                              className="md:table-cell hidden"
                            ></td>
                            <td
                              colSpan={3}
                              className="md:hidden px-2 py-2 text-right text-[8px] font-black uppercase tracking-widest"
                            >
                              Total Faturado:
                            </td>
                            <td
                              colSpan={2}
                              className="hidden md:table-cell px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest"
                            >
                              Total Faturado:
                            </td>
                            <td className="px-2 md:px-6 py-2 md:py-3 text-right">
                              <span className="text-[10px] md:text-sm font-black tracking-tighter">
                                {formatCurrency(
                                  itemsReportData.reduce(
                                    (acc, item) => acc + item.totalSales,
                                    0,
                                  ),
                                )}
                              </span>
                            </td>
                          </tr>
                          <tr className="bg-slate-900 text-white">
                            <td
                              colSpan={3}
                              className="md:table-cell hidden"
                            ></td>
                            <td
                              colSpan={3}
                              className="md:hidden px-2 py-2 text-right text-[8px] font-black uppercase tracking-widest"
                            >
                              Lucro Total:
                            </td>
                            <td
                              colSpan={2}
                              className="hidden md:table-cell px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest"
                            >
                              Lucro Total:
                            </td>
                            <td className="px-2 md:px-6 py-2 md:py-3 text-right">
                              <span className="text-[10px] md:text-base font-black tracking-tighter">
                                {formatCurrency(
                                  itemsReportData.reduce(
                                    (acc, item) =>
                                      acc + (item.totalSales - item.totalCost),
                                    0,
                                  ),
                                )}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeView === "banks" && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">
                      Gestão Bancária
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Controle de saldos e contas
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddBankModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                  >
                    <Plus size={14} strokeWidth={3} /> Nova Conta
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bankAccounts.map((bank) => (
                    <div
                      key={bank.id}
                      className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-indigo-100 shadow-sm hover:shadow-xl transition-all group relative"
                    >
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditBank(bank)}
                          className="p-1.5 bg-white text-indigo-600 rounded-xl border shadow-sm hover:bg-indigo-50"
                          title="Editar"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteBank(bank.id)}
                          className="p-1.5 bg-white text-rose-600 rounded-xl border shadow-sm hover:bg-rose-50"
                          title="Excluir"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <Landmark size={24} />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {bank.bankName}
                          </p>
                          <h3 className="text-lg font-black text-slate-800">
                            {bank.name}
                          </h3>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Saldo Atual
                        </p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">
                          {formatCurrency(bank.currentBalance)}
                        </p>
                      </div>
                      <div className="mt-6 pt-6 border-t flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400">
                          Saldo Inicial: {formatCurrency(bank.initialBalance)}
                        </span>
                        <button className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">
                          Ver Extrato
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Relatório Consolidado de Bancos */}
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                    <Landmark size={120} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">
                      Patrimônio Líquido em Bancos
                    </p>
                    <h2 className="text-5xl font-black tracking-tighter mb-6">
                      {formatCurrency(
                        bankAccounts.reduce(
                          (acc, b) => acc + b.currentBalance,
                          0,
                        ),
                      )}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                      <div>
                        <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">
                          Total de Contas
                        </p>
                        <p className="text-xl font-black">
                          {bankAccounts.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">
                          Maior Saldo
                        </p>
                        <p className="text-xl font-black">
                          {formatCurrency(
                            Math.max(
                              ...bankAccounts.map((b) => b.currentBalance),
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Novo Banco */}
            {showAddBankModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-6 border-b bg-indigo-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 p-2 rounded-xl text-white">
                        <Landmark size={20} />
                      </div>
                      <h2 className="text-xl font-black text-slate-800">
                        {editingBank
                          ? "Editar Conta Bancária"
                          : "Nova Conta Bancária"}
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddBankModal(false);
                        setEditingBank(null);
                        setNewBank({
                          name: "",
                          bankName: "",
                          initialBalance: 0,
                        });
                      }}
                      className="p-2 hover:bg-white rounded-full transition-colors"
                    >
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Apelido da Conta
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Conta Corrente Principal"
                        className="w-full px-4 py-3 bg-slate-50 border rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                        value={newBank.name}
                        onChange={(e) =>
                          setNewBank({ ...newBank, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Nome do Banco
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Nubank, Itaú, Bradesco..."
                        className="w-full px-4 py-3 bg-slate-50 border rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                        value={newBank.bankName}
                        onChange={(e) =>
                          setNewBank({ ...newBank, bankName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Saldo Inicial (R$)
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 bg-slate-50 border rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                        value={
                          newBank.initialBalance
                            ? formatCurrency(newBank.initialBalance as number)
                            : ""
                        }
                        onChange={(e) =>
                          setNewBank({
                            ...newBank,
                            initialBalance: parseCurrency(
                              maskCurrency(e.target.value),
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="p-6 border-t bg-slate-50 flex gap-3">
                    <button
                      onClick={() => {
                        setShowAddBankModal(false);
                        setEditingBank(null);
                        setNewBank({
                          name: "",
                          bankName: "",
                          initialBalance: 0,
                        });
                      }}
                      className="flex-1 py-3 font-black text-slate-400 uppercase tracking-widest text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddBankAccount}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                    >
                      Salvar Conta
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeView === "closings" && (
              <div className="space-y-2 animate-in slide-in-from-right-4">
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-3 border-b bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-800">
                      Relatórios de Fechamento de Caixa
                    </h3>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                      Histórico de encerramentos diários
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80 border-b">
                        <tr>
                          <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                            Data / Hora
                          </th>
                          <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                            Operador
                          </th>
                          <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                            Abertura
                          </th>
                          <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                            Dinheiro
                          </th>
                          <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                            Digitais
                          </th>
                          <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                            Esperado (Cx)
                          </th>
                          <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                            Real (Cx)
                          </th>
                          <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase text-right">
                            Diferença (Cx)
                          </th>
                          <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase text-right">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {cashClosings
                          .sort(
                            (a, b) =>
                              new Date(b.closedAt).getTime() -
                              new Date(a.closedAt).getTime(),
                          )
                          .map((closing) => {
                            const digitalSales =
                              closing.totalSales -
                              (closing.salesByMethod?.dinheiro || 0);
                            return (
                              <tr
                                key={closing.id}
                                className="hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="px-4 py-2 text-[10px] font-black text-slate-700">
                                  {new Date(
                                    closing.closedAt,
                                  ).toLocaleDateString("pt-BR")}{" "}
                                  {new Date(
                                    closing.closedAt,
                                  ).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="px-4 py-2 text-[10px] font-bold text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <UserCircle
                                      size={12}
                                      className="text-slate-300"
                                    />
                                    {closing.closedBy || "Admin"}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-[10px] font-bold text-slate-600">
                                  {formatCurrency(closing.openingValue)}
                                </td>
                                <td className="px-4 py-2 text-[10px] font-bold text-emerald-600">
                                  {formatCurrency(
                                    closing.salesByMethod?.dinheiro || 0,
                                  )}
                                </td>
                                <td className="px-4 py-2 text-[10px] font-bold text-indigo-600">
                                  {formatCurrency(digitalSales)}
                                </td>
                                <td className="px-4 py-2 text-[10px] font-bold text-slate-500">
                                  {formatCurrency(closing.expectedValue)}
                                </td>
                                <td className="px-4 py-2 text-[10px] font-black text-slate-800">
                                  {formatCurrency(closing.actualValue)}
                                </td>
                                <td
                                  className={`px-4 py-2 text-right font-black text-[10px] ${closing.difference === 0 ? "text-slate-500" : closing.difference > 0 ? "text-emerald-600" : "text-rose-600"}`}
                                >
                                  {closing.difference > 0 ? "+" : ""}{" "}
                                  {formatCurrency(closing.difference)}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    onClick={() => setSelectedClosing(closing)}
                                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                  >
                                    <Info size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        {cashClosings.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-8 text-center opacity-30 grayscale flex flex-col items-center gap-1.5"
                            >
                              <ClipboardList size={24} />
                              <p className="text-[8px] font-black uppercase tracking-widest">
                                Nenhum fechamento registrado
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Closing Detail Modal */}
            {selectedClosing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
                  <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
                        <ClipboardList size={18} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-800">
                          Detalhes do Fechamento
                        </h2>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          {new Date(
                            selectedClosing.closedAt,
                          ).toLocaleDateString("pt-BR")}{" "}
                          às{" "}
                          {new Date(
                            selectedClosing.closedAt,
                          ).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedClosing(null)}
                      className="p-2 hover:bg-white rounded-full transition-all text-slate-400"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Abertura
                        </p>
                        <p className="text-sm font-black text-slate-700">
                          {formatCurrency(selectedClosing.openingValue)}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Total Vendas
                        </p>
                        <p className="text-sm font-black text-slate-700">
                          {formatCurrency(selectedClosing.totalSales)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">
                          Vendas por Método
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(
                          selectedClosing.salesByMethod || {},
                        ).map(([method, value]) => (
                          <div
                            key={method}
                            onClick={() => {
                              setSelectedClosingMethodReport({
                                id: method,
                                label: method.replace("_", " "),
                              });
                              setFinanceReportSearch("");
                            }}
                            className="flex justify-between items-center p-1.5 hover:bg-indigo-100/50 rounded-lg cursor-pointer transition-colors group"
                            title="Clique para ver os pedidos"
                          >
                            <span className="text-[10px] font-bold text-slate-600 capitalize flex items-center gap-1 group-hover:text-indigo-700">
                              {method.replace("_", " ")}
                              <ChevronRight size={10} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                            </span>
                            <span className="text-[10px] font-black text-slate-800">
                              {formatCurrency(value as number)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                          Esp. Dinheiro
                        </p>
                        <p className="text-[10px] font-black text-slate-700">
                          {formatCurrency(selectedClosing.expectedValue)}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                          Real Dinheiro
                        </p>
                        <p className="text-[10px] font-black text-slate-700">
                          {formatCurrency(selectedClosing.actualValue)}
                        </p>
                      </div>
                      <div
                        className={`p-2 rounded-xl border text-center ${selectedClosing.difference >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}
                      >
                        <p
                          className={`text-[7px] font-black uppercase tracking-widest mb-0.5 ${selectedClosing.difference >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          Diferença
                        </p>
                        <p
                          className={`text-[10px] font-black ${selectedClosing.difference >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                        >
                          {formatCurrency(selectedClosing.difference)}
                        </p>
                      </div>
                    </div>

                    {selectedClosing.observations && (
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                        <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <AlertCircle size={10} /> Observações
                        </p>
                        <p className="text-[10px] font-medium text-amber-800 italic">
                          "{selectedClosing.observations}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t bg-slate-50/50">
                    <button
                      onClick={() => setSelectedClosing(null)}
                      className="w-full py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-500 uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                    >
                      Fechar Detalhes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedClosing && selectedClosingMethodReport && (
              <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in">
                <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100 animate-in zoom-in-95">
                  <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm text-indigo-400">
                        <Receipt size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-black tracking-tight capitalize">
                          Relatório de Pedidos — {selectedClosingMethodReport.label}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                          Fechamento de Caixa #{selectedClosing.id.slice(-6).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedClosingMethodReport(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Orders filter and list */}
                  {(() => {
                    const openedAt = new Date(selectedClosing.openedAt);
                    const closedAt = new Date(selectedClosing.closedAt);

                    const closingOrders = orders.filter((o) => {
                      const created = new Date(o.createdAt);
                      return created >= openedAt && created <= closedAt && o.status !== "cancelled";
                    });

                    const targetMethod = selectedClosingMethodReport.id;
                    const matching = closingOrders
                      .map((o) => {
                        let contribution = 0;
                        if (o.payments && o.payments.length > 0) {
                          contribution = o.payments.reduce((acc, p) => {
                            const clean = String(p.method).toLowerCase().trim();
                            return clean === targetMethod || clean.includes(targetMethod) ? acc + p.amount : acc;
                          }, 0);
                        } else if (o.paymentMethod) {
                          const clean = String(o.paymentMethod).toLowerCase().trim();
                          if (clean === targetMethod || clean.includes(targetMethod)) {
                            contribution = o.total || 0;
                          }
                        }
                        if (contribution === 0 && targetMethod === "all") {
                          contribution = o.total || 0;
                        }
                        return { order: o, contribution };
                      })
                      .filter((item) => item.contribution > 0)
                      .filter(({ order }) => {
                        if (!financeReportSearch.trim()) return true;
                        const term = financeReportSearch.toLowerCase().trim();
                        const nameMatch = (order.customerName || "").toLowerCase().includes(term);
                        const tableMatch = order.tableNumber ? String(order.tableNumber).includes(term) : false;
                        const idMatch = (order.id || "").toLowerCase().includes(term);
                        const itemsMatch = order.items.some((i) => i.name.toLowerCase().includes(term));
                        return nameMatch || tableMatch || idMatch || itemsMatch;
                      });

                    const totalSum = matching.reduce((acc, curr) => acc + curr.contribution, 0);

                    return (
                      <>
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                              Montante Acumulado
                            </p>
                            <p className="text-lg font-black text-emerald-600 tracking-tight">
                              {formatCurrency(totalSum)}
                            </p>
                          </div>

                          <div className="relative w-full sm:w-64">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Buscar por cliente, mesa..."
                              value={financeReportSearch}
                              onChange={(e) => setFinanceReportSearch(e.target.value)}
                              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                          {matching.length > 0 ? (
                            matching.map(({ order, contribution }) => {
                              const createdDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
                              const timeStr = createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                              return (
                                <div
                                  key={order.id}
                                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-indigo-300 transition-all space-y-2.5"
                                >
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div>
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                        {order.type === "table" ? `Mesa ${order.tableNumber || ""}` : order.type === "delivery" ? "Delivery" : "Balcão"} {order.customerName ? `• ${order.customerName}` : ""}
                                      </span>
                                      <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Clock size={10} /> {timeStr} • ID: {order.id.slice(-6).toUpperCase()}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        Contribuição
                                      </p>
                                      <p className="text-sm font-black text-emerald-600">
                                        {formatCurrency(contribution)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="space-y-1 bg-slate-50 p-2 rounded-xl text-xs">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                      Itens do Pedido ({order.items.length})
                                    </p>
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-[11px]">
                                        <span className="font-bold text-slate-700">
                                          <span className="text-indigo-600 font-black mr-1">{item.quantity}x</span> {item.name}
                                        </span>
                                        <span className="font-mono text-slate-500 text-[10px]">
                                          {formatCurrency(item.price * item.quantity)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-12 text-center text-slate-400 space-y-2">
                              <Receipt size={40} className="mx-auto opacity-30 animate-pulse" />
                              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                                Nenhum pedido encontrado
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                          <span className="text-[10px] font-bold text-slate-500">
                            {matching.length} pedido(s) encontrado(s)
                          </span>
                          <button
                            onClick={() => setSelectedClosingMethodReport(null)}
                            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                          >
                            Voltar aos Detalhes
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeView === "transactions" && (
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in slide-in-from-right-4">
                <div className="p-3 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between gap-2 items-center">
                  <div className="relative w-full md:w-64">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={14}
                    />
                    <input
                      type="text"
                      placeholder="Filtrar lançamentos..."
                      className="w-full pl-9 pr-3 py-1.5 border rounded-xl outline-none font-medium text-[10px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1">
                      {(["all", "income", "expense"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setFilterType(t)}
                          className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${filterType === t ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-400 hover:bg-slate-50"}`}
                        >
                          {t === "all"
                            ? "Tudo"
                            : t === "income"
                              ? "Entradas"
                              : "Saídas"}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 border-l pl-2 border-slate-200">
                      {(["all", "paid", "pending"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setFilterStatus(s)}
                          className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${filterStatus === s ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-400 hover:bg-slate-50"}`}
                        >
                          {s === "all"
                            ? "Todos Status"
                            : s === "paid"
                              ? "Efetivados"
                              : "Agendados"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80 border-b">
                      <tr>
                        <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                          Data / Hora
                        </th>
                        <th className="hidden md:table-cell px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                          Categoria
                        </th>
                        <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">
                          Descrição
                        </th>
                        <th className="hidden md:table-cell px-4 py-2 font-black text-slate-400 text-[8px] uppercase text-right">
                          Status
                        </th>
                        <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase text-right">
                          Valor
                        </th>
                        <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase text-right">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredRecords.map((record) => (
                        <tr
                          key={record.id}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            record.category === "Fechamento de Caixa" ||
                            record.category === "Abertura de Caixa"
                              ? "bg-indigo-50/40 border-l-4 border-indigo-500"
                              : record.category === "Sangria" ||
                                  record.category === "Suprimento"
                                ? "bg-amber-50/30 border-l-4 border-amber-400"
                                : ""
                          }`}
                        >
                          <td className="px-4 py-2 text-[10px] font-black text-slate-700">
                            {new Date(record.date).toLocaleDateString("pt-BR")}
                            {record.dueDate && record.status === "pending" && (
                              <p className="text-[7px] text-amber-600">
                                Venc:{" "}
                                {new Date(record.dueDate).toLocaleDateString(
                                  "pt-BR",
                                )}
                              </p>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-4 py-2">
                            <span className="text-[8px] font-black uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-600">
                              {record.category}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-bold text-slate-700 text-[10px] truncate max-w-[100px] md:max-w-none">
                            {record.description}
                          </td>
                          <td className="hidden md:table-cell px-4 py-2 text-right">
                            <span
                              className={`px-1 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest ${record.status === "pending" ? "bg-amber-100 text-amber-600 border border-amber-200" : "bg-emerald-100 text-emerald-600 border border-emerald-200"}`}
                            >
                              {record.status === "pending"
                                ? "Pendente"
                                : "Efetivado"}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-black text-[10px] ${record.type === "income" ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {record.type === "income" ? "+" : "-"} R${" "}
                            {record.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              {record.status === "pending" && (
                                <button
                                  onClick={() => handleSettlePending(record.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                  title={
                                    record.type === "income"
                                      ? "Efetivar Recebimento"
                                      : "Efetivar Pagamento"
                                  }
                                >
                                  <CheckCircle2
                                    size={12}
                                    className="animate-pulse text-emerald-500"
                                  />
                                </button>
                              )}
                              {record.category === "Vendas PDV" && (
                                <button
                                  onClick={() => {
                                    const order = orders.find(
                                      (o) => o.id === (record as any).orderId,
                                    );
                                    if (order) {
                                      const html = generateReceiptHtml(
                                        order,
                                        adminSettings,
                                      );
                                      const printWindow = window.open(
                                        "",
                                        "_blank",
                                        "width=400,height=600",
                                      );
                                      if (printWindow) {
                                        printWindow.document.write(html);
                                        printWindow.document.close();
                                      }
                                    }
                                  }}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                  title="Imprimir Pedido"
                                >
                                  <Printer size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditRecord(record)}
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Editar"
                              >
                                <FileText size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Excluir"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Modal de Novo Lançamento */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 p-1.5 rounded-xl text-white shadow-lg">
                    <Plus size={16} />
                  </div>
                  <h2 className="text-lg font-black text-slate-800">
                    {editingRecord ? "Editar Registro" : "Novo Registro"}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingRecord(null);
                  }}
                  className="p-1 text-slate-400 hover:bg-slate-50 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setFormType("income")}
                    className={`py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${formType === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}
                  >
                    Receita
                  </button>
                  <button
                    onClick={() => setFormType("expense")}
                    className={`py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${formType === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}
                  >
                    Despesa
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border">
                  <button
                    onClick={() => setFormStatus("paid")}
                    className={`py-1 rounded-md font-black text-[7px] uppercase tracking-widest transition-all ${formStatus === "paid" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400"}`}
                  >
                    Pago / Recebido
                  </button>
                  <button
                    onClick={() => setFormStatus("pending")}
                    className={`py-1 rounded-md font-black text-[7px] uppercase tracking-widest transition-all ${formStatus === "pending" ? "bg-amber-500 text-white shadow-sm" : "text-slate-400"}`}
                  >
                    Agendar
                  </button>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 font-black text-lg"
                    value={formAmount}
                    onChange={(e) =>
                      setFormAmount(maskCurrency(e.target.value))
                    }
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Categoria
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {formType === "expense"
                      ? [
                          "Fornecedores",
                          "Utilidades",
                          "Aluguel",
                          "Salários",
                          "Impostos",
                          "Sangria",
                          "Folha de Pagamento",
                          "Manutenção",
                          "Outros",
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      : [
                          "Vendas PDV",
                          "Suprimento",
                          "Fechamento de Caixa",
                          "Aportes",
                          "Reembolsos",
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Forma de Pagamento
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs"
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                  >
                    <option value="dinheiro">Dinheiro (Caixa)</option>
                    <option value="pix">PIX / Transferência</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="vale_refeicao">Vale Refeição</option>
                    <option value="bank">Conta Bancária</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none font-bold text-xs"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none font-medium text-xs"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Ex: Boleto Carnes"
                  />
                </div>

                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft size={12} className="text-indigo-600" />
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                        Lançamento Recurrente?
                      </span>
                    </div>
                    <button
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={`w-8 h-4 rounded-full transition-all relative ${isRecurring ? "bg-indigo-600" : "bg-slate-200"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isRecurring ? "left-4.5" : "left-0.5"}`}
                      ></div>
                    </button>
                  </div>

                  {isRecurring && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Quantidade de Parcelas
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="48"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none font-bold text-xs"
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                      />
                      <p className="text-[7px] text-slate-400 mt-1 font-medium italic">
                        * As parcelas serão geradas mensalmente a partir de
                        hoje.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t bg-slate-50 flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 font-black text-slate-500 uppercase tracking-widest text-[8px]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveRecord}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-1.5 shadow-xl shadow-indigo-100"
                >
                  <Save size={14} /> Salvar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal: Previsão de Pagamento Fiado */}
        {showFiadoDateModal && selectedFiado && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b bg-indigo-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-xl text-white">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      Previsão de Pagamento
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {selectedFiado.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFiadoDateModal(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Data Prevista
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex gap-3">
                <button
                  onClick={() => setShowFiadoDateModal(false)}
                  className="flex-1 py-3 font-black text-slate-400 uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSetFiadoDate}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Salvar Previsão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Detalhes do Cliente / Fiado */}
        {showCustomerDetailModal && selectedFiado && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b bg-indigo-50/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-xl text-white">
                    <UserCircle size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">
                      {selectedFiado.name}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Histórico Financeiro e de Pedidos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border">
                    <div className="flex flex-col px-2">
                      <span className="text-[6px] font-black text-slate-400 uppercase">
                        Início
                      </span>
                      <input
                        type="date"
                        value={statementStartDate}
                        onChange={(e) => setStatementStartDate(e.target.value)}
                        className="bg-transparent text-[9px] font-black outline-none"
                      />
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex flex-col px-2">
                      <span className="text-[6px] font-black text-slate-400 uppercase">
                        Fim
                      </span>
                      <input
                        type="date"
                        value={statementEndDate}
                        onChange={(e) => setStatementEndDate(e.target.value)}
                        className="bg-transparent text-[9px] font-black outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const start = new Date(statementStartDate + "T00:00:00");
                      const end = new Date(statementEndDate + "T23:59:59");

                      const filteredHistory = (
                        selectedFiado.history || []
                      ).filter((t) => {
                        const d = new Date(t.date);
                        return d >= start && d <= end;
                      });

                      const filteredOrders = orders.filter((o) => {
                        const d = new Date(o.createdAt);
                        return (
                          o.customerId === selectedFiado.id &&
                          d >= start &&
                          d <= end
                        );
                      });

                      const printWindow = window.open("", "_blank");
                      if (printWindow) {
                        printWindow.document.write(`
                        <html>
                          <head>
                            <title>Extrato - ${selectedFiado.name}</title>
                            <style>
                              body { font-family: sans-serif; padding: 40px; color: #334155; }
                              h1 { margin-bottom: 5px; color: #1e293b; }
                              .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                              .period { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
                              .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                              .card { padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; }
                              .card p { margin: 0; font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
                              .card h2 { margin: 5px 0 0; font-size: 24px; }
                              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                              th { text-align: left; font-size: 10px; text-transform: uppercase; color: #94a3b8; padding: 10px; border-bottom: 1px solid #e2e8f0; }
                              td { padding: 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
                              .credit { color: #10b981; font-weight: bold; }
                              .debit { color: #f43f5e; font-weight: bold; }
                              .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>Extrato do Cliente</h1>
                              <p style="margin: 0; font-weight: bold;">${selectedFiado.name}</p>
                              <p class="period">Período: ${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}</p>
                            </div>
                            
                            <div class="summary">
                              <div class="card">
                                <p>Saldo Atual</p>
                                <h2 style="color: ${selectedFiado.balance > 0 ? "#f43f5e" : "#10b981"}">R$ ${selectedFiado.balance.toFixed(2)}</h2>
                              </div>
                            </div>

                            <h3>Movimentações Financeiras</h3>
                            <table>
                              <thead>
                                <tr>
                                  <th>Data</th>
                                  <th>Descrição</th>
                                  <th>Tipo</th>
                                  <th>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${filteredHistory
                                  .map(
                                    (t) => `
                                  <tr>
                                    <td>${new Date(t.date).toLocaleDateString("pt-BR")}</td>
                                    <td>${t.description}</td>
                                    <td>${t.type === "credit" ? "Crédito" : "Débito"}</td>
                                    <td class="${t.type === "credit" ? "credit" : "debit"}">${t.type === "credit" ? "-" : "+"} R$ ${t.amount.toFixed(2)}</td>
                                  </tr>
                                `,
                                  )
                                  .join("")}
                                ${filteredHistory.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Nenhuma movimentação no período</td></tr>' : ""}
                              </tbody>
                            </table>

                            <h3 style="margin-top: 40px;">Histórico de Pedidos</h3>
                            <table>
                              <thead>
                                <tr>
                                  <th>Data</th>
                                  <th>Pedido</th>
                                  <th>Itens</th>
                                  <th>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${filteredOrders
                                  .map(
                                    (o) => `
                                  <tr>
                                    <td>${new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                                    <td>#${o.id.slice(-4).toUpperCase()}</td>
                                    <td>${o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}</td>
                                    <td style="font-weight: bold;">R$ ${o.total.toFixed(2)}</td>
                                  </tr>
                                `,
                                  )
                                  .join("")}
                                ${filteredOrders.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Nenhum pedido no período</td></tr>' : ""}
                              </tbody>
                            </table>

                            <div class="footer">
                              Documento gerado em ${new Date().toLocaleString("pt-BR")} • KitchenFlow AI POS
                            </div>
                            <script>window.print();</script>
                          </body>
                        </html>
                      `);
                        printWindow.document.close();
                      }
                    }}
                    className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-indigo-600"
                    title="Imprimir Extrato"
                  >
                    <Printer size={20} />
                  </button>
                  <button
                    onClick={() => setShowCustomerDetailModal(false)}
                    className="p-2 hover:bg-white rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Resumo de Saldo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Saldo em Aberto
                    </p>
                    <p
                      className={`text-2xl font-black ${selectedFiado.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      R$ {selectedFiado.balance.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                    <button
                      onClick={() => {
                        const existingDate = selectedFiado.history?.find((t) => t.type === "debit")?.expectedPaymentDate;
                        if (existingDate) {
                          setExpectedDate(new Date(existingDate).toISOString().split("T")[0]);
                        } else {
                          setExpectedDate(new Date().toISOString().split("T")[0]);
                        }
                        setShowFiadoDateModal(true);
                      }}
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline text-left"
                    >
                      {selectedFiado.history?.find((t) => t.type === "debit")
                        ?.expectedPaymentDate
                        ? `Previsto para: ${new Date(selectedFiado.history?.find((t) => t.type === "debit")!.expectedPaymentDate!).toLocaleDateString("pt-BR")}`
                        : "Definir Previsão de Pagamento"}
                    </button>
                  </div>
                </div>

                {/* Fechamento de Conta / Acordo de Promessa de Pagamento */}
                {selectedFiado.balance > 0 && (
                  <div className="bg-amber-50 border border-amber-200/50 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500 text-white p-2.5 rounded-2xl shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-800 tracking-tight uppercase">Fechamento de Conta</h4>
                        <p className="text-[9px] text-amber-600 font-bold leading-normal mt-0.5">
                          Agende um compromisso/previsão de pagamento para fechar as contas em aberto deste cliente (R$ {selectedFiado.balance.toFixed(2)}).
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const existingDate = selectedFiado.history?.find((t) => t.type === "debit")?.expectedPaymentDate;
                        if (existingDate) {
                          setExpectedDate(new Date(existingDate).toISOString().split("T")[0]);
                        } else {
                          setExpectedDate(new Date().toISOString().split("T")[0]);
                        }
                        setShowFiadoDateModal(true);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap self-stretch md:self-auto justify-center hover:scale-[1.02] active:scale-95"
                    >
                      <Calendar size={13} /> Fechar & Agendar Previsão
                    </button>
                  </div>
                )}

                {/* Lançamento Manual */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                    Lançamento Manual
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase">
                        Tipo
                      </label>
                      <select
                        value={manualTransactionType}
                        onChange={(e) =>
                          setManualTransactionType(
                            e.target.value as "credit" | "debit",
                          )
                        }
                        className="w-full px-3 py-2 bg-white border rounded-xl font-bold text-[10px] outline-none"
                      >
                        <option value="debit">Débito (Aumentar Dívida)</option>
                        <option value="credit">Crédito (Pagamento)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase">
                        Valor
                      </label>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={manualTransactionAmount}
                        onChange={(e) =>
                          setManualTransactionAmount(
                            maskCurrency(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-white border rounded-xl font-bold text-[10px] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase">
                        Descrição
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Ajuste de saldo"
                        value={manualTransactionDescription}
                        onChange={(e) =>
                          setManualTransactionDescription(e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border rounded-xl font-bold text-[10px] outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleManualCustomerTransaction}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Confirmar Lançamento
                  </button>
                </div>

                {/* Histórico de Transações */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <History size={14} className="text-indigo-600" /> Histórico
                    Financeiro
                  </h3>
                  <div className="space-y-2">
                    {(selectedFiado.history || []).filter((t) => {
                      const d = new Date(t.date);
                      return (
                        d >= new Date(statementStartDate + "T00:00:00") &&
                        d <= new Date(statementEndDate + "T23:59:59")
                      );
                    }).length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-4">
                        Nenhuma transação no período selecionado.
                      </p>
                    ) : (
                      (selectedFiado.history || [])
                        .filter((t) => {
                          const d = new Date(t.date);
                          return (
                            d >= new Date(statementStartDate + "T00:00:00") &&
                            d <= new Date(statementEndDate + "T23:59:59")
                          );
                        })
                        .map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-1.5 rounded-lg ${t.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                              >
                                {t.type === "credit" ? (
                                  <ArrowUpCircle size={14} />
                                ) : (
                                  <ArrowDownCircle size={14} />
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-800">
                                  {t.description}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">
                                  {new Date(t.date).toLocaleDateString("pt-BR")}{" "}
                                  às{" "}
                                  {new Date(t.date).toLocaleTimeString(
                                    "pt-BR",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </p>
                              </div>
                            </div>
                            <p
                              className={`text-xs font-black ${t.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}
                            >
                              {t.type === "credit" ? "-" : "+"} R${" "}
                              {t.amount.toFixed(2)}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Histórico de Pedidos */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <ClipboardList size={14} className="text-indigo-600" />{" "}
                    Histórico de Pedidos
                  </h3>
                  <div className="space-y-2">
                    {orders.filter((o) => {
                      const d = new Date(o.createdAt);
                      return (
                        o.customerId === selectedFiado.id &&
                        d >= new Date(statementStartDate + "T00:00:00") &&
                        d <= new Date(statementEndDate + "T23:59:59")
                      );
                    }).length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-4">
                        Nenhum pedido no período selecionado.
                      </p>
                    ) : (
                      orders
                        .filter((o) => {
                          const d = new Date(o.createdAt);
                          return (
                            o.customerId === selectedFiado.id &&
                            d >= new Date(statementStartDate + "T00:00:00") &&
                            d <= new Date(statementEndDate + "T23:59:59")
                          );
                        })
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((o) => (
                          <div
                            key={o.id}
                            className="p-3 bg-white border rounded-xl shadow-sm space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-[10px] font-black text-slate-800">
                                  Pedido #{o.id.slice(-4).toUpperCase()}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">
                                  {new Date(o.createdAt).toLocaleDateString(
                                    "pt-BR",
                                  )}{" "}
                                  às{" "}
                                  {new Date(o.createdAt).toLocaleTimeString(
                                    "pt-BR",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </p>
                              </div>
                              <span className="text-xs font-black text-slate-800 text-right">
                                R$ {o.total.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {o.items.map((item, idx) => (
                                <span
                                  key={`item-tag-${o.id}-${idx}-${item.productId}`}
                                  className="text-[7px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase"
                                >
                                  {item.quantity}x {item.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-slate-50 shrink-0">
                <button
                  onClick={() => setShowCustomerDetailModal(false)}
                  className="w-full py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-xs hover:bg-slate-100 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Acerto de Entregador Interativo */}
        {showCourierSettleModal && selectedCourierDebt && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b bg-indigo-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-xl text-white">
                    <Bike size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">
                      Acerto de Entregador
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {selectedCourierDebt.courier.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCourierSettleModal(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Dinheiro na Rua
                    </p>
                    <p className="text-xl font-black text-slate-800">
                      {formatCurrency(selectedCourierDebt.cashHand)}
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                      Taxas + Diária
                    </p>
                    <p className="text-xl font-black text-indigo-600">
                      {formatCurrency(
                        selectedCourierDebt.totalFees +
                          selectedCourierDebt.totalDaily,
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Valor Devolvido pelo Entregador
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-xl outline-none focus:border-indigo-500 transition-all"
                      value={amountReturned}
                      onChange={(e) => setAmountReturned(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium italic px-1">
                    Dica: Se o entregador devolveu tudo, o valor deve ser{" "}
                    {formatCurrency(selectedCourierDebt.cashHand)}
                  </p>
                </div>

                <div className="pt-6 border-t">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Saldo Final do Acerto
                      </p>
                      {(() => {
                        const returned = parseCurrency(amountReturned);
                        const remainingDebt =
                          selectedCourierDebt.cashHand - returned;
                        const finalBalance =
                          selectedCourierDebt.totalFees +
                          selectedCourierDebt.totalDaily -
                          remainingDebt;

                        return (
                          <p
                            className={`text-3xl font-black tracking-tighter ${finalBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {formatCurrency(Math.abs(finalBalance))}
                            <span className="text-xs ml-2 uppercase tracking-widest">
                              {finalBalance >= 0 ? "A Pagar" : "A Receber"}
                            </span>
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setShowCourierSettleModal(false)}
                  className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCourierSettle}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
                >
                  Confirmar Acerto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 text-center">
                <div
                  className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                    confirmConfig.type === "danger"
                      ? "bg-red-50 text-red-600"
                      : confirmConfig.type === "warning"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-indigo-50 text-indigo-600"
                  }`}
                >
                  {confirmConfig.type === "danger" ? (
                    <Trash2 size={32} />
                  ) : confirmConfig.type === "warning" ? (
                    <AlertTriangle size={32} />
                  ) : (
                    <Info size={32} />
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  {confirmConfig.title}
                </h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  {confirmConfig.message}
                </p>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 font-black text-slate-400 uppercase tracking-widest text-xs hover:bg-white rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmConfig.onConfirm();
                    setShowConfirmModal(false);
                  }}
                  className={`flex-1 py-3 rounded-2xl font-black uppercase text-xs text-white shadow-xl transition-all ${
                    confirmConfig.type === "danger"
                      ? "bg-red-600 shadow-red-100 hover:bg-red-700"
                      : confirmConfig.type === "warning"
                        ? "bg-amber-600 shadow-amber-100 hover:bg-amber-700"
                        : "bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700"
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-8">
            <div
              className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
                toast.type === "success"
                  ? "bg-emerald-500/90 border-emerald-400 text-white"
                  : "bg-red-500/90 border-red-400 text-white"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm font-black uppercase tracking-widest">
                {toast.message}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default Finance;
