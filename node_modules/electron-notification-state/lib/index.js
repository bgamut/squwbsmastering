"use strict";
exports.__esModule = true;
var windows_notification_state_1 = require("windows-notification-state");
var windows_quiet_hours_1 = require("windows-quiet-hours");
var macos_notification_state_1 = require("macos-notification-state");
function getSessionState() {
    if (process.platform === 'win32') {
        return windows_notification_state_1.getNotificationState();
    }
    if (process.platform === 'darwin') {
        return macos_notification_state_1.getSessionState();
    }
    return 'UNKNOWN_ERROR';
}
exports.getSessionState = getSessionState;
function getDoNotDisturb() {
    if (process.platform === 'win32') {
        return windows_quiet_hours_1.getIsQuietHours();
    }
    if (process.platform === 'darwin') {
        return macos_notification_state_1.getDoNotDisturb();
    }
    return false;
}
exports.getDoNotDisturb = getDoNotDisturb;
