using System;
using System.Text.RegularExpressions;

class Program {
    static string Normalize(string s) => Regex.Replace(s, "\s+", "").ToUpperInvariant();
    static void Main() {
        string expected = "CREATE PROCEDURE MOB_CADASTRAR_PEDIDO_ITEM ( ID_PEDIDO INTEGER ) AS declare variable ITEM integer; begin end";
        int idx = expected.IndexOf("AS", StringComparison.OrdinalIgnoreCase);
        string expectedBody = idx != -1 ? expected.Substring(idx + 2) : expected;
        Console.WriteLine(Normalize(expectedBody));
    }
}
