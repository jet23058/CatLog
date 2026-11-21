import Foundation
import JavaScriptCore

/// 在 JavaScriptCore 裡執行 `packages/core`，讓 iOS 與 web 用同一份計算邏輯。
///
/// - 資料一律以 JSON 文字進出，避免 Swift / JS 型別轉換造成差異（例如數字、未知欄位）。
/// - JSContext 不是 thread-safe，所有呼叫都經過同一把鎖。
public final class CoreBridge: @unchecked Sendable {
    public enum Argument {
        /// 先用 `loadData(json:)` 載入的 App 資料（只在 JS 裡解析一次）。
        case data
        /// 任意 JSON 文字，在 JS 裡用 `JSON.parse` 轉成物件。
        case json(String)
        case string(String)
        case number(Double)
        case int(Int)
        case bool(Bool)
        case null
        /// 在 JS 端組成物件，例如 `checkCompatibility({ appVersion, data, meta })`。
        indirect case object([String: Argument])
        /// 已載入資料的某個欄位，例如 `.dataField("records")`，不必把整份資料傳回 Swift。
        case dataField(String)
        /// 在 JS 端組成陣列。
        indirect case array([Argument])
    }

    private let context: JSContext
    private let core: JSValue
    private let json: JSValue
    private var loadedData: JSValue?
    private let lock = NSLock()

    /// 從 CatLogKit 內建的 catlog-core.js 建立。
    public static func bundled() throws -> CoreBridge {
        guard let url = Bundle.module.url(forResource: "catlog-core", withExtension: "js") else {
            throw CoreBridgeError.scriptNotFound
        }
        return try CoreBridge(script: String(contentsOf: url, encoding: .utf8))
    }

    public init(script: String) throws {
        guard let context = JSContext() else { throw CoreBridgeError.contextUnavailable }
        self.context = context
        context.evaluateScript(script)
        if let exception = context.exception {
            throw CoreBridgeError.jsException(exception.toString() ?? "unknown")
        }
        guard let core = context.objectForKeyedSubscript("CatLogCore"), core.isObject else {
            throw CoreBridgeError.coreNotLoaded
        }
        self.core = core
        self.json = context.objectForKeyedSubscript("JSON")
    }

    /// 解析 App 資料 JSON 並保留在 JS 端，之後用 `.data` 參數傳入。
    public func loadData(json text: String) throws {
        try withLock {
            loadedData = try parse(text)
        }
    }

    /// 是否已用 `loadData(json:)` 載入資料。
    public var hasLoadedData: Bool {
        withLock { loadedData != nil }
    }

    /// 目前載入的資料（JSON 文字）。
    public func dataJSON() throws -> String? {
        try withLock {
            guard let loadedData else { return nil }
            return try stringify(loadedData)
        }
    }

    /// 呼叫 core 的函式，回傳結果的 JSON 文字（undefined 時為 "null"）。
    public func callJSON(_ name: String, _ arguments: [Argument] = []) throws -> String {
        try withLock {
            let result = try invoke(name, arguments)
            return try stringify(result)
        }
    }

    /// 呼叫 core 的函式並解碼成 Swift 型別。
    public func call<T: Decodable>(_ name: String, _ arguments: [Argument] = [], as type: T.Type = T.self) throws -> T {
        let text = try callJSON(name, arguments)
        do {
            return try JSONDecoder().decode(T.self, from: Data(text.utf8))
        } catch {
            throw CoreBridgeError.decodingFailed(function: name, underlying: error.localizedDescription)
        }
    }

    /// 呼叫回傳字串的 core 函式（例如 `hashString`）。
    public func callString(_ name: String, _ arguments: [Argument] = []) throws -> String {
        try withLock {
            let result = try invoke(name, arguments)
            guard result.isString, let value = result.toString() else {
                throw CoreBridgeError.unexpectedResult(function: name)
            }
            return value
        }
    }

