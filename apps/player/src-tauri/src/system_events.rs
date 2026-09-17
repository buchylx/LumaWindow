use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LifecycleStatus {
    pub platform: &'static str,
    pub bridge_installed: bool,
    pub session_notifications: bool,
    pub error: Option<String>,
}

#[cfg(windows)]
mod windows {
    use super::LifecycleStatus;
    use tauri::Emitter;
    use windows_sys::Win32::{
        Foundation::{HWND, LPARAM, LRESULT, WPARAM},
        System::RemoteDesktop::{
            WTSRegisterSessionNotification, WTSUnRegisterSessionNotification,
            NOTIFY_FOR_THIS_SESSION,
        },
        UI::{
            Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass},
            WindowsAndMessaging::*,
        },
    };
    const SUBCLASS_ID: usize = 0x4c554d41;

    unsafe extern "system" fn window_event(
        hwnd: HWND,
        msg: u32,
        wp: WPARAM,
        lp: LPARAM,
        id: usize,
        data: usize,
    ) -> LRESULT {
        let event = match (msg, wp as u32) {
            (WM_WTSSESSION_CHANGE, WTS_SESSION_LOCK) => Some("session-lock"),
            (WM_WTSSESSION_CHANGE, WTS_SESSION_UNLOCK) => Some("session-unlock"),
            (WM_POWERBROADCAST, PBT_APMSUSPEND) => Some("system-suspend"),
            (WM_POWERBROADCAST, PBT_APMRESUMEAUTOMATIC | PBT_APMRESUMESUSPEND) => {
                Some("system-resume")
            }
            (WM_SIZE, SIZE_MINIMIZED) => Some("minimized"),
            (WM_SIZE, SIZE_RESTORED | SIZE_MAXIMIZED) => Some("restored"),
            (WM_DISPLAYCHANGE, _) => Some("displays-changed"),
            _ => None,
        };
        if let Some(event) = event {
            // The box is installed on this window's thread and lives until WM_NCDESTROY.
            let app = &*(data as *const tauri::AppHandle);
            let _ = app.emit_to("main", "system-event", event);
            if event == "displays-changed" {
                let _ = app.emit_to("controls", "system-event", event);
            }
        }
        if msg == WM_NCDESTROY {
            WTSUnRegisterSessionNotification(hwnd);
            RemoveWindowSubclass(hwnd, Some(window_event), id);
            drop(Box::from_raw(data as *mut tauri::AppHandle));
        }
        DefSubclassProc(hwnd, msg, wp, lp)
    }

    pub fn install(window: &tauri::WebviewWindow) -> LifecycleStatus {
        let mut status = LifecycleStatus {
            platform: "windows",
            bridge_installed: false,
            session_notifications: false,
            error: None,
        };
        let hwnd = match window.hwnd() {
            Ok(handle) => handle.0 as HWND,
            Err(error) => {
                status.error = Some(error.to_string());
                return status;
            }
        };
        use tauri::Manager;
        let data = Box::into_raw(Box::new(window.app_handle().clone()));
        // setup runs on the window thread; subclassing must never cross threads.
        unsafe {
            if SetWindowSubclass(hwnd, Some(window_event), SUBCLASS_ID, data as usize) == 0 {
                drop(Box::from_raw(data));
                status.error = Some(std::io::Error::last_os_error().to_string());
                return status;
            }
            status.bridge_installed = true;
            status.session_notifications =
                WTSRegisterSessionNotification(hwnd, NOTIFY_FOR_THIS_SESSION) != 0;
            if !status.session_notifications {
                status.error = Some(std::io::Error::last_os_error().to_string());
            }
        }
        status
    }
}

pub fn install(window: &tauri::WebviewWindow) -> LifecycleStatus {
    #[cfg(windows)]
    {
        windows::install(window)
    }
    #[cfg(not(windows))]
    {
        let _ = window;
        LifecycleStatus {
            platform: std::env::consts::OS,
            bridge_installed: false,
            session_notifications: false,
            error: Some("Native lifecycle bridge is not yet implemented on this platform".into()),
        }
    }
}
