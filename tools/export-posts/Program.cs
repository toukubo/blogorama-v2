using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.SqlClient;
using System.Data.SqlTypes;

namespace export_posts
{
    using Entry = Tuple<long, long, string, string, DateTime, DateTime?, string>;
    using System.IO;
    using Newtonsoft.Json;
    using System.Diagnostics;

    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                var sb = new StringBuilder();
                var sw = new StringWriter(sb);
                using(var writer = new JsonTextWriter(sw))
                {
                    writer.Formatting = Formatting.Indented;

                    writer.WriteStartObject();

                    // write meta object as Ghost expects
                    writer.WritePropertyName("meta");
                    writer.WriteStartObject();
                    writer.WritePropertyName("exported_on");
                    writer.WriteValue(DateTime.Now);
                    writer.WritePropertyName("version");
                    writer.WriteValue("002");
                    writer.WriteEndObject();

                    // write data object
                    writer.WritePropertyName("data");
                    writer.WriteStartObject();
                    writer.WritePropertyName("posts");

                    writer.WriteStartArray();
                    ForEachEntry(e =>
                    {
                        writer.WriteStartObject();
                        writer.WritePropertyName("id");
                        writer.WriteValue(e.Item1);
                        writer.WritePropertyName("uuid");
                        writer.WriteValue(Guid.NewGuid().ToString("D"));
                        writer.WritePropertyName("title");
                        writer.WriteValue(e.Item3);
                        writer.WritePropertyName("slug");
                        writer.WriteValue(e.Item7);
                        // generate markdown
                        var html = e.Item4.Replace('“', '"').Replace('”', '"').Replace("&nbsp;", " ");
                        writer.WritePropertyName("markdown");
                        writer.WriteValue(GenerateMarkdown(html));
                        //writer.WritePropertyName("category");
                        //writer.WriteValue(e.Item2);                        
                        writer.WritePropertyName("html");
                        writer.WriteValue(html);
                        writer.WritePropertyName("image");
                        writer.WriteValue((string)null);
                        writer.WritePropertyName("featured");
                        writer.WriteValue(0);
                        writer.WritePropertyName("page");
                        writer.WriteValue(0);
                        writer.WritePropertyName("status");
                        writer.WriteValue("published");
                        writer.WritePropertyName("language");
                        writer.WriteValue("en_US");
                        writer.WritePropertyName("author_id");
                        writer.WriteValue(1);
                        writer.WritePropertyName("created_at");
                        writer.WriteValue(e.Item5);
                        writer.WritePropertyName("created_by");
                        writer.WriteValue(1);
                        writer.WritePropertyName("updated_at");
                        writer.WriteValue(e.Item6);
                        writer.WritePropertyName("updated_by");
                        writer.WriteValue(1);
                        writer.WritePropertyName("published_at");
                        writer.WriteValue(e.Item5);
                        writer.WritePropertyName("published_by");
                        writer.WriteValue(1);
                        writer.WriteEndObject();
                    });
                    writer.WriteEndArray();

                    writer.WriteEndObject();
                    writer.WriteEndObject();
                }

                Console.WriteLine(sb.ToString());
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR: {0}", ex);
            }
        }

        private static string GenerateMarkdown(string html)
        {
            // write html to disk
            using(var fs = File.Open("input.html", FileMode.Create))
            {
                var data = Encoding.UTF8.GetBytes(html);
                fs.Write(data, 0, data.Length);
            }

            // generate markdown with filters
            var process = Process.Start(
                "cmd.exe",
                "/C \"pandoc -f html input.html -t json | node app.js | pandoc --no-wrap -f json -t markdown_strict > output.md\"");
            process.WaitForExit();

            // read and return markdown
            using(var fs = File.OpenRead("output.md"))
            using(var reader = new StreamReader(fs))
            {
                return reader.ReadToEnd();
            }
        }

        static void ForEachEntry(Action<Entry> callback)
        {
            using (var conn = new SqlConnection("Integrated Security=SSPI;Persist Security Info=False;User ID=\"\";Initial Catalog=blogorama;Data Source=.;"))
            {
                conn.Open();
                using (var cmd = new SqlCommand("select entry_id, entry_category, entry_title, entry_text, entry_date, update_date, entry_url from entries", conn))
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        callback(new Entry(
                            reader.GetInt64(0),
                            reader.GetInt64(1),
                            reader.GetString(2),
                            reader.GetString(3),
                            reader.GetDateTime(4),
                            reader.IsDBNull(5) ? (DateTime?)null : reader.GetDateTime(5),
                            reader.GetString(6)));
                    }
                }
            }
        }
    }
}
