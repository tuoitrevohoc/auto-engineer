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
    AskGeminiDefinition,
    AddImageLogDefinition,
    GenerateImageDefinition 
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
    AskGeminiDefinition,
    AddImageLogDefinition,
    GenerateImageDefinition
];

export const getActionDefinition = (id: string): ActionDefinition | undefined => {
  return ACTION_REGISTRY.find((a) => a.id === id);
};
