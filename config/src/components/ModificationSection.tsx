import { Card, Checkbox, Form, Icon as AntIcon, Slider, Input } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { SliderMarks, SliderValue } from "antd/lib/slider";
import React, { Component } from "react";
import {
  ConfigAvailableModification,
  ExecutionStartRequest,
  Icon
} from "../api";
import { UpdateMod } from "../Updater";
import IconDisplay from "./IconDisplay";
import OptionsSection from "./OptionsSection";

const marks: SliderMarks = {
  0: 0,
  20: 20,
  40: 40,
  60: 60,
  80: 80,
  100: 100,
  120: 120
};

interface Props {
  clientId: string;
  icon?: Icon;
  mod: ConfigAvailableModification;
  socket: WebSocket;
}

export default class ModificationSection extends Component<Props> {
  cardActions(): React.ReactNode[] {
    return [<AntIcon type="play-circle" onClick={this.start} />];
  }

  enabledChange = (e: CheckboxChangeEvent) => {
    const { clientId, mod } = this.props;

    UpdateMod({
      client: clientId,
      enabled: e.target.checked,
      modification: mod.name
    });
  };

  onDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { clientId, mod } = this.props;

    UpdateMod({
      client: clientId,
      description: e.target.value,
      modification: mod.name
    });
  };

  onLengthChange = (value: SliderValue) => {
    const { clientId, mod } = this.props;

    let min, max: number;

    if (typeof value === "number") {
      min = max = value;
    } else {
      [min, max] = value;
    }

    UpdateMod({
      client: clientId,
      minLength: min,
      maxLength: max,
      modification: mod.name
    });
  };

  onTooltipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { clientId, mod } = this.props;

    UpdateMod({
      client: clientId,
      modification: mod.name,
      tooltip: e.target.value
    });
  };

  start = () => {
    const { clientId, mod, socket } = this.props;

    const msg: ExecutionStartRequest = {
      type: "Execution.StartRequest",
      length: mod.customMinLength,
      modificationId: clientId + "|" + mod.name
    };

    socket.send(JSON.stringify(msg));
  };

  render() {
    const { icon, mod } = this.props;
    const sliderMax = Math.min(Math.max(0, mod.maxLength), 120) || 120;
    const actions = this.cardActions();

    return (
      <Card
        title={
          <>
            {icon && (
              <>
                <IconDisplay key={`${mod.name}_icon`} icon={icon} />{" "}
              </>
            )}
            {mod.description}
          </>
        }
        style={{ margin: 4, width: 300 }}
        actions={actions}
      >
        <Form>
          <Form.Item key={mod.name + "_enabled"}>
            <Checkbox
              defaultChecked={mod.enabled}
              onChange={this.enabledChange}
            >
              Enabled
            </Checkbox>
          </Form.Item>
          <Form.Item key={mod.name + "_duration"} extra="Duration (in seconds)">
            <Slider
              range
              marks={marks}
              defaultValue={[mod.customMinLength, mod.customMaxLength]}
              min={0}
              max={sliderMax}
              onAfterChange={this.onLengthChange}
            />
          </Form.Item>
          <Form.Item key={mod.name + "_title"} extra="Title">
            <Input
              defaultValue={mod.customDescription}
              onChange={this.onDescriptionChange}
              allowClear
              placeholder="Leave empty to use default"
            />
          </Form.Item>
          <Form.Item key={mod.name + "_tooltip"} extra="Tooltip">
            <Input
              defaultValue={mod.tooltip}
              onChange={this.onTooltipChange}
              allowClear
              placeholder="Leave empty to discard"
            />
          </Form.Item>
        </Form>

        {mod.options && (
          <OptionsSection
            clientId={this.props.clientId}
            key={mod.name + "_options"}
            options={mod.options}
            modId={mod.name}
          />
        )}
      </Card>
    );
  }
}
