import { Form, Input } from "antd";
import React from "react";
import { InterfaceSettings } from "../api";
import { UpdateInterfaceOption } from "../Updater";

interface Props {
  options: InterfaceSettings;
}

interface ExtraProperties {
  readonly extra: React.ReactNode;
  readonly multiline: boolean;
}

type UISettingsKey = keyof InterfaceSettings;

const extraProps: { readonly [key in UISettingsKey]: ExtraProperties } = {
  durationTooltip: {
    extra: "Duration Chooser: Tooltip",
    multiline: true
  },
  modificationsHeader: {
    extra: "Modification List: Header",
    multiline: false
  },
  nextPollText: {
    extra: (
      <p>
        Next Poll: Text
        <br />
        Available placeholders: <em>%duration%</em>
      </p>
    ),
    multiline: true
  },
  noModificationName: {
    extra: '"No Modification": Name',
    multiline: false
  },
  noModificationTooltip: {
    extra: '"No Modification": Tooltip',
    multiline: true
  },
  notRegisteredHeader: {
    extra: "Not Registered: Header",
    multiline: false
  },
  notRegisteredText: {
    extra: "Not Registered: Text",
    multiline: true
  },
  pluralityName: {
    extra: "Plurality Mode: Name",
    multiline: false
  },
  pluralityTooltip: {
    extra: "Plurality Mode: Tooltip",
    multiline: true
  },
  pollEndedText: {
    extra: "Poll Ended: Text",
    multiline: true
  },
  secondsLeftText: {
    extra: (
      <p>
        Seconds Left: Text
        <br />
        Available placeholders: <em>%duration%</em>
      </p>
    ),
    multiline: true
  },
  subscribersOnlyHeader: {
    extra: "Subscribers Only: Header",
    multiline: false
  },
  subscribersOnlyText: {
    extra: "Subscribers Only: Text",
    multiline: true
  },
  votingModeHeader: {
    extra: "Voting Mode Chooser: Header",
    multiline: false
  },
  weightedRandomName: {
    extra: "Weighted Random Mode: Name",
    multiline: false
  },
  weightedRandomTooltip: {
    extra: "Weighted Random Mode: Tooltip",
    multiline: true
  },
  winnerName: {
    extra: "Winner: Name",
    multiline: false
  },
  winnerText: {
    extra: (
      <p>
        Winner: Text
        <br />
        Available placeholders: <em>%duration%</em>, <em>%icon%</em>,{" "}
        <em>%mod%</em>, <em>%percentage%</em>, <em>%totalVotes%</em>,{" "}
        <em>%votes%</em>
      </p>
    ),
    multiline: true
  },
  winnerTextNoModification: {
    extra: (
      <p>
        Winner (No Modification): Text
        <br />
        Available placeholders: <em>%icon%</em>, <em>%mod%</em>,{" "}
        <em>%percentage%</em>, <em>%totalVotes%</em>, <em>%votes%</em>
      </p>
    ),
    multiline: true
  }
};

const UISettingsSection: React.FunctionComponent<Props> = ({ options }) => (
  <Form>
    {Object.entries(options).map(([key, value]) => {
      const entry = extraProps[key as UISettingsKey];

      if (entry.multiline) {
        return (
          <Form.Item key={key} extra={entry.extra}>
            <Input.TextArea
              autosize
              defaultValue={value}
              onChange={e =>
                UpdateInterfaceOption({ [key]: e.target.value.trim() })
              }
            />
          </Form.Item>
        );
      }

      return (
        <Form.Item key={key} extra={entry.extra}>
          <Input
            defaultValue={value}
            onChange={e =>
              UpdateInterfaceOption({ [key]: e.target.value.trim() })
            }
          />
        </Form.Item>
      );
    })}
  </Form>
);

export default UISettingsSection;
