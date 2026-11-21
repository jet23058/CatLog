import Foundation

/// 數字欄位的輸入過濾。`keyboardType(.decimalPad)` 只管螢幕鍵盤；
/// 用實體鍵盤（模擬器、iPad 外接鍵盤）或注音輸入法時仍可能打出「ㄅ」等字元，所以存進欄位前一律過濾。
public enum NumericInput {
    /// 只保留數字與（允許時）第一個小數點；全形數字與全形小數點會轉成半形。
    /// - maxFractionDigits：小數最多幾位（例如資產原幣金額 2 位，與 web 相同）；nil 表示不限制。
    public static func sanitize(_ text: String, allowDecimal: Bool = true, maxFractionDigits: Int? = nil) -> String {
        var result = ""
        var hasDecimalPoint = false
        var fractionDigits = 0
        for character in text {
            let normalized = halfWidth(character)
            if normalized.isASCII, normalized.isNumber {
                if hasDecimalPoint {
                    if let maxFractionDigits, fractionDigits >= maxFractionDigits { continue }
                    fractionDigits += 1
                }
                result.append(normalized)
            } else if normalized == ".", allowDecimal, !hasDecimalPoint {
                hasDecimalPoint = true
                result.append(result.isEmpty ? "0." : ".")
            }
        }
        return result
    }

    private static func halfWidth(_ character: Character) -> Character {
        switch character {
        case "０"..."９":
            let offset = character.unicodeScalars.first!.value - ("０" as Unicode.Scalar).value
            return Character(Unicode.Scalar(("0" as Unicode.Scalar).value + offset)!)
        case "．", "。": return "."
        default: return character
        }
    }
}
