import { Checkbox, Form, Input, InputNumber, Select } from "antd";
import React from "react";
import { ClientOption, NumberOption, BoolOption } from "../api";
import { UpdateClientOption, UpdateModOption } from "../Updater";
import { isBoolOption, isStringOption } from "../guards";

interface Props {
  clientId?: string;
  modId?: string;
  options: ClientOption[];
}

function createOptions(values: string[] | number[] | boolean[]): JSX.Element[] {
  const res: JSX.Element[] = [];

  values.forEach((v: string | number | boolean) =>
    res.push(
      <Select.Option key={"" + v} value={typeof v === "boolean" ? +v : v}>
        {v}
      </Select.Option>
    )
  );

  return res;
}

export default class OptionsSection extends React.Component<Props> {
  createFormItem(o: ClientOption): JSX.Element {
    if (isBoolOption(o)) {
      return (
        <Form.Item key={o.id}>
          <Checkbox
            defaultChecked={o.value}
            onChange={e => this.onChange(o.id, e.target.checked)}
          >
            {o.description}
          </Checkbox>
        </Form.Item>
      );
    }

    if (o.validValues) {
      return (
        <Form.Item extra={o.description}>
          <Select
            onChange={value => this.onChange(o.id, value)}
            defaultValue={o.value}
          >
            {createOptions(o.validValues)}
          </Select>
        </Form.Item>
      );
    }

    if (isStringOption(o)) {
      return (
        <Form.Item extra={o.description}>
          <Input
            onChange={event => this.onChange(o.id, event.target.value)}
            defaultValue={(o.value as string) || (o.default as string)}
          />
        </Form.Item>
      );
    }

    return (
      <Form.Item extra={o.description}>
        <InputNumber
          onChange={value => value !== undefined && this.onChange(o.id, value)}
          defaultValue={+o.value || +o.default}
          precision={(o as NumberOption).numType === "int" ? 0 : undefined}
        />
      </Form.Item>
    );
  }

  onChange = (optionId: string, value: string | number | boolean) => {
    if (this.props.clientId == undefined) {
      return;
    }

    if (this.props.modId == undefined) {
      UpdateClientOption({ client: this.props.clientId, optionId, value });
      return;
    }

    UpdateModOption({
      client: this.props.clientId,
      modification: this.props.modId,
      optionId,
      value
    });
  };

  render() {
    const { options } = this.props;

    if (options.length === 0) {
      return <></>;
    }

    return <Form>{options.map(o => this.createFormItem(o))}</Form>;
  }
}
