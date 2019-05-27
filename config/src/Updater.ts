import {
  ConfigChange,
  ConfigChangeClient,
  InterfaceSettings,
  OptionType,
  PollSettings
} from "./api";

interface ClientOptionUpdate {
  client: string;
  optionId: string;
  value: OptionType;
}

interface ModUpdate {
  client: string;
  description?: string;
  enabled?: boolean;
  maxLength?: number;
  minLength?: number;
  modification: string;
  tooltip?: string;
}

interface ModOptionUpdate {
  client: string;
  modification: string;
  optionId: string;
  value: OptionType;
}

interface ConfigChangeIntern extends ConfigChange {
  clients: { [id: string]: ConfigChangeClient };
  pollSettings: Partial<PollSettings>;
}

const changes: ConfigChangeIntern = {
  clients: {},
  interfaceSettings: {},
  pollSettings: {},
  type: "Config.Change"
};

let sendUpdate = false;
let updateFlagTimer: number | undefined;

/**
 * Call when there are new changes to be sent to SHF. Debounces for 2 seconds.
 */
function debounceUpdate() {
  clearTimeout(updateFlagTimer);

  updateFlagTimer = setTimeout(() => {
    sendUpdate = true;
  }, 2000);
}

/**
 * Sends update message, if there are changes to be saved, and cleans dirty objects.
 *
 * Returns true if message was sent, false otherwise.
 */
export function SendUpdateMessage(socket: WebSocket): boolean {
  if (sendUpdate) {
    sendUpdate = false;

    socket.send(JSON.stringify(changes));

    changes.clients = {};
    changes.interfaceSettings = {};
    changes.pollSettings = {};

    return true;
  }

  return false;
}

export function UpdateClientOption(update: ClientOptionUpdate) {
  const { client, optionId } = update;
  changes.clients[client] = changes.clients[client] || {};

  const { options } = changes.clients[client];
  changes.clients[client].options = { ...options, [optionId]: update.value };

  debounceUpdate();
}

export function UpdatePollOption(update: Partial<PollSettings>) {
  changes.pollSettings = { ...changes.pollSettings, ...update };
  debounceUpdate();
}

export function UpdateInterfaceOption(update: Partial<InterfaceSettings>) {
  changes.interfaceSettings = { ...changes.interfaceSettings, ...update };
  debounceUpdate();
}

export function UpdateMod(update: ModUpdate) {
  const { description, maxLength, minLength, enabled, tooltip } = update;

  const mod = getModReference(update);

  if (description != undefined) {
    mod.description = description;
  }

  if (enabled != undefined) {
    mod.enabled = enabled;
  }

  if (maxLength != undefined) {
    mod.maxLength = maxLength;
  }

  if (minLength != undefined) {
    mod.minLength = minLength;
  }

  if (tooltip != undefined) {
    mod.tooltip = tooltip;
  } else if (tooltip == "") {
    mod.tooltip = undefined;
  }

  debounceUpdate();
}

export function UpdateModOption(update: ModOptionUpdate) {
  const { optionId, value } = update;

  const modRef = getModReference(update);
  modRef.options = modRef.options || {};
  modRef.options[optionId] = value;

  debounceUpdate();
}

function getModReference(update: ModUpdate) {
  const { client, modification } = update;

  const changeClient = (changes.clients[client] =
    changes.clients[client] || {});

  const changeMods = (changeClient.modifications =
    changeClient.modifications || {});

  const changeMod = (changeMods[modification] = changeMods[modification] || {});
  return changeMod;
}
