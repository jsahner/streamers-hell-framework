import { Checkbox, Form, Input, InputNumber, Select } from "antd";
import React from "react";
import { UpdatePollOption } from "../Updater";
import { PollSettings } from "../api";

interface Props {
  options: PollSettings;
}

const PollSettingsSection: React.FunctionComponent<Props> = props => {
  const { options } = props;

  return (
    <Form>
      <Form.Item extra="URL to Extension Background Service (EBS)">
        <Input
          defaultValue={options.ebsUrl}
          onChange={e => UpdatePollOption({ ebsUrl: e.target.value })}
        />
      </Form.Item>
      <Form.Item>
        <Checkbox
          defaultChecked={options.allowNoModification}
          onChange={e =>
            UpdatePollOption({ allowNoModification: e.target.checked })
          }
        >
          Viewers may vote for "no modification"
        </Checkbox>
      </Form.Item>
      <Form.Item extra="Maximum amount of modifications per poll">
        <InputNumber
          onChange={value => UpdatePollOption({ maxModifications: value })}
          defaultValue={options.maxModifications}
          min={0}
          precision={0}
        />
      </Form.Item>
      <Form.Item extra="Duration of a poll in seconds">
        <InputNumber
          onChange={value => UpdatePollOption({ duration: value })}
          defaultValue={options.duration}
          min={30}
          precision={0}
        />
      </Form.Item>
      <Form.Item extra="Frequency of polls in seconds">
        <InputNumber
          onChange={value => UpdatePollOption({ frequency: value })}
          defaultValue={options.frequency}
          min={0}
          precision={0}
        />
      </Form.Item>
      <Form.Item extra="Viewers that may participate in polls">
        <Select
          onChange={value => UpdatePollOption({ participants: value })}
          defaultValue={options.participants}
        >
          <Select.Option key="all" value="all">
            Everyone
          </Select.Option>
          <Select.Option key="logged_in" value="logged_in">
            Logged-in users
          </Select.Option>
          <Select.Option key="subscribers" value="subscribers">
            Subscribers
          </Select.Option>
        </Select>
      </Form.Item>
      <Form.Item extra="Voting Mode">
        <Select
          onChange={value => UpdatePollOption({ mode: value })}
          defaultValue={options.mode}
        >
          <Select.Option key="viewers" value="viewers">
            Let my viewers decide
          </Select.Option>
          <Select.Option key="plurality" value="plurality">
            Plurality mode (most votes win)
          </Select.Option>
          <Select.Option key="weighted_random" value="weighted_random">
            Weighted random mode (more votes = higher chance of choosing
            respective modification
          </Select.Option>
        </Select>
      </Form.Item>
    </Form>
  );
};

export default PollSettingsSection;
