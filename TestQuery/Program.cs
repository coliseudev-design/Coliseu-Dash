using System;
using FirebirdSql.Data.FirebirdClient;

class Program
{
    static void Main()
    {
        string cs = "User=SYSDBA;Password=masterkey;Database=C:\\Coliseu\\Data\\KSTRATOR.FDB;DataSource=localhost;Port=3050;Dialect=3;Charset=NONE;";
        using (FbConnection conn = new FbConnection(cs))
        {
            conn.Open();
            try {
                using (FbCommand cmd = new FbCommand("SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$RELATION_NAME LIKE '%EMP%'", conn))
                using (FbDataReader r = cmd.ExecuteReader())
                {
                    while(r.Read()) {
                        Console.WriteLine($"TABLE: {r[0].ToString().Trim()}");
                    }
                }
            }
            catch (Exception ex) {
                Console.WriteLine($"ERRO: {ex.Message}");
            }
        }
    }
}
