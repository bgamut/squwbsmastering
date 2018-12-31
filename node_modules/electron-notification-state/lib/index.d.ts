import { QUERY_USER_NOTIFICATION_STATE } from 'windows-notification-state';
import { SessionState } from 'macos-notification-state';
export declare type NotificationState = QUERY_USER_NOTIFICATION_STATE | SessionState | 'UNKNOWN' | 'UNKNOWN_ERROR' | 'DO_NOT_DISTURB';
export declare function getSessionState(): NotificationState;
export declare function getDoNotDisturb(): boolean;
