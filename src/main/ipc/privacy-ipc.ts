import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { clearOutboundRequests, getOutboundRequests } from '../network-log'

export function registerPrivacyIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PRIVACY_GET_NETWORK_LOG, () => getOutboundRequests())
  ipcMain.handle(IPC_CHANNELS.PRIVACY_CLEAR_NETWORK_LOG, () => clearOutboundRequests())
}