    /// 讀取 core 匯出的常數（例如 `CURRENT_SCHEMA_VERSION`）。
    public func constant<T: Decodable>(_ name: String, as type: T.Type = T.self) throws -> T {
        try withLock {
            guard let value = core.objectForKeyedSubscript(name), !value.isUndefined else {
                throw CoreBridgeError.functionNotFound(name)
            }
            let text = try stringify(value)
            return try JSONDecoder().decode(T.self, from: Data(text.utf8))
        }
    }

    // MARK: - Private（呼叫前必須已持有鎖）

    private func withLock<T>(_ body: () throws -> T) rethrows -> T {
        lock.lock()
        defer { lock.unlock() }
        return try body()
    }

    private func invoke(_ name: String, _ arguments: [Argument]) throws -> JSValue {
        guard let function = core.objectForKeyedSubscript(name), !function.isUndefined else {
            throw CoreBridgeError.functionNotFound(name)
        }
        let values = try arguments.map(toJSValue)
        context.exception = nil
        let result = function.call(withArguments: values)
        if let exception = context.exception {
            context.exception = nil
            throw CoreBridgeError.jsException("\(name): \(exception.toString() ?? "unknown")")
        }
        return result ?? JSValue(undefinedIn: context)
    }

    private func toJSValue(_ argument: Argument) throws -> Any {
        switch argument {
        case .data:
            guard let loadedData else { throw CoreBridgeError.dataNotLoaded }
            return loadedData
        case .json(let text): return try parse(text)
        case .string(let value): return value
        case .number(let value): return value
        case .int(let value): return value
        case .bool(let value): return value
        case .null: return NSNull()
        case .dataField(let key):
            guard let loadedData else { throw CoreBridgeError.dataNotLoaded }
            return loadedData.objectForKeyedSubscript(key) ?? JSValue(undefinedIn: context)
        case .array(let items):
            guard let array = JSValue(newArrayIn: context) else { throw CoreBridgeError.contextUnavailable }
            for (index, item) in items.enumerated() {
                array.setObject(try toJSValue(item), atIndexedSubscript: index)
            }
            return array
        case .object(let fields):
            guard let object = JSValue(newObjectIn: context) else { throw CoreBridgeError.contextUnavailable }
            for (key, value) in fields {
                object.setObject(try toJSValue(value), forKeyedSubscript: key as NSString)
            }
            return object
        }
    }

    private func parse(_ text: String) throws -> JSValue {
        context.exception = nil
        let value = json.invokeMethod("parse", withArguments: [text])
        if let exception = context.exception {
            context.exception = nil
            throw CoreBridgeError.invalidJSON(exception.toString() ?? "")
        }
        return value ?? JSValue(nullIn: context)
    }

    private func stringify(_ value: JSValue) throws -> String {
        if value.isUndefined { return "null" }
        context.exception = nil
        let result = json.invokeMethod("stringify", withArguments: [value])
        if let exception = context.exception {
            context.exception = nil
            throw CoreBridgeError.jsException("JSON.stringify: \(exception.toString() ?? "")")
        }
        guard let result, result.isString, let text = result.toString() else { return "null" }
        return text
    }
}

public enum CoreBridgeError: Error, Equatable, LocalizedError {
    case scriptNotFound
    case contextUnavailable
    case coreNotLoaded
    case dataNotLoaded
    case functionNotFound(String)
    case jsException(String)
    case invalidJSON(String)
    case unexpectedResult(function: String)
    case decodingFailed(function: String, underlying: String)

    public var errorDescription: String? {
        switch self {
        case .scriptNotFound: return "找不到 catlog-core.js"
        case .contextUnavailable: return "無法建立 JavaScriptCore 環境"
        case .coreNotLoaded: return "catlog-core.js 沒有匯出 CatLogCore"
        case .dataNotLoaded: return "尚未載入資料"
        case .functionNotFound(let name): return "core 沒有 \(name)"
        case .jsException(let message): return "core 執行錯誤：\(message)"
        case .invalidJSON(let message): return "JSON 格式錯誤：\(message)"
        case .unexpectedResult(let function): return "\(function) 回傳格式不符"
        case .decodingFailed(let function, let underlying): return "\(function) 結果解碼失敗：\(underlying)"
        }
    }
}
