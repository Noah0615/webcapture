export type CaptureMode = 'viewport' | 'fullpage' | 'selector';
export type Device = 'desktop' | 'laptop' | 'tablet' | 'mobile';
export type Template = 'detail' | 'compare2' | 'compare4';
export interface CaptureOptions { mode: CaptureMode; device: Device; clean: boolean; selector: string; concurrency: number; sessionId?: string }
export interface CaptureItem { id: string; url: string; title: string; status: 'queued' | 'capturing' | 'done' | 'error'; image?: string; width?: number; height?: number; capturedAt?: string; httpStatus?: number; error?: string; note: string; selected: boolean }
export interface SessionInfo { id: string; origin: string; updatedAt: string }
export interface DesktopAPI {
  capture: (items: {id: string; url: string}[], options: CaptureOptions) => Promise<void>;
  cancel: () => Promise<void>;
  onProgress: (cb: (item: Partial<CaptureItem> & {id: string}) => void) => () => void;
  sessions: () => Promise<SessionInfo[]>;
  addSession: (url: string) => Promise<SessionInfo>;
  removeSession: (id: string) => Promise<void>;
}
declare global { interface Window { snapdeck?: DesktopAPI } }
export const devices: Record<Device, {label: string; width: number; height: number}> = {
  desktop: { label: '데스크톱', width: 1920, height: 1080 },
  laptop: { label: '노트북', width: 1440, height: 900 },
  tablet: { label: '태블릿', width: 820, height: 1180 },
  mobile: { label: '모바일', width: 393, height: 852 },
};
