export type TrxItem = {
  id: string
  productId: string | null
  name: string
  price: number
  quantity: number
}

export type Trx = {
  id: string
  code: string
  total: number
  paymentMethod: string
  paidAmount: number
  changeAmount: number
  createdAt: string
  items: TrxItem[]
}

export type Product = {
  id: string
  name: string
  price: number
  costPrice: number
  image: string
  stock: number
  createdAt: string
  updatedAt: string
}

export type Expense = {
  id: string
  description: string
  amount: number
  createdAt: string
}

export type ReportData = {
  period: "day" | "week" | "month"
  label: string
  summary: {
    totalSales: number
    totalExpense: number
    netProfit: number
    transactionCount: number
  }
  bestSellers: { name: string; quantity: number; revenue: number }[]
  ledger: {
    type: "income" | "expense"
    id: string
    description: string
    detail: string
    amount: number
    createdAt: string
  }[]
}
