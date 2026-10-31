/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VirtualFile {
  name: string;
  content: string;
}

export interface VirtualFolder {
  folders: string[];
  files: Record<string, string>;
}

export type FileSystemData = Record<string, VirtualFolder>;

export interface TerminalLine {
  id: string;
  type: 'system' | 'prompt' | 'output' | 'error' | 'help' | 'banner';
  text?: string;
  html?: string;
  className?: string;
}

export type SystemStatus = 'offline' | 'thinking' | 'online' | 'poweroff';

export interface CommandContext {
  operatorName: string;
  currentDir: string;
  fileSystem: FileSystemData;
  isAdmin?: boolean;
  batteryLevel?: number;
  coreTemp?: number;
}

export interface CommandResult {
  nextDir?: string;
  openEditor?: {
    appType: 'vim' | 'nano';
    fileName: string;
    fileContent: string;
  };
  triggerDegauss?: boolean;
  triggerRestart?: boolean;
  clearTerminal?: boolean;
  triggerContactModal?: boolean;
  triggerAdminModal?: boolean;
  triggerAiChatModal?: boolean;
  triggerScreensaver?: boolean;
  triggerStress?: boolean;
  triggerFlickerToggle?: boolean;
  outputLines: TerminalLine[];
}
