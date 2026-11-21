#if DEBUG
/// `-CatLogDemo` 用的範例資料（與 packages/core/src/calculations.test.js 相同）。
enum DemoData {
    static let json = """
    {
      "records": {
        "2025-12-31": [{ "name": "銀行", "type": "fixed", "amount": 9000000 }],
        "2026-01-31": [{ "name": "銀行", "type": "fixed", "amount": 6000000 }, { "name": "股票", "type": "floating", "amount": 4000000 }],
        "2026-03-31": [{ "name": "銀行", "type": "fixed", "amount": 6500000 }, { "name": "股票", "type": "floating", "amount": 5500000 }]
      },
      "debts": { "2026-03-15": [{ "name": "信貸", "amount": 1000000 }] },
      "debtEvents": { "2026-03": [{ "id": "demo-e1", "date": "2026-03-20", "type": "repay", "name": "信貸", "amount": 50000 }] },
      "incomes": {
        "2025-12": { "totalAmount": 100000 },
        "2026-01": { "totalAmount": 120000, "sources": [] },
        "2026-03": { "totalAmount": 150000, "sources": [] }
      },
      "expenses": {
        "2026-01": [{ "date": "2026/01/05", "amount": 30000, "category": "飲食" }, { "date": "2026/01/20", "amount": 10000, "category": "交通" }],
        "2026-03": [{ "date": "2026-03-10", "amount": 50000, "category": "飲食" }]
      },
      "stockTransactions": [
        { "date": "2026-01-10", "market": "TW", "symbol": "2330", "name": "台積電", "type": "buy", "amount": 600000, "shares": 600 },
        { "date": "2026-02-10", "market": "TW", "symbol": "2330", "name": "台積電", "type": "sell", "amount": 350000, "shares": 300 },
        { "date": "2026-03-10", "market": "TW", "symbol": "2330", "name": "台積電", "type": "dividend", "amount": 5000 },
        { "date": "2026-02-11", "market": "TW", "symbol": "2317", "name": "鴻海", "type": "buy", "amount": 100000, "shares": 500 },
        { "date": "2026-03-01", "market": "US", "symbol": "AAPL", "name": "Apple", "type": "buy", "amount": 1000, "currency": "USD" }
      ],
      "stockHoldingSnapshots": {
        "2026-03": [{ "id": "demo-v1", "version": 1, "importedAt": "2026-03-31T00:00:00Z", "holdings": [
          { "market": "TW", "symbol": "2330", "name": "台積電", "shares": 300, "marketValue": 330000 },
          { "market": "TW", "symbol": "2317", "name": "鴻海", "shares": 500, "marketValue": 80000 }
        ] }]
      },
      "fireSettings": { "withdrawalRate": 4 }
    }
    """
}
#endif
