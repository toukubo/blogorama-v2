using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace load_posts_cs
{
    class Program
    {
        static void Main(string[] args)
        {
            var client = new HttpClient();

            using(var stream = File.OpenRead("posts.json"))
            using(var reader = new StreamReader(stream))
            {
                var json = reader.ReadToEnd();
                var posts = JsonConvert.DeserializeObject(json) as JArray;
                foreach (JObject post in posts)
                {
                    var id = (long)(post["id"] as JValue).Value;
                    var content = new StringContent(JsonConvert.SerializeObject(post), Encoding.UTF8, "application/json");
                    client.PutAsync("http://nerd-search.cloudapp.net/blog/post/" + id.ToString(), content).Wait();
                    Console.WriteLine("Indexed post {0}", id);
                }
            }
        }
    }
}
