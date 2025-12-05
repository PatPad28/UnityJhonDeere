// ============= MiniJSON.cs =============
using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.IO;

namespace MiniJSON {
    public static class Json {
        public static object Deserialize(string json) {
            if (json == null) return null;
            return Parser.Parse(json);
        }

        sealed class Parser : IDisposable {
            enum TOKEN { NONE, CURLY_OPEN, CURLY_CLOSE, SQUARED_OPEN, SQUARED_CLOSE,
                         COLON, COMMA, STRING, NUMBER, TRUE, FALSE, NULL }

            StringReader json;
            Parser(string jsonString) { json = new StringReader(jsonString); }
            public static object Parse(string jsonString) {
                using (var instance = new Parser(jsonString)) {
                    return instance.ParseValue();
                }
            }

            public void Dispose() { json.Dispose(); }

            Dictionary<string, object> ParseObject() {
                var table = new Dictionary<string, object>();
                json.Read();
                while (true) {
                    switch (NextToken) {
                        case TOKEN.NONE: return null;
                        case TOKEN.COMMA: continue;
                        case TOKEN.CURLY_CLOSE: return table;
                        default:
                            string name = ParseString();
                            if (NextToken != TOKEN.COLON) return null;
                            json.Read();
                            table[name] = ParseValue();
                            break;
                    }
                }
            }

            object ParseValue() {
                switch (NextToken) {
                    case TOKEN.STRING: return ParseString();
                    case TOKEN.NUMBER: return ParseNumber();
                    case TOKEN.CURLY_OPEN: return ParseObject();
                    case TOKEN.SQUARED_OPEN: return ParseArray();
                    case TOKEN.TRUE: return true;
                    case TOKEN.FALSE: return false;
                    case TOKEN.NULL: return null;
                }
                return null;
            }

            List<object> ParseArray() {
                var array = new List<object>();
                json.Read();
                var parsing = true;
                while (parsing) {
                    TOKEN nextToken = NextToken;
                    switch (nextToken) {
                        case TOKEN.NONE: return null;
                        case TOKEN.COMMA: continue;
                        case TOKEN.SQUARED_CLOSE: parsing = false; break;
                        default: array.Add(ParseValue()); break;
                    }
                }
                return array;
            }

            string ParseString() {
                var s = new StringBuilder();
                json.Read();
                bool parsing = true;
                while (parsing) {
                    if (json.Peek() == -1) break;
                    char c = NextChar;
                    switch (c) {
                        case '"': parsing = false; break;
                        case '\\':
                            c = NextChar;
                            if (c == '"') s.Append('"');
                            else if (c == '\\') s.Append('\\');
                            break;
                        default: s.Append(c); break;
                    }
                }
                return s.ToString();
            }

            object ParseNumber() {
                string number = NextWord;
                if (number.IndexOf('.') == -1) {
                    long.TryParse(number, out long parsedInt);
                    return parsedInt;
                }
                else {
                    double.TryParse(number, out double parsedDouble);
                    return parsedDouble;
                }
            }

            TOKEN NextToken {
                get {
                    EatWhitespace();
                    if (json.Peek() == -1) return TOKEN.NONE;
                    switch (json.Peek()) {
                        case '{': return TOKEN.CURLY_OPEN;
                        case '}': json.Read(); return TOKEN.CURLY_CLOSE;
                        case '[': return TOKEN.SQUARED_OPEN;
                        case ']': json.Read(); return TOKEN.SQUARED_CLOSE;
                        case ':': json.Read(); return TOKEN.COLON;
                        case ',': json.Read(); return TOKEN.COMMA;
                        case '"': return TOKEN.STRING;
                        case '-': case '0': case '1': case '2': case '3': case '4':
                        case '5': case '6': case '7': case '8': case '9': return TOKEN.NUMBER;
                    }
                    string word = NextWord;
                    if (word == "true") return TOKEN.TRUE;
                    if (word == "false") return TOKEN.FALSE;
                    if (word == "null") return TOKEN.NULL;
                    return TOKEN.NONE;
                }
            }

            char NextChar => (char)json.Read();
            string NextWord {
                get {
                    var word = new StringBuilder();
                    while (" \t\n\r{}[],:\"".IndexOf((char)json.Peek()) == -1) {
                        word.Append(NextChar);
                        if (json.Peek() == -1) break;
                    }
                    return word.ToString();
                }
            }
            void EatWhitespace() {
                while (" \t\n\r".IndexOf((char)json.Peek()) != -1) json.Read();
            }
        }
    }
}
