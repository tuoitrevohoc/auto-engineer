import { ActionDefinition } from '@/types/workflow';
import { 
    GitCheckoutDefinition, 
    RunCommandDefinition, 
    ConfirmDefinition, 
    UserInputDefinition, 
    SetDescriptionDefinition, 
    AddLogDefinition, 
    NewTempFolderDefinition, 
    ForEachListDefinition,
    AskChatGPTDefinition,
    SplitStringDefinition,
    AskGeminiDefinition
} from './actions/definitions';

export const ACTION_REGISTRY: ActionDefinition[] = [
    GitCheckoutDefinition,
    RunCommandDefinition,
    ConfirmDefinition,
    UserInputDefinition,
    SetDescriptionDefinition,
    AddLogDefinition,
    NewTempFolderDefinition,
    ForEachListDefinition,
    AskChatGPTDefinition,
    SplitStringDefinition,
    AskGeminiDefinition
];

export const getActionDefinition = (id: string): ActionDefinition | undefined => {
  return ACTION_REGISTRY.find((a) => a.id === id);
};
