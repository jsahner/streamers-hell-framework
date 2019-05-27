using API;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.Storage
{
    public class Modification
    {
        public string CustomDescription { get; set; }
        public decimal CustomMaxLength { get; set; }
        public decimal CustomMinLength { get; set; }
        public bool Enabled { get; set; }
        public Dictionary<string, object> Options { get; set; } = new Dictionary<string, object>();
        public string Tooltip { get; set; }

        public static Modification From(ClientRegisterModification m)
        {
            var res = new Modification
            {
                CustomMaxLength = Math.Max(m.MaxLength ?? 120, 120),
                CustomMinLength = 0,
                Enabled = false,
            };

            if (m.Options != null)
            {
                res.Options = m.Options.ToDictionary(o => o.Id, o => o.Default.Bool as object ?? o.Default.Double as object ?? o.Default.String);
            }

            return res;
        }

        /// <summary>
        /// Returns itself.
        /// </summary>
        public Modification UpdateFrom(ClientRegisterModification msg)
        {
            Tooltip = Tooltip ?? msg.Tooltip;

            if (msg.MaxLength != null)
            {
                CustomMaxLength = Math.Min(CustomMaxLength, (decimal)msg.MaxLength);
                CustomMinLength = Math.Min(CustomMinLength, CustomMaxLength);
            }

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
                        switch (o.NumType)
                        {
                            case null:
                                // boolean or string
                                if (o.Default.Bool != null && val is bool)
                                {
                                    return val;
                                }

                                if (o.Default.String != null && val is string)
                                {
                                    return val;
                                }

                                break;

                            case NumType.Double when val is decimal:
                                return val;

                            case NumType.Int when val is decimal:
                                return val;
                        }
                    }

                    return o.Default;
                });
            }

            return this;
        }

        /// <summary>
        /// Returns itself.
        /// </summary>
        public Modification UpdateFrom(ConfigChangeModification msg)
        {
            if (msg.Description != null)
            {
                CustomDescription = msg.Description == "" ? null : msg.Description;
            }

            if (msg.MaxLength != null)
            {
                CustomMaxLength = Math.Min((decimal)msg.MaxLength, 120);
                CustomMinLength = Math.Min(CustomMinLength, CustomMaxLength);
            }

            if (msg.MinLength != null)
            {
                CustomMinLength = Math.Max((decimal)msg.MinLength, 0);
                CustomMaxLength = Math.Max(CustomMinLength, CustomMaxLength);
            }

            if (msg.Enabled != null)
            {
                Enabled = (bool)msg.Enabled;
            }

            if (msg.Options != null)
            {
                foreach (var entry in msg.Options)
                {
                    Options[entry.Key] = entry.Value.Bool as object ?? entry.Value.Double as object ?? entry.Value.String;
                }
            }

            if (msg.Tooltip != null)
            {
                Tooltip = msg.Tooltip;
            }

            return this;
        }
    }
}