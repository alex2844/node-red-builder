# __NODE_NAME__

This is a demonstration node built with `node-red-builder` framework.
It performs a mock action and outputs the result.

## Inputs

- `payload` (any): The incoming message payload (currently ignored in this example).
- `action` (string): The action to perform. If `actionType` is set to `msg`,
  you can pass the action dynamically via `msg.action`.
- `topic` (string): The topic assigned to the output message.

## Outputs

- `payload` (object): A JSON object containing the results of the execution.
  - `action`: The action that was actually run.
  - `message`: A descriptive result string.
  - `timestamp`: ISO timestamp of when the action occurred.
- `topic` (string): The categorized topic of the message.

## Details

Select an action from the dropdown menu. You can also inject actions
dynamically by changing the *Action* field type to `msg` and passing
one of the valid action values (`Apply`, `Restart`, `Add`, `Delete`,
`Update`) into the node.
