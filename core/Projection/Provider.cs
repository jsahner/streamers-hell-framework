using API;
using ColorThiefDotNet;
using Q42.HueApi;
using Q42.HueApi.ColorConverters;
using Q42.HueApi.ColorConverters.Original;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using static Projection.Globals;

namespace Projection
{
    public class Provider
    {
        private const string FOLDER = "Images";
        private readonly Dictionary<string, Tuple<string, RGBColor>> idToPath = new Dictionary<string, Tuple<string, RGBColor>>();
        private LocalHueClient hueClient;

        public Provider()
        {
            Directory.CreateDirectory(FOLDER);

            Console.Write("Start analyzing pictures... ");

            var pathColors = Directory.GetFiles(FOLDER)
                .AsParallel()
                .Select(path =>
                {
                    try
                    {
                        var name = Path.GetFileNameWithoutExtension(path);

                        using (var bitmap = new Bitmap(path))
                        {
                            var thief = new ColorThief();
                            var hexString = thief.GetColor(bitmap).Color.ToHexString();
                            var color = new RGBColor(hexString);

                            return new
                            {
                                Color = color,
                                Id = $"IMG_{name}",
                                Path = Path.GetFullPath(path)
                            };
                        }
                    }
                    catch
                    {
                        return null;
                    }
                })
                .Where(a => a != null)
                .ToList();

            Console.WriteLine("Done");

            Modifications = pathColors
                .Select(a => Path.GetFileNameWithoutExtension(a.Path))
                .Select(name => new ClientRegisterModification
                {
                    Description = $"Display {name}",
                    Name = $"IMG_{name}",
                    Icon = new API.Icon
                    {
                        Data = "🖼️",
                        Type = IconType.Emoji
                    }
                })
                .ToArray();

            idToPath = new Dictionary<string, Tuple<string, RGBColor>>();
            foreach (var entry in pathColors)
            {
                idToPath[entry.Id] = Tuple.Create(entry.Path, entry.Color);
            }
        }

        public event StartStopHandler OnStart, OnStop;

        public string HueAppKey { get; private set; }

        public string HueBridgeIp { get; private set; }

        public IEnumerable<ClientRegisterModification> Modifications { get; }

        public static async Task<string> FindHueBridgeIpAsync()
        {
            var locator = new HttpBridgeLocator();
            var bridgeIps = await locator.LocateBridgesAsync(TimeSpan.FromSeconds(5)).ConfigureAwait(false);
            return bridgeIps.FirstOrDefault()?.IpAddress;
        }

        //private WebSocketSessionManager Sessions => server.WebSocketServices["/"].Sessions;
        public static Task<string> RegisterHueAsync(string ipAddress)
        {
            var client = new LocalHueClient(ipAddress);
            return client.RegisterAsync("StreamersHell", Environment.MachineName);
        }

        public void SetHueAppKey(string value)
        {
            HueAppKey = value;
            UpdateHue();
        }

        public void SetHueBridgeIp(string value)
        {
            HueBridgeIp = value;
            UpdateHue();
        }

        public async Task Start(string modificationId, TimeSpan time)
        {
            if (!idToPath.TryGetValue(modificationId, out var tuple))
            {
                return;
            }

            SetCurrentPath(tuple.Item1);

            var cmd = new LightCommand
            {
                On = true
            };
            cmd.SetColor(tuple.Item2);
            SetHueColor(cmd);

            OnStart?.Invoke(modificationId);
            await Task.Delay(time).ConfigureAwait(false);
            Stop(modificationId);
        }

        /// <summary>
        /// Setting this property will broadcast to all connected clients automatically
        /// </summary>
        private void SetCurrentPath(string value)
        {
            var msg = new InfoMessage
            {
                Type = InfoMessageType.InfoMessage,
                Data = new Dictionary<string, object>
                {
                    ["projection_image"] = value
                }
            };

            Program.Send(msg.ToJson());
        }

        private void SetHueColor(LightCommand cmd)
        {
            hueClient?.SendCommandAsync(cmd).ConfigureAwait(false);
        }

        private void Stop(string modificationId)
        {
            SetCurrentPath("");

            var cmd = new LightCommand
            {
                On = false
            };

            SetHueColor(cmd);
            OnStop?.Invoke(modificationId);
        }

        private void UpdateHue()
        {
            if (string.IsNullOrWhiteSpace(HueAppKey) || string.IsNullOrWhiteSpace(HueBridgeIp))
            {
                hueClient = null;
                return;
            }

            hueClient = new LocalHueClient(HueBridgeIp);
            hueClient.Initialize(HueAppKey);

            var cmd = new LightCommand
            {
                On = false
            };

            hueClient.SendCommandAsync(cmd).ConfigureAwait(false);
        }
    }
}