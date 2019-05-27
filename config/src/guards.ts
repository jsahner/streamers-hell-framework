import { BoolOption, ClientOption, NumberOption, StringOption } from "./api";

export function isBoolOption(option: ClientOption): option is BoolOption {
  return typeof option.value === "boolean";
}

export function isNumberOption(option: ClientOption): option is NumberOption {
  return typeof option.value === "number";
}

export function isStringOption(option: ClientOption): option is StringOption {
  return typeof option.value === "string";
}
