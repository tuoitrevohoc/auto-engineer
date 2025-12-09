
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction } from './actions/Action';
import { GitCheckoutAction } from './actions/GitCheckoutAction';
import { RunCommandAction } from './actions/RunCommandAction';
import { ConfirmAction } from './actions/ConfirmAction';
import { UserInputAction } from './actions/UserInputAction';
import { SetDescriptionAction } from './actions/SetDescriptionAction';
import { AddLogAction } from './actions/AddLogAction';
import { ForEachFolderAction } from './actions/ForEachFolderAction';
import { ForEachListAction } from './actions/ForEachListAction';

const actionInstances: WorkflowAction[] = [
  new GitCheckoutAction(),
  new RunCommandAction(),
  new ConfirmAction(),
  new UserInputAction(),
  new SetDescriptionAction(),
  new AddLogAction(),
  new ForEachFolderAction(),
  new ForEachListAction(),
];

export const ACTION_REGISTRY: ActionDefinition[] = actionInstances.map(a => a.definition);

export const ACTION_INSTANCES: Record<string, WorkflowAction> = actionInstances.reduce((acc, action) => {
    acc[action.definition.id] = action;
    return acc;
}, {} as Record<string, WorkflowAction>);

export const getActionDefinition = (id: string): ActionDefinition | undefined => {
  return ACTION_REGISTRY.find((a) => a.id === id);
};

export const getActionInstance = (id: string): WorkflowAction | undefined => {
    return ACTION_INSTANCES[id];
};
