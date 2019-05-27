using API;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.Storage
{
    public class Client
    {
        public string Id { get; set; }
        public Dictionary<string, Modification> Modifications { get; set; } = new Dictionary<string, Modification>();
        public Dictionary<string, object> Options { get; set; } = new Dictionary<string, object>();

        public static Client From(ClientRegister msg)
        {
            var res = new Client { Id = msg.Id };

            if (msg.Modifications != null)
            {
                res.Modifications = msg.Modifications.ToDictionary(m => m.Name, Modification.From);
            }

            if (msg.Options != null)
            {
                res.Options = msg
                    .Options
                    .ToDictionary(
                        o => o.Id,
                        o => o.Default.Bool as object ?? o.Default.Double as object ?? o.Default.String);
            }

            return res;
        }

        public ConfigAvailableClient ToConfigAvailableClient(ClientRegister msg)
        {
            var res = new ConfigAvailableClient
            {
                Icon = msg.Icon,
                Id = Id,
                Modifications = new List<ConfigAvailableModification>(),
                Options = new List<ClientOption>()
            };

            if (msg.Options != null)
            {
                foreach (var o in msg.Options)
                {
                    var tmp = new ClientOption
                    {
                        Default = o.Default,
                        Description = o.Description,
                        Id = o.Id,
                        NumType = o.NumType,
                        ValidValues = o.ValidValues,
                        Value = o.Default
                    };

                    if (Options.TryGetValue(o.Id, out var val))
                    {
                        switch (val)
                        {
                            case bool b:
                                tmp.Value = b;
                                break;

                            case decimal d:
                                tmp.Value = d;
                                break;

                            case string s:
                                tmp.Value = s;
                                break;
                        }
                    }

                    res.Options.Add(tmp);
                }
            }

            if (msg.Modifications == null)
            {
                return res;
            }

            foreach (var mod in Modifications)
            {
                var registerMod = msg.Modifications.Find(m => m.Name == mod.Key);

                if (registerMod == null)
                {
                    continue;
                }

                var tmpMod = new ConfigAvailableModification
                {
                    CustomDescription = mod.Value.CustomDescription,
                    CustomMaxLength = mod.Value.CustomMaxLength,
                    CustomMinLength = mod.Value.CustomMinLength,
                    Description = registerMod.Description,
                    Enabled = mod.Value.Enabled,
                    Icon = registerMod.Icon,
                    MaxLength = Math.Min(registerMod.MaxLength ?? 120, 120),
                    Name = registerMod.Name,
                    Options = new List<ClientOption>(),
                    Tooltip = mod.Value.Tooltip,
                };

                if (registerMod.Options != null)
                {
                    foreach (var option in registerMod.Options)
                    {
                        var tmpCO = new ClientOption
                        {
                            Default = option.Default,
                            Description = option.Description,
                            Id = option.Id,
                            NumType = option.NumType,
                            ValidValues = option.ValidValues,
                            Value = option.Default
                        };

                        if (mod.Value.Options.TryGetValue(option.Id, out var val))
                        {
                            switch (val)
                            {
                                case bool b:
                                    tmpCO.Value = b;
                                    break;

                                case decimal d:
                                    tmpCO.Value = d;
                                    break;

                                case string s:
                                    tmpCO.Value = s;
                                    break;
                            }
                        }

                        tmpMod.Options.Add(tmpCO);
                    }
                }

                res.Modifications.Add(tmpMod);
            }

            return res;
        }

        /// <summary>
        /// Returns itself.
        /// </summary>
        public Client UpdateFrom(ClientRegister msg)
        {
            if (msg.Options == null)
            {
                Options.Clear();
            }
            else
            {
                Options = msg.Options.ToDictionary(o => o.Id, o =>
                {
                    if (Options.TryGetValue(o.Id, out var val))
                    {
                        if (o.Default.Bool != null && val is bool b)
                        {
                            return b;
                        }

                        if (o.Default.Double != null && val is decimal d && o.ValidValues?.Contains(d) != false)
                        {
                            return d;
                        }

                        if (o.Default.String != null && val is string s && o.ValidValues?.Contains(s) != false)
                        {
                            return s;
                        }
                    }

                    return o.Default.Bool ?? o.Default.Double ?? (object)o.Default.String;
                });
            }

            if (msg.Modifications == null)
            {
                Modifications.Clear();
            }
            else
            {
                Modifications = msg
                    .Modifications
                    .ToDictionary(
                        m => m.Name,
                        m => Modifications.TryGetValue(m.Name, out var mod)
                            ? mod.UpdateFrom(m)
                            : Modification.From(m));
            }

            return this;
        }

        /// <summary>
        /// Returns itself.
        /// </summary>
        public Client UpdateFrom(ConfigChangeClient client)
        {
            if (client.Modifications != null)
            {
                foreach (var msgMod in client.Modifications)
                {
                    if (Modifications.TryGetValue(msgMod.Key, out var mod))
                    {
                        mod.UpdateFrom(msgMod.Value);
                    }
                }
            }

            if (client.Options != null)
            {
                foreach (var msgOption in client.Options)
                {
                    var val = msgOption.Value;
                    Options[msgOption.Key] = val.Bool as object ?? val.Double as object ?? val.String;
                }
            }

            return this;
        }
    }
}