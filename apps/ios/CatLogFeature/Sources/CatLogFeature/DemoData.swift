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
      "incomes": {
        "2025-12": { "totalAmount": 100000 },
        "2026-01": { "totalAmount": 120000, "sources": [] },
        "2026-03": { "totalAmount": 150000, "sources": [] }
      },
      "expenses": {
        "2026-01": [{ "date": "2026/01/05", "amount": 30000, "category": "飲食" }, { "date": "2026/01/20", "amount": 10000, "category": "交通" }],
        "2026-03": [{ "date": "2026-03-10", "amount": 50000, "category": "飲食" }]
      },
      "fireSettings": { "withdrawalRate": 4 }
    }
    """
}
#endif
